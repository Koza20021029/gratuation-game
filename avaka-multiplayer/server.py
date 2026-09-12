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

def create_initial_state(room_code):
    return {
        'room_code': room_code,
        'started': False,
        'month': 1,
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
        "text": "這艘船是活的。不僅僅一種比喻，而是真的活著。你花了整整一年，跟著走過祖先的同一條山路，身體記住了採集時該繞開哪棵樹、Avaka的纖維要朝哪個方向捻才不會斷。這些動作可能沒有被文字記錄，卻藏在族人身體的記憶之中，等待被喚醒。<br><br>後來，透過科學資料，證實了Avaka 纖維吸水之後會膨脹。你忽然明白，老人說「讓船呼吸」不只是一種想像，是造船的學問。當海水滲進縫隙，纖維膨脹後，船反而變得更緊實。可以拆，可以修，可以一塊一塊換掉，再一次出海。<br><br>那些你以為早已斷裂的記憶，其實只是靜靜地等著願意承接的人。<br><br>而這艘船會繼續航行，帶著耆老們說過的話，也帶著你找回的那些記憶。"
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
    'elder':  {'name': '資深工匠 (耆老)', 'max_ap': 4, 'ap_recovery': 3, 'kp': 10, 'score': 0},
    'youth':  {'name': '文化青年',      'max_ap': 6, 'ap_recovery': 4, 'kp': 0,  'score': 0},
    'middle': {'name': '中生代',        'max_ap': 5, 'ap_recovery': 3, 'kp': 5,  'score': 0}
}


