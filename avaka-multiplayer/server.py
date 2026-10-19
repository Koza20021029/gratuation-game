import os
import sys

# macOS kqueue compatibility for eventlet
if sys.platform == 'darwin':
    os.environ.setdefault('EVENTLET_HUB', 'selects')

import eventlet
eventlet.monkey_patch()


from flask import Flask, send_from_directory, request, render_template
from flask_socketio import SocketIO, emit, join_room, leave_room
import random
import string
import threading
import time

app = Flask(__name__, static_folder='static')
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='eventlet',
    ping_timeout=60,
    ping_interval=25,
    max_http_buffer_size=2 * 1024 * 1024
)

# Thread lock to protect shared state from race conditions
state_lock = threading.Lock()

# Game State: Multiple Rooms
rooms = {} # room_code -> game_state
player_rooms = {} # sid -> room_code

# Graceful disconnect: store player data for reconnection during active games
# Key: (room_code, old_sid) -> {'player_data': {...}, 'disconnect_time': float}
DISCONNECT_GRACE_SECONDS = 900
disconnected_players = {}

# Each browser keeps a private token so that a refresh, a sleeping phone or a dropped connection
# can be matched back to its player. Tokens stay here, never inside the broadcast room state.
player_tokens = {}  # sid -> token

def has_waiting_players(room_code):
    """True while someone who dropped out of this room can still come back."""
    now = time.time()
    return any(rc == room_code and now - entry['disconnect_time'] <= DISCONNECT_GRACE_SECONDS
               for (rc, _), entry in disconnected_players.items())

def purge_stale_rooms():
    now = time.time()
    for key in [k for k, e in disconnected_players.items() if now - e['disconnect_time'] > DISCONNECT_GRACE_SECONDS]:
        del disconnected_players[key]
    for code in [c for c, st in rooms.items() if not st['players'] and not has_waiting_players(c)]:
        del rooms[code]

# The forest is shared by the whole room: needing the material is what keeps people tending it.
FOREST_START = 3
FOREST_MAX = 5

def forest_level(value):
    if value >= 4: return 'lush'
    if value <= 1: return 'aged'
    return 'ok'

def settle_forest_month(state, room_code):
    """Called when a month ends: tended plots recover, untended ones age. Month 2 (forest closed) is skipped."""
    ended = state['month']
    if ended != 2:
        before = state.get('forest', FOREST_START)
        if state.get('forest_tended'):
            state['forest'] = min(FOREST_MAX, before + 1)
            add_log(room_code, f"🌳 森林：{ended} 月有人上山砍伐、照顧林地，森林狀態 {before} → {state['forest']}")
        else:
            state['forest'] = max(0, before - 1)
            add_log(room_code, f"🍂 森林：{ended} 月沒有人上山，林地無人照顧，森林狀態 {before} → {state['forest']}")
    state['forest_tended'] = False

# ── Monthly group missions, badges and end-of-year titles ──────────────────────
ASK_SCORE_CAP = 2      # asks / guidance that score per player per month (KP is still gained beyond it)

MISSIONS = {
    'ask':    {'name': '開口問',     'desc': '本月全組合計請益 {target} 次'},
    'gift':   {'name': '帶禮物來',   'desc': '本月有人送材料給耆老'},
    'help':   {'name': '接下重擔',   'desc': '本月有人幫忙長者'},
    'forest': {'name': '上山看看',   'desc': '本月有人上山砍伐、照顧林地'},
    'teach':  {'name': '把話傳下去', 'desc': '本月耆老指導至少 1 次'},
    'steps':  {'name': '一起動手',   'desc': '本月全組合計完成 {target} 道工序'},
}

BADGES = {
    'ask': '開口問', 'gift': '帶禮物來', 'help': '接下重擔', 'forest': '照顧山林',
    'teach': '把話傳下去', 'translate': '看見道理', 'finish': '船下水了',
}

TITLES = {
    'heritage': {'name': '最會傳承',   'stats': ('ask', 'teach', 'tell')},
    'giving':   {'name': '最懂回饋',   'stats': ('gift',)},
    'helper':   {'name': '長者的幫手', 'stats': ('help',)},
    'forest':   {'name': '山林守護者', 'stats': ('chop', 'plant')},
}

def new_stats():
    return {'ask': 0, 'teach': 0, 'gift': 0, 'help': 0, 'chop': 0, 'plant': 0, 'assist': 0, 'tell': 0,
            'translate': 0, 'steps': 0}

# ── Quiz after asking: answers stay on the server, the client only holds the wording ──
# id -> index of the correct option (option order is the one in app.js QUIZ_TEXT)
QUIZ_ANSWERS = {'q1': 0, 'q2': 0, 'q3': 2, 'q4': 0, 'q5': 0, 'q6': 0, 'q7': 0, 'q8': 0,
                'q9': 0, 'q10': 0, 'q11': 0, 'q12': 0, 'q13': 0, 'q14': 0, 'q15': 0}

def give_quiz(player):
    """Hand the player one question they have not seen yet (the bank restarts once exhausted)."""
    seen = player.setdefault('quiz_seen', [])
    pool = [q for q in QUIZ_ANSWERS if q not in seen]
    if not pool:
        seen.clear()
        pool = list(QUIZ_ANSWERS)
    qid = random.choice(pool)
    seen.append(qid)
    order = [0, 1, 2]
    random.shuffle(order)
    player['quiz_seq'] = player.get('quiz_seq', 0) + 1
    player['quiz'] = {'id': qid, 'order': order, 'seq': player['quiz_seq']}

# ── Monthly event cards: every player picks one of two options ──
# cost / gain keys: ap, kp, score, material (given to the teammate with the fewest), rest (extra AP next month)
EVENTS = {
    2:  {'id': 'm2',  'a': {'name': '到灘頭參加', 'ap': 2, 'score': 1, 'label': '參加招魚祭'},
                      'b': {'name': '整理工具',   'rest': 1}},
    3:  {'id': 'm3',  'a': {'name': '一起出海',   'ap': 2, 'score': 1, 'label': '一起出海'},
                      'b': {'name': '留下來做工'}},
    6:  {'id': 'm6',  'a': {'name': '分享收成',   'material': 1, 'score': 1, 'label': '分享收成'},
                      'b': {'name': '留著自己用'}},
    8:  {'id': 'm8',  'a': {'name': '花時間說明', 'ap': 1, 'kp': 1},
                      'b': {'name': '下次再說'}},
    10: {'id': 'm10', 'a': {'name': '幫忙燒貝灰', 'ap': 2, 'score': 1, 'label': '幫忙燒貝灰'},
                      'b': {'name': '請教長輩',   'ap': 1, 'kp': 1}},
    11: {'id': 'm11', 'a': {'name': '留下來聽',   'ap': 1, 'kp': 1},
                      'b': {'name': '早點休息',   'rest': 1}},
}

def deal_events(state):
    event = EVENTS.get(state['month'])
    for p in state['players'].values():
        p['event'] = {'id': event['id'], 'month': state['month']} if event else None

def clear_month_prompts(state):
    """Unanswered quizzes, events and mini-games do not carry over to the next month."""
    for p in state['players'].values():
        p['quiz'] = None
        p['event'] = None
        p['minigame'] = None

def award_badge(player, badge_id, room_code):
    badges = player.setdefault('badges', [])
    if badge_id not in badges:
        badges.append(badge_id)
        add_log(room_code, f"🏅 {player['name']} 獲得徽章「{BADGES[badge_id]}」")

def pick_mission(state):
    """Pick this month's group mission among the ones the room can actually do."""
    players = list(state['players'].values())
    month = state['month']
    has_elder = any(p['role'] == 'elder' for p in players)
    has_younger = any(p['role'] != 'elder' for p in players)
    askers = sum(1 for p in players if p['role'] in ('youth', 'middle') and not p['finished'])
    building = sum(1 for p in players if not p['finished'])
    options = {}
    if askers: options['ask'] = askers
    if has_elder and has_younger:
        options['gift'] = 1
        options['teach'] = 1
        if any(p['role'] == 'elder' and not p['finished'] for p in players):
            options['help'] = 1
    if month != 2:
        options['forest'] = 1
        if building: options['steps'] = building
    previous = (state.get('mission') or {}).get('id')
    choices = [m for m in options if m != previous] or list(options)
    if not choices:
        state['mission'] = None
        return
    mid = random.choice(choices)
    state['mission'] = {'id': mid, 'name': MISSIONS[mid]['name'],
                        'desc': MISSIONS[mid]['desc'].format(target=options[mid]),
                        'target': options[mid], 'progress': 0, 'done': False}

def mission_progress(state, room_code, mission_id, amount=1):
    mission = state.get('mission')
    if not mission or mission['done'] or mission['id'] != mission_id: return
    mission['progress'] = min(mission['target'], mission['progress'] + amount)
    if mission['progress'] >= mission['target']:
        mission['done'] = True
        add_log(room_code, f"🎯 小組任務「{mission['name']}」達成！所有人獲得 1 分")
        for p in state['players'].values():
            p['score'] += 1
            p['score_breakdown'].append("小組任務 (+1)")

def award_titles(state):
    titles = {}
    players = list(state['players'].values())
    for tid, info in TITLES.items():
        totals = {p['id']: sum(p.get('stats', {}).get(k, 0) for k in info['stats']) for p in players}
        best = max(totals.values(), default=0)
        if best > 0:
            for p in players:
                if totals[p['id']] == best:
                    p.setdefault('titles', []).append(tid)
            titles[tid] = best
    state['titles_awarded'] = titles

def scoring_ask(player, month):
    """True while this player's asks / guidance still score this month."""
    if player.get('ask_score_month') != month:
        player['ask_score_month'] = month
        player['ask_score_count'] = 0
    if player['ask_score_count'] >= ASK_SCORE_CAP:
        return False
    player['ask_score_count'] += 1
    return True

# Once a boat is finished its builder still has months of stamina. It goes into a boat for the whole
# community: 1 AP a time at the shore, and everyone is rewarded at year's end by how far it got.
TRIBE_BOAT_PER_PLAYER = 3
TRIBE_BOAT_FULL_SCORE = 3
TRIBE_BOAT_HALF_SCORE = 1

def create_initial_state(room_code):
    return {
        'room_code': room_code,
        'started': False,
        'month': 1,
        'forest': FOREST_START,        # shared forest health, 0..FOREST_MAX
        'forest_tended': False,        # did anyone chop (tend the plots) this month?
        'tribe_boat': 0,               # the boat everyone builds together once their own is done
        'tribe_boat_goal': TRIBE_BOAT_PER_PLAYER,
        'mission': None,               # this month's group mission
        'players': {}, # socket_id -> player_data
        'logs': []
    }

def generate_room_code():
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        if code not in rooms:
            return code

ENDINGS = {
    "tier1": {
        "title": "【傳承之靈】活著的拼板舟",
        "text": "這艘船是活的。不僅僅一種比喻，而是真的活著。你花了整整一年，跟著走過祖先的同一條山路，身體記住了採集時該繞開哪棵樹、Avaka的纖維要朝哪個方向撚才不會斷。這些動作可能沒有被文字記錄，卻藏在族人身體的記憶之中，等待被喚醒。<br><br>後來，透過科學資料，證實了Avaka 纖維吸水之後會膨脹。你忽然明白，老人說「讓船呼吸」不只是一種想像，是造船的學問。當海水滲進縫隙，纖維膨脹後，船反而變得更緊實。可以拆，可以修，可以一塊一塊換掉，再一次出海。<br><br>那些你以為早已斷裂的記憶，其實只是靜靜地等著願意承接的人。<br><br>而這艘船會繼續航行，帶著耆老們說過的話，也帶著你找回的那些記憶。"
    },
    "tier2": {
        "title": "【協商之光】時代的橋樑",
        "text": "你沒辦法只活在傳統裡，這你很清楚。<br><br>孩子要上學，油費要繳，時間不等人，你在這些現實壓力裡嘗試找到縫隙，幾塊工業材料省了些工夫，但你沒有就此撒手。你還是去敲了耆老的門，還是問了那幾個不問不會有人主動說的問題：材料要怎麼選、哪道工序不能跳過，有甚麼樣的禁忌。<br><br>船造好的時候，你自己也說不清它到底是傳統還是現代。但或許這才是最誠實的答案，蘭嶼從來就不是一座博物館，人們在這裡過的是真實的生活，傳統也一直在真實的生活裡摩擦、磨損、又重新長出新的樣子。<br><br>這艘船帶著工業的氣味，也帶著老人家的智慧。它雖不完美，但它是活在這個時代裡的人造出來的。"
    },
    "tier3": {
        "title": "【效率之重】工業的餘溫",
        "text": "船造好了。但有什麼東西卻悄然失去了。<br><br>南寶樹脂把縫填得密不透風，不用等木材慢慢漲開，不用對著日曆算季節，省下了大半時間。船下水的那一刻，看起來和其他船沒什麼兩樣。<br><br>只是壞了就壞了，沒辦法修。那種嵌接的方式、那種拆開再組回去的可能，在你選擇跳過的那幾道工序裡，也連帶消失了。<br><br>手指也忘了。忘了纖維來回時的阻力，忘了怎麼判斷木材的品種。隨然並非一夕之間，卻是一點一點地，在每個選擇便利的瞬間流失。<br><br>這艘船能用，但卻沒辦法教會你任何事。它只是一件時代下的商品。"
    },
    "tier4": {
        "title": "【失落之魂】斷裂的鏈條",
        "text": "船下水了。你應該覺得完成了什麼，但內心是空的。<br><br>你沒有上山採集過那些Avaka，不知道採集時要說什麼、要避開哪些日子。你繞過了所有看起來麻煩的環節，也繞過了所有真正重要的事。<br><br>這艘船和這片海沒有關係，和山也沒有關係。它只是一個形狀，一件可以賣給觀光客拍照的道具。沒有人會想修它，壞了就丟，再做一艘新的。<br><br>那些採集時吟唱的歌，那些老人家說只有動手做才能理解的身體知識——不是被你反對，是被你忽略了。被忽略的東西，比被摧毀的東西消失得更安靜，也更難追回。"
    },
    "tier5": {
        "title": "【文化斷裂】遺失的時間",
        "text": "一年過去了，灘頭的木材還散在那裡。<br><br>始終沒有開始，好像哪裡卡住了，也許是不知道下一步該問誰，也許是繞了太多遠路，隨時間一天一天過去，而你還沒準備好。<br><br>一艘船的誕生需要一整年，不是因為工序真的那麼複雜，是因為它必須跟著季節走：採集、乾燥、等待、修整，每一步都有它自己的時間。你的節奏和這個節奏對不上，船就停在那裡，等一個不會來的時機。<br><br>那些纖維會腐爛。那些還沒說出口的技術知識，也會隨著保有記憶的人慢慢老去，而跟著消失。<br><br>不是誰的錯。那只是隨著時代推進而必然的結果。"
    }
}

ROLES = {
    'elder':  {'name': '資深工匠 (耆老)', 'max_ap': 6, 'ap_recovery': 5, 'kp': 10, 'score': 0},
    'youth':  {'name': '文化復振青年',  'max_ap': 8, 'ap_recovery': 6, 'kp': 0,  'score': 0},
    'middle': {'name': '中生代',        'max_ap': 7, 'ap_recovery': 5, 'kp': 5,  'score': 0}
}