MONTH_RULES = [
    {"month": 1, "name": "Kashyman", "desc": "準備月：移動不消耗 AP。"},
    {"month": 2, "name": "Kapowan", "desc": "飛魚禁令：禁止進入山林（會被強制退回灘頭），無法執行採集動作。"},
    {"month": 3, "name": "Pikaokaod", "desc": "捕撈飛魚盛期：在灘頭工作室執行「剝麻」與「搓繩」動作，AP 消耗減少 1 點。"},
    {"month": 4, "name": "Papataw", "desc": "男人勤於出海：青年向長老「請益」的消耗增至 4 AP（原為 3），協商者增至 2 AP（原為 1）。"},
    {"month": 5, "name": "Pipilapila", "desc": "梅雨季節：回合開始時，若持有材料且「未完成工序④乾燥」，需扣除 1 AP 防潮；否則材料腐爛歸零。"},
    {"month": 6, "name": "Apiya vehan", "desc": "好月節：執行最終「填縫」動作（完成造船）時，總分額外加 2 分。"},
    {"month": 7, "name": "Pehhakow", "desc": "解禁重啟：山林解禁，執行「採集」動作（消耗 3 AP）可獲得 2 份材料（原為 1 份）。"},
    {"month": 8, "name": "Pitanatana", "desc": "土器月：購買工業材料後執行「科技轉譯」時必定成功，無須進行機率檢定。"},
    {"month": 9, "name": "Kalimman", "desc": "飛魚終食祭：商店內所有物品購買價格翻倍（材料由 3 KP 變為 6 KP）。"},
    {"month": 10, "name": "Kaneman", "desc": "禁忌之月：嚴禁執行「填縫」動作（無法在該月份完成造船）。"},
    {"month": 11, "name": "Kapitowan", "desc": "祭神月：回合開始時，若青年/協商者與長老處於同一個地點，可自動獲得 2 點 KP。"},
    {"month": 12, "name": "Kaowan", "desc": "手工藝月：在灘頭工作室執行「搓繩」動作消耗 0 AP（原為 1 AP）。"}
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
                    del state['players'][sid]
                    add_log(room_code, f"{p_name} 斷線了")
                    if len(state['players']) == 0:
                        del rooms[room_code]
                    else:
                        state_copy = dict(state)
                        socketio.emit('state_update', state_copy, to=room_code)
            del player_rooms[sid]

@socketio.on('create_room')
def handle_create_room(data):
    name = data.get('name')
    role = data.get('role')
    if role not in ROLES: return
    if not name or not name.strip(): return
    
    with state_lock:
        room_code = generate_room_code()
        rooms[room_code] = create_initial_state(room_code)
        _join_player_to_room(request.sid, name.strip(), role, room_code, data.get('avatar'))

@socketio.on('rejoin_game')
def handle_rejoin(data):
    old_id = data.get('old_id')
    room_code = data.get('room_code')
    new_id = request.sid
    with state_lock:
        if room_code in rooms:
            state = rooms[room_code]
            if old_id in state['players']:
                # Migrate player data to new socket ID
                player_data = state['players'].pop(old_id)
                player_data['id'] = new_id
                state['players'][new_id] = player_data
                player_rooms[new_id] = room_code
                
                # Rejoin socket room
                join_room(room_code)
                emit('state_update', state, to=room_code)

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
                    if len(state['players']) == 0:
                        del rooms[room_code_to_leave]
                        room_code_to_leave = None  # No need to broadcast
                    else:
                        state_to_broadcast = dict(state)
            del player_rooms[sid]
    
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
        for p in state['players'].values():
            role_info = ROLES[p['role']]
            p['ap'] = role_info['max_ap']
            p['max_ap'] = role_info['max_ap']
            p['ap_recovery'] = role_info['ap_recovery']
            p['kp_history'] = [{'month': 1, 'kp': p['kp']}]
            p['path_choice'] = 'none'
            p['last_step_month'] = 0
        add_log(room_code, "遊戲開始！第 1 個月：Kashyman")
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
        if not player or player['finished']: return

        action = data.get('type')
        target = data.get('target')
        month = state['month']

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
            if player['role'] == 'youth' or month == 1:
                cost = 0
            if consume_ap(cost):
                player['location'] = target
                add_log(room_code, f"{player['name']} 移動到了 {target}")

        elif action == 'craft':
            step = data.get('step')
            cost = 3
            if month == 3: cost -= 1  # Month 3 discount applies to all steps

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
                    if consume_ap(cost):
                        amount = 2 if month == 7 else 1
                        player['materials'] += amount
                        if player['progress'] == 0:
                            player['progress'] = 1
                            player['last_step_month'] = month
                            add_log(room_code, f"{player['name']} 完成了 ①砍伐剝皮 ipana'ape (獲得 {amount} 份材料)")
                        else:
                            add_log(room_code, f"{player['name']} 執行了砍伐剝皮，獲得了 {amount} 份材料")

                elif step == 'rub' and player['progress'] == 1:
                    if player['materials'] < 1:
                        emit('error', {'msg': '懸掛摩擦軟化需要 1 份材料'})
                        return
                    if consume_ap(cost):
                        player['materials'] -= 1
                        player['progress'] = 2
                        player['last_step_month'] = month
                        add_log(room_code, f"{player['name']} 完成了 ②懸掛摩擦軟化 (消耗 1 份材料)")

                elif step == 'strip' and player['progress'] == 2:
                    if player['materials'] < 1:
                        emit('error', {'msg': '劃痕撕絲需要 1 份材料'})
                        return
                    if consume_ap(cost):
                        player['materials'] -= 1
                        player['progress'] = 3
                        player['last_step_month'] = month
                        add_log(room_code, f"{player['name']} 完成了 ③劃痕撕絲 chingdasan (消耗 1 份材料)")

            # ---- Steps 4-6: Beach Workshop steps ----
            elif step in ('dry', 'twine', 'caulk'):
                if player['location'] != '灘頭工作室':
                    emit('error', {'msg': '曝曬乾燥、捻繩理線與填縫完工工序必須在灘頭工作室執行！'})
                    return
                if player.get('last_step_month', 0) >= month:
                    emit('error', {'msg': '纖維需在灘頭晾曬乾燥至少 1 個月！請等待下個月節氣成熟後再執行下一工序。'})
                    return

                if step == 'dry' and player['progress'] == 3:
                    if player['materials'] < 1:
                        emit('error', {'msg': '曝曬乾燥需要 1 份材料'})
                        return
                    if consume_ap(cost):
                        player['materials'] -= 1
                        player['progress'] = 4
                        player['last_step_month'] = month
                        add_log(room_code, f"{player['name']} 完成了 ④脫水曝曬乾燥 (消耗 1 份材料)")

                elif step == 'twine' and player['progress'] == 4:
                    if player['materials'] < 1:
                        emit('error', {'msg': '理線捻繩需要 1 份材料'})
                        return
                    if player['kp'] < 3:
                        emit('error', {'msg': '理線捻繩需要 3 KP（傳統搓捻技藝）'})
                        return
                    if month == 12: cost = 0
                    if consume_ap(cost):
                        player['materials'] -= 1
                        player['progress'] = 5
                        player['last_step_month'] = month
                        add_log(room_code, f"{player['name']} 完成了 ⑤理線捻繩 kolili (消耗 1 份材料)")

                elif step == 'caulk' and player['progress'] == 5:
                    if month == 10:
                        emit('error', {'msg': '禁忌之月：這是專門製作貝灰的月份，即便材料已齊備，現在也絕不能動工填縫！'})
                        return
                    if player['kp'] < 8:
                        emit('error', {'msg': '填縫完工需要 8 KP（Mamaruk / tumbek su varuk）'})
                        return
                    if player['materials'] < 1:
                        emit('error', {'msg': '填縫完工需要 1 份材料'})
                        return

                    if player['role'] == 'elder': cost = 0

                    if consume_ap(cost):
                        player['materials'] -= 1
                        player['progress'] = 6
                        player['finished'] = True
                        player['path_choice'] = 'traditional'
                        player['last_step_month'] = month

                        score = 15 + 5  # Base + guarantee
                        if month == 6: score += 2
                        player['score'] += score
                        player['score_breakdown'].append(f"傳統 Avaka (+{score})")
                        add_log(room_code, f"{player['name']} 完美傳承了造船技術！獲得 {score} 分")

        elif action == 'buy':
            if player['location'] != '商店':
                emit('error', {'msg': '必須在商店'})
                return
            if player['progress'] < 3:
                emit('error', {'msg': '必須至少在山林完成三道工序（砍伐→軟化→撕絲），才能使用工業樹脂加工填縫！'})
                return
            if player['materials'] < 2:
                emit('error', {'msg': '購買工業樹脂完工需要至少 2 份材料！'})
                return
            if player.get('last_step_month', 0) >= month:
                emit('error', {'msg': '傳統纖維需先完成山林三道工序，晾曬至少 1 個月才能進行樹脂加工！'})
                return

            cost = 4 if month == 9 else 3
            if consume_ap(cost):
                player['materials'] -= 2
                player['industrial'] = True
                player['path_choice'] = 'industrial'
                player['progress'] = 6
                player['finished'] = True
                player['last_step_month'] = month

                score = 5
                if player['role'] == 'middle':
                    score += 5
                else:
                    score -= 5

                player['score'] += score
                player['score_breakdown'].append(f"工業材料 ({score})")
                add_log(room_code, f"{player['name']} 使用現代材料完工，文化流失了...")

        elif action == 'ask':
            if player['role'] not in ['youth', 'middle']: return
            
            is_youth = player['role'] == 'youth'
            base_cost = 3 if is_youth else 1
            cost = (base_cost + 1) if month == 4 else base_cost
            
            if consume_ap(cost):
                kp_gain = 3 if is_youth else 1
                player['kp'] += kp_gain
                player['score'] += 1
                player['score_breakdown'].append("請益長老 (+1)")
                add_log(room_code, f"{player['name']} 向長老請益，獲得 {kp_gain} KP 與 1 點文化積分")
                # give elder score
                for p in state['players'].values():
                    if p['role'] == 'elder' and p['id'] != player['id']:
                        p['score'] += 1
                        p['score_breakdown'].append("傳承指導 (+1)")
                        add_log(room_code, f"{p['name']} 因傳承指導獲得 1 分")

        elif action == 'teach':
            if player['role'] != 'elder': return
            target_id = data.get('target_id')
            target_p = state['players'].get(target_id)
            if target_p and consume_ap(2):
                target_p['kp'] += 1
                player['score'] += 1
                player['score_breakdown'].append("遠程指導 (+1)")
                add_log(room_code, f"{player['name']} 遠程指導了 {target_p['name']}，獲得 1 分傳承分數")

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
            if consume_ap(1):
                player['materials'] -= 1
                target_p['materials'] += 1
                add_log(room_code, f"🤝 {player['name']} 消耗了 1 AP，將 1 份材料送給了 {target_p['name']}！")

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

                if success:
                    score = 4
                    player['score'] += score
                    player['materials'] += 2
                    player['score_breakdown'].append(f"科學轉譯 (+{score})")
                    add_log(room_code, f"🔬 {player['name']} 成功對傳統工藝進行「科學轉譯」！解鎖工藝數據，獲得 +4 分與 2 份材料！")
                else:
                    add_log(room_code, f"🔬 {player['name']} 嘗試對工藝進行「科學轉譯」，但實驗數據不足未果...")

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
            
            state['month'] += 1
            if state['month'] > 12:
                state['started'] = False
                add_log(room_code, "一年結束，遊戲結算！")
                for p in state['players'].values():
                    if not p['finished']:
                        p['ending'] = ENDINGS['tier5']
                    elif p['score'] >= 18:
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
                
                # Partial AP recovery per month (e.g. +4 AP for youth, +3 AP for elder/middle)
                for p in state['players'].values():
                    rec = p.get('ap_recovery', 3)
                    p['ap'] = min(p['max_ap'], p['ap'] + rec)
                    add_log(room_code, f"⚡ {p['name']} 體力恢復，增加 {rec} AP (現有: {p['ap']}/{p['max_ap']} AP)")
                    
                if state['month'] == 2:
                    for p in state['players'].values():
                        if p['location'] == '山林':
                            p['location'] = '灘頭工作室'
                            add_log(room_code, f"飛魚禁令：為避免觸犯禁忌，{p['name']} 已自動退出山林，回到灘頭工作室。")
                            
                if state['month'] == 5:
                    for p in state['players'].values():
                        if p['materials'] > 0 and p.get('progress', 0) < 4:
                            if p['ap'] >= 1:
                                p['ap'] -= 1
                                add_log(room_code, f"🌧️ 梅雨腐蝕：{p['name']} 消耗 1 AP 保護灘頭的材料免於腐爛。")
                            else:
                                p['materials'] = 0
                                add_log(room_code, f"🌧️ 梅雨腐蝕：{p['name']} 未及時保護，曝曬中的材料腐爛歸零了！")
                        elif p['materials'] > 0 and p.get('progress', 0) >= 4:
                            add_log(room_code, f"🛡️ 梅雨腐蝕：{p['name']} 的材料已完成脫水乾燥，安然度過梅雨！")

                if state['month'] == 11:
                    by_loc = {}
                    for p in state['players'].values():
                        by_loc.setdefault(p['location'], []).append(p)
                    for loc, ps in by_loc.items():
                        has_youth = any(p['role'] == 'youth' for p in ps)
                        has_elder = any(p['role'] == 'elder' for p in ps)
                        if has_youth and has_elder:
                            for p in ps:
                                if p['role'] == 'youth':
                                    p['kp'] += 2
                                    add_log(room_code, f"祭神月傳承：{p['name']} 獲得 2 KP")
                
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
    socketio.run(app, host='0.0.0.0', port=port)