MONTH_RULES = [
    {"month": 1, "name": "Kashyman", "desc": "準備月：為接下來的封山存貨，執行「①砍伐剝皮」可獲得 2 份材料（原為 1 份）。"},
    {"month": 2, "name": "Kapowan", "desc": "飛魚禁令：禁止進入山林（會被強制退回灘頭），無法執行「①砍伐剝皮」。"},
    {"month": 3, "name": "Pikaokaod", "desc": "捕撈飛魚盛期（集體勞動）：部落分工合作，執行任何一道工序，AP 消耗減少 1 點。"},
    {"month": 4, "name": "Papataw", "desc": "男人勤於出海：所有「請益」多消耗 1 AP（青年向耆老 4 AP、中生代向耆老 3 AP、青年向中生代 2 AP）。下個月是梅雨季：持有材料的人，本月結束前請留下 1 AP 防潮。"},
    {"month": 5, "name": "Pipilapila", "desc": "梅雨季節：進入本月時，持有材料且「未完成工序④乾燥」的人，要用上個月留下的 1 AP 防潮；上個月把 AP 用光的人，材料腐爛歸零。"},
    {"month": 6, "name": "Apiya vehan", "desc": "好月節（送禮分享的吉月）：贈送材料給耆老、幫忙長者的得分加倍（各 +2 分）。"},
    {"month": 7, "name": "Pehhakow", "desc": "解禁重啟：山林解禁，執行「①砍伐剝皮」（消耗 3 AP）可獲得 2 份材料（原為 1 份）。"},
    {"month": 8, "name": "Pitanatana", "desc": "土器月（物質掌握）：採陶土、燒陶器，是掌握材料性質的月份，執行「科學轉譯」必定成功。"},
    {"month": 9, "name": "Kalimman", "desc": "飛魚終食祭：全部落參與祭儀，本月無法在商店完工。"},
    {"month": 10, "name": "Kaneman", "desc": "禁忌之月：不允許落成，本月任何方式都不能完工（填縫、機器加工、工業樹脂皆禁止）。"},
    {"month": 11, "name": "Kapitowan", "desc": "祭神月：回合開始時，若青年／中生代與耆老處於同一個地點，可自動獲得 2 點 KP。"},
    {"month": 12, "name": "Kaowan", "desc": "手工藝月（最終衝刺）：「⑤理線撚繩」消耗 0 AP，而且⑤與⑥不必跨月等待，可以在本月接連完成。"}
]

def add_log(room_code, msg):
    if room_code in rooms:
        rooms[room_code]['logs'].append(msg)
        if len(rooms[room_code]['logs']) > 50:
            rooms[room_code]['logs'].pop(0)

def record_player_kp(player, month):
    history = player.setdefault('kp_history', [])
    if history and history[-1]['month'] == month:
        history[-1]['kp'] = player['kp']
    else:
        history.append({'month': month, 'kp': player['kp']})

@app.route('/')
def index():
    return render_template('index.html')

# the rules site lives inside the game: /rules opens the player rules, /rules/class.html the classroom guide
@app.route('/rules')
@app.route('/rules/')
def rules_index():
    return send_from_directory('static/rules', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")

@socketio.on('get_state')
def handle_get_state():
    """Called by client after reconnect to get the latest room state."""
    sid = request.sid
    with state_lock:
        room_code = player_rooms.get(sid)
        if room_code and room_code in rooms:
            emit('state_update', rooms[room_code])

@socketio.on('chat_message')
def handle_chat(data):
    room_code = player_rooms.get(request.sid)
    if room_code in rooms and request.sid in rooms[room_code]['players']:
        player_name = rooms[room_code]['players'][request.sid]['name']
        msg = data.get('msg', '').strip()
        if msg:
            emit('chat_broadcast', {'name': player_name, 'msg': msg}, to=room_code)

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    print(f"Client disconnected: {sid}")
    with state_lock:
        if sid in player_rooms:
            room_code = player_rooms[sid]
            if room_code in rooms:
                state = rooms[room_code]
                if sid in state['players']:
                    p_name = state['players'][sid]['name']
                    player_data = state['players'][sid]

                    if state['started'] or state['month'] > 12:
                        # Game is active (or showing its results): preserve player data for possible rejoin
                        disconnected_players[(room_code, sid)] = {
                            'player_data': player_data,
                            'token': player_tokens.get(sid),
                            'disconnect_time': time.time()
                        }
                        del state['players'][sid]
                        add_log(room_code, f"{p_name} 斷線了（{DISCONNECT_GRACE_SECONDS // 60} 分鐘內可重連）")
                        if len(state['players']) == 0:
                            pass  # the room waits for its players to come back; purge_stale_rooms() clears it later
                        else:
                            socketio.emit('state_update', dict(state), to=room_code)
                    else:
                        # Lobby phase: remove immediately
                        del state['players'][sid]
                        add_log(room_code, f"{p_name} 斷線了")
                        if len(state['players']) == 0:
                            del rooms[room_code]
                        else:
                            socketio.emit('state_update', dict(state), to=room_code)
            del player_rooms[sid]
        player_tokens.pop(sid, None)

@socketio.on('create_room')
def handle_create_room(data):
    name = data.get('name')
    role = data.get('role')
    if role not in ROLES: return
    if not name or not name.strip(): return
    
    with state_lock:
        purge_stale_rooms()
        room_code = generate_room_code()
        rooms[room_code] = create_initial_state(room_code)
        player_tokens[request.sid] = data.get('token')
        _join_player_to_room(request.sid, name.strip(), role, room_code, data.get('avatar'))

@socketio.on('rejoin_game')
def handle_rejoin(data):
    """Bring a player back after a dropped connection, a page refresh or a sleeping device."""
    old_id = data.get('old_id')
    token = data.get('token')
    room_code = (data.get('room_code') or '').upper()
    new_id = request.sid
    with state_lock:
        state = rooms.get(room_code)
        if not state:
            emit('rejoin_failed', {'msg': '房間已經不存在了'})
            return

        def restore(player_data):
            player_data['id'] = new_id
            state['players'][new_id] = player_data
            player_rooms[new_id] = room_code
            player_tokens[new_id] = token
            join_room(room_code)

        # Case 1: the old connection has not been cleaned up yet (fast reconnect / second tab taking over)
        live = None
        if old_id and old_id != new_id and old_id in state['players']:
            live = old_id
        elif token:
            live = next((sid for sid in state['players']
                         if sid != new_id and player_tokens.get(sid) == token), None)
        if new_id in state['players']:
            socketio.emit('state_update', state, to=room_code)
            return
        if live:
            restore(state['players'].pop(live))
            player_rooms.pop(live, None)
            player_tokens.pop(live, None)
            add_log(room_code, f"{state['players'][new_id]['name']} 重新連線了")
            socketio.emit('state_update', state, to=room_code)
            return

        # Case 2: the player dropped out and is still within the grace period
        key = None
        if old_id and (room_code, old_id) in disconnected_players:
            key = (room_code, old_id)
        elif token:
            key = next((k for k, e in disconnected_players.items()
                        if k[0] == room_code and e.get('token') == token), None)
        if key:
            entry = disconnected_players.pop(key)
            if time.time() - entry['disconnect_time'] <= DISCONNECT_GRACE_SECONDS:
                restore(entry['player_data'])
                add_log(room_code, f"🔄 {entry['player_data']['name']} 成功重連！進度已恢復。")
                socketio.emit('state_update', state, to=room_code)
                return
            emit('rejoin_failed', {'msg': '離開太久，無法回到原本的遊戲'})
            return
        emit('rejoin_failed', {'msg': '找不到你在這個房間的紀錄'})

@socketio.on('join_game')
def handle_join(data):
    name = data.get('name')
    role = data.get('role')
    room_code = data.get('room_code', '').upper()
    
    with state_lock:
        if room_code not in rooms:
            emit('error', {'msg': '找不到該房間序號，請確認代碼是否正確'})
            return
            
        if rooms[room_code]['started']:
            emit('error', {'msg': '該房間遊戲已經開始，無法中途加入'})
            return
            
        if role not in ROLES: return
        if not name or not name.strip(): return
        player_tokens[request.sid] = data.get('token')
        _join_player_to_room(request.sid, name.strip(), role, room_code, data.get('avatar'))

def _join_player_to_room(sid, name, role, room_code, avatar=None):
    # join_room must be called outside the lock since it uses socketio internals
    join_room(room_code)
    player_rooms[sid] = room_code
    state = rooms[room_code]
    
    role_info = ROLES[role]
    state['players'][sid] = {
        'id': sid,
        'name': name,
        'role': role,
        'avatar': avatar,
        'ap': role_info['max_ap'],
        'max_ap': role_info['max_ap'],
        'ap_recovery': role_info['ap_recovery'],
        'kp': role_info['kp'],
        'kp_history': [{'month': 1, 'kp': role_info['kp']}],
        'path_choice': 'none',
        'last_step_month': 0,
        'gift_month': 0,
        'help_month': 0,
        'plant_month': 0,          # last month this player replanted
        'plant_bonus_from': 0,     # first month in which the replanting pays back one extra material
        'assist_month': 0,         # month in which a teammate lent this player a hand (next step is cheaper)
        'assist_score_month': 0,   # last month in which lending a hand scored
        'rest_bonus_month': 0,     # month whose AP recovery is 1 higher (event: rest early)
        'tell_month': 0,           # last month in which this elder told stories
        'quiz': None, 'quiz_result': None, 'quiz_seen': [], 'quiz_seq': 0,
        'event': None,
        'minigame': None, 'minigame_seq': 0,
        'stats': new_stats(),
        'badges': [],
        'titles': [],
        'location': '灘頭工作室',
        'materials': 0,
        'progress': 0,
        'industrial': False,
        'finished': False,
        'score': 0,
        'score_breakdown': [],
        'ready': False
    }
    
    add_log(room_code, f"{name} 加入了房間，扮演 {ROLES[role]['name']}")
    socketio.emit('state_update', state, to=room_code)

@socketio.on('leave_game')
def handle_leave():
    sid = request.sid
    room_code_to_leave = None
    state_to_broadcast = None
    
    with state_lock:
        if sid in player_rooms:
            room_code_to_leave = player_rooms[sid]
            if room_code_to_leave in rooms:
                state = rooms[room_code_to_leave]
                if sid in state['players']:
                    p_name = state['players'][sid]['name']
                    del state['players'][sid]
                    add_log(room_code_to_leave, f"{p_name} 離開了房間")
                    if len(state['players']) == 0 and has_waiting_players(room_code_to_leave):
                        room_code_to_leave = None  # others may still reconnect
                    elif len(state['players']) == 0:
                        del rooms[room_code_to_leave]
                        room_code_to_leave = None  # No need to broadcast
                    else:
                        state_to_broadcast = dict(state)
            del player_rooms[sid]
        player_tokens.pop(sid, None)
    
    if room_code_to_leave:
        leave_room(room_code_to_leave)
        if state_to_broadcast:
            socketio.emit('state_update', state_to_broadcast, to=room_code_to_leave)

@socketio.on('start_game')
def handle_start():
    sid = request.sid
    with state_lock:
        if sid not in player_rooms: return
        room_code = player_rooms[sid]
        state = rooms.get(room_code)
        if not state or len(state['players']) < 1: return
        
        state['started'] = True
        state['month'] = 1
        state['forest'] = FOREST_START
        state['forest_tended'] = False
        state['tribe_boat'] = 0
        state['tribe_boat_goal'] = TRIBE_BOAT_PER_PLAYER * len(state['players'])
        for p in state['players'].values():
            role_info = ROLES[p['role']]
            p['ap'] = role_info['max_ap']
            p['max_ap'] = role_info['max_ap']
            p['ap_recovery'] = role_info['ap_recovery']
            p['kp_history'] = [{'month': 1, 'kp': p['kp']}]
            p['path_choice'] = 'none'
            p['last_step_month'] = 0
            p['gift_month'] = 0
            p['help_month'] = 0
            p['plant_month'] = 0
            p['plant_bonus_from'] = 0
            p['assist_month'] = 0
            p['assist_score_month'] = 0
            p['rest_bonus_month'] = 0
            p['tell_month'] = 0
            p['quiz'] = None; p['quiz_result'] = None; p['quiz_seen'] = []; p['quiz_seq'] = 0
            p['event'] = None
            p['minigame'] = None; p['minigame_seq'] = 0
            p['stats'] = new_stats()
            p['badges'] = []
            p['titles'] = []
        pick_mission(state)
        add_log(room_code, "遊戲開始！第 1 個月：Kashyman")
        if state.get('mission'):
            add_log(room_code, f"🎯 本月小組任務「{state['mission']['name']}」：{state['mission']['desc']}（達成全員 +1 分）")
        socketio.emit('state_update', state, to=room_code)

def get_player(sid):
    room_code = player_rooms.get(sid)
    if room_code and room_code in rooms:
        return rooms[room_code]['players'].get(sid), rooms[room_code], room_code
    return None, None, None

@socketio.on('action')
def handle_action(data):
    sid = request.sid
    with state_lock:
        player, state, room_code = get_player(sid)
        if not player: return

        action = data.get('type')
        target = data.get('target')
        month = state['month']
        action_done = False

        # A finished boat does not end the year: its builder can still move,
        # gather materials for others, give, guide and help.
        if player['finished']:
            allowed = action in ('move', 'give', 'teach', 'tell', 'help', 'plant', 'assist',
                                 'translate', 'patrol', 'tribe', 'quiz_answer', 'event_choice', 'minigame_result') or \
                (action == 'craft' and data.get('step') == 'chop')
            if not allowed:
                emit('error', {'msg': '你的船已經完工了！接下來可以砍伐備料、補種、巡山、贈送材料、指導、幫忙其他人，或為部落的船出力。'})
                return

        def consume_ap(cost):
            if player['ap'] >= cost:
                player['ap'] -= cost
                return True
            emit('error', {'msg': 'AP 不足'})
            return False

        if action == 'move':
            if month == 2 and target == '山林':
                emit('error', {'msg': '飛魚禁令：部落灘頭已舉行招魚祭，為了尊重魚靈，整個月份禁止進入山林！'})
                return
                
            cost = 1
            if player['role'] == 'youth':
                cost = 0
            if consume_ap(cost):
                player['location'] = target
                add_log(room_code, f"{player['name']} 移動到了 {target}")
                action_done = True

        elif action == 'craft':
            step = data.get('step')
            cost = 3
            if month == 3: cost -= 1  # Month 3 discount applies to all steps
            assisted = player.get('assist_month', 0) == month

            def step_cost(base):
                # A teammate's hand takes 2 AP off this step, but never below 1
                return max(1, base - 2) if assisted and base >= 1 else base

            def step_done(paid):
                if assisted and paid >= 1:
                    player['assist_month'] = 0
                if paid >= 1:
                    # A short timing game follows the step; doing it well refunds 1 AP
                    player['minigame_seq'] = player.get('minigame_seq', 0) + 1
                    player['minigame'] = {'step': step, 'seq': player['minigame_seq']}
                else:
                    player['minigame'] = None

            # ---- Steps 1-3: Forest steps ----
            if step in ('chop', 'rub', 'strip'):
                if player['location'] != '山林':
                    emit('error', {'msg': '植株砍伐、纖維軟化與撕絲工序必須在山林中執行！'})
                    return
                if step in ('rub', 'strip') and player.get('last_step_month', 0) >= month:
                    emit('error', {'msg': '上一工序剛完成，必須間隔至少 1 個月讓材料熟化後再繼續！'})
                    return

                if step == 'chop':
                    if month == 2:
                        emit('error', {'msg': '飛魚禁令：部落灘頭已舉行招魚祭，整個月門戶關閉。為了尊重魚靈，所有男人禁止在山林工作！'})
                        return
                    # An aged forest has fewer mature plants nearby: chopping takes more effort
                    chop_cost = step_cost(cost + 1 if state.get('forest', FOREST_START) <= 1 else cost)
                    if consume_ap(chop_cost):
                        step_done(chop_cost)
                        amount = 2 if month in (1, 7) else 1
                        replanted = 0 < player.get('plant_bonus_from', 0) <= month
                        if replanted:
                            amount += 1
                            player['plant_bonus_from'] = 0
                        player['materials'] += amount
                        state['forest_tended'] = True
                        player.setdefault('stats', new_stats())['chop'] += 1
                        award_badge(player, 'forest', room_code)
                        mission_progress(state, room_code, 'forest')
                        if player['progress'] == 0:
                            player['progress'] = 1
                            player['last_step_month'] = month
                            mission_progress(state, room_code, 'steps')
                            add_log(room_code, f"{player['name']} 完成了 ①砍伐剝皮 ipana'ape (獲得 {amount} 份材料)")
                        else:
                            add_log(room_code, f"{player['name']} 執行了砍伐剝皮，獲得了 {amount} 份材料")
                        if replanted:
                            add_log(room_code, f"🌱 {player['name']} 之前補種的 Avaka 長成了，這次多收 1 份材料")
                        action_done = True

                elif step == 'rub' and player['progress'] == 1:
                    if player['materials'] < 1:
                        emit('error', {'msg': '懸掛摩擦軟化需要 1 份材料'})
                        return
                    paid = step_cost(cost)
                    if consume_ap(paid):
                        step_done(paid)
                        player['materials'] -= 1
                        player['progress'] = 2
                        player['last_step_month'] = month
                        add_log(room_code, f"{player['name']} 完成了 ②懸掛摩擦軟化 (消耗 1 份材料)")
                        mission_progress(state, room_code, 'steps')
                        action_done = True

                elif step == 'strip' and player['progress'] == 2:
                    if player['materials'] < 1:
                        emit('error', {'msg': '劃痕撕絲需要 1 份材料'})
                        return
                    paid = step_cost(cost)
                    if consume_ap(paid):
                        step_done(paid)
                        player['materials'] -= 1
                        player['progress'] = 3
                        player['last_step_month'] = month
                        add_log(room_code, f"{player['name']} 完成了 ③劃痕撕絲 chingdasan (消耗 1 份材料)")
                        mission_progress(state, room_code, 'steps')
                        action_done = True

            # ---- Steps 4-6: Beach Workshop steps ----
            elif step in ('dry', 'twine', 'caulk'):
                if player['location'] != '灘頭工作室':
                    emit('error', {'msg': '曝曬乾燥、撚繩理線與填縫完工工序必須在灘頭工作室執行！'})
                    return
                sprint = month == 12 and step in ('twine', 'caulk')
                if player.get('last_step_month', 0) >= month and not sprint:
                    emit('error', {'msg': '纖維需在灘頭晾曬乾燥至少 1 個月！請等待下個月節氣成熟後再執行下一工序。'})
                    return

                if step == 'dry' and player['progress'] == 3:
                    if player['materials'] < 1:
                        emit('error', {'msg': '曝曬乾燥需要 1 份材料'})
                        return
                    paid = step_cost(cost)
                    if consume_ap(paid):
                        step_done(paid)
                        player['materials'] -= 1
                        player['progress'] = 4
                        player['last_step_month'] = month
                        add_log(room_code, f"{player['name']} 完成了 ④脫水曝曬乾燥 (消耗 1 份材料)")
                        mission_progress(state, room_code, 'steps')
                        action_done = True

                elif step == 'twine' and player['progress'] == 4:
                    if player['materials'] < 1:
                        emit('error', {'msg': '理線撚繩需要 1 份材料'})
                        return
                    if player['kp'] < 3:
                        emit('error', {'msg': '理線撚繩需要 3 KP（傳統搓撚技藝）'})
                        return
                    if month == 12: cost = 0
                    paid = step_cost(cost)
                    if consume_ap(paid):
                        step_done(paid)
                        player['materials'] -= 1
                        player['progress'] = 5
                        player['last_step_month'] = month
                        add_log(room_code, f"{player['name']} 完成了 ⑤理線撚繩 oviden (消耗 1 份材料)")
                        mission_progress(state, room_code, 'steps')
                        action_done = True

                elif step == 'caulk' and player['progress'] == 5:
                    if month == 10:
                        emit('error', {'msg': '禁忌之月：這是專門製作貝灰的月份，即便材料已齊備，現在也絕不能動工填縫！'})
                        return
                    if player['kp'] < 8:
                        emit('error', {'msg': '填縫完工需要 8 KP（Mamaruk / tumbek su varok）'})
                        return
                    if player['materials'] < 1:
                        emit('error', {'msg': '填縫完工需要 1 份材料'})
                        return

                    if player['role'] == 'elder': cost = 0

                    paid = step_cost(cost)
                    if consume_ap(paid):
                        step_done(paid)
                        player['materials'] -= 1
                        player['progress'] = 6
                        player['finished'] = True
                        player['path_choice'] = 'traditional'
                        player['last_step_month'] = month

                        score = 15 + 5  # Base + guarantee
                        player['score'] += score
                        player['score_breakdown'].append(f"傳統 Avaka (+{score})")
                        add_log(room_code, f"{player['name']} 完美傳承了造船技術！獲得 {score} 分")
                        award_badge(player, 'finish', room_code)
                        mission_progress(state, room_code, 'steps')
                        action_done = True

        elif action == 'buy':
            item = data.get('item', 'resin')
            if item not in ('resin', 'machine'): return
            if player['location'] != '商店':
                emit('error', {'msg': '必須在商店'})
                return
            if month == 9:
                emit('error', {'msg': '飛魚終食祭：全部落都在參與祭儀，這個月無法在商店完工。'})
                return
            if month == 10:
                emit('error', {'msg': '禁忌之月：這個月不允許落成，任何方式都不能完工。'})
                return
            if player['progress'] < 3:
                emit('error', {'msg': '必須至少在山林完成三道工序（砍伐→軟化→撕絲），才能到商店完工！'})
                return
            if player['materials'] < 2:
                emit('error', {'msg': '在商店完工需要至少 2 份材料！'})
                return
            if player.get('last_step_month', 0) >= month:
                emit('error', {'msg': '上一道工序剛完成，纖維需晾放至少 1 個月才能到商店加工！'})
                return
            if item == 'machine' and player['kp'] < 5:
                emit('error', {'msg': '機器加工天然纖維需要 5 KP：要先懂傳統作法，才知道怎麼用機器轉化它。'})
                return

            cost = 3
            if consume_ap(cost):
                player['materials'] -= 2
                player['progress'] = 6
                player['finished'] = True
                player['last_step_month'] = month

                if item == 'machine':
                    player['industrial'] = False
                    player['path_choice'] = 'hybrid'
                    score = 12
                    if player['role'] == 'middle':
                        score += 3
                    player['score'] += score
                    player['score_breakdown'].append(f"機器加工天然纖維 (+{score})")
                    add_log(room_code, f"{player['name']} 用機器加工 Avaka 纖維完工，獲得 {score} 分。船仍可拆修，但少了手工曝曬與撚繩的經驗。")
                    award_badge(player, 'finish', room_code)
                else:
                    player['industrial'] = True
                    player['path_choice'] = 'industrial'
                    score = 5
                    player['score'] += score
                    player['score_breakdown'].append(f"工業樹脂 (+{score})")
                    add_log(room_code, f"{player['name']} 用工業樹脂完工，獲得 {score} 分。船很快造好了，但接縫黏死，壞了無法拆修。")
                    award_badge(player, 'finish', room_code)
                action_done = True

        elif action == 'ask':
            if player['role'] not in ['youth', 'middle']: return
            ask_target = data.get('target', 'elder')

            if ask_target == 'middle':
                if player['role'] != 'youth': return
                mentors = [p for p in state['players'].values()
                           if p['role'] == 'middle' and p['id'] != player['id']]
                if not mentors:
                    emit('error', {'msg': '房間裡沒有中生代可以請益'})
                    return
                mentor = max(mentors, key=lambda p: p['kp'])
                if player['kp'] >= mentor['kp']:
                    emit('error', {'msg': f"你的 KP 已經不低於 {mentor['name']}，更深的知識要向耆老請益！"})
                    return

                cost = 2 if month == 4 else 1
                if consume_ap(cost):
                    kp_gain = 2
                    player['kp'] += kp_gain
                    if scoring_ask(player, month):
                        player['score'] += 1
                        player['score_breakdown'].append("請益中生代 (+1)")
                        mentor['score'] += 1
                        mentor['score_breakdown'].append("傳承指導 (+1)")
                        add_log(room_code, f"{player['name']} 向中生代 {mentor['name']} 請益，獲得 {kp_gain} KP，雙方各得 1 分")
                    else:
                        add_log(room_code, f"{player['name']} 向中生代 {mentor['name']} 請益，獲得 {kp_gain} KP（本月請益的加分已達上限）")
                    player.setdefault('stats', new_stats())['ask'] += 1
                    award_badge(player, 'ask', room_code)
                    mission_progress(state, room_code, 'ask')
                    give_quiz(player)
                    action_done = True

            else:
                is_youth = player['role'] == 'youth'
                base_cost = 3 if is_youth else 2
                cost = (base_cost + 1) if month == 4 else base_cost

                if consume_ap(cost):
                    kp_gain = 3
                    brought_gift = player.get('gift_month', 0) == month
                    if brought_gift:
                        kp_gain += 1
                    player['kp'] += kp_gain
                    gift_note = "（帶禮請益，多得 1 KP）" if brought_gift else ""
                    if scoring_ask(player, month):
                        player['score'] += 1
                        player['score_breakdown'].append("請益耆老 (+1)")
                        add_log(room_code, f"{player['name']} 向耆老請益，獲得 {kp_gain} KP 與 1 分{gift_note}")
                        # give elder score
                        for p in state['players'].values():
                            if p['role'] == 'elder' and p['id'] != player['id']:
                                p['score'] += 1
                                p['score_breakdown'].append("傳承指導 (+1)")
                                add_log(room_code, f"{p['name']} 因傳承指導獲得 1 分")
                    else:
                        add_log(room_code, f"{player['name']} 向耆老請益，獲得 {kp_gain} KP{gift_note}（本月請益的加分已達上限）")
                    player.setdefault('stats', new_stats())['ask'] += 1
                    award_badge(player, 'ask', room_code)
                    mission_progress(state, room_code, 'ask')
                    give_quiz(player)
                    action_done = True

        elif action == 'teach':
            if player['role'] != 'elder': return
            target_id = data.get('target_id')
            target_p = state['players'].get(target_id)
            if not target_p:
                emit('error', {'msg': '找不到指導對象'})
                return
            if consume_ap(2):
                target_p['kp'] += 1
                if scoring_ask(player, month):
                    player['score'] += 1
                    player['score_breakdown'].append("遠程指導 (+1)")
                    add_log(room_code, f"{player['name']} 遠程指導了 {target_p['name']}，獲得 1 分傳承分數")
                else:
                    add_log(room_code, f"{player['name']} 遠程指導了 {target_p['name']}（本月指導的加分已達上限）")
                player.setdefault('stats', new_stats())['teach'] += 1
                award_badge(player, 'teach', room_code)
                mission_progress(state, room_code, 'teach')
                action_done = True

        elif action == 'tell':
            # The elder gathers whoever is nearby: one telling teaches everyone at the same place.
            if player['role'] != 'elder': return
            if player.get('tell_month', 0) == month:
                emit('error', {'msg': '這個月已經講述過了，下個月再說！'})
                return
            listeners = [p for p in state['players'].values()
                         if p['role'] in ('youth', 'middle') and p['location'] == player['location']]
            if not listeners:
                emit('error', {'msg': '身邊沒有人在聽。請青年或中生代先來到你所在的地點。'})
                return
            if consume_ap(2):
                gain = 2 if month in (2, 10) else 1   # the months when work is forbidden are for listening
                for p in listeners:
                    p['kp'] += gain
                    record_player_kp(p, month)
                player['tell_month'] = month
                player['score'] += 1
                player['score_breakdown'].append("講述 (+1)")
                player.setdefault('stats', new_stats())['tell'] += 1
                award_badge(player, 'teach', room_code)
                mission_progress(state, room_code, 'teach')
                names = '、'.join(p['name'] for p in listeners)
                add_log(room_code, f"🗣️ {player['name']} 對身邊的人講述：{names} 各獲得 {gain} KP，{player['name']} 獲得 1 分")
                action_done = True

        elif action == 'give':
            target_id = data.get('target_id')
            target_p = state['players'].get(target_id)
            if not target_p: return
            if player['location'] != target_p['location']:
                emit('error', {'msg': '必須在同一地點才能贈與'})
                return
            if player['materials'] < 1:
                emit('error', {'msg': '你沒有足夠的材料可以贈與'})
                return
            if consume_ap(0):
                player['materials'] -= 1
                target_p['materials'] += 1
                add_log(room_code, f"🤝 {player['name']} 將 1 份材料送給了 {target_p['name']}！")
                if target_p['role'] == 'elder' and player['role'] != 'elder':
                    player.setdefault('stats', new_stats())['gift'] += 1
                    award_badge(player, 'gift', room_code)
                    mission_progress(state, room_code, 'gift')
                if target_p['role'] == 'elder' and player['role'] != 'elder' and player.get('gift_month', 0) != month:
                    player['gift_month'] = month
                    gift_score = 2 if month == 6 else 1
                    player['score'] += gift_score
                    player['score_breakdown'].append(f"回饋長者 (+{gift_score})")
                    add_log(room_code, f"🎁 {player['name']} 帶禮物回饋耆老，獲得 {gift_score} 分；本月向耆老請益可多得 1 KP")
                action_done = True

        elif action == 'help':
            if player['role'] == 'elder': return
            again = player.get('help_month', 0) == month
            if again and not player['finished']:
                emit('error', {'msg': '這個月已經幫忙過長者了，下個月再來！'})
                return
            elders = [p for p in state['players'].values()
                      if p['role'] == 'elder' and p['location'] == player['location'] and not p['finished']]
            if not elders:
                emit('error', {'msg': '必須和還在造船的耆老在同一個地點，才能幫忙'})
                return
            elder = min(elders, key=lambda p: p['ap'])
            if elder['ap'] >= elder['max_ap']:
                emit('error', {'msg': f"{elder['name']} 現在體力充足，還不需要幫忙"})
                return
            if consume_ap(1):
                elder['ap'] = min(elder['max_ap'], elder['ap'] + 2)
                player['help_month'] = month
                player.setdefault('stats', new_stats())['help'] += 1
                award_badge(player, 'help', room_code)
                mission_progress(state, room_code, 'help')
                if again:
                    # with their own boat done they can keep helping all month; the point was already given
                    add_log(room_code, f"💪 {player['name']} 繼續幫 {elder['name']} 趕工，{elder['name']} 回復體力（現有 {elder['ap']}/{elder['max_ap']} AP）")
                else:
                    help_score = 2 if month == 6 else 1
                    player['score'] += help_score
                    player['score_breakdown'].append(f"幫忙長者 (+{help_score})")
                    add_log(room_code, f"💪 {player['name']} 幫 {elder['name']} 分擔粗重的工作，{elder['name']} 回復體力（現有 {elder['ap']}/{elder['max_ap']} AP），{player['name']} 獲得 {help_score} 分")
                action_done = True

        elif action == 'quiz_answer':
            quiz = player.get('quiz')
            if not quiz: return
            choice = data.get('choice')
            answer = QUIZ_ANSWERS[quiz['id']]
            correct = choice == answer
            player['quiz'] = None
            player['quiz_result'] = {'id': quiz['id'], 'correct': correct, 'answer': answer, 'seq': quiz['seq']}
            if correct:
                player['kp'] += 1
                add_log(room_code, f"📝 {player['name']} 答對了請益小問答，多得 1 KP")
            action_done = True

        elif action == 'event_choice':
            pending = player.get('event')
            event = EVENTS.get(month)
            if not pending or not event or pending.get('id') != event['id']: return
            choice = data.get('choice')
            if choice not in ('a', 'b'): return
            opt = event[choice]
            if player['ap'] < opt.get('ap', 0):
                emit('error', {'msg': 'AP 不足，無法選這個選項'})
                return
            receiver = None
            if opt.get('material'):
                if player['materials'] < opt['material']:
                    emit('error', {'msg': '你沒有材料可以分享'})
                    return
                others = [p for p in state['players'].values() if p['id'] != player['id']]
                if not others:
                    emit('error', {'msg': '現在沒有其他人可以分享'})
                    return
                receiver = min(others, key=lambda p: p['materials'])
            player['ap'] -= opt.get('ap', 0)
            player['kp'] += opt.get('kp', 0)
            notes = []
            if opt.get('ap'): notes.append(f"消耗 {opt['ap']} AP")
            if receiver:
                player['materials'] -= opt['material']
                receiver['materials'] += opt['material']
                notes.append(f"把 {opt['material']} 份材料分給 {receiver['name']}")
            if opt.get('kp'): notes.append(f"獲得 {opt['kp']} KP")
            if opt.get('score'):
                player['score'] += opt['score']
                player['score_breakdown'].append(f"{opt['label']} (+{opt['score']})")
                notes.append(f"獲得 {opt['score']} 分")
            if opt.get('rest'):
                player['rest_bonus_month'] = month + 1
                notes.append(f"下個月多回復 {opt['rest']} AP")
            player['event'] = None
            add_log(room_code, f"📜 {player['name']} 選擇「{opt['name']}」" + ("：" + "，".join(notes) if notes else ""))
            action_done = True

        elif action == 'minigame_result':
            pending = player.get('minigame')
            if not pending: return
            player['minigame'] = None
            if data.get('success'):
                player['ap'] = min(player['max_ap'], player['ap'] + 1)
                add_log(room_code, f"✨ {player['name']} 手感很好，工序做得順，省下 1 AP")
            action_done = True

        elif action == 'plant':
            if player['location'] != '山林':
                emit('error', {'msg': '補種 Avaka 必須在山林'})
                return
            if month == 2:
                emit('error', {'msg': '飛魚禁令：這個月禁止在山林工作！'})
                return
            if player.get('plant_month', 0) == month:
                emit('error', {'msg': '這個月已經補種過了，下個月再來！'})
                return
            if consume_ap(1):
                player['plant_month'] = month
                player['plant_bonus_from'] = month + 1
                state['forest_tended'] = True
                player.setdefault('stats', new_stats())['plant'] += 1
                award_badge(player, 'forest', room_code)
                mission_progress(state, room_code, 'forest')
                add_log(room_code, f"🌱 {player['name']} 在山林補種了 Avaka、照顧林地（下個月起第一次砍伐多得 1 份材料）")
                action_done = True

        elif action == 'patrol':
            if player['location'] != '山林':
                emit('error', {'msg': '巡山必須在山林'})
                return
            if month == 2:
                emit('error', {'msg': '飛魚禁令：這個月禁止在山林工作！'})
                return
            if player.get('patrol_month', 0) == month:
                emit('error', {'msg': '這個月已經巡過山了，下個月再來！'})
                return
            if consume_ap(1):
                player['patrol_month'] = month
                state['forest_tended'] = True
                player.setdefault('stats', new_stats())['plant'] += 1
                award_badge(player, 'forest', room_code)
                mission_progress(state, room_code, 'forest')
                player['score'] += 1
                player['score_breakdown'].append("巡山 (+1)")
                add_log(room_code, f"🥾 {player['name']} 巡了一趟山，看過每一區的 Avaka，獲得 1 分")
                action_done = True

        elif action == 'tribe':
            if not player['finished']:
                emit('error', {'msg': '要等自己的船完工，才有餘力為部落的船出力'})
                return
            if player['location'] != '灘頭工作室':
                emit('error', {'msg': '部落的船在灘頭工作室'})
                return
            goal = state.get('tribe_boat_goal', TRIBE_BOAT_PER_PLAYER)
            if state.get('tribe_boat', 0) >= goal:
                emit('error', {'msg': '部落的船已經完成了！'})
                return
            if consume_ap(1):
                state['tribe_boat'] = state.get('tribe_boat', 0) + 1
                add_log(room_code, f"🛶 {player['name']} 為部落的船出了一份力（{state['tribe_boat']}/{goal}）")
                if state['tribe_boat'] >= goal:
                    add_log(room_code, f"🛶 部落的船完成了！年底所有人獲得 {TRIBE_BOAT_FULL_SCORE} 分")
                action_done = True

        elif action == 'assist':
            target_p = state['players'].get(data.get('target_id'))
            if not target_p or target_p['id'] == player['id']: return
            if player['location'] != target_p['location']:
                emit('error', {'msg': '必須在同一地點才能搭把手'})
                return
            if target_p['finished']:
                emit('error', {'msg': f"{target_p['name']} 的船已經完工了"})
                return
            if target_p.get('assist_month', 0) == month:
                emit('error', {'msg': f"這個月已經有人幫 {target_p['name']} 了，等他做完這道工序再說"})
                return
            if consume_ap(1):
                target_p['assist_month'] = month
                player.setdefault('stats', new_stats())['assist'] += 1
                if player.get('assist_score_month', 0) != month:
                    player['assist_score_month'] = month
                    player['score'] += 1
                    player['score_breakdown'].append("搭把手 (+1)")
                    add_log(room_code, f"🙌 {player['name']} 幫 {target_p['name']} 搭把手：{target_p['name']} 本月下一道工序少 2 AP，{player['name']} 獲得 1 分")
                else:
                    add_log(room_code, f"🙌 {player['name']} 幫 {target_p['name']} 搭把手：{target_p['name']} 本月下一道工序少 2 AP")
                action_done = True

        elif action == 'translate':
            if player['kp'] < 2:
                emit('error', {'msg': '科學轉譯需要至少 2 KP 傳統知識基礎！'})
                return
            if consume_ap(2):
                player['kp'] -= 2
                # Success probability calculation
                if month == 8:
                    success = True  # Month 8: Pitanatana (土器月): 科學轉譯必成功！
                else:
                    base_prob = 0.5 + (player['kp'] * 0.05)
                    if player['role'] == 'middle':
                        base_prob += 0.20  # Middle role bonus
                    base_prob = min(1.0, max(0.2, base_prob))
                    success = (random.random() <= base_prob)

                if success and player['finished']:
                    # with the boat done, translating still yields material to pass on, but no more points
                    player['materials'] += 2
                    player.setdefault('stats', new_stats())['translate'] += 1
                    award_badge(player, 'translate', room_code)
                    add_log(room_code, f"🔬 {player['name']} 成功對傳統工藝進行「科學轉譯」，獲得 2 份材料，可以送給還在造船的人")
                elif success:
                    score = 4
                    player['score'] += score
                    player['materials'] += 2
                    player['score_breakdown'].append(f"科學轉譯 (+{score})")
                    player.setdefault('stats', new_stats())['translate'] += 1
                    award_badge(player, 'translate', room_code)
                    add_log(room_code, f"🔬 {player['name']} 成功對傳統工藝進行「科學轉譯」！解鎖工藝數據，獲得 +4 分與 2 份材料！")
                else:
                    add_log(room_code, f"🔬 {player['name']} 嘗試對工藝進行「科學轉譯」，但實驗數據不足未果...")
                action_done = True

        if action_done:
            record_player_kp(player, month)
            socketio.emit('state_update', state, to=room_code)



@socketio.on('toggle_ready')
def handle_toggle_ready():
    sid = request.sid
    with state_lock:
        player, state, room_code = get_player(sid)
        if not state or not player: return
        
        player['ready'] = not player.get('ready', False)
        add_log(room_code, f"⏳ {player['name']} {'已準備好' if player['ready'] else '取消了準備'}")
        
        all_ready = all(p.get('ready', False) for p in state['players'].values())
        if all_ready and len(state['players']) > 0:
            for p in state['players'].values():
                p['ready'] = False
            
            settle_forest_month(state, room_code)
            clear_month_prompts(state)
            state['month'] += 1
            if state['month'] > 12:
                state['started'] = False
                add_log(room_code, "一年結束，遊戲結算！")
                state['forest_level'] = forest_level(state['forest'])
                state['mission'] = None
                award_titles(state)
                if state['forest'] >= 4:
                    add_log(room_code, f"🌳 森林狀態 {state['forest']}/{FOREST_MAX}：這一年大家一直有人照顧林地，所有人獲得 2 分")
                    for p in state['players'].values():
                        p['score'] += 2
                        p['score_breakdown'].append("照顧山林 (+2)")
                boat, goal = state.get('tribe_boat', 0), state.get('tribe_boat_goal', TRIBE_BOAT_PER_PLAYER)
                boat_score = TRIBE_BOAT_FULL_SCORE if boat >= goal else TRIBE_BOAT_HALF_SCORE if boat * 2 >= goal else 0
                if boat_score:
                    add_log(room_code, f"🛶 部落的船 {boat}/{goal}：{'大家一起把它造完了' if boat >= goal else '造了一半以上'}，所有人獲得 {boat_score} 分")
                    for p in state['players'].values():
                        p['score'] += boat_score
                        p['score_breakdown'].append(f"部落的船 (+{boat_score})")
                for p in state['players'].values():
                    if not p['finished']:
                        p['ending'] = ENDINGS['tier5']
                    elif p['score'] >= 18 and p.get('path_choice') == 'traditional':
                        p['ending'] = ENDINGS['tier1']
                    elif p['score'] >= 11:
                        p['ending'] = ENDINGS['tier2']
                    elif p['score'] >= 6:
                        p['ending'] = ENDINGS['tier3']
                    else:
                        p['ending'] = ENDINGS['tier4']
            else:
                month_info = MONTH_RULES[state['month']-1]
                add_log(room_code, f"進入第 {state['month']} 個月：{month_info['name']}。")
                pick_mission(state)
                if state.get('mission'):
                    add_log(room_code, f"🎯 本月小組任務「{state['mission']['name']}」：{state['mission']['desc']}（達成全員 +1 分）")
                
                # Plum rain is resolved with whatever stamina was left over from month 4,
                # so setting 1 AP aside is a real decision.
                if state['month'] == 5:
                    for p in state['players'].values():
                        if p['materials'] > 0 and p.get('progress', 0) < 4:
                            if p['ap'] >= 1:
                                p['ap'] -= 1
                                add_log(room_code, f"🌧️ 梅雨腐蝕：{p['name']} 用上個月留下的 1 AP 保護材料免於腐爛。")
                            else:
                                p['materials'] = 0
                                add_log(room_code, f"🌧️ 梅雨腐蝕：{p['name']} 上個月把體力用光了，來不及防潮，材料腐爛歸零！")
                        elif p['materials'] > 0 and p.get('progress', 0) >= 4:
                            add_log(room_code, f"🛡️ 梅雨腐蝕：{p['name']} 的材料已完成脫水乾燥，安然度過梅雨！")

                # Partial AP recovery per month (e.g. +4 AP for youth, +3 AP for elder/middle)
                for p in state['players'].values():
                    rec = p.get('ap_recovery', 3)
                    if p.get('rest_bonus_month', 0) == state['month']:
                        rec += 1
                    p['ap'] = min(p['max_ap'], p['ap'] + rec)
                    add_log(room_code, f"⚡ {p['name']} 體力恢復，增加 {rec} AP (現有: {p['ap']}/{p['max_ap']} AP)")
                    
                if state['month'] == 4:
                    add_log(room_code, "⚠️ 預告：下個月是梅雨季。持有材料的人，這個月結束前請留下 1 AP 防潮，否則材料會腐爛歸零。")

                if state['month'] == 2:
                    for p in state['players'].values():
                        if p['location'] == '山林':
                            p['location'] = '灘頭工作室'
                            add_log(room_code, f"飛魚禁令：為避免觸犯禁忌，{p['name']} 已自動退出山林，回到灘頭工作室。")
                            
                if state['month'] == 11:
                    by_loc = {}
                    for p in state['players'].values():
                        by_loc.setdefault(p['location'], []).append(p)
                    for loc, ps in by_loc.items():
                        has_learner = any(p['role'] in ('youth', 'middle') for p in ps)
                        has_elder = any(p['role'] == 'elder' for p in ps)
                        if has_learner and has_elder:
                            for p in ps:
                                if p['role'] in ('youth', 'middle'):
                                    p['kp'] += 2
                                    add_log(room_code, f"祭神月傳承：{p['name']} 獲得 2 KP")
                
                deal_events(state)

                # Record KP for new month
                for p in state['players'].values():
                    record_player_kp(p, state['month'])
                                    
        socketio.emit('state_update', state, to=room_code)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(('0.0.0.0', port))
        s.close()
    except OSError:
        if port == 5000:
            port = 5001
            print(f"⚠️ Port 5000 已被系統服務 (如 macOS AirPlay) 佔用，自動切換至連接埠 {port}。")
    print(f"Starting Server with Eventlet on http://localhost:{port} ...")
    try:
        probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        probe.connect(('10.255.255.255', 1))
        lan_ip = probe.getsockname()[0]
        probe.close()
        print(f"其他裝置請連到（要在同一個網路）： http://{lan_ip}:{port}")
    except OSError:
        pass
    socketio.run(app, host='0.0.0.0', port=port)

