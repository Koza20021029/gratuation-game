const socket = io({
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    timeout: 20000,
    transports: ['websocket', 'polling']
});
// Removed mermaid

// ── Vanilla TextType Component for Premium Cinematic Titles ─────────────────
class TextType {
    constructor(element, options = {}) {
        this.element = element;
        this.text = options.text || '';
        this.typingSpeed = options.typingSpeed !== undefined ? options.typingSpeed : 50;
        this.initialDelay = options.initialDelay !== undefined ? options.initialDelay : 0;
        this.pauseDuration = options.pauseDuration !== undefined ? options.pauseDuration : 2000;
        this.deletingSpeed = options.deletingSpeed !== undefined ? options.deletingSpeed : 30;
        this.loop = options.loop !== undefined ? options.loop : true;
        this.showCursor = options.showCursor !== undefined ? options.showCursor : true;
        this.cursorCharacter = options.cursorCharacter || '|';
        this.textColors = options.textColors || [];
        this.variableSpeed = options.variableSpeed || null;
        this.reverseMode = options.reverseMode || false;
        
        this.textArray = Array.isArray(this.text) ? this.text : [this.text];
        this.displayedText = '';
        this.currentCharIndex = 0;
        this.isDeleting = false;
        this.currentTextIndex = 0;
        this.timeoutId = null;
        
        this.isSpacedMode = this.element.classList.contains('glow-text');
        
        this.init();
    }
    
    init() {
        this.element.innerHTML = '';
        this.element.classList.add('text-type');
        
        if (!this.isSpacedMode) {
            this.contentEl = document.createElement('span');
            this.contentEl.className = 'text-type__content';
            this.element.appendChild(this.contentEl);
        }
        
        if (this.showCursor) {
            this.cursorEl = document.createElement('span');
            this.cursorEl.className = 'text-type__cursor';
            this.cursorEl.textContent = this.cursorCharacter;
            
            // Cursor base styling
            this.cursorEl.style.marginLeft = '0.15rem';
            this.cursorEl.style.display = 'inline-block';
            this.cursorEl.style.animation = 'text-type-blink 0.8s infinite alternate ease-in-out';
            this.cursorEl.style.fontWeight = 'bold';
            
            if (!this.isSpacedMode) {
                this.element.appendChild(this.cursorEl);
            }
            
            if (!document.getElementById('text-type-blink-style')) {
                const style = document.createElement('style');
                style.id = 'text-type-blink-style';
                style.textContent = `
                    @keyframes text-type-blink {
                        0%, 30% { opacity: 1; }
                        70%, 100% { opacity: 0; }
                    }
                    .text-type {
                        display: inline-block;
                        white-space: pre-wrap;
                    }
                    .text-type__cursor {
                        transition: color 0.3s ease, text-shadow 0.3s ease;
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        setTimeout(() => {
            this.tick();
        }, this.initialDelay);
    }
    
    getRandomSpeed() {
        if (!this.variableSpeed) return this.typingSpeed;
        const { min, max } = this.variableSpeed;
        return Math.random() * (max - min) + min;
    }
    
    updateColors(color) {
        if (this.showCursor && this.cursorEl) {
            this.cursorEl.style.color = color;
            this.cursorEl.style.textShadow = `0 0 15px ${color}`;
        }
        if (!this.isSpacedMode && this.contentEl) {
            this.contentEl.style.color = color;
            this.contentEl.style.textShadow = `0 0 25px ${color}`;
        }
    }
    
    tick() {
        const currentText = this.textArray[this.currentTextIndex];
        const processedText = this.reverseMode ? currentText.split('').reverse().join('') : currentText;
        
        const color = this.textColors.length > 0 
            ? this.textColors[this.currentTextIndex % this.textColors.length] 
            : 'inherit';
        
        this.updateColors(color);
        
        if (this.isDeleting) {
            if (this.displayedText === '') {
                this.isDeleting = false;
                if (this.currentTextIndex === this.textArray.length - 1 && !this.loop) {
                    return;
                }
                this.currentTextIndex = (this.currentTextIndex + 1) % this.textArray.length;
                this.currentCharIndex = 0;
                this.timeoutId = setTimeout(() => this.tick(), this.pauseDuration);
            } else {
                this.displayedText = this.displayedText.slice(0, -1);
                
                if (this.isSpacedMode) {
                    const spans = Array.from(this.element.querySelectorAll('span:not(.text-type__cursor)'));
                    if (spans.length > 0) {
                        spans[spans.length - 1].remove();
                        const newSpans = Array.from(this.element.querySelectorAll('span:not(.text-type__cursor)'));
                        if (newSpans.length > 0 && this.showCursor && this.cursorEl) {
                            newSpans[newSpans.length - 1].appendChild(this.cursorEl);
                        } else if (this.showCursor && this.cursorEl) {
                            this.element.appendChild(this.cursorEl);
                        }
                    }
                } else {
                    this.contentEl.textContent = this.displayedText;
                }
                
                this.timeoutId = setTimeout(() => this.tick(), this.deletingSpeed);
            }
        } else {
            if (this.currentCharIndex < processedText.length) {
                const char = processedText[this.currentCharIndex];
                this.displayedText += char;
                
                if (this.isSpacedMode) {
                    const charSpan = document.createElement('span');
                    charSpan.textContent = char;
                    charSpan.style.color = color;
                    charSpan.style.textShadow = `0 0 35px ${color}`;
                    charSpan.style.opacity = '0';
                    charSpan.style.transform = 'scale(0.85)';
                    charSpan.style.transition = 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.2)';
                    
                    if (this.showCursor && this.cursorEl) {
                        if (this.cursorEl.parentNode) {
                            this.cursorEl.remove();
                        }
                        charSpan.appendChild(this.cursorEl);
                    }
                    
                    this.element.appendChild(charSpan);
                    
                    requestAnimationFrame(() => {
                        charSpan.style.opacity = '1';
                        charSpan.style.transform = 'scale(1)';
                    });
                } else {
                    this.contentEl.textContent = this.displayedText;
                }
                
                this.currentCharIndex++;
                const speed = this.variableSpeed ? this.getRandomSpeed() : this.typingSpeed;
                this.timeoutId = setTimeout(() => this.tick(), speed);
            } else {
                if (!this.loop && this.currentTextIndex === this.textArray.length - 1) {
                    return;
                }
                this.timeoutId = setTimeout(() => {
                    this.isDeleting = true;
                    this.tick();
                }, this.pauseDuration);
            }
        }
    }
    
    destroy() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    }
}

// ── Translation Mapping for Chinese & English Cover Page ────────────────────
let currentLang = 'zh';
let taglineInstance = null;

const AVATAR_ROLE_LABELS = {
    zh: {
        elder: '資深工匠 — 為你的角色打造專屬外型',
        youth: '文化復振青年 — 為你的角色打造專屬外型',
        middle: '中生代 — 為你的角色打造專屬外型'
    },
    en: {
        elder: 'Elder Artisan — Customize your own character appearance',
        youth: 'Young Apprentice (Youth) — Customize your own character appearance',
        middle: 'Middle Generation — Customize your own character appearance'
    }
};

const endingTranslations = {
    "【傳承之靈】活著的拼板舟": {
        title: "【Spirit of Heritage】The Living Plank Boat",
        text: "This boat is alive. Not merely as a metaphor, but truly living. You spent a whole year walking the same mountain paths as your ancestors. Your body remembers which tree to bypass when gathering, and which direction to twine the Avaka fibers so they won't snap. These actions might not be written down in books, but they are stored in the physical memory of the tribe, waiting to be awakened.<br><br>Later, scientific data confirmed that Avaka fibers expand when they absorb water. You suddenly realize that the elders' saying about 'letting the boat breathe' is not just imagination, but true shipbuilding science. When seawater seeps into the seams and the fibers swell, the boat actually becomes tighter and sturdier. It can be dismantled, repaired, and replaced piece by piece to set sail once more.<br><br>The memories you thought were broken were actually just waiting quietly for someone willing to inherit them.<br><br>And this boat will continue to sail, carrying the words spoken by the elders, and the memories you have reclaimed."
    },
    "【協商之光】時代的橋樑": {
        title: "【Light of Negotiation】Bridge of the Era",
        text: "You know very well that you cannot live solely in the past.<br><br>Children need schooling, fuel bills need to be paid, and time waits for no one. Under these real-life pressures, you tried to find a middle ground. A few pieces of industrial materials saved some effort, but you did not give up. You still knocked on the Elder's door, and you still asked the questions that no one would answer unless asked: how to choose materials, which steps cannot be skipped, and what taboos exist.<br><br>When the boat was completed, you couldn't quite tell if it was traditional or modern. But perhaps that is the most honest answer. Lanyu is not a museum; people live real lives here, and tradition is always rubbing, wearing down, and growing into new shapes in real life.<br><br>This boat carries the smell of industry, but also the wisdom of the elders. It is not perfect, but it was built by people living in this era."
    },
    "【效率之重】工業的餘溫": {
        title: "【Weight of Efficiency】Warmth of Industry",
        text: "The boat is finished. But something has been quietly lost.<br><br>Industrial glue sealed the seams perfectly. You didn't need to wait for the wood to expand, nor did you need to watch the calendar for the seasons; you saved most of your time. When the boat was launched, it looked no different from any other.<br><br>It's just that once it's broken, it can't be repaired. The traditional interlocking joints, and the possibility of taking it apart and rebuilding it, have disappeared along with the steps you chose to skip.<br><br>Your fingers have forgotten too. They forgot the resistance of the fibers moving back and forth, and they forgot how to identify wood species. It didn't happen overnight, but rather slipped away little by little, at every moment you chose convenience.<br><br>This boat works, but it cannot teach you anything. It is merely a commodity of the times."
    },
    "【失落之魂】斷裂的鏈條": {
        title: "【Lost Soul】Broken Chain",
        text: "The boat has been launched. You should feel accomplished, but inside you feel empty.<br><br>You never went to the mountains to gather Avaka, so you don't know what to say during gathering, or which days to avoid. You bypassed all the parts that seemed troublesome, and you also bypassed everything that truly mattered.<br><br>This boat has no connection to the sea, nor to the mountains. It is only a shape, a prop for tourists to take photos with. No one will want to repair it; when it breaks, it will be thrown away, and a new one will be made.<br><br>The songs sung during gathering, the physical knowledge that the elders said could only be understood by doing—these were not opposed by you, but ignored. Things that are ignored disappear more quietly and are harder to reclaim than things that are destroyed.<br><br>It is no one's fault. It is just the quiet, inevitable result of the era's progression."
    },
    "【文化斷裂】遺失的時間": {
        title: "【Cultural Disruption】Lost Time",
        text: "A year has passed, and the timber on the beach remains scattered.<br><br>You never started, as if stuck somewhere. Perhaps you didn't know who to ask for the next step, or perhaps you took too many detours. Day by day, time passed, and you were still not ready.<br><br>It takes a whole year for a boat to be born, not because the steps are so complex, but because it must follow the seasons: gathering, drying, waiting, and trimming. When your rhythm does not align with this pace, the boat stops there, waiting for a time that will never come.<br><br>Those fibers will rot. And the technical knowledge that has not yet been spoken will fade away along with the people who hold the memories.<br><br>It is no one's fault. It is simply the inevitable outcome as the era moves forward."
    }
};

const translations = {
    zh: {
        title: ['島', '嶼', '的', '維', '度'],
        tagline: [
            '— 活著的拼板舟 —',
            '— 飛魚季的低喃 —',
            '— 傳承者的試煉 —',
            '— 與時序順應的旅程 —'
        ],
        placeholderName: '輸入你的名字...',
        roleLabel: '選擇你的角色定位',
        roles: {
            elder: {
                title: '資深工匠<br><span style="font-size:0.8rem; font-weight:normal; opacity:0.8;">(耆老)</span>',
                badgeAp: 'AP 6 (+5/月)',
                badgeKp: 'KP 10',
                desc: '填縫專家<br>遠程指導'
            },
            youth: {
                title: '文化復振青年<br><span style="font-size:0.8rem; font-weight:normal; opacity:0.8;">(青年)</span>',
                badgeAp: 'AP 8 (+6/月)',
                badgeKp: 'KP 0',
                desc: '快速移動<br>學徒請益'
            },
            middle: {
                title: '中生代<br><span style="font-size:0.8rem; font-weight:normal; opacity:0.8;">(中生代工匠)</span>',
                badgeAp: 'AP 7 (+5/月)',
                badgeKp: 'KP 5',
                desc: '學得快、傳得快<br>擅長轉化'
            }
        },
        placeholderRoom: '輸入 4 碼序號',
        joinBtn: '加入房間',
        createBtn: '自己開新房',
        rulesBtn: '查看遊戲規則與流程',
        waitingTitle: '等候大廳',
        waitingRoomLabel: '專屬房間代碼',
        waitingDesc: '請將上方的代碼分享給好友，讓他們輸入以加入此遊戲！',
        startBtn: '開始遊戲',
        leaveBtn: '退出房間',
        avatar: {
            title: '✨ 創建你的專屬 3D 角色',
            dragTip: '🖱 拖曳旋轉 · 滾輪縮放',
            backBtn: '返回',
            confirmBtn: '✅ 確認並進入房間',
            labels: {
                skin: '🎨 膚色',
                hair: '💇 髮型',
                hairColor: '🪮 髮色',
                eye: '👁 瞳孔顏色',
                face: '👤 臉型',
                accessory: '🛡 雅美／達悟族禮儀配件',
                accessorySub: '僅祭典（飛魚祭、大船下水）時配戴',
                cloth: '👕 雅美／達悟族服飾',
                clothSub: '傳統以白、黑、藍色為主，忌用鮮豔色彩'
            },
            skinTitles: {
                '#C68642': '標準膚色',
                '#A0622A': '深古銅色',
                '#8D5524': '深棕色',
                '#6B3F1F': '深色'
            },
            hairOptions: {
                short: '短直髮',
                long: '長直髮',
                bun: '束髻',
                bald: '光頭'
            },
            hairColorTitles: {
                '#0d0d0d': '烏黑（雅美／達悟族傳統）',
                '#2a1a0a': '深棕黑',
                '#5a3a1a': '棕色',
                '#c8c8c8': '銀白（耆老）'
            },
            eyeTitles: {
                '#2a1a08': '深棕（最常見）',
                '#4a2e10': '棕色',
                '#7a4820': '琥珀棕',
                '#1a1a1a': '深黑'
            },
            faceOptions: {
                round: '圓潤臉',
                square: '寬顎臉',
                slim: '清秀臉'
            },
            poseLabel: '🕺 動作',
            poseOptions: { stand: '站立', wave: '揮手', hips: '叉腰', cross: '抱胸', fist: '舉拳' },
            expressionLabel: '🙂 表情',
            expressionOptions: { smile: '微笑', calm: '平靜', determined: '堅毅' },
            accessoryOptions: {
                none: '無',
                silver_helmet: '銀盔',
                rattan_helmet: '藤盔',
                chest_ornament: '胸飾'
            },
            accessoryTitles: {
                silver_helmet: '銀盔：雅美／達悟族最神聖禮器，銀片打造成圓錐狀',
                rattan_helmet: '藤盔：傳統編織藤帽，由省藤條緊密圈編而成',
                chest_ornament: '半月形胸飾：象徵社會地位與成就'
            },
            clothOptions: {
                loincloth: '丁字褲',
                vest_dark: '藍白背心',
                rattan_armor: '藤甲',
                ceremony: '祭典全裝'
            }
        },
        game: {
            sidebarHeader: '👥 部落工匠狀態',
            logsHeader: '📜 部落記事',
            chatHeader: '💬 部落頻道',
            chatPlaceholder: '與島民交流...',
            chatSendBtn: '傳送',
            leaveGameBtn: '退出遊戲',
            leaveConfirm: '確定要退出遊戲嗎？',
            steps: ['尚未開始', '①已砍伐剝皮', '②已摩擦軟化', '③已撕絲剝離', '④已曝曬乾燥', '⑤已理線撚繩', '✅ ⑥已填縫完工'],
            meTag: '你',
            giveBtn: '🎁 贈材料 (0 AP)',
            ap: 'AP:',
            kp: 'KP:',
            mat: '材:',
            progressLabel: '進度',
            emptyLoc: '無人在此',
            statusLabels: ['剩餘 AP', 'KP 點數', '持有材料', '造船進度', '總得分'],
            readyBtnReady: '取消準備 (等候其他玩家...)',
            readyBtnNotReady: '準備進入下個月',
            askBtn: '🙏 向耆老請益 <span style="font-size:0.8rem;opacity:0.7;font-weight:normal;">(3 AP → 獲 3 KP · +1 分)</span>',
            askElderTitle: '🙏 向耆老請益',
            askMiddleTitle: '🤝 向中生代請益',
            askGiftNote: '🎁 帶禮',
            scoreUnit: '分',
            helpBtn: '💪 幫忙長者 <span style="font-size:0.8rem;opacity:0.7;font-weight:normal;">(1 AP → 耆老回復 2 AP · +1 分)</span>',
            giveElderBonus: ' · +1 分',
            scoreLogLabel: '得分紀錄',
            noScoreYet: '尚未得分',
            teachLabel: '選擇學徒',
            teachBtn: '💡 遠程指導 <span style="font-size:0.8rem;opacity:0.7;font-weight:normal;">(2 AP → 他人獲 1 KP · +1 分)</span>',
            locations: {
                '山林': {
                    name: '🌲 山林',
                    badge: '資源區',
                    desc: '採集 Avaka 假莖與蘭嶼花椒的區域（前三道工序在此執行）',
                    moveBtn: '移動至此 (1 AP)',
                    steps: {
                        chop: "① 砍伐剝皮 ipana'ape (3 AP | 產出材料)",
                        rub: '② 懸掛摩擦軟化 (3 AP | 需 1 材料 + 跨月)',
                        strip: '③ 劃痕撕絲 chingdasan (3 AP | 需 1 材料 + 跨月)'
                    }
                },
                '灘頭工作室': {
                    name: '🛖 灘頭工作室',
                    badge: '工藝核心',
                    desc: '纖維加工與最終造船工序的執行區域（後三道工序在此執行）',
                    moveBtn: '移動至此 (1 AP)',
                    steps: {
                        dry: '④ 脫水曝曬乾燥 (3 AP | 需 1 材料)',
                        twine: '⑤ 理線撚繩 oviden (3 AP | 需 3 KP + 1 材料 + 跨月乾燥)',
                        caulk: '⑥ 填縫完工 Mamaruk (3 AP | 需 8 KP + 1 材料 + 跨月乾燥)'
                    }
                },
                '商店': {
                    name: '🏬 現代化商店',
                    badge: '工業區',
                    desc: '這裡有現成的工業材料，也有可以加工天然纖維的機器',
                    moveBtn: '移動至此 (1 AP)',
                    buyBtn: '🧴 工業樹脂完工 (3 AP | 需 2 材料 + 山林前三道工序 + 跨月 → +5 分)',
                    machineBtn: '⚙️ 機器加工 Avaka 纖維完工 (3 AP | 需 5 KP + 2 材料 + 山林前三道工序 + 跨月 → +12 分)'
                }
            }
        },
        rulesHtml: `
            <h2>📜 遊戲規則介紹與流程</h2>
            <div class="rules-scroll-area custom-scrollbar">
                <p><strong>《Avaka：島嶼的維度》</strong> 是一款關於蘭嶼傳統造船與文化選擇的多人合作與競合遊戲。您將扮演雅美／達悟族的工匠，必須在 12 個月（回合）內完成一艘拼板舟。完工的方式有三種，沒有標準答案，但每一種都有它的結果；未在期限內完工則視為失敗。</p>

                <h3>🎯 體力、知識與得分</h3>
                <ul>
                    <li><strong>⚡ 行動點數 (AP) 與每月恢復：</strong> AP 代表體力與時間。六道工序各 3 AP（耆老執行⑥填縫 0 AP）、移動 1 AP（青年免費）、贈送材料 0 AP、幫忙長者 1 AP、科學轉譯 2 AP、遠程指導 2 AP，請益依對象 1 至 3 AP。每個月初只恢復一部分體力（青年 +6、中生代與耆老 +5，不超過上限）。</li>
                    <li><strong>💡 技術點數 (KP)：</strong> 代表對傳統工藝的理解，要向人請益才會增加。⑤理線撚繩需 3 KP，⑥填縫完工需 8 KP，機器加工需 5 KP。</li>
                    <li><strong>🙏 請益（向誰學，學到的不一樣）：</strong> 向<b>耆老</b>請益：青年 3 AP、中生代 2 AP，都獲得 3 KP，請益者與耆老<b>各 +1 分</b>。青年向<b>中生代</b>請益：1 AP 獲得 2 KP，<b>雙方各 +1 分</b>；中生代傳得快，但青年的 KP 必須低於該中生代才能問，更深的知識還是要找耆老。耆老也可以「遠程指導 (2 AP)」，對象 +1 KP，耆老 <b>+1 分</b>。請益與指導的加分，每人每月最多計 2 次；超過之後照樣得到 KP，只是不再加分。</li>
                    <li><strong>🎁 回饋與幫忙（傳統教養）：</strong> 把材料「贈送」給耆老，贈送者 <b>+1 分</b>（每月計 1 次），而且當月向耆老請益可<b>多得 1 KP</b>（帶禮請益）。與耆老在同一地點時可以「幫忙長者 (1 AP)」：耆老回復 2 AP，自己 <b>+1 分</b>（每月 1 次）。6 月好月節這兩種得分加倍。</li>
                    <li><strong>🔬 科學轉譯：</strong> 消耗 2 AP 與 2 KP，成功率 = 50% + 扣除後的 KP×5%（中生代再 +20%）；<b>第 8 個月 (Pitanatana 土器月) 必定成功</b>。成功獲得 <b>+4 分</b>與 <b>2 份材料</b>。</li>
                    <li><strong>⏳ 跨月等待：</strong> 除了「①砍伐剝皮」可以在同一個月重複執行外，每完成一道工序都要等到<b>下一個月</b>才能做下一道（12 月的⑤與⑥例外，可以接連完成）。最快也要到 7 月才能完工。</li>
                    <li><strong>🌿 材料：</strong> 在山林執行「①砍伐剝皮」產出材料（每次 1 份，1 月與 7 月 2 份），工序②至⑥各消耗 1 份。</li>
                    <li><strong>🌳 森林狀態：</strong> 全房間共用，0 到 5，開局 3。這個月有人上山「①砍伐剝皮」、照顧林地，森林就 +1；整個月沒有人上山就 −1（2 月封山不計）。森林降到 1 以下時，砍伐多耗 1 AP；結算時森林在 4 以上，所有人 +2 分。因為需要材料，所以會去照顧山林；大家都不上山，森林就會老化。</li>
                    <li><strong>🎯 每月小組任務與徽章：</strong> 每個月系統會抽一個全組一起完成的任務（例如「本月有人送材料給耆老」），達成後所有人 <b>+1 分</b>，任務顯示在畫面上方。第一次做到某些事會得到徽章，年終會頒發稱號；徽章與稱號不加分。</li>
                    <li><strong>🎲 更多可以做的事：</strong> <b>請益小問答</b>：請益後會出一題三選一，答對多得 1 KP，答錯沒有損失（答案都在知識庫裡）。<b>事件卡</b>：2、3、6、8、10、11 月每個人會收到一張二選一的事件卡。<b>講述</b>（耆老，2 AP，每月 1 次）：和耆老在同一個地點的青年與中生代各 +1 KP（2 月與 10 月 +2 KP），耆老 +1 分。<b>補種 Avaka</b>（山林，1 AP，每月 1 次）：算作有人照顧林地，下個月起第一次砍伐多得 1 份材料。<b>搭把手</b>（同地點，1 AP）：隊友本月下一道工序少 2 AP，自己 +1 分（每月計 1 次）。<b>工序小遊戲</b>：做完工序後抓準時機按下，成功退回 1 AP，可以跳過。</li>
                    <li><strong>📅 曆法禁忌：</strong> 依循蘭嶼 12 個月的夜曆，例如 2 月封山不能進山林、4 月底要留 1 AP 準備梅雨、9 月不能在商店完工、10 月任何方式都不能完工。每個月的效果會顯示在畫面上方。</li>
                </ul>

                <h3>👤 角色能力介紹</h3>
                <ul>
                    <li><strong>👑 資深工匠 (耆老)：</strong> AP 上限 6（每月 +5），開局 10 KP。技藝最純熟，執行「⑥填縫」不耗 AP，可遠程指導後輩。體力有限，很需要後輩送材料與幫忙。</li>
                    <li><strong>🏃 文化復振青年 (青年)：</strong> AP 上限 8（每月 +6），開局 0 KP。移動不耗 AP；可以向耆老請益（學得深），也可以向中生代請益（學得快）。</li>
                    <li><strong>🌉 中生代 (中生代工匠)：</strong> AP 上限 7（每月 +5），開局 5 KP。小時候有過傳統生活的經驗，向耆老請益只要 2 AP 就能獲得 3 KP；能把知識有效率地傳給青年；熟悉兩種文化，科學轉譯成功率 +20%，走「機器加工天然纖維」路線額外 +3 分。</li>
                </ul>

                <h3>🗺️ 造船流程圖：三種完工方式</h3>
                <div class="css-flowchart">
                    <div class="fc-node fc-start">🌲 山林階段（三條路都要先完成）</div>
                    <div class="fc-node">① 砍伐剝皮 ipana'ape (3 AP | 產出 1 材料，可重複)</div>
                    <div class="fc-arrow">↓ 跨月</div>
                    <div class="fc-node">② 懸掛摩擦軟化 (3 AP | 耗 1 材料)</div>
                    <div class="fc-arrow">↓ 跨月</div>
                    <div class="fc-node">③ 劃痕撕絲 chingdasan (3 AP | 耗 1 材料)</div>
                    <div class="fc-arrow" style="margin: 12px 0;">↓ 跨月，接下來選一條路</div>
                    <div class="fc-branches" style="flex-direction: column;">
                        <div class="fc-branch traditional">
                            <div class="fc-label">🌟 傳統 Avaka<br><small>🛖 灘頭工作室</small></div>
                            <div class="fc-node">④ 脫水曝曬乾燥 (3 AP | 耗 1 材料)</div>
                            <div class="fc-arrow">↓ 跨月</div>
                            <div class="fc-node">⑤ 理線撚繩 oviden (3 AP | 需 3 KP + 1 材料)</div>
                            <div class="fc-arrow">↓ 跨月</div>
                            <div class="fc-node">⑥ 填縫完工 Mamaruk (3 AP | 需 8 KP + 1 材料)</div>
                            <div class="fc-arrow">↓</div>
                            <div class="fc-node fc-win">+20 分<br>船可拆、可修</div>
                        </div>
                        <div class="fc-branch" style="border-color: rgba(251, 191, 36, 0.5);">
                            <div class="fc-label" style="color:#fbbf24;">⚙️ 機器加工天然纖維<br><small>🏬 商店</small></div>
                            <div class="fc-node">用機器處理 Avaka 纖維 (3 AP | 需 5 KP + 2 材料)</div>
                            <div class="fc-arrow">↓</div>
                            <div class="fc-node" style="background: rgba(251, 191, 36, 0.12); border-color:#fbbf24; color:#fde68a; font-weight:bold;">+12 分（中生代 +15）<br>仍用 Avaka，船可拆修；少了手工曝曬與撚繩的經驗</div>
                        </div>
                        <div class="fc-branch" style="border-color: rgba(148, 163, 184, 0.5);">
                            <div class="fc-label" style="color:#cbd5e1;">🧴 工業樹脂<br><small>🏬 商店</small></div>
                            <div class="fc-node">用樹脂直接填縫 (3 AP | 需 2 材料)</div>
                            <div class="fc-arrow">↓</div>
                            <div class="fc-node" style="background: rgba(148, 163, 184, 0.12); border-color:#94a3b8; color:#e2e8f0; font-weight:bold;">+5 分<br>很快完工；接縫黏死，壞了無法拆修</div>
                        </div>
                    </div>
                </div>

                <h3>🏆 結算</h3>
                <p>12 個月結束後，系統會結算「文化韌性總分」與 KP 演進曲線圖。完工分數如上圖，請益、指導、回饋長者、幫忙長者與科學轉譯都會另外加分，遊戲中可以隨時在畫面下方的「得分紀錄」看到自己的分數從哪裡來。最高等級的結局「傳承之靈」只有走傳統路線才能獲得。船完工之後這一年還沒結束：你仍然可以砍伐備料、贈送材料、指導或幫忙其他人，這些也都會加分。分數不是在評斷哪條路對或錯，而是讓你回頭想：我做了哪些事？為什麼這些事會加分？</p>
            </div>
            <button id="close-rules-btn" class="btn primary mt-4">我已經完全了解了</button>
        `,
        widgets: {
            leftTitle: '蘭嶼即時海象觀測',
            tideLabel: '目前潮汐',
            waveLabel: '近海浪高',
            windLabel: '平均風速',
            tempLabel: '黑潮水溫',
            moonLabel: '當前月相',
            moons: [
                '新月/朔 🌑',
                '眉月 🌒',
                '上弦月 🌓',
                '盈凸月 🌔',
                '滿月/望 🌕',
                '虧凸月 🌖',
                '下弦月 🌗',
                '殘月 🌘'
            ],
            rightTitle: '工坊即時狀態',
            activeLabel: '島民工匠在線',
            boatsLabel: '累計造船艘數',
            hempLabel: 'Avaka 採集量',
            tickerTitle: '📢 部落動態日誌',
            tides: ['漲潮', '退潮', '乾潮', '滿潮'],
            tickerMessages: [
                '青年在灘頭工作室開始剝麻...',
                '耆老在灘頭開始大船下水祈福...',
                '中生代在現代商店購置了工業樹脂...',
                '島民在山林採集蘭嶼花椒...',
                '雅美／達悟族長輩正在向年輕人傳授造船歌謠...',
                '潮汐變更，目前正值退潮時段...',
                '飛魚群在開元港外海躍出水面！',
                '海風徐徐吹拂，山林氣溫適宜原料生長...'
            ]
        }
    },
    en: {
        title: ['D','i','m','e','n','s','i','o','n',' ','o','f',' ','t','h','e',' ','I','s','l','a','n','d'],
        tagline: [
            '— The Living Plank Boat —',
            '— Whispers of the Flying Fish Season —',
            '— Trial of the Inheritors —',
            '— A Journey in Harmony with Seasons —'
        ],
        placeholderName: 'Enter your name...',
        roleLabel: 'Select Your Role',
        roles: {
            elder: {
                title: 'Elder Artisan<br><span style="font-size:0.8rem; font-weight:normal; opacity:0.8;">(Elder)</span>',
                badgeAp: 'AP 6 (+5/mo)',
                badgeKp: 'KP 10',
                desc: 'Caulking Expert<br>Remote Guiding'
            },
            youth: {
                title: 'Young Apprentice<br><span style="font-size:0.8rem; font-weight:normal; opacity:0.8;">(Youth)</span>',
                badgeAp: 'AP 8 (+6/mo)',
                badgeKp: 'KP 0',
                desc: 'Fast Movement<br>Apprentice Learning'
            },
            middle: {
                title: 'Middle Generation<br><span style="font-size:0.8rem; font-weight:normal; opacity:0.8;">(Bridge Artisan)</span>',
                badgeAp: 'AP 7 (+5/mo)',
                badgeKp: 'KP 5',
                desc: 'Learns & teaches fast<br>Skilled at adapting'
            }
        },
        placeholderRoom: 'ENTER 4-DIGIT CODE',
        joinBtn: 'Join Room',
        createBtn: 'Create Room',
        rulesBtn: 'View Game Rules & Guide',
        waitingTitle: 'Waiting Lobby',
        waitingRoomLabel: 'Exclusive Room Code',
        waitingDesc: 'Please share the code above with friends to have them join this game!',
        startBtn: 'Start Game',
        leaveBtn: 'Leave Lobby',
        avatar: {
            title: '✨ Create Your Custom 3D Character',
            dragTip: '🖱 Drag to Rotate · Scroll to Zoom',
            backBtn: 'Back',
            confirmBtn: '✅ Confirm & Enter Room',
            labels: {
                skin: '🎨 Skin Color',
                hair: '💇 Hair Style',
                hairColor: '🪮 Hair Color',
                eye: '👁 Eye Color',
                face: '👤 Face Shape',
                accessory: '🛡 Yami/Tao Ceremonial Accessories',
                accessorySub: 'Worn only during festivals (Flying Fish Festival, Ship Launch)',
                cloth: '👕 Yami/Tao Clothing',
                clothSub: 'Traditional colors are white, black, blue; bright colors avoided'
            },
            skinTitles: {
                '#C68642': 'Standard Skin',
                '#A0622A': 'Deep Bronze',
                '#8D5524': 'Dark Brown',
                '#6B3F1F': 'Dark Skin'
            },
            hairOptions: {
                short: 'Short',
                long: 'Long',
                bun: 'Bun',
                bald: 'Bald'
            },
            hairColorTitles: {
                '#0d0d0d': 'Black (Traditional Yami/Tao)',
                '#2a1a0a': 'Dark Brown',
                '#5a3a1a': 'Brown',
                '#c8c8c8': 'Silver (Elder)'
            },
            eyeTitles: {
                '#2a1a08': 'Dark Brown (Common)',
                '#4a2e10': 'Brown',
                '#7a4820': 'Amber',
                '#1a1a1a': 'Jet Black'
            },
            faceOptions: {
                round: 'Round',
                square: 'Square',
                slim: 'Slim'
            },
            poseLabel: '🕺 Pose',
            poseOptions: { stand: 'Standing', wave: 'Waving', hips: 'Hands on hips', cross: 'Arms crossed', fist: 'Fist up' },
            expressionLabel: '🙂 Expression',
            expressionOptions: { smile: 'Smile', calm: 'Calm', determined: 'Determined' },
            accessoryOptions: {
                none: 'None',
                silver_helmet: 'Silver Helmet',
                rattan_helmet: 'Rattan Helmet',
                chest_ornament: 'Chest Ornament'
            },
            accessoryTitles: {
                silver_helmet: 'Silver Helmet: Sacred ceremonial object, conical silver plates',
                rattan_helmet: 'Rattan Helmet: Traditional woven rattan helmet',
                chest_ornament: 'Half-moon Chest Ornament: Symbol of status and achievement'
            },
            clothOptions: {
                loincloth: 'Loincloth',
                vest_dark: 'Blue & White Vest',
                rattan_armor: 'Rattan Armor',
                ceremony: 'Ceremonial Vestments'
            }
        },
        game: {
            sidebarHeader: '👥 Tribe Artisans Status',
            logsHeader: '📜 Tribe Chronicle',
            chatHeader: '💬 Tribe Chat',
            chatPlaceholder: 'Chat with islanders...',
            chatSendBtn: 'Send',
            leaveGameBtn: 'Leave Game',
            leaveConfirm: 'Are you sure you want to leave the game?',
            steps: ['Not Started', '① Chopped & Stripped', '② Rubbed & Softened', '③ Split & Stripped', '④ Dried', '⑤ Twined & Knotted', '✅ ⑥ Caulked & Finished'],
            meTag: 'You',
            giveBtn: '🎁 Give Mat (0 AP)',
            ap: 'AP:',
            kp: 'KP:',
            mat: 'Mat:',
            progressLabel: 'Progress',
            emptyLoc: 'No one here',
            statusLabels: ['Remaining AP', 'KP Points', 'Owned Materials', 'Ship Progress', 'Total Score'],
            readyBtnReady: 'Cancel Ready (Waiting...)',
            readyBtnNotReady: 'Ready for Next Month',
            askBtn: '🙏 Ask Elder <span style="font-size:0.8rem;opacity:0.7;font-weight:normal;">(3 AP → get 3 KP · +1 pt)</span>',
            askElderTitle: '🙏 Ask Elder',
            askMiddleTitle: '🤝 Ask Middle Generation',
            askGiftNote: '🎁 gift',
            scoreUnit: 'pt',
            helpBtn: '💪 Help the Elder <span style="font-size:0.8rem;opacity:0.7;font-weight:normal;">(1 AP → Elder recovers 2 AP · +1 pt)</span>',
            giveElderBonus: ' · +1 pt',
            scoreLogLabel: 'Score log',
            noScoreYet: 'No points yet',
            teachLabel: 'Select Apprentice',
            teachBtn: '💡 Guide Apprentice <span style="font-size:0.8rem;opacity:0.7;font-weight:normal;">(2 AP → they get 1 KP · +1 pt)</span>',
            locations: {
                '山林': {
                    name: '🌲 Mountain Forest',
                    badge: 'Resources',
                    desc: 'Gather Avaka stems & Lanyu prickly ash (Steps 1-3 performed here)',
                    moveBtn: 'Move here (1 AP)',
                    steps: {
                        chop: "① Chop & Peel Stem ipana'ape (3 AP | Yields Mat)",
                        rub: '② Hang & Rub Soften (3 AP | 1 Mat + Cross-month)',
                        strip: '③ Score & Strip Fiber chingdasan (3 AP | 1 Mat + Cross-month)'
                    }
                },
                '灘頭工作室': {
                    name: '🛖 Beach Workshop',
                    badge: 'Craft Core',
                    desc: 'Fiber processing and final shipbuilding steps (Steps 4-6 performed here)',
                    moveBtn: 'Move here (1 AP)',
                    steps: {
                        dry: '④ Dry & Dewater (3 AP | 1 Mat + Curing)',
                        twine: '⑤ Twine Rope oviden (3 AP | 3 KP + 1 Mat + Cross-month)',
                        caulk: '⑥ Caulk & Finish Mamaruk (3 AP | 8 KP + 1 Mat + Cross-month)'
                    }
                },
                '商店': {
                    name: '🏬 Modernized Store',
                    badge: 'Industrial',
                    desc: 'Ready-made industrial materials, and machines that can process natural fibre',
                    moveBtn: 'Move here (1 AP)',
                    buyBtn: '🧴 Finish with industrial resin (3 AP | 2 Mats + Forest Steps 1-3 + Cross-month → +5 pts)',
                    machineBtn: '⚙️ Finish with machine-processed Avaka fibre (3 AP | 5 KP + 2 Mats + Forest Steps 1-3 + Cross-month → +12 pts)'
                }
            }
        },
        rulesHtml: `
            <h2>📜 Game Rules & Process</h2>
            <div class="rules-scroll-area custom-scrollbar">
                <p><strong>"Avaka: Dimension of the Island"</strong> is a multiplayer cooperative & competitive game about traditional boat building and cultural choices on Lanyu (Orchid Island). You play a Yami/Tao artisan who must complete a plank boat within 12 months (rounds). There are three ways to finish. None is the "right answer", but each has its own consequences; not finishing in time counts as failure.</p>

                <h3>🎯 Stamina, Knowledge & Scoring</h3>
                <ul>
                    <li><strong>⚡ Action Points (AP) &amp; Monthly Recovery:</strong> AP stands for stamina and time. Each of the six craft steps costs 3 AP (Elder caulks for 0 AP), Move 1 AP (free for Youth), Give Material 0 AP, Help the Elder 1 AP, Scientific Translation 2 AP, Remote Guiding 2 AP, Asking 1–3 AP depending on who you ask. Each month restores only part of your stamina (Youth +6, Middle Generation and Elder +5, never above the maximum).</li>
                    <li><strong>💡 Knowledge Points (KP):</strong> Your understanding of the traditional craft; it only grows by learning from others. ⑤ Twining needs 3 KP, ⑥ Caulking needs 8 KP, machine processing needs 5 KP.</li>
                    <li><strong>🙏 Asking (who you learn from matters):</strong> Ask the <b>Elder</b>: Youth pays 3 AP, Middle Generation pays 2 AP, both gain 3 KP, and the asker and the Elder each get <b>+1 point</b>. Youth can ask the <b>Middle Generation</b>: 1 AP for 2 KP, <b>+1 point each</b>; they pass knowledge on quickly, but the Youth's KP must be lower than theirs, so deeper knowledge still comes from the Elder. The Elder can also Remote Guide (2 AP): target +1 KP, Elder <b>+1 point</b>. Points for asking and guiding count at most twice per player per month; beyond that you still gain KP, just no more points.</li>
                    <li><strong>🎁 Giving back &amp; helping (traditional upbringing):</strong> Give a material to the Elder for <b>+1 point</b> (counted once a month); asking the Elder in that same month then yields <b>+1 extra KP</b> (asking with a gift). When you are in the same place as the Elder you can Help the Elder (1 AP): the Elder recovers 2 AP and you get <b>+1 point</b> (once a month). Both score double in Month 6, the Good Month Festival.</li>
                    <li><strong>🔬 Scientific Translation:</strong> Costs 2 AP &amp; 2 KP. Success rate = 50% + remaining KP×5% (Middle Generation +20%); <b>guaranteed in Month 8 (Pitanatana)</b>. Success grants <b>+4 points</b> and <b>2 materials</b>.</li>
                    <li><strong>⏳ Cross-Month Waiting:</strong> Except for ① Chop &amp; Peel, which can be repeated in the same month, every step must wait until the <b>next month</b> before the following step (steps ⑤ and ⑥ in Month 12 are the exception). The earliest possible finish is Month 7.</li>
                    <li><strong>🌿 Materials:</strong> ① Chop &amp; Peel in the forest yields materials (1 each time, 2 in Months 1 and 7); steps ② to ⑥ each consume 1.</li>
                    <li><strong>🌳 Forest health:</strong> Shared by the whole room, from 0 to 5, starting at 3. If anyone goes up to do ① Chop &amp; Peel and tend the plots this month, the forest gains 1; if nobody goes all month, it loses 1 (Month 2, when the forest is closed, does not count). At 1 or below, chopping costs 1 more AP; at 4 or above at the end, everyone gets +2 points. People tend the forest because they need its material; when nobody goes, it ages.</li>
                    <li><strong>🎯 Monthly group mission &amp; badges:</strong> Each month the game draws one mission for the whole group (for example "someone gives a material to the Elder this month"). Completing it gives everyone <b>+1 point</b>; the mission is shown at the top of the screen. Doing certain things for the first time earns a badge, and titles are awarded at the end of the year; badges and titles carry no points.</li>
                    <li><strong>🎲 More things to do:</strong> <b>Ask quiz</b>: after asking you get one three-choice question; a correct answer gives +1 KP and a wrong one costs nothing (the answers are in the Knowledge Base). <b>Event cards</b>: in Months 2, 3, 6, 8, 10 and 11 everyone gets a two-option card. <b>Storytelling</b> (Elder, 2 AP, once a month): every Youth and Middle Generation player at the Elder's location gains +1 KP (+2 KP in Months 2 and 10) and the Elder gets +1 point. <b>Replant Avaka</b> (Forest, 1 AP, once a month): counts as tending the plots, and your first chop from next month on yields 1 extra material. <b>Lend a hand</b> (same location, 1 AP): your teammate's next step this month costs 2 AP less and you get +1 point (once a month). <b>Step mini-game</b>: after a craft step, press at the right moment to get 1 AP back; you can skip it.</li>
                    <li><strong>📅 Calendar Taboos:</strong> The game follows Lanyu's 12-month calendar, e.g. the forest is closed in Month 2, you should keep 1 AP at the end of Month 4 for the plum rain, the store cannot finish boats in Month 9, and nothing can be finished in Month 10. Each month's effect is shown at the top of the screen.</li>
                </ul>

                <h3>👤 Character Roles</h3>
                <ul>
                    <li><strong>👑 Master Artisan (Elder):</strong> Max AP 6 (+5/month), starts with 10 KP. The most skilled: caulking costs 0 AP and can guide others remotely. Limited stamina, so gifts of material and help from the younger ones matter a lot.</li>
                    <li><strong>🏃 Young Apprentice (Youth):</strong> Max AP 8 (+6/month), starts with 0 KP. Moves for free; can ask the Elder (deeper) or the Middle Generation (faster).</li>
                    <li><strong>🌉 Middle Generation (Bridge Artisan):</strong> Max AP 7 (+5/month), starts with 5 KP. Grew up with the traditional way of life, so asking the Elder costs only 2 AP for 3 KP; passes knowledge on to the Youth efficiently; at home in two cultures: +20% on Scientific Translation and +3 points on the machine-processed natural fibre path.</li>
                </ul>

                <h3>🗺️ Boat-building Flowchart: three ways to finish</h3>
                <div class="css-flowchart">
                    <div class="fc-node fc-start">🌲 Forest stage (required for all three paths)</div>
                    <div class="fc-node">① Chop &amp; Peel ipana'ape (3 AP | yields 1 material, repeatable)</div>
                    <div class="fc-arrow">↓ next month</div>
                    <div class="fc-node">② Hang &amp; Rub to soften (3 AP | 1 material)</div>
                    <div class="fc-arrow">↓ next month</div>
                    <div class="fc-node">③ Score &amp; Strip fibre chingdasan (3 AP | 1 material)</div>
                    <div class="fc-arrow" style="margin: 12px 0;">↓ next month, then choose a path</div>
                    <div class="fc-branches" style="flex-direction: column;">
                        <div class="fc-branch traditional">
                            <div class="fc-label">🌟 Traditional Avaka<br><small>🛖 Beach Workshop</small></div>
                            <div class="fc-node">④ Dry in the sun (3 AP | 1 material)</div>
                            <div class="fc-arrow">↓ next month</div>
                            <div class="fc-node">⑤ Twine rope oviden (3 AP | 3 KP + 1 material)</div>
                            <div class="fc-arrow">↓ next month</div>
                            <div class="fc-node">⑥ Caulk &amp; finish Mamaruk (3 AP | 8 KP + 1 material)</div>
                            <div class="fc-arrow">↓</div>
                            <div class="fc-node fc-win">+20 points<br>Boat can be taken apart and repaired</div>
                        </div>
                        <div class="fc-branch" style="border-color: rgba(251, 191, 36, 0.5);">
                            <div class="fc-label" style="color:#fbbf24;">⚙️ Machine-processed natural fibre<br><small>🏬 Store</small></div>
                            <div class="fc-node">Process the Avaka fibre by machine (3 AP | 5 KP + 2 materials)</div>
                            <div class="fc-arrow">↓</div>
                            <div class="fc-node" style="background: rgba(251, 191, 36, 0.12); border-color:#fbbf24; color:#fde68a; font-weight:bold;">+12 points (Middle Generation +15)<br>Still Avaka, still repairable; the hands-on drying and twining are skipped</div>
                        </div>
                        <div class="fc-branch" style="border-color: rgba(148, 163, 184, 0.5);">
                            <div class="fc-label" style="color:#cbd5e1;">🧴 Industrial resin<br><small>🏬 Store</small></div>
                            <div class="fc-node">Seal the seams with resin (3 AP | 2 materials)</div>
                            <div class="fc-arrow">↓</div>
                            <div class="fc-node" style="background: rgba(148, 163, 184, 0.12); border-color:#94a3b8; color:#e2e8f0; font-weight:bold;">+5 points<br>Done quickly; seams are glued shut and cannot be repaired</div>
                        </div>
                    </div>
                </div>

                <h3>🏆 Settlement</h3>
                <p>After 12 months the system totals everyone's Cultural Resilience score and draws the KP curve chart. Finishing scores are shown in the chart above. Asking, guiding, giving back to the Elder, helping the Elder and Scientific Translation all add points; during the game the "Score log" at the bottom of the screen shows where your points come from. The top ending is reserved for the traditional path. Finishing your boat does not end your year: you can still gather materials, give them away, guide or help the others, and all of that scores too. The score does not judge which path is right or wrong; it invites you to look back: what did I do, and why did those things earn points?</p>
            </div>
            <button id="close-rules-btn" class="btn primary mt-4">I understand completely</button>
        `,
        widgets: {
            leftTitle: 'Lanyu Ocean Observation',
            tideLabel: 'Current Tide',
            waveLabel: 'Wave Height',
            windLabel: 'Wind Speed',
            tempLabel: 'Sea Temp',
            moonLabel: 'Moon Phase',
            moons: [
                'New Moon 🌑',
                'Waxing Crescent 🌒',
                'First Quarter 🌓',
                'Waxing Gibbous 🌔',
                'Full Moon 🌕',
                'Waning Gibbous 🌖',
                'Last Quarter 🌗',
                'Waning Crescent 🌘'
            ],
            rightTitle: 'Workshop Status',
            activeLabel: 'Online Artisans',
            boatsLabel: 'Boats Finished',
            hempLabel: 'Hemp Harvest',
            tickerTitle: '📢 Tribal Event Logs',
            tides: ['Flood Tide', 'Ebb Tide', 'Low Tide', 'High Tide'],
            tickerMessages: [
                'A youth started peeling hemp at the workshop...',
                'An elder initiated the boat launching ritual...',
                'A negotiator bought resin at the store...',
                'Islanders are gathering Lanyu prickly ash...',
                'Yami/Tao elders are teaching canoe songs to youths...',
                'Tide shifted: low tide cycle active...',
                'School of flying fish spotted near harbor!',
                'Sea breeze blowing; temperature is ideal for crops...'
            ]
        }
    }
};

function translateLocationName(loc) {
    if (currentLang === 'en') {
        if (loc === '山林') return 'Mountain Forest';
        if (loc === '灘頭工作室') return 'Beach Workshop';
        if (loc === '商店') return 'Modernized Store';
    }
    return loc;
}

function translateLog(logText) {
    if (currentLang !== 'en') return logText;
    
    // Replace names of locations
    let translated = logText
        .replace(/山林/g, 'Mountain Forest')
        .replace(/灘頭工作室/g, 'Beach Workshop')
        .replace(/商店/g, 'Modernized Store');
        
    // Replace names of roles
    translated = translated
        .replace(/資深工匠 \(耆老\)/g, 'Elder Artisan')
        .replace(/文化復振青年/g, 'Young Apprentice')
        .replace(/中生代/g, 'Middle Generation');
        
    // Replace typical action sentences
    const patterns = [
        { regex: /(.+) 加入了房間，扮演 (.+)/, replace: '$1 joined the room as $2' },
        { regex: /(.+) 斷線了/, replace: '$1 disconnected' },
        { regex: /(.+) 離開了房間/, replace: '$1 left the room' },
        { regex: /遊戲開始！第 1 個月：Kashyman/, replace: 'Game started! Month 1: Kashyman' },
        { regex: /(.+) 移動到了 (.+)/, replace: '$1 moved to $2' },
        { regex: /(.+) 執行了砍伐剝皮，獲得了 (\d+) 份材料/, replace: '$1 performed chop & peel, yielding $2 material(s)' },
        { regex: /(.+) 完成了 ①砍伐剝皮 ipana'ape \(獲得 (\d+) 份材料\)/, replace: '$1 completed ① Chop & Peel ipana\'ape (yielding $2 material(s))' },
        { regex: /(.+) 完成了 剝麻/, replace: '$1 completed peeling hemp' },
        { regex: /(.+) 完成了 刮絲/, replace: '$1 completed scraping fiber' },
        { regex: /(.+) 完成了 撚線/, replace: '$1 completed twining rope' },
        { regex: /(.+) 完美傳承了造船技術！獲得 (\d+) 分/, replace: '$1 perfectly inherited shipbuilding skills! Gained $2 points' },
        { regex: /(.+) 使用現代材料完工，文化流失了\.\.\./, replace: '$1 finished using modernized materials, cultural heritage was lost...' },
        { regex: /(.+) 向部落長輩請益，獲得 3 KP/, replace: '$1 learned from the Elder, gained 3 KP' },
        { regex: /(.+) 向耆老請益，獲得 (\d+) KP 與 1 分（帶禮請益，多得 1 KP）/, replace: '$1 learned from the Elder: +$2 KP, +1 point (brought a gift: +1 extra KP)' },
        { regex: /(.+) 向耆老請益，獲得 (\d+) KP 與 1 分/, replace: '$1 learned from the Elder: +$2 KP, +1 point' },
        { regex: /(.+) 向Middle Generation (.+) 請益，獲得 (\d+) KP，雙方各得 1 分/, replace: '$1 learned from Middle Generation $2: +$3 KP, +1 point each' },
        { regex: /(.+) 用機器加工 Avaka 纖維完工，獲得 (\d+) 分。.+/, replace: '$1 finished with machine-processed Avaka fibre (+$2). The boat can still be taken apart and repaired, but the hands-on drying and twining were skipped.' },
        { regex: /(.+) 用工業樹脂完工，獲得 (\d+) 分。.+/, replace: '$1 finished with industrial resin (+$2). The boat was done quickly, but the seams are glued shut and cannot be repaired.' },
        { regex: /🎁 (.+) 帶禮物回饋耆老，獲得 (\d+) 分；本月向耆老請益可多得 1 KP/, replace: '🎁 $1 brought a gift for the Elder: +$2 point(s); asking the Elder this month gives +1 extra KP' },
        { regex: /💪 (.+) 幫 (.+) 分擔粗重的工作，.+（現有 (\d+)\/(\d+) AP），.+ 獲得 (\d+) 分/, replace: '💪 $1 helped $2 with the heavy work: $2 recovers stamina ($3/$4 AP), $1 gains $5 point(s)' },
        { regex: /梅雨腐蝕：(.+) 用上個月留下的 1 AP 保護材料免於腐爛。/, replace: 'Plum Rain: $1 used 1 AP left over from last month to keep the materials from rotting.' },
        { regex: /梅雨腐蝕：(.+) 上個月把體力用光了，來不及防潮，材料腐爛歸零！/, replace: 'Plum Rain: $1 had no AP left from last month, so the materials rotted to zero!' },
        { regex: /🌳 森林：(\d+) 月有人上山砍伐、照顧林地，森林狀態 (\d+) → (\d+)/, replace: '🌳 Forest: someone chopped and tended the plots in Month $1; forest health $2 → $3' },
        { regex: /🍂 森林：(\d+) 月沒有人上山，林地無人照顧，森林狀態 (\d+) → (\d+)/, replace: '🍂 Forest: nobody went up in Month $1, so the plots went untended; forest health $2 → $3' },
        { regex: /🌳 森林狀態 (\d+)\/(\d+)：這一年大家一直有人照顧林地，所有人獲得 2 分/, replace: '🌳 Forest health $1/$2: the plots were tended all year, so everyone gains 2 points' },
        { regex: /🗣️ (.+) 對身邊的人講述：(.+) 各獲得 (\d+) KP，.+ 獲得 1 分/, replace: (m, who, names, kp) => `🗣️ ${who} told stories to those nearby: ${names.replace(/、/g, ', ')} each gain ${kp} KP; ${who} gains 1 point` },
        { regex: /📝 (.+) 答對了請益小問答，多得 1 KP/, replace: '📝 $1 answered the ask quiz correctly: +1 KP' },
        { regex: /📜 (.+) 選擇「(.+?)」(?:：(.+))?/, replace: (m, who, opt, notes) => `📜 ${who} chose "${eventOptionEn(opt)}"${notes ? ': ' + eventNotesEn(notes) : ''}` },
        { regex: /✨ (.+) 手感很好，工序做得順，省下 1 AP/, replace: '✨ $1 had a good hand for the step and saved 1 AP' },
        { regex: /🌱 (.+) 在.+補種了 Avaka、照顧林地.*/, replace: '🌱 $1 replanted Avaka and tended the plots (the first chop from next month on yields 1 extra material)' },
        { regex: /🌱 (.+) 之前補種的 Avaka 長成了，這次多收 1 份材料/, replace: '🌱 The Avaka $1 replanted has grown: 1 extra material this time' },
        { regex: /🙌 (.+) 幫 (.+) 搭把手：.+ 本月下一道工序少 2 AP，.+ 獲得 1 分/, replace: '🙌 $1 lent $2 a hand: $2\'s next step this month costs 2 AP less; $1 gains 1 point' },
        { regex: /🙌 (.+) 幫 (.+) 搭把手：.+ 本月下一道工序少 2 AP/, replace: '🙌 $1 lent $2 a hand: $2\'s next step this month costs 2 AP less' },
        { regex: /💪 (.+) 繼續幫 (.+) 趕工，.+ 回復體力（現有 (\d+)\/(\d+) AP）/, replace: '💪 $1 keeps helping $2 with the work; $2 recovers stamina (now $3/$4 AP)' },
        { regex: /🔬 (.+) 成功對傳統工藝進行「科學轉譯」，獲得 2 份材料，可以送給還在造船的人/, replace: '🔬 $1 succeeded at "Scientific Translation": 2 materials to pass on to those still building' },
        { regex: /🥾 (.+) 巡了一趟山，看過每一區的 Avaka，獲得 1 分/, replace: '🥾 $1 walked the hill and checked every Avaka plot: +1 point' },
        { regex: /🛶 (.+) 為部落的船出了一份力（(\d+)\/(\d+)）/, replace: '🛶 $1 put in a share of work on the community boat ($2/$3)' },
        { regex: /🛶 部落的船完成了！年底所有人獲得 (\d+) 分/, replace: '🛶 The community boat is finished! Everyone gains $1 points at the end of the year' },
        { regex: /🛶 部落的船 (\d+)\/(\d+)：.+，所有人獲得 (\d+) 分/, replace: '🛶 Community boat $1/$2: everyone gains $3 point(s)' },
        { regex: /🤝 (.+) 將 1 份材料送給了 (.+)！/, replace: '🤝 $1 gave 1 material to $2!' },
        { regex: /(.+) 向Middle Generation (.+) 請益，獲得 (\d+) KP（本月請益的加分已達上限）/, replace: '$1 learned from Middle Generation $2: +$3 KP (asking points already at this month\'s limit)' },
        { regex: /(.+) 向耆老請益，獲得 (\d+) KP.*（本月請益的加分已達上限）/, replace: '$1 learned from the Elder: +$2 KP (asking points already at this month\'s limit)' },
        { regex: /(.+) 遠程指導了 (.+)（本月指導的加分已達上限）/, replace: '$1 remotely guided $2 (guiding points already at this month\'s limit)' },
        { regex: /🏅 (.+) 獲得徽章「(.+)」/, replace: (m, who, badge) => `🏅 ${who} earned the badge "${badgeNameEn(badge)}"` },
        { regex: /🎯 小組任務「(.+)」達成！所有人獲得 1 分/, replace: (m, name) => `🎯 Group mission "${missionNameEn(name)}" completed! Everyone gains 1 point` },
        { regex: /🎯 本月小組任務「(.+)」：.+/, replace: (m, name) => `🎯 This month's group mission: "${missionNameEn(name)}" (+1 point for everyone when completed)` },
        { regex: /⚠️ 預告：下個月是梅雨季。.+/, replace: '⚠️ Heads-up: plum rain comes next month. If you hold materials, keep 1 AP unspent at the end of this month or they will rot to zero.' },
        { regex: /(.+) 因傳承指導獲得 1 分/, replace: '$1 gained 1 point for heritage guidance' },
        { regex: /(.+) 遠程指導了 (.+)，獲得 1 分傳承分數/, replace: '$1 remotely guided $2 and gained 1 heritage point' },
        { regex: /(.+) 遠程指導了 (.+)/, replace: '$1 remotely guided $2' },
        { regex: /🤝 (.+) 消耗了 1 AP，將 1 份材料送給了 (.+)！/, replace: '🤝 $1 spent 1 AP to give 1 material to $2!' },
        { regex: /⏳ (.+) 已準備好/, replace: '⏳ $1 is ready' },
        { regex: /⏳ (.+) 取消了準備/, replace: '⏳ $1 canceled ready' },
        { regex: /一年結束，遊戲結算！/, replace: 'Year ended, game settlement!' },
        { regex: /進入第 (\d+) 個月：(.+)。。?/, replace: 'Entering Month $1: $2.' },
        { regex: /進入第 (\d+) 個月：(.+)/, replace: 'Entering Month $1: $2' },
        { regex: /梅雨腐蝕：(.+) 消耗 1 AP 保護灘頭的材料免於腐爛。/, replace: 'Plum Rain: $1 spent 1 AP to protect materials at the beach from rotting.' },
        { regex: /梅雨腐蝕：(.+) 未及時保護，曝曬中的材料腐爛歸零了！/, replace: 'Plum Rain: $1 failed to protect materials, exposed materials rotted to zero!' },
        { regex: /祭神月傳承：(.+) 獲得 2 KP/, replace: 'Sacred Month Heritage: $1 gained 2 KP' }
    ];
    
    for (const p of patterns) {
        if (p.regex.test(translated)) {
            translated = translated.replace(p.regex, p.replace);
            break;
        }
    }
    
    return translated;
}

function translateScoreBreakdown(breakdown) {
    if (currentLang !== 'en') return breakdown;
    return breakdown.map(item => {
        return item
            .replace(/傳統 Avaka/g, 'Traditional Avaka')
            .replace(/工業材料/g, 'Industrial Materials')
            .replace(/傳承指導/g, 'Heritage Guidance')
            .replace(/請益耆老/g, 'Asked the Elder')
            .replace(/請益中生代/g, 'Asked the Middle Generation')
            .replace(/回饋長者/g, 'Gift to the Elder')
            .replace(/幫忙長者/g, 'Helped the Elder')
            .replace(/機器加工天然纖維/g, 'Machine-processed natural fibre')
            .replace(/工業樹脂/g, 'Industrial resin')
            .replace(/科學轉譯/g, 'Scientific Translation')
            .replace(/遠程指導/g, 'Remote Guidance')
            .replace(/照顧山林/g, 'Tended the forest')
            .replace(/小組任務/g, 'Group mission')
            .replace(/一起出海/g, 'Went fishing together')
            .replace(/分享收成/g, 'Shared the harvest')
            .replace(/搭把手/g, 'Lent a hand')
            .replace(/部落的船/g, 'Community boat')
            .replace(/巡山/g, 'Walked the hill')
            .replace(/參加招魚祭/g, 'Joined the fish-summoning ceremony')
            .replace(/幫忙燒貝灰/g, 'Helped burn shell lime')
            .replace(/講述/g, 'Storytelling');
    });
}

function summarizeScoreBreakdown(breakdown) {
    const items = translateScoreBreakdown(breakdown || []);
    if (!items.length) return translations[currentLang].game.noScoreYet;
    const counts = new Map();
    items.forEach(item => counts.set(item, (counts.get(item) || 0) + 1));
    return [...counts.entries()].map(([label, n]) => n > 1 ? `${label} ×${n}` : label).join(currentLang === 'en' ? ', ' : '、');
}

function applyLanguage() {
    const t = translations[currentLang];
    
    // 1. Update Main Title
    const glowTextEl = document.querySelector('.glow-text');
    if (glowTextEl) {
        glowTextEl.innerHTML = '';
        if (currentLang === 'en') {
            glowTextEl.classList.add('lang-en');
            const words = ['Dimension', 'of', 'the', 'Island'];
            words.forEach(w => {
                const s = document.createElement('span');
                s.className = 'glow-word';
                s.style.display = 'inline-block';
                s.style.whiteSpace = 'nowrap';
                
                w.split('').forEach(char => {
                    const ls = document.createElement('span');
                    ls.className = 'proximity-letter';
                    ls.textContent = char;
                    ls.style.display = 'inline-block';
                    s.appendChild(ls);
                });
                
                glowTextEl.appendChild(s);
            });
        } else {
            glowTextEl.classList.remove('lang-en');
            t.title.forEach(char => {
                const s = document.createElement('span');
                s.className = 'proximity-letter';
                s.textContent = char;
                s.style.display = 'inline-block';
                glowTextEl.appendChild(s);
            });
        }
    }
    
    // 2. Restart Tagline Animation
    const titleTaglineEl = document.querySelector('.title-tagline');
    if (titleTaglineEl) {
        if (taglineInstance) {
            taglineInstance.destroy();
        }
        taglineInstance = new TextType(titleTaglineEl, {
            text: t.tagline,
            typingSpeed: currentLang === 'en' ? 70 : 100,
            deletingSpeed: 40,
            pauseDuration: 3000,
            loop: true,
            showCursor: true,
            cursorCharacter: '▎',
            textColors: [
                '#d4af37', // Gold
                '#38bdf8', // Blue
                '#34d399', // Green
                '#a78bfa'  // Purple
            ],
            variableSpeed: currentLang === 'en' ? { min: 40, max: 90 } : { min: 60, max: 140 }
        });
    }
    
    // 3. Translate Join Section Elements
    const nameInput = document.getElementById('player-name');
    if (nameInput) nameInput.placeholder = t.placeholderName;
    
    const roleSelector = document.querySelector('.role-selector');
    if (roleSelector && roleSelector.previousElementSibling) {
        roleSelector.previousElementSibling.textContent = t.roleLabel;
    }
    
    // Translate Role Cards
    const roleOptions = document.querySelectorAll('.role-option');
    roleOptions.forEach(opt => {
        const role = opt.dataset.role;
        const roleData = t.roles[role];
        if (roleData) {
            opt.querySelector('h3').innerHTML = roleData.title;
            opt.querySelector('.ap-badge').textContent = roleData.badgeAp;
            opt.querySelector('.kp-badge').textContent = roleData.badgeKp;
            opt.querySelector('small').innerHTML = roleData.desc;
        }
    });
    
    const roomInput = document.getElementById('room-code');
    if (roomInput) roomInput.placeholder = t.placeholderRoom;
    
    const jBtn = document.getElementById('join-btn');
    if (jBtn) jBtn.textContent = t.joinBtn;
    
    const cBtn = document.getElementById('create-btn');
    if (cBtn) cBtn.textContent = t.createBtn;
    
    const rBtn = document.getElementById('open-rules-btn');
    if (rBtn) rBtn.textContent = t.rulesBtn;
    
    // 4. Translate Waiting Section Elements
    const waitingSection = document.getElementById('waiting-section');
    if (waitingSection) {
        const waitingH2 = waitingSection.querySelector('h2');
        if (waitingH2) waitingH2.textContent = t.waitingTitle;
        
        const waitingRoomCodeLabel = waitingSection.querySelector('span');
        if (waitingRoomCodeLabel) waitingRoomCodeLabel.textContent = t.waitingRoomLabel;
        
        const waitingP = waitingSection.querySelector('p');
        if (waitingP) waitingP.textContent = t.waitingDesc;
    }
    
    const sBtn = document.getElementById('start-game-btn');
    if (sBtn) sBtn.textContent = t.startBtn;
    
    const lBtn = document.getElementById('leave-lobby-btn');
    if (lBtn) lBtn.textContent = t.leaveBtn;

    // 5. Translate Avatar Creator Screen
    const avatarScreenH2 = document.querySelector('#avatar-screen h2');
    if (avatarScreenH2) avatarScreenH2.textContent = t.avatar.title;
    
    const avatarDragTip = document.querySelector('#avatar-screen p[style*="text-align:center"]');
    if (avatarDragTip) avatarDragTip.textContent = t.avatar.dragTip;
    
    const avBack = document.getElementById('avatar-back-btn');
    if (avBack) avBack.textContent = t.avatar.backBtn;
    
    const avConfirm = document.getElementById('avatar-confirm-btn');
    if (avConfirm) avConfirm.textContent = t.avatar.confirmBtn;
    
    // Translate Labels & Options
    const ctrlGroups = document.querySelectorAll('.avatar-ctrl-group');
    ctrlGroups.forEach(group => {
        const label = group.querySelector('.avatar-ctrl-label');
        if (!label) return;
        
        const txt = label.textContent.trim();
        if (txt.includes('膚色') || txt.includes('Skin')) {
            label.textContent = t.avatar.labels.skin;
            group.querySelectorAll('.swatch').forEach(sw => {
                const val = sw.dataset.val;
                if (t.avatar.skinTitles[val]) sw.title = t.avatar.skinTitles[val];
            });
        } else if (txt.includes('髮型') || txt.includes('Hair Style')) {
            label.textContent = t.avatar.labels.hair;
            group.querySelectorAll('.avatar-opt').forEach(opt => {
                const val = opt.dataset.val;
                if (t.avatar.hairOptions[val]) opt.textContent = t.avatar.hairOptions[val];
            });
        } else if (txt.includes('髮色') || txt.includes('Hair Color')) {
            label.textContent = t.avatar.labels.hairColor;
            group.querySelectorAll('.swatch').forEach(sw => {
                const val = sw.dataset.val;
                if (t.avatar.hairColorTitles[val]) sw.title = t.avatar.hairColorTitles[val];
            });
        } else if (txt.includes('瞳孔') || txt.includes('Eye Color')) {
            label.textContent = t.avatar.labels.eye;
            group.querySelectorAll('.swatch').forEach(sw => {
                const val = sw.dataset.val;
                if (t.avatar.eyeTitles[val]) sw.title = t.avatar.eyeTitles[val];
            });
        } else if (txt.includes('臉型') || txt.includes('Face Shape')) {
            label.textContent = t.avatar.labels.face;
            group.querySelectorAll('.avatar-opt').forEach(opt => {
                const val = opt.dataset.val;
                if (t.avatar.faceOptions[val]) opt.textContent = t.avatar.faceOptions[val];
            });
        } else if (txt.includes('動作') || txt.includes('Pose')) {
            label.textContent = t.avatar.poseLabel;
            group.querySelectorAll('.avatar-opt').forEach(opt => {
                const val = opt.dataset.val;
                if (t.avatar.poseOptions[val]) opt.textContent = t.avatar.poseOptions[val];
            });
        } else if (txt.includes('表情') || txt.includes('Expression')) {
            label.textContent = t.avatar.expressionLabel;
            group.querySelectorAll('.avatar-opt').forEach(opt => {
                const val = opt.dataset.val;
                if (t.avatar.expressionOptions[val]) opt.textContent = t.avatar.expressionOptions[val];
            });
        } else if (txt.includes('配件') || txt.includes('防護') || txt.includes('禮儀') || txt.includes('Ceremonial') || txt.includes('Accessories')) {
            ensureRattanHelmetButton();
            label.textContent = t.avatar.labels.accessory;
            const sub = group.querySelector('div');
            if (sub) sub.textContent = t.avatar.labels.accessorySub;
            group.querySelectorAll('.avatar-opt').forEach(opt => {
                const val = opt.dataset.val;
                if (t.avatar.accessoryOptions[val]) opt.textContent = t.avatar.accessoryOptions[val];
                if (t.avatar.accessoryTitles[val]) {
                    opt.title = t.avatar.accessoryTitles[val];
                } else {
                    opt.removeAttribute('title');
                }
            });
        } else if (txt.includes('服飾') || txt.includes('Clothing')) {
            label.textContent = t.avatar.labels.cloth;
            const sub = group.querySelector('div');
            if (sub) sub.textContent = t.avatar.labels.clothSub;
            group.querySelectorAll('.avatar-opt').forEach(opt => {
                const val = opt.dataset.val;
                if (t.avatar.clothOptions[val]) opt.textContent = t.avatar.clothOptions[val];
            });
        }
    });

    if (pendingRoomAction && pendingRoomAction.data && pendingRoomAction.data.role) {
        const avatarRoleName = document.getElementById('avatar-role-name-label');
        if (avatarRoleName) {
            avatarRoleName.textContent = AVATAR_ROLE_LABELS[currentLang][pendingRoomAction.data.role] || '';
        }
    }

    // 6. Translate Game Screen Static Elements
    const gameSidebarH3 = document.querySelector('.sidebar h3');
    if (gameSidebarH3) gameSidebarH3.textContent = t.game.sidebarHeader;
    
    const gameLogsH3 = document.querySelector('.sys-logs h3');
    if (gameLogsH3) gameLogsH3.textContent = t.game.logsHeader;
    
    const gameChatH3 = document.querySelector('.chat-section h3');
    if (gameChatH3) gameChatH3.textContent = t.game.chatHeader;
    
    const gameChatInput = document.getElementById('chat-input');
    if (gameChatInput) gameChatInput.placeholder = t.game.chatPlaceholder;
    
    const gameChatSendBtn = document.getElementById('chat-send-btn');
    if (gameChatSendBtn) gameChatSendBtn.textContent = t.game.chatSendBtn;
    
    const gameLeaveBtn = document.getElementById('leave-game-btn');
    if (gameLeaveBtn) gameLeaveBtn.textContent = t.game.leaveGameBtn;
    
    const gameRulesLoreBtn = document.getElementById('open-lore-btn');
    if (gameRulesLoreBtn) gameRulesLoreBtn.textContent = currentLang === 'en' ? '📖 Effect & Lore' : '📖 當月效果與夜曆';
    
    const gameCloseLoreBtn = document.getElementById('close-lore-btn');
    if (gameCloseLoreBtn) gameCloseLoreBtn.textContent = currentLang === 'en' ? 'Close' : '關閉';

    // Translate Location Cards
    for (const [locKey, locData] of Object.entries(t.game.locations)) {
        const card = document.querySelector(`.location-card[data-loc="${locKey}"]`);
        if (!card) continue;
        
        const h3 = card.querySelector('h3');
        if (h3) h3.textContent = locData.name;
        
        const badge = card.querySelector('.badge');
        if (badge) {
            badge.textContent = locData.badge;
        }
        
        const desc = card.querySelector('.desc');
        if (desc) desc.textContent = locData.desc;
        
        const moveBtn = card.querySelector('.move-btn');
        if (moveBtn) moveBtn.textContent = locData.moveBtn;
        
        if (locKey === '山林') {
            const gatherBtn = card.querySelector('.gather-btn');
            if (gatherBtn) gatherBtn.textContent = locData.actionBtn;
            if (locData.steps) {
                const chopBtn = card.querySelector('.craft-btn[data-step="chop"]');
                if (chopBtn && locData.steps.chop) chopBtn.textContent = locData.steps.chop;
                const rubBtn = card.querySelector('.craft-btn[data-step="rub"]');
                if (rubBtn && locData.steps.rub) rubBtn.textContent = locData.steps.rub;
                const stripBtn = card.querySelector('.craft-btn[data-step="strip"]');
                if (stripBtn && locData.steps.strip) stripBtn.textContent = locData.steps.strip;
            }
        } else if (locKey === '灘頭工作室') {
            if (locData.steps) {
                const dryBtn = card.querySelector('.craft-btn[data-step="dry"]');
                if (dryBtn && locData.steps.dry) dryBtn.textContent = locData.steps.dry;
                const twineBtn = card.querySelector('.craft-btn[data-step="twine"]');
                if (twineBtn && locData.steps.twine) twineBtn.textContent = locData.steps.twine;
                const caulkBtn = card.querySelector('.craft-btn[data-step="caulk"]');
                if (caulkBtn && locData.steps.caulk) caulkBtn.textContent = locData.steps.caulk;
            }
        } else if (locKey === '商店') {
            const buyBtn = card.querySelector('.buy-btn[data-item="resin"]');
            if (buyBtn) buyBtn.textContent = locData.buyBtn;
            const machineBtn = card.querySelector('.buy-btn[data-item="machine"]');
            if (machineBtn) machineBtn.textContent = locData.machineBtn;
        }
    }
    
    // Translate Special Actions Panel
    const askBtnEl = document.getElementById('ask-btn');
    if (askBtnEl) askBtnEl.innerHTML = t.game.askBtn;
    
    const teachSelectLabel = document.querySelector('.teach-box-premium span');
    if (teachSelectLabel) teachSelectLabel.textContent = t.game.teachLabel;
    
    const teachBtnEl = document.getElementById('teach-btn');
    if (teachBtnEl) teachBtnEl.innerHTML = t.game.teachBtn;

    const helpBtnEl = document.getElementById('help-btn');
    if (helpBtnEl) helpBtnEl.innerHTML = t.game.helpBtn;

    const kbBtnEl = document.getElementById('open-kb-btn');
    // KB_TEXT is declared further down; on the very first call it is not initialised yet
    try { if (kbBtnEl) kbBtnEl.textContent = (KB_TEXT[currentLang] || KB_TEXT.zh).openBtn; } catch (e) { /* first load: keep the default label */ }

    // 7. Translate Rules Modal
    const rulesModalContent = document.querySelector('#rules-modal .modal-content');
    if (rulesModalContent) {
        rulesModalContent.innerHTML = t.rulesHtml;
    }

    // 8. Translate Lobby Side Widgets
    const leftWidgetTitle = document.getElementById('left-widget-title');
    if (leftWidgetTitle) leftWidgetTitle.textContent = t.widgets.leftTitle;

    const lblTide = document.getElementById('label-widget-tide');
    if (lblTide) lblTide.textContent = t.widgets.tideLabel;
    
    const lblWave = document.getElementById('label-widget-wave');
    if (lblWave) lblWave.textContent = t.widgets.waveLabel;
    
    const lblWind = document.getElementById('label-widget-wind');
    if (lblWind) lblWind.textContent = t.widgets.windLabel;
    
    const lblTemp = document.getElementById('label-widget-temp');
    if (lblTemp) lblTemp.textContent = t.widgets.tempLabel;

    const lblMoon = document.getElementById('label-widget-moon');
    if (lblMoon) lblMoon.textContent = t.widgets.moonLabel;

    const rightWidgetTitle = document.getElementById('right-widget-title');
    if (rightWidgetTitle) rightWidgetTitle.textContent = t.widgets.rightTitle;

    const lblActive = document.getElementById('label-widget-active');
    if (lblActive) lblActive.textContent = t.widgets.activeLabel;
    
    const lblBoats = document.getElementById('label-widget-boats');
    if (lblBoats) lblBoats.textContent = t.widgets.boatsLabel;
    
    const lblHemp = document.getElementById('label-widget-hemp');
    if (lblHemp) lblHemp.textContent = t.widgets.hempLabel;

    const lblTickerTitle = document.getElementById('label-widget-ticker-title');
    if (lblTickerTitle) lblTickerTitle.textContent = t.widgets.tickerTitle;

    if (window.updateWidgetLanguages) {
        window.updateWidgetLanguages();
    }
}


// DOM Elements
const lobbyScreen = document.getElementById('lobby');
const gameScreen = document.getElementById('game');
const joinSection = document.getElementById('join-section');
const waitingSection = document.getElementById('waiting-section');

const rulesModal = document.getElementById('rules-modal');
const openRulesBtn = document.getElementById('open-rules-btn');
const closeRulesBtn = document.getElementById('close-rules-btn');

const joinBtn = document.getElementById('join-btn');
const createBtn = document.getElementById('create-btn');
const startGameBtn = document.getElementById('start-game-btn');
const leaveLobbyBtn = document.getElementById('leave-lobby-btn');
const leaveGameBtn = document.getElementById('leave-game-btn');

const playerNameInput = document.getElementById('player-name');
const roomCodeInput = document.getElementById('room-code');
const displayRoomCode = document.getElementById('display-room-code');
const roleOptions = document.querySelectorAll('.role-option');
const lobbyPlayersList = document.getElementById('lobby-players-list');

const monthEl = document.getElementById('current-month');
const monthNameEl = document.getElementById('month-name');
const monthDescEl = document.getElementById('month-desc');
const nextMonthBtn = document.getElementById('next-month-btn');

const playersListEl = document.getElementById('players-list');
const logsEl = document.getElementById('logs');
const myStatusEl = document.getElementById('my-status');

const askBtn = document.getElementById('ask-btn');
const teachContainer = document.getElementById('teach-container');
const teachTargetSelect = document.getElementById('teach-target');
const teachBtn = document.getElementById('teach-btn');
const askMiddleBtn = document.getElementById('ask-middle-btn');
const helpBtn = document.getElementById('help-btn');

// Chat UI
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatMessagesEl = document.getElementById('chat-messages');

// Avatar Creator
const avatarScreen = document.getElementById('avatar-screen');
const avatarBackBtn = document.getElementById('avatar-back-btn');
const avatarConfirmBtn = document.getElementById('avatar-confirm-btn');
const avatarRoleName = document.getElementById('avatar-role-name-label');

let selectedRole = 'elder';
let myId = null;
let currentDisplayedMonth = 0;
let pendingRoomAction = null;
let currentAvatarSelections = {};
let lastGameState = null;
let lightRaysInstance = null;
let prismaticBurstInstance = null;
let locPlayerCardInstances = [];




const scriptEvents = {
    2: {
        title_zh: "【封山危機】遺忘儲備的代價",
        title_en: "【Mountain Closure】Price of Forgetting to Stockpile",
        dialogues_zh: [
            { role: "文化復振青年", text: "糟了！我的 Avaka 原料用完了，但現在上山會觸犯禁忌……" },
            { role: "中生代", text: "這就是為什麼老人家說 Kashyman 月要拼命存貨。山上現在不能去，但你可以來問我，或是帶著禮物去請教老人家。等待的時候，正好把該懂的學起來。" }
        ],
        dialogues_en: [
            { role: "Young Apprentice (Youth)", text: "Oh no! I'm out of Avaka, but entering the mountains now is forbidden..." },
            { role: "Middle Generation", text: "This is why the elders said to stock up in Kashyman. The forest is closed now, but you can come and ask me, or bring a gift and ask the Elder. Waiting is a good time to learn what you need to know." }
        ],
        desc_zh: "【飛魚禁令】部落灘頭已舉行招魚祭，整個月門戶關閉。為了尊重魚靈，所有男人禁止進入山林，無法執行「①砍伐剝皮」！\n💡 提示：你可以請同區域的隊友使用「贈與」功能支援你材料。",
        desc_en: "【Flying Fish Ban】The beach ritual is active. All men are banned from entering the mountains. Cannot perform '① Chop & Peel'!\n💡 Tip: Ask teammates in the same area to use 'Give Mat' to support you."
    },
    5: {
        title_zh: "【梅雨腐蝕】時間與天氣的賽跑",
        title_en: "【Plum Rain Erosion】Race Against Time and Weather",
        dialogues_zh: [
            { role: "系統", text: "天空陰雲密佈，突如其來的降雨讓你在灘頭曝曬的 Avaka 纖維陷入腐爛危機。" },
            { role: "耆老", text: "孩子，做船不能只看地上的麻，要看天上的雲。快收起來！" }
        ],
        dialogues_en: [
            { role: "System", text: "Clouds gather. A sudden downpour puts your drying Avaka fiber at risk of rotting." },
            { role: "Elder", text: "Child, building a boat is not just about the hemp on the ground, but the clouds in the sky. Hurry, pack it up!" }
        ],
        desc_zh: "【梅雨季節】進入本月時，擁有材料且「未完成工序④乾燥」的玩家，會用上個月留下的 1 AP 來遮蓋防潮。上個月把 AP 全部用光的人來不及保護，材料受潮損壞歸零！",
        desc_en: "【Plum Rain Season】On entering this month, players holding materials who haven't finished step 4 (Drying) use 1 AP left over from last month to cover them. Anyone who spent all their AP last month is too late: the wet materials rot to zero!"
    },
    10: {
        title_zh: "【禁忌之月】心理韌性的考驗",
        title_en: "【Forbidden Month】A Test of Resilience",
        dialogues_zh: [
            { role: "中生代", text: "這就是『儀式時間』的邏輯。你得學會等待。如果你現在強行完工，這艘船在部落眼中將失去靈魂。" },
            { role: "文化復振青年", text: "但我只剩兩個月就要結算了！如果不現在做，我怕來不及完成……" }
        ],
        dialogues_en: [
            { role: "Middle Generation", text: "This is the logic of 'Ceremonial Time'. You must learn to wait. Finishing the ship now will make it soulless to the tribe." },
            { role: "Young Apprentice (Youth)", text: "But I only have two months left! If I don't do it now, I'm afraid I won't finish in time..." }
        ],
        desc_zh: "【大凶之月】這是專門製作貝灰的月份，不允許造屋或落成禮。本月任何方式都不能完工：填縫、機器加工、工業樹脂皆禁止。\n💡 提示：趁這段時間多向長輩「請益」累積 KP 吧！",
        desc_en: "【Taboo Month】This month is dedicated to shell lime burning. Building and launches are banned. No boat can be finished this month, by any path (caulking, machine processing or resin)!\n💡 Tip: Use this time to 'Learn' from the Elder and build KP!"
    },
    12: {
        title_zh: "【最終衝刺】祖先的祝福",
        title_en: "【Final Sprint】Blessing of the Ancestors",
        dialogues_zh: [
            { role: "系統", text: "這是屬於手工藝的月份。雖然時間緊迫，但你發現自己的手感前所未有的流暢。" },
            { role: "耆老", text: "看吧，只要你順應時序，土地會給你最後的補償。快動手，讓這條船趕在明年飛魚祭前下水！" }
        ],
        dialogues_en: [
            { role: "System", text: "This is the month of handicraft. Though time is short, your hands move smoother than ever." },
            { role: "Elder", text: "Look, as long as you follow the calendar, the land will reward you. Hurry, let's launch this boat before next year's festival!" }
        ],
        desc_zh: "【最終衝刺】本月執行「⑤理線撚繩」不消耗任何 AP，而且⑤與⑥不必跨月等待，可以接連完成！請把握最後的機會完成拼板舟。",
        desc_en: "【Final Sprint】⑤ Twining costs 0 AP this month, and steps ⑤ and ⑥ need no cross-month wait, so you can do them back to back! Seize this final opportunity to complete your boat."
    }
};

const GAME_RULES = [
    {name: "Kashyman", desc_zh: "準備月：為接下來的封山存貨，執行「①砍伐剝皮」可獲得 2 份材料（原為 1 份）。", desc_en: "Prep Month: Stock up before the forest closes. ① Chop & Peel yields 2 materials instead of 1."},
    {name: "Kapowan", desc_zh: "飛魚禁令：禁止進入山林（會被強制退回灘頭），無法執行「①砍伐剝皮」。", desc_en: "Flying Fish Ban: Forest closed. Cannot enter it or perform ① Chop & Peel."},
    {name: "Pikaokaod", desc_zh: "捕撈飛魚盛期（集體勞動）：部落分工合作，執行任何一道工序，AP 消耗減少 1 點。", desc_en: "Peak Fishing (collective labour): the village shares the work, so every craft step costs 1 AP less."},
    {name: "Papataw", desc_zh: "男人勤於出海：所有「請益」多消耗 1 AP（青年向耆老 4 AP、中生代向耆老 3 AP、青年向中生代 2 AP）。下個月是梅雨季：持有材料的人，本月結束前請留下 1 AP 防潮。", desc_en: "Men at Sea: Every Ask costs +1 AP (Youth→Elder 4, Middle Generation→Elder 3, Youth→Middle Generation 2). Plum rain comes next month: if you hold materials, keep 1 AP unspent at the end of this month."},
    {name: "Pipilapila", desc_zh: "梅雨季節：進入本月時，持有材料且「未完成工序④乾燥」的人，要用上個月留下的 1 AP 防潮；上個月把 AP 用光的人，材料腐爛歸零。", desc_en: "Plum Rain Season: On entering this month, players holding materials who have not finished step ④ Drying spend 1 AP left over from last month to keep them dry; if you used up all your AP last month, your materials rot to zero."},
    {name: "Apiya vehan", desc_zh: "好月節（送禮分享的吉月）：贈送材料給耆老、幫忙長者的得分加倍（各 +2 分）。", desc_en: "Good Month Festival (a month for giving and sharing): gifts to the Elder and helping the Elder score double (+2 each)."},
    {name: "Pehhakow", desc_zh: "解禁重啟：山林解禁，執行「①砍伐剝皮」（消耗 3 AP）可獲得 2 份材料（原為 1 份）。", desc_en: "Forest Reopened: ① Chop & Peel yields 2 materials instead of 1."},
    {name: "Pitanatana", desc_zh: "土器月（物質掌握）：採陶土、燒陶器，是掌握材料性質的月份，執行「科學轉譯」必定成功。", desc_en: "Clay Vessel Month (mastering materials): the month of digging clay and firing pots. Scientific Translation always succeeds."},
    {name: "Kalimman", desc_zh: "飛魚終食祭：全部落參與祭儀，本月無法在商店完工。", desc_en: "Final Fish Feast: the whole village takes part in the ritual; you cannot finish at the store this month."},
    {name: "Kaneman", desc_zh: "禁忌之月：不允許落成，本月任何方式都不能完工（填縫、機器加工、工業樹脂皆禁止）。", desc_en: "Forbidden Month: no boat may be completed this month, by any path (caulking, machine processing and resin are all banned)."},
    {name: "Kapitowan", desc_zh: "祭神月：回合開始時，若青年／中生代與耆老處於同一個地點，可自動獲得 2 點 KP。", desc_en: "Sacred Month: Youth and Middle Generation in the same place as the Elder automatically gain +2 KP."},
    {name: "Kaowan", desc_zh: "手工藝月（最終衝刺）：「⑤理線撚繩」消耗 0 AP，而且⑤與⑥不必跨月等待，可以在本月接連完成。", desc_en: "Handicraft Month (final sprint): ⑤ Twining costs 0 AP, and steps ⑤ and ⑥ need no cross-month wait, so they can be done back to back this month."}
];

function showMonthEventModal(month) {
    const ev = scriptEvents[month];
    const rule = GAME_RULES[month - 1];
    if (!rule) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active event-card-container';
    modal.style.zIndex = '3000';
    
    const isEn = currentLang === 'en';
    let title = ev 
        ? (isEn ? ev.title_en : ev.title_zh) 
        : (isEn ? `Month ${month}: ${rule.name}` : `第 ${month} 個月：${rule.name}`);
    let desc = ev 
        ? (isEn ? ev.desc_en : ev.desc_zh) 
        : (isEn ? `【Monthly Rule】\n${rule.desc_en}` : `【本月規則】\n${rule.desc_zh}`);
    
    let html = `
        <div class="modal-content event-card" style="position: relative; max-width: 600px; max-height: 90vh; display: flex; flex-direction: column; padding: 12px; text-align: left; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.9), 0 0 20px rgba(197,160,89,0.25); border: 2px solid #C5A059; border-radius: 2px; background: repeating-linear-gradient(45deg, rgba(197,160,89,0.035) 0px, rgba(197,160,89,0.035) 1px, transparent 1px, transparent 5px), repeating-linear-gradient(-45deg, rgba(197,160,89,0.035) 0px, rgba(197,160,89,0.035) 1px, transparent 1px, transparent 5px), linear-gradient(135deg, rgba(16,20,28,0.98), rgba(10,12,16,0.95)); ">
            
            <!-- Baroque Top Center Ornament -->
            <div style="position:absolute; top: -16px; left: 50%; transform: translateX(-50%); color: #C5A059; font-size: 1.8rem; background: #11151c; padding: 0 15px; text-shadow: 0 0 15px rgba(197,160,89,0.8); z-index: 10;">⚜</div>
            
            <div style="position: relative; border: 1px solid rgba(197,160,89,0.4); display: flex; flex-direction: column; overflow: hidden; flex: 1;">
                
                <!-- Baroque Corner Ornaments (Scalloped cutouts with stars) -->
                <div style="position:absolute; top: -1px; left: -1px; color: #C5A059; font-size: 0.9rem; background: #11151c; width: 22px; height: 22px; display:flex; align-items:center; justify-content:center; border-right: 1px solid rgba(197,160,89,0.4); border-bottom: 1px solid rgba(197,160,89,0.4); border-bottom-right-radius: 12px; z-index: 5;">✦</div>
                <div style="position:absolute; top: -1px; right: -1px; color: #C5A059; font-size: 0.9rem; background: #11151c; width: 22px; height: 22px; display:flex; align-items:center; justify-content:center; border-left: 1px solid rgba(197,160,89,0.4); border-bottom: 1px solid rgba(197,160,89,0.4); border-bottom-left-radius: 12px; z-index: 5;">✦</div>
                <div style="position:absolute; bottom: -1px; left: -1px; color: #C5A059; font-size: 0.9rem; background: #11151c; width: 22px; height: 22px; display:flex; align-items:center; justify-content:center; border-right: 1px solid rgba(197,160,89,0.4); border-top: 1px solid rgba(197,160,89,0.4); border-top-right-radius: 12px; z-index: 5;">✦</div>
                <div style="position:absolute; bottom: -1px; right: -1px; color: #C5A059; font-size: 0.9rem; background: #11151c; width: 22px; height: 22px; display:flex; align-items:center; justify-content:center; border-left: 1px solid rgba(197,160,89,0.4); border-top: 1px solid rgba(197,160,89,0.4); border-top-left-radius: 12px; z-index: 5;">✦</div>
                
                <div style="padding: 1.8rem 2.2rem; background-image: radial-gradient(circle at top right, rgba(197,160,89,0.1), transparent 45%); overflow-y: auto; flex: 1; position: relative; z-index: 1;" class="custom-scrollbar">
                    <div style="display:flex; justify-content: space-between; align-items:flex-start; border-bottom: 1px dashed rgba(197,160,89,0.3); padding-bottom: 1rem; margin-bottom: 1.2rem;">
                    <h2 style="color:var(--secondary); font-size: 1.7rem; margin: 0; letter-spacing: 1px; text-shadow: 0 2px 10px rgba(212,175,55,0.3);">${title}</h2>
                    <span style="background: rgba(212,175,55,0.15); color: var(--secondary); padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.85rem; font-weight: bold; border: 1px solid rgba(212,175,55,0.4); text-transform: uppercase; letter-spacing: 2px; flex-shrink: 0; margin-left: 1rem;">EVENT</span>
                </div>
                <div style="display:flex; flex-direction:column; gap: 0.8rem; margin-bottom: 1.2rem;">
    `;
    
    if (ev) {
        const dialogues = isEn ? ev.dialogues_en : ev.dialogues_zh;
        if (dialogues) {
            dialogues.forEach(d => {
                const isSys = d.role === '系統' || d.role === 'System';
                let color = 'var(--text-muted)';
                if (!isSys) {
                    if (d.role.includes('青年') || d.role.includes('Apprentice')) color = '#4CAF50';
                    else if (d.role.includes('耆老') || d.role.includes('Elder')) color = '#FFC107';
                    else color = '#03A9F4';
                }
                html += `
                    <div style="background: rgba(0,0,0,0.4); padding: 1rem 1.2rem; border-radius: 8px; border-left: 3px solid ${color}; transition: transform 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <strong style="color: ${color}; display: block; margin-bottom: 0.3rem; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 1px;">${d.role}</strong>
                        <span style="line-height: 1.6; color: #f8fafc; font-size: 1.05rem;">${d.text}</span>
                    </div>
                `;
            });
        }
    }
    
    const btnText = isEn ? 'I Understand' : '我明白了';
    const ruleLabel = isEn ? 'Rule Update' : '規則更新';
    
    html += `
                </div>
                <div style="background: rgba(244, 67, 54, 0.05); border-left: 4px solid var(--danger); padding: 1.2rem; border-radius: 0 8px 8px 0; margin-bottom: 1.5rem; box-shadow: inset 0 0 20px rgba(244,67,54,0.02);">
                    <h4 style="color: rgba(244, 67, 54, 0.8); margin: 0 0 0.6rem 0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 2px;">${ruleLabel}</h4>
                    <p style="color: #f1f5f9; font-size: 0.95rem; line-height: 1.6; white-space: pre-line; margin: 0;">${desc}</p>
                </div>
                <button class="btn primary glow-btn" style="width: 100%; padding: 1rem; font-size: 1.1rem; letter-spacing: 2px; border-radius: 8px; transition: all 0.3s; text-transform: uppercase; margin-top: auto;" onclick="this.closest('.modal-overlay').remove()">${btnText}</button>
                </div>
            </div>
        </div>
    `;
    modal.innerHTML = html;
    document.body.appendChild(modal);
}

// Rules Modal
document.addEventListener('click', (e) => {
    if (e.target.id === 'open-rules-btn' || e.target.closest('#open-rules-btn')) {
        document.getElementById('rules-modal').classList.add('active');
    } else if (e.target.id === 'close-rules-btn' || e.target.closest('#close-rules-btn')) {
        document.getElementById('rules-modal').classList.remove('active');
    }
});

// Role Selection
roleOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        roleOptions.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selectedRole = opt.dataset.role;
    });
});

// ── BorderGlow: pointer tracking for role cards ───────────────────────────
(function initRoleCardGlow() {
    function getCenterHalf(el) {
        const { width, height } = el.getBoundingClientRect();
        return [width / 2, height / 2];
    }
    function getEdgeProximity(el, x, y) {
        const [cx, cy] = getCenterHalf(el);
        const dx = x - cx, dy = y - cy;
        let kx = Infinity, ky = Infinity;
        if (dx !== 0) kx = cx / Math.abs(dx);
        if (dy !== 0) ky = cy / Math.abs(dy);
        return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1) * 100;
    }
    function getCursorAngle(el, x, y) {
        const [cx, cy] = getCenterHalf(el);
        const dx = x - cx, dy = y - cy;
        if (dx === 0 && dy === 0) return 0;
        let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        return ((deg % 360) + 360) % 360;
    }
    roleOptions.forEach(card => {
        card.addEventListener('pointermove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--edge-proximity', getEdgeProximity(card, x, y).toFixed(2));
            card.style.setProperty('--cursor-angle', getCursorAngle(card, x, y).toFixed(2) + 'deg');
        }, { passive: true });
        card.addEventListener('pointerleave', () => {
            card.style.setProperty('--edge-proximity', '0');
        }, { passive: true });
    });
})();
// ─────────────────────────────────────────────────────────────────────────────

// Join & Create
document.addEventListener('DOMContentLoaded', () => {
    // Initialize LightRays shader background
    const lightRaysCanvas = document.getElementById('light-rays-canvas');
    if (lightRaysCanvas && window.LightRaysShader) {
        lightRaysInstance = new LightRaysShader(lightRaysCanvas, {
            raysOrigin: 'top-center',
            raysColor: '#fde68a', // Gorgeous warm golden sunlight for the lobby
            raysSpeed: 0.8,
            lightSpread: 1.2,
            rayLength: 2.5,
            pulsating: true,
            fadeDistance: 1.0,
            saturation: 1.0,
            followMouse: true,
            mouseInfluence: 0.15,
            distortion: 0.08
        });
    }

    // Initialize Language Switcher click listener
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            currentLang = currentLang === 'zh' ? 'en' : 'zh';
            applyLanguage();
            playActionSound();
            if (lastGameState) {
                if (lastGameState.started) {
                    renderGame(lastGameState);
                } else {
                    renderLobby(lastGameState);
                }
            }
        });
    }

    // Apply active language configuration on launch
    applyLanguage();
    if (typeof initLobbyWidgets === 'function') {
        initLobbyWidgets();
    }

    // Background Effects Spawners
    function spawnLeaf() {
        const layer = document.querySelector('.leaves-layer');
        if (!layer || layer.style.opacity === '0' || layer.style.opacity === '') return;
        const leaf = document.createElement('div');
        leaf.className = 'leaf-particle';
        leaf.innerHTML = `<div style="transform: scale(${Math.random() * 2.5 + 0.5})">
            <svg style="filter: drop-shadow(0 0 5px rgba(255,255,255,0.2));" viewBox="0 0 24 24" fill="rgba(255,255,255,0.35)" width="24" height="24"><path d="M17,8C8,10 5.5,13.5 5.5,17C5.5,17 7.5,14 11.5,13.5C11.5,13.5 12,18 12,18C12,18 13.5,12.5 17,8Z"/></svg>
        </div>`;
        const duration = Math.random() * 5 + 5;
        leaf.style.left = `${Math.random() * 100}vw`;
        leaf.style.animationDuration = `${duration}s`;
        layer.appendChild(leaf);
        setTimeout(() => { if(leaf.parentNode) leaf.parentNode.removeChild(leaf); }, duration * 1000);
    }

    function spawnFish() {
        const layer = document.querySelector('.fishes-layer');
        if (!layer || layer.style.opacity === '0' || layer.style.opacity === '') return;
        const fish = document.createElement('div');
        fish.className = 'fish-particle';
        const isReverse = Math.random() > 0.5;
        fish.innerHTML = `<div style="transform: scale(${Math.random() * 2 + 0.8}) ${isReverse ? 'scaleX(-1)' : ''}">
            <svg style="filter: drop-shadow(0 0 8px rgba(255,255,255,0.2));" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)" width="40" height="20"><path d="M2 12C2 12 7 7 12 12C17 17 22 12 22 12C22 12 17 9 12 12C7 15 2 12 2 12ZM4 12L1 10V14L4 12Z"/></svg>
        </div>`;
        const duration = Math.random() * 8 + 7;
        fish.style.top = `${Math.random() * 60 + 20}vh`;
        fish.style.animationDuration = `${duration}s`;
        if (isReverse) {
            fish.style.left = '110vw';
            fish.style.animationName = 'swimAcrossReverse';
        }
        layer.appendChild(fish);
        setTimeout(() => { if(fish.parentNode) fish.parentNode.removeChild(fish); }, duration * 1000);
    }

    function spawnRain() {
        const layer = document.querySelector('.rain-layer');
        if (!layer || layer.style.opacity === '0' || layer.style.opacity === '') return; // Don't spawn on cover
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        const duration = Math.random() * 0.4 + 0.3; 
        drop.style.left = `${Math.random() * 100}vw`;
        drop.style.animationDuration = `${duration}s`;
        layer.appendChild(drop);
        setTimeout(() => { if(drop.parentNode) drop.parentNode.removeChild(drop); }, duration * 1000);
    }

    function spawnStar() {
        const layer = document.querySelector('.stars-layer');
        if (!layer || layer.style.opacity === '0' || layer.style.opacity === '') return; // Don't spawn on cover
        const star = document.createElement('div');
        star.className = 'star-particle';
        star.style.left = `${Math.random() * 100}vw`;
        star.style.top = `${Math.random() * 60}vh`; 
        const duration = Math.random() * 3 + 2;
        star.style.animationDuration = `${duration}s`;
        layer.appendChild(star);
        setTimeout(() => { if(star.parentNode) star.parentNode.removeChild(star); }, duration * 1000);
    }

    const isMobile = window.innerWidth <= 768;
    setInterval(spawnLeaf, isMobile ? 3000 : 800);
    setInterval(spawnFish, isMobile ? 6000 : 2000);
    setInterval(spawnRain, isMobile ? 200 : 30);
    setInterval(spawnStar, isMobile ? 1200 : 300);
});

joinBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    const code = roomCodeInput.value.trim().toUpperCase();
    if (!name) return showToast('請輸入名字！');
    if (!code || code.length !== 4) return showToast('請輸入4碼房間代碼！');
    
    openAvatarCreator('join', { name, role: selectedRole, room_code: code });
});

createBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (!name) return showToast('請輸入名字！');
    
    openAvatarCreator('create', { name, role: selectedRole });
});

function openAvatarCreator(actionType, data) {
    pendingRoomAction = { type: actionType, data: data };
    
    if (avatarRoleName) avatarRoleName.textContent = AVATAR_ROLE_LABELS[data.role] || '';
    
    lobbyScreen.classList.remove('active');
    avatarScreen.classList.add('active');
    if (typeof clearLobbyWidgets === 'function') {
        clearLobbyWidgets();
    }
    
    ensureRattanHelmetButton();
    
    // Give DOM time to render canvas, then init Three.js
    setTimeout(() => { initAvatar3D(); }, 80);
}

function ensureRattanHelmetButton() {
    const accessoryRow = document.querySelector('[data-ctrl="accessory"]');
    if (accessoryRow && !accessoryRow.querySelector('[data-val="rattan_helmet"]')) {
        const btn = document.createElement('button');
        btn.className = 'avatar-opt';
        btn.dataset.val = 'rattan_helmet';
        btn.title = '藤盔：傳統編織藤帽，由8根粗省藤直脊與省藤圈圈編而成';
        btn.textContent = (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'Rattan Helmet' : '藤盔';
        btn.style.cssText = 'flex:1; min-width:55px;';
        
        const silverBtn = accessoryRow.querySelector('[data-val="silver_helmet"]');
        if (silverBtn) {
            accessoryRow.insertBefore(btn, silverBtn);
        } else {
            accessoryRow.appendChild(btn);
        }
    }
}

// Avatar control buttons — swatch & option buttons
const avatarControlsEl = document.getElementById('avatar-controls');
if (avatarControlsEl) {
    avatarControlsEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-val]');
        if (!btn) return;
        const row = btn.closest('[data-ctrl]');
        if (!row) return;
        const ctrl = row.dataset.ctrl;
        const val = btn.dataset.val;
        
        // Deselect siblings
        row.querySelectorAll('.swatch, .avatar-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        // Update 3D
        updateAvatarPart(ctrl, val);
    });
}

avatarBackBtn.addEventListener('click', () => {
    destroyAvatar3D();
    avatarScreen.classList.remove('active');
    lobbyScreen.classList.add('active');
    if (typeof initLobbyWidgets === 'function') {
        initLobbyWidgets();
    }
    pendingRoomAction = null;
});

avatarConfirmBtn.addEventListener('click', () => {
    if (!pendingRoomAction) return;
    
    const snapshot = captureAvatarSnapshot();
    const faceLabels  = currentLang === 'en' ? {round:'Round', square:'Square', slim:'Slim'} : {round:'圓潤臉', square:'寬顎臉', slim:'清秀臉'};
    const hairLabels  = currentLang === 'en' ? {short:'Short', long:'Long', bun:'Bun', bald:'Bald'} : {short:'短直髮', long:'長直髮', bun:'束髻', bald:'光頭'};
    const accLabels   = currentLang === 'en' ? {none:'', silver_helmet:'Silver Helmet', rattan_helmet:'Rattan Helmet', chest_ornament:'Chest Ornament'} : {none:'', silver_helmet:'銀盔', rattan_helmet:'藤盔', chest_ornament:'胸飾'};
    const clothLabels = currentLang === 'en' ? {loincloth:'Loincloth', vest_dark:'Blue & White Vest', rattan_armor:'Rattan Armor', ceremony:'Ceremonial'} : {loincloth:'丁字褲', vest_dark:'藍白背心', rattan_armor:'藤甲', ceremony:'祭典全裝'};
    
    const avatarData = {
        image: snapshot,
        icon: '🧑',
        traits: [
            (currentLang === 'en' ? 'Hair: ' : '髮型:') + hairLabels[avatarState.hair],
            (currentLang === 'en' ? 'Face: ' : '臉型:') + faceLabels[avatarState.face],
            (currentLang === 'en' ? 'Expression: ' : '表情:') + (translations[currentLang].avatar.expressionOptions[avatarState.expression] || ''),
            (currentLang === 'en' ? 'Clothing: ' : '服飾:') + clothLabels[avatarState.cloth],
            avatarState.accessory !== 'none' ? (currentLang === 'en' ? 'Acc: ' : '配件:') + accLabels[avatarState.accessory] : null
        ].filter(Boolean)
    };
    
    pendingRoomAction.data.avatar = avatarData;
    pendingRoomAction.data.token = sessionToken();
    
    if (pendingRoomAction.type === 'join') {
        socket.emit('join_game', pendingRoomAction.data);
    } else {
        socket.emit('create_room', pendingRoomAction.data);
    }
    
    destroyAvatar3D();
    avatarScreen.classList.remove('active');
});

leaveLobbyBtn.addEventListener('click', () => {
    socket.emit('leave_game');
    clearSession(); mySession = null; lastGameState = null;
    waitingSection.style.display = 'none';
    joinSection.style.display = 'block';
});

leaveGameBtn.addEventListener('click', () => {
    const isEn = currentLang === 'en';
    
    // Use custom confirm modal instead of browser confirm() which can be blocked
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9900;background:rgba(2,6,23,0.80);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:modal-fade-in 0.25s ease;cursor:none;';
    
    overlay.innerHTML = `
        <div style="background:rgba(10,20,40,0.95);border:1px solid rgba(239,68,68,0.4);border-radius:16px;padding:2rem;max-width:320px;width:90%;text-align:center;box-shadow:0 0 40px rgba(239,68,68,0.2);">
            <div style="font-size:2rem;margin-bottom:0.5rem;">🚪</div>
            <h3 style="color:#f87171;margin-bottom:0.8rem;font-size:1.1rem;">${isEn ? 'Leave the Game?' : '確定要退出遊戲嗎？'}</h3>
            <p style="color:#94a3b8;font-size:0.85rem;margin-bottom:1.5rem;">${isEn ? 'Your progress in this session will be lost.' : '退出後，你在本局的行動記錄將無法恢復。'}</p>
            <div style="display:flex;gap:0.8rem;justify-content:center;">
                <button id="leave-cancel-btn" style="padding:0.6rem 1.4rem;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.07);color:#94a3b8;cursor:pointer;font-size:0.9rem;transition:all 0.2s;">${isEn ? 'Cancel' : '取消'}</button>
                <button id="leave-confirm-btn" style="padding:0.6rem 1.4rem;border-radius:8px;border:1px solid rgba(239,68,68,0.5);background:rgba(239,68,68,0.2);color:#f87171;cursor:pointer;font-size:0.9rem;font-weight:600;transition:all 0.2s;">${isEn ? 'Leave Game' : '退出遊戲'}</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    document.getElementById('leave-cancel-btn').addEventListener('click', () => {
        overlay.remove();
    });
    
    document.getElementById('leave-confirm-btn').addEventListener('click', () => {
        overlay.remove();
        // Send leave event and delay reload to ensure socket event is sent
        socket.emit('leave_game');
        clearSession(); mySession = null;
        setTimeout(() => { location.reload(); }, 300);
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
});


startGameBtn.addEventListener('click', () => {
    socket.emit('start_game');
});

// Socket Events
// This browser's private token and the room it is in survive a refresh, a sleeping phone or a dropped
// connection, so the server can hand the same player back.
const SESSION_KEY = 'avaka_session';
function loadSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
}
function saveSession(s) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) { /* private mode: reconnect still works without refresh */ }
}
function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
}
function newToken() {
    const bytes = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
let mySession = loadSession();   // { token, room_code }
function sessionToken() {
    if (!mySession || !mySession.token) mySession = { token: newToken(), room_code: null };
    return mySession.token;
}

function showConnectionBanner(show) {
    let el = document.getElementById('connection-banner');
    if (!show) { if (el) el.remove(); return; }
    if (!el) {
        el = document.createElement('div');
        el.id = 'connection-banner';
        el.style.cssText = 'position:fixed; top:0; left:0; right:0; z-index:99990; padding:0.6rem 1rem; text-align:center; font-size:0.95rem; font-weight:600; color:#fff7ed; background:rgba(194,65,12,0.95); box-shadow:0 2px 12px rgba(0,0,0,0.4);';
        document.body.appendChild(el);
    }
    el.textContent = currentLang === 'en' ? '⚠️ Connection lost. Reconnecting…' : '⚠️ 連線中斷，正在重新連線…';
}

let myOldId = null;
socket.on('connect', () => {
    showConnectionBanner(false);
    myOldId = myId;
    myId = socket.id;
    if (mySession && mySession.room_code) {
        socket.emit('rejoin_game', { old_id: myOldId, token: mySession.token, room_code: mySession.room_code });
    }
});

socket.on('disconnect', () => {
    if (mySession && mySession.room_code) showConnectionBanner(true);
});

socket.on('rejoin_failed', (err) => {
    const wasInRoom = lastGameState !== null;
    clearSession();
    mySession = null;
    if (wasInRoom) {
        showToast(err && err.msg ? err.msg : '無法回到原本的遊戲');
        setTimeout(() => location.reload(), 1500);
    }
});

// A phone coming back from sleep or another app: reconnect right away instead of waiting for the next retry
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !socket.connected) socket.connect();
});
window.addEventListener('online', () => { if (!socket.connected) socket.connect(); });

socket.on('error', (err) => {
    showToast(err.msg);
    if (gameScreen.classList.contains('active')) return;
    // Ensure we go back to the login screen if an error occurs (e.g. wrong room code)
    avatarScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    lobbyScreen.classList.add('active');
    waitingSection.style.display = 'none';
    joinSection.style.display = 'block';
});

socket.on('state_update', (state) => {
    lastGameState = state;
    if (state.players[myId] && (!mySession || mySession.room_code !== state.room_code)) {
        mySession = { token: sessionToken(), room_code: state.room_code };
        saveSession(mySession);
    }
    if (!state.started && Object.keys(state.players).length > 0 && state.month > 12) {
        // Game Over
        renderGameOver(state);
        if (typeof clearLobbyWidgets === 'function') clearLobbyWidgets();
        return;
    }

    if (!state.started) {
        // Lobby state
        if (prismaticBurstInstance) {
            prismaticBurstInstance.destroy();
            prismaticBurstInstance = null;
        }
        const wasLobbyActive = lobbyScreen.classList.contains('active');
        lobbyScreen.classList.add('active');
        gameScreen.classList.remove('active');
        avatarScreen.classList.remove('active');
        renderLobby(state);
        if (!wasLobbyActive && typeof initLobbyWidgets === 'function') {
            initLobbyWidgets();
        }
    } else {
        // Game state
        const wasLobbyActive = lobbyScreen.classList.contains('active');
        lobbyScreen.classList.remove('active');
        avatarScreen.classList.remove('active');
        gameScreen.classList.add('active');
        if (wasLobbyActive && typeof clearLobbyWidgets === 'function') {
            clearLobbyWidgets();
        }
        
        if (state.month !== currentDisplayedMonth) {
            currentDisplayedMonth = state.month;
            if (state.month <= 12) {
                showMonthEventModal(state.month);
            }
        }
        
        renderGame(state);
    }
});

// Chat logic
function sendChatMessage() {
    const msg = chatInput.value.trim();
    if (msg) {
        socket.emit('chat_message', { msg });
        chatInput.value = '';
    }
}

chatSendBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

socket.on('chat_broadcast', (data) => {
    const msgEl = document.createElement('div');
    msgEl.style.background = 'rgba(0,0,0,0.2)';
    msgEl.style.padding = '0.5rem';
    msgEl.style.borderRadius = '6px';
    msgEl.style.fontSize = '0.9rem';
    const nameSpan = document.createElement('strong');
    nameSpan.style.color = 'var(--secondary)';
    nameSpan.textContent = data.name + ':';
    const textSpan = document.createElement('span');
    textSpan.style.color = 'var(--text-main)';
    textSpan.textContent = ' ' + data.msg;
    msgEl.appendChild(nameSpan);
    msgEl.appendChild(textSpan);
    chatMessagesEl.appendChild(msgEl);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
});


function showToast(msg) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.style.background = 'rgba(239, 68, 68, 0.9)';
    toast.style.color = '#fff';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    toast.style.fontWeight = 'bold';
    toast.style.transition = 'opacity 0.3s ease-out';
    toast.textContent = msg;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// Lore Data and Modal Logic
const monthLoreData = [
    null,
    { 
        title_zh: "【迎接魚季與社交】", 
        title_en: "【Welcoming Season & Socializing】",
        desc_zh: "● 祭儀：舉行「立春」儀式與「孝敬父母日」。進行殺豬祭儀，將豬肉分享給祖先以祈求出海平安。<br><br>● 勞動：準備捕魚工具、採集材料、修補大船、理髮。",
        desc_en: "● Rituals: Spring welcoming & Parents honoring. Pig sacrifice for safety at sea.<br><br>● Labor: Prep fishing gear, gather bark, repair big ships, hair cutting."
    },
    { 
        title_zh: "【禁忌與正式招魚】", 
        title_en: "【Taboo & Formal Fish Summoning】",
        desc_zh: "● 祭儀：舉行正式的招飛魚祭 (Manlag)。紅頭部落於初二開始。東清部落會焚燒蘆葦莖製作火把。<br><br>● 文化：進入禁慾期（Paneneb），男船員在共宿屋（Panragan）集體生活以防寒並防止私會婦女。<br><br>● 勞動：開始夜間火把捕魚；山林封閉，不上山工作。",
        desc_en: "● Rituals: Formal Flying Fish Summon (Manlag). Burning reed stalks for torches.<br><br>● Culture: Taboo period (Paneneb); crew sleep in communal huts to stay warm & disciplined.<br><br>● Labor: Night torch fishing begins; the forest is closed and no work is done in the mountains."
    },
    { 
        title_zh: "【全力捕撈與放寬】", 
        title_en: "【Full-Scale Fishing & Relaxing】",
        desc_zh: "● 祭儀：大船船組解散，男人可回原家屋睡覺。<br><br>● 文化：捕獲的飛魚可帶回家中煮熟處理，並塗抹鹽巴晾曬。<br><br>● 勞動：全力捕撈飛魚；婦女開始到山上採集陸蟹。",
        desc_en: "● Rituals: Big boat groups disband. Men return home to sleep.<br><br>● Culture: Caught fish brought home, cooked, salted, and dried.<br><br>● Labor: Full-scale flying fish catch; women gather land crabs."
    },
    { 
        title_zh: "【鬼頭刀與慰勞】", 
        title_en: "【Mahi-Mahi & Appreciation】",
        desc_zh: "● 祭儀：舉行小船招魚祭，開始晝間繩釣鬼頭刀。舉行慰勞節（螃蟹祭），婦女製作芋頭糕慰勞丈夫辛勞。<br><br>● 勞動：砍伐專門晾曬鬼頭刀的魚架（Papataw）。",
        desc_en: "● Rituals: Small boat summon; daytime line fishing for Mahi-Mahi. Appreciation Festival (Crab Feast): women make taro cakes for husbands.<br><br>● Labor: Gather wood for Mahi-Mahi racks."
    },
    { 
        title_zh: "【儲備與祈福】", 
        title_en: "【Storage & Blessing】",
        desc_zh: "● 祭儀：月初舉行祈福祭。<br><br>● 勞動：舉行蒸飛魚祭（mapasoad），將飛魚乾剪翅後蒸熟儲存。製作木臼與木杵。",
        desc_en: "● Rituals: Blessing ceremony at the start of the month.<br><br>● Labor: Steaming ceremony (mapasoad): clip wings, steam, dry, store. Craft wooden mortar and pestles."
    },
    { 
        title_zh: "【共享與終止】", 
        title_en: "【Sharing & Termination】",
        desc_zh: "● 祭儀：飛魚終了祭，此月結束後不再捕飛魚。舉行收獲節與小米祭。<br><br>● 文化：稱為「好月節」，親友間互相贈送剩餘的飛魚，分享勞動成果。",
        desc_en: "● Rituals: End-of-Season ceremony. Harvest and millet festivals.<br><br>● Culture: Known as the 'Good Month'. Relatives share remaining fish to celebrate labor."
    },
    { 
        title_zh: "【耕作與落成】", 
        title_en: "【Farming & House Launching】",
        desc_zh: "● 祭儀：適合舉辦房屋（主屋、涼亭）或各種拼板舟的落成禮。<br><br>● 勞動：開始開墾新的水芋田與地瓜田。",
        desc_en: "● Rituals: Perfect month for house completion or plank boat launches.<br><br>● Labor: Start cultivating new water taro and sweet potato fields."
    },
    { 
        title_zh: "【取土燒陶】", 
        title_en: "【Clay Gathering & Pottery】",
        desc_zh: "● 勞動：採集陶土並燒製陶器（陶甕）。因氣候乾燥有利於陶器成型。",
        desc_en: "● Labor: Gather clay and fire traditional pottery vessels. Dry weather is perfect for shaping clay."
    },
    { 
        title_zh: "【終食與去穢】", 
        title_en: "【Final Fish Eating & Purification】",
        desc_zh: "● 祭儀：月中（14或15日）舉行飛魚終食祭，此後嚴禁食用飛魚乾。<br><br>● 文化：剩餘魚乾需餵豬，不可再儲存。此月被視為驅除惡靈的月份。",
        desc_en: "● Rituals: Mid-month (14th/15th) final fish feast. Eating dried fish is strictly banned afterwards.<br><br>● Culture: Remaining dried fish is fed to pigs, not stored. Purification rituals."
    },
    { 
        title_zh: "【大凶與貝灰】", 
        title_en: "【Taboo & Shell Lime】",
        desc_zh: "● 禁忌：全年最不吉利的月份，禁止建屋、造船落成或為嬰兒取名。<br><br>● 勞動：專門燒製貝灰（與檳榔共食或彩繪船身用）。",
        desc_en: "● Taboo: Most unlucky month. House building, boat launches, or naming babies is forbidden.<br><br>● Labor: Dedicated to burning shell lime (for betel nut or boat painting)."
    },
    { 
        title_zh: "【祭祖與播種】", 
        title_en: "【Ancestral worship & Planting】",
        desc_zh: "● 祭儀：舉行祖靈祭 (Pazos) 與亡魂節，感謝神靈保護與祖先養育。<br><br>● 勞動：播種小米；採伐蘆葦以備未來製作捕魚用的火把。",
        desc_en: "● Rituals: Ancestral ritual (Pazos) & All Souls Day. Thank the gods and ancestors.<br><br>● Labor: Plant millet; gather reeds to make fishing torches."
    },
    { 
        title_zh: "【工藝與冶金】", 
        title_en: "【Crafts & Metallurgy】",
        desc_zh: "● 勞動：男人從事冶鐵（製作銀帽、盔甲、漿繩）；女人織布並編織藤籃。<br><br>● 文化：婦女舉行祝福芋頭田的儀式。",
        desc_en: "● Labor: Men engage in metallurgy (silver helmets, armor, oars); women weave clothes and rattan baskets.<br><br>● Culture: Women perform taro field blessing rituals."
    }
];

document.addEventListener('click', (e) => {
    if (e.target.id === 'open-lore-btn') {
        const monthEl = document.getElementById('current-month');
        if (!monthEl) return;
        const month = parseInt(monthEl.textContent);
        const lore = monthLoreData[month];
        if (lore) {
            const isEn = currentLang === 'en';
            const ruleDesc = isEn ? GAME_RULES[month - 1].desc_en : GAME_RULES[month - 1].desc_zh;
            document.getElementById('lore-title').textContent = document.getElementById('month-name').textContent;
            document.getElementById('lore-subtitle').textContent = isEn ? lore.title_en : lore.title_zh;
            
            const loreText = isEn ? lore.desc_en : lore.desc_zh;
            const effectHtml = `<div style="background:rgba(212,175,55,0.1); border-left:4px solid var(--primary); padding:10px; margin-bottom:15px; border-radius:4px;">
                <strong>${isEn ? '✨ Special Effect' : '✨ 本月特殊效果'}：</strong><br>
                ${ruleDesc}
            </div>`;
            
            document.getElementById('lore-content').innerHTML = effectHtml + loreText;
            document.getElementById('lore-modal').style.display = 'flex';
        }
    } else if (e.target.id === 'close-lore-btn') {
        document.getElementById('lore-modal').style.display = 'none';
    }
});

function disableActionButtonsTemporarily() {
    const btns = document.querySelectorAll('.action-btn, #next-month-btn');
    btns.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    });
    setTimeout(() => {
        btns.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
        });
    }, 500);
}

function sendAction(data) {
    socket.emit('action', data);
    disableActionButtonsTemporarily();
}

function playActionSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
}

function showFloatingIcon(e, icon) {
    if (!e) return;
    const el = document.createElement('div');
    el.textContent = icon;
    el.style.position = 'fixed';
    el.style.left = `${e.clientX}px`;
    el.style.top = `${e.clientY}px`;
    el.style.transform = 'translate(-50%, -50%)';
    el.style.fontSize = '2.2rem';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '99999';
    el.style.opacity = '1';
    el.style.transition = 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
    el.style.textShadow = '0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(100,200,255,0.5)';
    document.body.appendChild(el);
    
    requestAnimationFrame(() => {
        el.style.transform = 'translate(-50%, -120px) scale(1.4)';
        el.style.opacity = '0';
    });
    
    setTimeout(() => el.remove(), 800);
}

// Action bindings
document.querySelectorAll('.move-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        playActionSound();
        showFloatingIcon(e, '🚶');
        const loc = e.target.closest('.location-card').dataset.loc;
        sendAction({ type: 'move', target: loc });
    });
});



document.querySelectorAll('.craft-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        playActionSound();
        showFloatingIcon(e, '🔨');
        const step = e.target.dataset.step;
        sendAction({ type: 'craft', step });
    });
});

document.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        playActionSound();
        const item = e.currentTarget.dataset.item || 'resin';
        showFloatingIcon(e, item === 'machine' ? '⚙️' : '🧴');
        openShopConfirm(item);
    });
});

nextMonthBtn.addEventListener('click', (e) => {
    playActionSound();
    showFloatingIcon(e, '⏳');
    disableActionButtonsTemporarily();
    socket.emit('toggle_ready');
});

askBtn.addEventListener('click', (e) => {
    playActionSound();
    showFloatingIcon(e, '🙏');
    sendAction({ type: 'ask', target: 'elder' });
});

if (askMiddleBtn) {
    askMiddleBtn.addEventListener('click', (e) => {
        playActionSound();
        showFloatingIcon(e, '🤝');
        sendAction({ type: 'ask', target: 'middle' });
    });
}

if (helpBtn) {
    helpBtn.addEventListener('click', (e) => {
        playActionSound();
        showFloatingIcon(e, '💪');
        sendAction({ type: 'help' });
    });
}

teachBtn.addEventListener('click', (e) => {
    playActionSound();
    showFloatingIcon(e, '💡');
    const targetId = teachTargetSelect.value;
    if(targetId) {
        sendAction({ type: 'teach', target_id: targetId });
    }
});

const translateBtn = document.getElementById('translate-btn');
if (translateBtn) {
    translateBtn.addEventListener('click', (e) => {
        playActionSound();
        showFloatingIcon(e, '🔬');
        sendAction({ type: 'translate' });
    });
}

playersListEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('assist-btn')) {
        playActionSound();
        showFloatingIcon(e, '🙌');
        sendAction({ type: 'assist', target_id: e.target.dataset.id });
        return;
    }
    if (e.target.classList.contains('give-btn')) {
        playActionSound();
        showFloatingIcon(e, '🎁');
        const targetId = e.target.dataset.id;
        sendAction({ type: 'give', target_id: targetId });
    }
});

function renderLobby(state) {
    if (lightRaysInstance) {
        lightRaysInstance.updateConfig({
            raysColor: '#fde68a',
            raysSpeed: 0.8,
            lightSpread: 1.2,
            rayLength: 2.5,
            distortion: 0.08
        });
    }

    document.querySelector('.bg-layer').classList.add('lobby-anim'); 
    document.querySelector('.bg-layer').style.filter = 'none'; 
    document.querySelector('.bg-layer').style.backgroundPosition = ''; // Clear inline styles
    document.querySelector('.leaves-layer').style.opacity = '1';
    document.querySelector('.fishes-layer').style.opacity = '1';
    document.querySelector('.rain-layer').style.opacity = '0';
    document.querySelector('.stars-layer').style.opacity = '0';

    lobbyPlayersList.innerHTML = '';
    const playerCount = Object.keys(state.players).length;
    
    if (state.room_code) {
        displayRoomCode.textContent = state.room_code;
    }

    if(playerCount === 0) {
        lobbyPlayersList.innerHTML = '<p style="color:var(--text-muted); padding:1rem;">尚無玩家加入</p>';
    } else {
        for (const [id, p] of Object.entries(state.players)) {
            lobbyPlayersList.innerHTML += `
                <div class="lobby-player-item">
                <div style="display:flex; align-items:center; gap:0.8rem;">
                        ${p.avatar && p.avatar.image 
                            ? `<img src="${p.avatar.image}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:2px solid var(--primary); background:#0a0f1e;">` 
                            : `<span style="font-size:1.5rem;">${p.avatar?p.avatar.icon:''}</span>`}
                        <div>
                            <strong style="color:var(--primary); font-size:1.1rem;">${p.name}</strong> 
                            <span style="color:var(--text-muted); font-size:0.9rem;">— ${getRoleName(p.role)}</span>
                        </div>
                    </div>
                    <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.4rem; line-height:1.4;">
                        ${p.avatar && p.avatar.traits ? p.avatar.traits.join(' | ') : ''}
                    </div>
                    ${id === myId ? '<span class="badge primary-badge">你</span>' : ''}
                </div>
            `;
        }
    }

    // Check if I am in the lobby
    if(state.players[myId]) {
        joinSection.style.display = 'none';
        waitingSection.style.display = 'block';
    } else {
        joinSection.style.display = 'block';
        waitingSection.style.display = 'none';
    }
}

const monthThemes = [
    null, // 0
    { pos: '0% 0%', hue: 0, bright: 1.1, leaves: 1, fishes: 0, rain: 0, stars: 0, raysColor: '#bbf7d0', raysSpeed: 0.8, lightSpread: 1.2, rayLength: 2.5, distortion: 0.08 }, // M1: Kashyman - 準備月 (綠, 葉子)
    { pos: '0% 10%', hue: 15, bright: 1.05, leaves: 1, fishes: 0, rain: 0, stars: 0, raysColor: '#34d399', raysSpeed: 0.6, lightSpread: 1.0, rayLength: 2.2, distortion: 0.06 }, // M2: Kapowan - 禁山林 (深綠)
    { pos: '0% 20%', hue: 30, bright: 1.0, leaves: 0, fishes: 1, rain: 0, stars: 0, raysColor: '#22d3ee', raysSpeed: 0.9, lightSpread: 1.4, rayLength: 2.6, distortion: 0.1 }, // M3: Pikaokaod - 飛魚盛期 (藍綠, 飛魚)
    { pos: '0% 40%', hue: 45, bright: 1.0, leaves: 0, fishes: 1, rain: 0, stars: 0, raysColor: '#0ea5e9', raysSpeed: 1.0, lightSpread: 1.5, rayLength: 2.7, distortion: 0.12 }, // M4: Papataw - 鬼頭刀 (淺海, 飛魚)
    { pos: '0% 60%', hue: 60, bright: 0.8, leaves: 0, fishes: 1, rain: 1, stars: 0, raysColor: '#475569', raysSpeed: 0.4, lightSpread: 0.8, rayLength: 1.8, distortion: 0.15 }, // M5: Pipilapila - 梅雨季 (暗海, 大雨)
    { pos: '0% 80%', hue: 75, bright: 0.95, leaves: 0, fishes: 1, rain: 0, stars: 0, raysColor: '#60a5fa', raysSpeed: 0.7, lightSpread: 1.2, rayLength: 2.4, distortion: 0.08 }, // M6: Apiya vehan - 好月節 (湛藍)
    { pos: '0% 100%', hue: 90, bright: 0.9, leaves: 0, fishes: 0, rain: 0.3, stars: 0, raysColor: '#38bdf8', raysSpeed: 0.8, lightSpread: 1.3, rayLength: 2.5, distortion: 0.09 }, // M7: Pehhakow - 飛魚季結束 (深藍, 微雨)
    { pos: '0% 100%', hue: 120, bright: 0.85, leaves: 0, fishes: 0, rain: 0, stars: 0.5, raysColor: '#a855f7', raysSpeed: 0.5, lightSpread: 1.0, rayLength: 2.0, distortion: 0.07 }, // M8: Pitanatana - 土器月 (寂靜深淵, 微星芒)
    { pos: '0% 80%', hue: 200, bright: 0.8, leaves: 0, fishes: 0, rain: 0, stars: 1, raysColor: '#ec4899', raysSpeed: 0.6, lightSpread: 1.1, rayLength: 2.1, distortion: 0.08 }, // M9: Kalimman - 終食祭 (秋夜星空, 紅/紫)
    { pos: '0% 50%', hue: 280, bright: 0.8, leaves: 0, fishes: 0, rain: 0, stars: 0.5, raysColor: '#f97316', raysSpeed: 0.5, lightSpread: 0.9, rayLength: 1.9, distortion: 0.09 }, // M10: Kaneman - 不吉祥月 (暮色)
    { pos: '0% 20%', hue: 320, bright: 0.9, leaves: 1, fishes: 0, rain: 0, stars: 0, raysColor: '#fbbf24', raysSpeed: 0.7, lightSpread: 1.2, rayLength: 2.3, distortion: 0.08 }, // M11: Kapitowan - 祭神 (微芒, 落葉回歸)
    { pos: '0% 0%', hue: 350, bright: 1.0, leaves: 1, fishes: 0, rain: 0, stars: 0, raysColor: '#fef08a', raysSpeed: 0.9, lightSpread: 1.3, rayLength: 2.6, distortion: 0.07 }  // M12: Kaowan - 手工藝月 (初春)
];

function updateBackgroundForMonth(month) {
    const bgLayer = document.querySelector('.bg-layer');
    const leavesLayer = document.querySelector('.leaves-layer');
    const fishesLayer = document.querySelector('.fishes-layer');
    const rainLayer = document.querySelector('.rain-layer');
    const starsLayer = document.querySelector('.stars-layer');
    
    if (!bgLayer) return;
    
    const s = monthThemes[month] || monthThemes[1];
    
    bgLayer.style.backgroundPosition = s.pos;
    bgLayer.style.filter = `hue-rotate(${s.hue}deg) brightness(${s.bright})`;
    
    if (leavesLayer) leavesLayer.style.opacity = s.leaves;
    if (fishesLayer) fishesLayer.style.opacity = s.fishes;
    if (rainLayer) rainLayer.style.opacity = s.rain;
    if (starsLayer) starsLayer.style.opacity = s.stars;

    if (lightRaysInstance && s.raysColor) {
        lightRaysInstance.updateConfig({
            raysColor: s.raysColor,
            raysSpeed: s.raysSpeed !== undefined ? s.raysSpeed : 1.0,
            lightSpread: s.lightSpread !== undefined ? s.lightSpread : 1.0,
            rayLength: s.rayLength !== undefined ? s.rayLength : 2.0,
            distortion: s.distortion !== undefined ? s.distortion : 0.08
        });
    }
}

let lastRenderedMonth = null;
function renderGame(state) {
    document.querySelector('.bg-layer').classList.remove('lobby-anim'); // Stop lobby animation
    
    if (lastRenderedMonth !== state.month) {
        lastRenderedMonth = state.month;
        const monthInfoEl = document.querySelector('.month-info');
        if (monthInfoEl) {
            monthInfoEl.classList.remove('month-flip-anim');
            void monthInfoEl.offsetWidth; // trigger reflow
            monthInfoEl.classList.add('month-flip-anim');
        }
    }

    const isEn = currentLang === 'en';
    const monthBadgeHtml = isEn ? `Month <span id="current-month">${state.month}</span>` : `第 <span id="current-month">${state.month}</span> 個月`;
    document.getElementById('month-badge').innerHTML = monthBadgeHtml;
    
    updateBackgroundForMonth(state.month);

    monthNameEl.textContent = GAME_RULES[state.month - 1].name;
    monthDescEl.textContent = isEn ? GAME_RULES[state.month - 1].desc_en : GAME_RULES[state.month - 1].desc_zh;
    renderForestStatus(state);
    renderMission(state);
    renderPrompts(state);

    // Players list & Map locations
    playersListEl.innerHTML = '';
    const locMap = { '山林': [], '灘頭工作室': [], '商店': [] };
    
    let youthOptions = '';
    let amIElder = false;
    
    const steps = translations[currentLang].game.steps;
    
    for (const [id, p] of Object.entries(state.players)) {
        const isMe = id === myId;
        const myP = state.players[myId];
        
        let giveBtnHtml = '';
        if (!isMe && myP && myP.location === p.location && myP.materials > 0) {
            giveBtnHtml = `<button class="give-btn" data-id="${id}" style="font-size:0.75rem; padding: 0.3rem 0.8rem; border-radius:6px; background:rgba(212,175,55,0.15); color:var(--secondary); border:1px solid rgba(212,175,55,0.4); cursor:pointer; font-weight:bold; transition:all 0.3s; box-shadow: 0 0 10px rgba(212,175,55,0.1);">${translations[currentLang].game.giveBtn}${(p.role === 'elder' && myP.role !== 'elder' && (myP.gift_month || 0) !== state.month) ? (state.month === 6 ? translations[currentLang].game.giveElderBonus.replace('+1', '+2') : translations[currentLang].game.giveElderBonus) : ''}</button>`;
        }
        
        giveBtnHtml += assistHtml(state, myP, p, id, isMe);

        const roleColor = p.role === 'elder' ? '#d97706' : (p.role === 'youth' ? '#10b981' : '#0ea5e9');
        const behindGlowColor = p.role === 'elder' ? 'rgba(217, 119, 6, 0.67)' : (p.role === 'youth' ? 'rgba(16, 185, 129, 0.67)' : 'rgba(14, 165, 233, 0.67)');
        const innerGradient = p.role === 'elder' 
            ? 'linear-gradient(145deg, rgba(217, 119, 6, 0.18) 0%, rgba(2, 6, 23, 0.9) 100%)' 
            : (p.role === 'youth' 
                ? 'linear-gradient(145deg, rgba(16, 185, 129, 0.18) 0%, rgba(2, 6, 23, 0.9) 100%)' 
                : 'linear-gradient(145deg, rgba(14, 165, 233, 0.18) 0%, rgba(2, 6, 23, 0.9) 100%)');

        // Sidebar item
        const pEl = document.createElement('div');
        pEl.className = `pc-card-wrapper ${isMe ? 'me' : ''} ${p.progress === 4 ? 'finished' : ''}`;
        pEl.style.setProperty('--behind-glow-color', behindGlowColor);
        pEl.style.setProperty('--inner-gradient', innerGradient);
        pEl.style.setProperty('margin-bottom', '1.2rem');
        pEl.style.setProperty('width', '100%');

        pEl.innerHTML = `
            <div class="pc-behind"></div>
            <div class="pc-card-shell">
                <!-- JRPG Pixel Art Progress Icon (Moved outside card to prevent clipping) -->
                <div class="px-icon-container" style="--c: ${roleColor};">
                    <div class="px-icon px-state-${p.progress || 0}"></div>
                </div>
                <section class="pc-card" style="${isMe ? 'border-color: ' + roleColor + '66; box-shadow: 0 0 15px ' + roleColor + '33;' : ''}">
                    <div class="pc-inside" style="padding: 1.1rem 1rem; position: relative;">
                        <div class="pc-shine"></div>
                        <div class="pc-glare"></div>
                        <div class="pc-content">
                            <!-- Header row: Avatar, Name & Status -->
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <div class="loc-avatar-ring" style="width: 40px; height: 40px; border-color: ${roleColor}; box-shadow: 0 0 10px ${roleColor}44; flex-shrink: 0;">
                                        ${p.avatar && p.avatar.image 
                                            ? `<img src="${p.avatar.image}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">` 
                                            : `<span style="font-size:1.5rem; line-height:1;">${p.avatar ? p.avatar.icon : ''}</span>`}
                                    </div>
                                    <div style="display: flex; flex-direction: column; gap: 1px;">
                                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                                            ${isMe ? `
                                            <span class="player-name player-avatar-trigger"
                                                title="${isEn ? 'Click to preview your character' : '點擊預覽你的角色'}"
                                                data-player-name="${p.name}"
                                                data-player-role="${p.role}"
                                                style="cursor:pointer; text-decoration:underline dotted rgba(255,255,255,0.4); text-underline-offset:3px; font-weight: 800; font-size: 1.15rem; color: #fff; line-height: 1.2;"
                                            >${p.name} <span style="font-size:0.65rem;opacity:0.65;">👁</span></span>
                                            ` : `<span class="player-name" style="font-weight: 800; font-size: 1.15rem; color: #fff; line-height: 1.2;">${p.name}</span>`}
                                            
                                            <!-- Moved player status icon (hourglass/checkmark) here, next to the name -->
                                            <div class="player-status-icon" style="font-size: 1.0rem; flex-shrink: 0;">
                                                ${p.ready ? `<span title="${isEn ? 'Ready' : '已準備'}" class="ready-icon">✅</span>` : `<span title="${isEn ? 'Thinking' : '思考中'}" class="thinking-icon" style="opacity:0.6;">⏳</span>`}
                                            </div>
                                        </div>
                                        ${isMe ? `<span class="tag is-me" style="width: fit-content; padding: 0.05rem 0.35rem; font-size: 0.65rem; margin-top: 1px; display: inline-block;">${translations[currentLang].game.meTag}</span>` : ''}
                                    </div>
                                </div>
                            </div>

                            <!-- Role Badge and Give Button -->
                            <div style="margin-bottom: 0.6rem; display: flex; justify-content: space-between; align-items: center; min-height: 28px;">
                                <span class="role-badge ${p.role}" style="font-size: 0.9rem; font-weight: 800;">${getRoleName(p.role)}</span>
                                ${giveBtnHtml}
                            </div>

                            <!-- Traits list -->
                            ${p.avatar && p.avatar.traits && p.avatar.traits.length > 0 ? `
                            <div class="player-traits" style="display:flex; flex-wrap:wrap; gap:0.35rem; margin-bottom: 0.75rem;">
                                ${p.avatar.traits.map(t => `<span style="background:rgba(255,255,255,0.07); padding:0.22rem 0.55rem; border-radius:8px; font-size:0.78rem; color:var(--text-muted); border:1px solid rgba(255,255,255,0.08); font-weight: 600; white-space: nowrap;">${t}</span>`).join('')}
                            </div>
                            ` : ''}

                            <!-- Player Stats Grid -->
                            <div class="player-stats-grid" style="margin-bottom: 0.75rem;">
                                <div class="stat-box ap-box" style="padding: 0.35rem 0.2rem;">
                                    <span class="stat-icon" style="font-size: 0.95rem;">⚡</span>
                                    <span class="stat-label" style="font-size: 0.7rem;">${translations[currentLang].game.ap}</span>
                                    <span class="stat-value" style="font-size: 0.85rem;">${p.ap}/${p.max_ap || (p.role === 'youth' ? 8 : p.role === 'middle' ? 7 : 6)}</span>
                                </div>
                                <div class="stat-box kp-box" style="padding: 0.35rem 0.2rem;">
                                    <span class="stat-icon" style="font-size: 0.95rem;">💡</span>
                                    <span class="stat-label" style="font-size: 0.7rem;">${translations[currentLang].game.kp}</span>
                                    <span class="stat-value" style="font-size: 0.95rem;">${p.kp}</span>
                                </div>
                                <div class="stat-box mat-box" style="padding: 0.35rem 0.2rem;">
                                    <span class="stat-icon" style="font-size: 0.95rem;">🌿</span>
                                    <span class="stat-label" style="font-size: 0.7rem;">${translations[currentLang].game.mat}</span>
                                    <span class="stat-value" style="font-size: 0.95rem;">${p.materials}</span>
                                </div>
                            </div>

                            <!-- Footer row -->
                            <div class="player-footer" style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.6rem; margin-top: auto; display: flex; justify-content: space-between; align-items: center;">
                                <div class="progress-pill" style="padding: 0.25rem 0.6rem; font-size: 0.78rem;">
                                    <span class="progress-label" style="font-size: 0.7rem;">${translations[currentLang].game.progressLabel}</span>
                                    <span class="progress-value" style="font-size: 0.78rem;">${steps[p.progress]}</span>
                                </div>
                                <div class="score-pill" style="padding: 0.25rem 0.6rem; font-size: 0.78rem;">
                                    <span>⭐ ${p.score}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        `;
        playersListEl.appendChild(pEl);

        // Map badge
        if (locMap[p.location]) {
            locMap[p.location].push({ name: p.name, role: p.role, avatar: p.avatar, isMe: id === myId });
        }

        // Teach targets
        if (p.role === 'youth' || p.role === 'middle') {
            const roleSuffix = isEn ? (p.role === 'middle' ? ' (Middle Generation)' : ' (Youth)') : (p.role === 'middle' ? ' (中生代)' : ' (青年)');
            youthOptions += `<option value="${id}">${p.name}${roleSuffix}</option>`;
        }

        // My status
        if (isMe) {
            myStatusEl.innerHTML = `
                <div class="status-item"><span class="status-label">${translations[currentLang].game.statusLabels[0]}</span><span class="status-val">${p.ap} / ${p.max_ap || (p.role === 'youth' ? 8 : p.role === 'middle' ? 7 : 6)}</span></div>
                <div class="status-item"><span class="status-label">${translations[currentLang].game.statusLabels[1]}</span><span class="status-val">${p.kp}</span></div>
                <div class="status-item"><span class="status-label">${translations[currentLang].game.statusLabels[2]}</span><span class="status-val">${p.materials}</span></div>
                <div class="status-item"><span class="status-label">${translations[currentLang].game.statusLabels[3]}</span><span class="status-val">${steps[p.progress]}</span></div>
                <div class="status-item"><span class="status-label">${translations[currentLang].game.statusLabels[4]}</span><span class="status-val">${p.score}</span></div>
                <div class="status-item" style="max-width: 360px;"><span class="status-label">${translations[currentLang].game.scoreLogLabel}</span><span class="status-val" style="font-size:0.8rem; font-weight:normal; line-height:1.45;">${summarizeScoreBreakdown(p.score_breakdown)}${badgeLineHtml(p)}</span></div>
            `;
            announceNewBadges(state, p);

            const gt = translations[currentLang].game;
            const hintSpan = (text) => `<span style="font-size:0.8rem;opacity:0.7;font-weight:normal;">(${text})</span>`;
            const others = Object.values(state.players).filter(o => o.id !== p.id);

            if (p.role === 'youth' || p.role === 'middle') {
                askBtn.style.display = 'block';
                const baseCost = p.role === 'youth' ? 3 : 2;
                const cost = state.month === 4 ? baseCost + 1 : baseCost;
                const broughtGift = (p.gift_month || 0) === state.month;
                const gain = broughtGift ? 4 : 3;
                askBtn.innerHTML = `${gt.askElderTitle} ${hintSpan(`${cost} AP ➔ ${gain} KP${broughtGift ? ' ' + gt.askGiftNote : ''} · +1 ${gt.scoreUnit}`)}`;
            } else {
                askBtn.style.display = 'none';
            }

            // Youth can also learn from the middle generation while their KP is lower
            if (askMiddleBtn) {
                const mentors = others.filter(o => o.role === 'middle');
                if (p.role === 'youth' && mentors.length > 0) {
                    const cost = state.month === 4 ? 2 : 1;
                    const canLearn = mentors.some(o => o.kp > p.kp);
                    askMiddleBtn.style.display = 'block';
                    askMiddleBtn.style.opacity = canLearn ? '1' : '0.45';
                    askMiddleBtn.innerHTML = `${gt.askMiddleTitle} ${hintSpan(`${cost} AP ➔ 2 KP · +1 ${gt.scoreUnit}`)}`;
                } else {
                    askMiddleBtn.style.display = 'none';
                }
            }

            // Helping an elder who shares your location
            if (helpBtn) {
                const hasElder = others.some(o => o.role === 'elder');
                if (p.role !== 'elder' && hasElder) {
                    const canHelp = (p.help_month || 0) !== state.month
                        && others.some(o => o.role === 'elder' && o.location === p.location && !o.finished && o.ap < o.max_ap);
                    helpBtn.style.display = 'block';
                    helpBtn.style.opacity = canHelp ? '1' : '0.45';
                    helpBtn.innerHTML = state.month === 6 ? gt.helpBtn.replace('+1 ', '+2 ') : gt.helpBtn;
                } else {
                    helpBtn.style.display = 'none';
                }
            }
            
            if (p.role === 'elder') {
                amIElder = true;
            } else {
                teachContainer.style.display = 'none';
            }
            
            // Ready Button UI
            if (p.ready) {
                nextMonthBtn.textContent = translations[currentLang].game.readyBtnReady;
                nextMonthBtn.className = 'btn secondary outline';
            } else {
                nextMonthBtn.textContent = translations[currentLang].game.readyBtnNotReady;
                nextMonthBtn.className = 'btn primary glow-btn';
            }
        }
    }

    if (amIElder) {
        teachContainer.style.display = 'flex';
        if (youthOptions === '') {
            teachTargetSelect.innerHTML = `<option value="">(${currentLang === 'en' ? 'No target available' : '無可指導對象'})</option>`;
        } else {
            teachTargetSelect.innerHTML = youthOptions;
        }
    }

    // Destroy previous location player card pixel instances
    if (locPlayerCardInstances) {
        locPlayerCardInstances.forEach(inst => inst.destroy());
    }
    locPlayerCardInstances = [];

    // Update map location badges with premium icon cards
    const ROLE_META = {
        elder:  { label: isEn ? 'Elder Artisan' : '耆老', color: '#d4af37', rgb: '212, 175, 55', icon: '🧓' },
        middle: { label: isEn ? 'Middle Generation' : '中生代', color: '#a78bfa', rgb: '167, 139, 250', icon: '👷' },
        youth:  { label: isEn ? 'Young Apprentice' : '文化復振青年', color: '#4ade80', rgb: '74, 222, 128', icon: '🧑' },
    };
    for (const [loc, players] of Object.entries(locMap)) {
        const container = document.querySelector(`.location-card[data-loc="${loc}"] .players-here`);
        if (!container) continue;
        if (players.length === 0) {
            container.innerHTML = `<span class="loc-empty">${translations[currentLang].game.emptyLoc}</span>`;
            continue;
        }
        container.innerHTML = players.map(({ name, role, avatar, isMe }) => {
            const meta = ROLE_META[role] || { label: role, color: '#94a3b8', rgb: '148, 163, 184', icon: '👤' };
            const avatarHtml = avatar && avatar.image
                ? `<img src="${avatar.image}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid ${meta.color};">`
                : `<span style="font-size:1.4rem;line-height:1;">${avatar?.icon || meta.icon}</span>`;
            return `
            <div class="loc-player-card ${isMe ? 'loc-card-me' : ''}" style="--role-color:${meta.color}; --role-color-rgb:${meta.rgb}" data-role="${role}">
                <canvas class="pixel-canvas"></canvas>
                <div class="loc-avatar-container">
                    <div class="loc-avatar-ring" style="border-color:${meta.color};">
                        ${avatarHtml}
                    </div>
                    <span class="loc-avatar-icon-badge" style="background:${meta.color};">${meta.icon}</span>
                </div>
                <div class="loc-info">
                    <div class="loc-name-row">
                        <span class="loc-name">${name}</span>
                        ${isMe ? `<span class="loc-me-badge" style="background:${meta.color}33; border: 1px solid ${meta.color}; color:${meta.color};">${isEn ? 'YOU' : '你'}</span>` : ''}
                    </div>
                    <span class="loc-role-badge" style="border-color:${meta.color}66; background:${meta.color}1a; color:${meta.color};">
                        ${meta.label}
                    </span>
                </div>
            </div>`;
        }).join('');
    }

    // Initialize Pixel Cards for each location player card
    document.querySelectorAll('.loc-player-card').forEach(el => {
        const role = el.getAttribute('data-role');
        let variant = 'default';
        if (role === 'elder') variant = 'yellow';
        else if (role === 'middle') variant = 'blue';
        else if (role === 'youth') variant = 'green';
        
        if (window.PixelCard) {
            const inst = new window.PixelCard(el, { variant });
            locPlayerCardInstances.push(inst);
        }
    });

    // Logs
    logsEl.innerHTML = state.logs.map(l => `<div class="log-entry">${translateLog(l)}</div>`).reverse().join('');
    
    // Initialize 3D holographic tilt trackers for sidebar player cards
    initPlayerCardsTilt();
}

function drawKPChart(canvas, players) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = 760;
    const height = 300;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, width, height);

    const padL = 55, padR = 45, padT = 45, padB = 45;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;

    const maxMonth = 12;
    const maxKp = 15;

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, 'rgba(6, 16, 32, 0.95)');
    bgGrad.addColorStop(1, 'rgba(11, 25, 46, 0.98)');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, 12);
    ctx.fill();

    // Chart Header
    const isEn = currentLang === 'en';
    ctx.fillStyle = '#7dd3fc';
    ctx.font = 'bold 14px "Noto Serif TC", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(isEn ? '📈 Knowledge Point (KP) Development Curves (Months 1–12)' : '📈 12 個月角色技術點數 (KP) 發展曲線圖', padL, 14);

    // Y-axis grid & labels
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
    ctx.font = '11px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const ySteps = [0, 3, 6, 9, 12, 15];
    ySteps.forEach(val => {
        const y = padT + chartH - (val / maxKp) * chartH;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(width - padR, y);
        ctx.stroke();
        ctx.fillText(`${val} KP`, padL - 8, y);
    });

    // X-axis grid & labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let m = 1; m <= maxMonth; m++) {
        const x = padL + ((m - 1) / (maxMonth - 1)) * chartW;
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, height - padB);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.stroke();
        ctx.fillText(`M${m}`, x, height - padB + 8);
    }

    const ROLE_COLORS = {
        elder: '#d4af37',   // Gold
        youth: '#4ade80',   // Emerald Green
        middle: '#a78bfa'   // Purple
    };

    const playerList = Object.values(players);
    playerList.forEach((p) => {
        const color = ROLE_COLORS[p.role] || '#38bdf8';
        const history = p.kp_history || [{ month: 1, kp: p.kp || 0 }];
        
        const points = [];
        let currentKp = history[0] ? history[0].kp : (p.kp || 0);
        for (let m = 1; m <= maxMonth; m++) {
            const entry = history.find(h => h.month === m);
            if (entry) currentKp = entry.kp;
            const x = padL + ((m - 1) / (maxMonth - 1)) * chartW;
            const y = padT + chartH - (Math.min(currentKp, maxKp) / maxKp) * chartH;
            points.push({ m, kp: currentKp, x, y });
        }

        // Line
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        points.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Dots
        points.forEach(pt => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#061020';
            ctx.stroke();
        });

        // Industrial path badge
        if (p.industrial || p.path_choice === 'industrial') {
            const lastPt = points[points.length - 1];
            ctx.font = 'bold 11px sans-serif';
            ctx.fillStyle = '#ef4444';
            ctx.textAlign = 'center';
            ctx.fillText(isEn ? '⚠️ Deskilled (Resin)' : '⚠️ 去技能化 (樹脂)', lastPt.x, Math.max(padT + 12, lastPt.y - 14));
        } else if (p.path_choice === 'hybrid') {
            const lastPt = points[points.length - 1];
            ctx.font = 'bold 11px sans-serif';
            ctx.fillStyle = '#fbbf24';
            ctx.textAlign = 'center';
            ctx.fillText(isEn ? '⚙️ Machine-processed' : '⚙️ 機器加工', lastPt.x, Math.max(padT + 12, lastPt.y - 14));
        }
    });
}

function renderGameOver(state) {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    if (lightRaysInstance) {
        lightRaysInstance.destroy();
        lightRaysInstance = null;
    }

    if (prismaticBurstInstance) {
        prismaticBurstInstance.destroy();
        prismaticBurstInstance = null;
    }

    if (locPlayerCardInstances) {
        locPlayerCardInstances.forEach(inst => inst.destroy());
        locPlayerCardInstances = [];
    }

    const isEn = currentLang === 'en';
    const finalTitle = isEn ? 'Settlement: Cultural Resilience' : '結算：文化韌性';
    const restartBtnText = isEn ? 'Return to Tribe' : '重新回到部落';
    const scoreSrc = isEn ? 'Score Sources: ' : '得分來源: ';

    const playersSorted = Object.values(state.players).sort((a,b)=>b.score-a.score);

    appEl.innerHTML = `
        <canvas id="prismatic-burst-canvas" class="prismatic-burst-container"></canvas>
        <div class="screen active" style="align-items:center; justify-content:center; overflow-y:auto; padding:2rem 0; min-height:100vh;">
            <div class="glass" style="padding: 2rem; text-align:center; max-width: 860px; width: 92%; position:relative; z-index:10; margin: auto;">
                <h1 style="font-family: 'Noto Serif TC', serif; font-weight: 900; font-size: 2.5rem; color:var(--primary); margin-bottom: 2rem; letter-spacing:0.15em; text-shadow: 0 0 20px rgba(139, 195, 74, 0.4);">${finalTitle}</h1>
                
                <!-- Player Score Cards -->
                <div style="text-align:left; margin-bottom: 2rem; display:flex; flex-direction:column; gap:1.5rem;">
                    ${playersSorted.map((p, i) => `
                        <div style="background:rgba(0,0,0,0.4); padding:1.5rem; border-radius:12px; border-left: 5px solid ${i===0?'var(--secondary)':'var(--text-muted)'};">
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.5rem; flex-wrap:wrap; gap:0.5rem;">
                                <h3 style="font-size:1.3rem; color:var(--primary); margin:0;">
                                    ${i===0?'👑 ':''}${p.avatar ? p.avatar.icon : ''} ${p.name} 
                                    <span style="font-size:0.9rem; color:var(--text-muted); font-weight:normal;">- ${getRoleName(p.role)}</span>
                                </h3>
                                <span style="font-size:0.82rem; padding:0.2rem 0.6rem; border-radius:12px; border:1px solid ${getPathBadge(p).border}; background:${getPathBadge(p).bg}; color:${getPathBadge(p).color};">
                                    ${getPathBadge(p).label}
                                </span>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.8rem;">
                                <p style="color:var(--secondary); font-size:1.6rem; font-weight:800; font-family:'Outfit', sans-serif; margin:0;">⭐ ${p.score}</p>
                                <p style="font-size:1.1rem; font-weight:bold; margin:0; color: ${p.finished ? 'var(--primary)' : 'var(--danger)'};">
                                    ${p.ending ? (isEn && endingTranslations[p.ending.title] ? endingTranslations[p.ending.title].title : p.ending.title) : (p.finished ? (isEn ? '✅ Heritage Succeeded' : '✅ 傳承成功') : (isEn ? '❌ Cultural Disruption' : '❌ 文化斷裂'))}
                                </p>
                            </div>
                            ${p.ending ? `
                            <div style="color:var(--text-main); font-size:0.95rem; line-height:1.7; background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin-bottom: 0.8rem; font-family: 'Noto Serif TC', serif;">
                                ${isEn && endingTranslations[p.ending.title] ? endingTranslations[p.ending.title].text : p.ending.text}
                            </div>
                            ` : ''}
                            <p style="color:var(--text-muted); font-size:0.8rem; margin:0;">${scoreSrc}${translateScoreBreakdown(p.score_breakdown).join(', ')}</p>
                            ${playerHonoursHtml(p)}
                        </div>
                    `).join('')}
                </div>

                ${forestSummaryHtml(state)}

                <!-- KP Development Curve Chart -->
                <div style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 16px; padding: 1.5rem; text-align: left; margin: 2rem 0; box-shadow: 0 10px 30px rgba(0,0,0,0.5); backdrop-filter: blur(12px);">
                    <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom: 1rem; border-bottom: 1px solid rgba(56,189,248,0.2); padding-bottom:0.6rem;">
                        <span style="font-size: 1.5rem;">📊</span>
                        <div>
                            <h2 style="font-family: 'Noto Serif TC', serif; font-size: 1.3rem; color: #7dd3fc; margin: 0; font-weight: 700;">
                                ${isEn ? 'KP Development Curves & Path Selection' : '各角色 KP 演進與路徑選擇曲線圖'}
                            </h2>
                            <p style="font-size: 0.8rem; color: #94a3b8; margin: 0.2rem 0 0 0;">
                                ${isEn ? 'Tracks technical knowledge growth (KP) and deskilling triggers across 12 months.' : '記錄 12 個月間技術點數 (KP) 累積與去技能化點位，作為機制層對話依據。'}
                            </p>
                        </div>
                    </div>
                    <canvas id="kp-chart-canvas" style="width:100%; height:300px; display:block; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:rgba(6,16,32,0.8);"></canvas>
                    <div style="display:flex; gap:1.2rem; flex-wrap:wrap; margin-top:0.8rem; font-size:0.8rem; color:#94a3b8;">
                        ${playersSorted.map(p => {
                            const ROLE_COLORS = { elder: '#d4af37', youth: '#4ade80', middle: '#a78bfa' };
                            const c = ROLE_COLORS[p.role] || '#38bdf8';
                            return `<span style="display:inline-flex; align-items:center; gap:0.4rem;">
                                <span style="width:10px; height:10px; border-radius:50%; background:${c}; display:inline-block;"></span>
                                <strong style="color:#e2e8f0;">${p.name}</strong> (${getRoleName(p.role)}: ${p.kp} KP)
                            </span>`;
                        }).join('')}
                    </div>
                </div>

                <!-- Mechanism Layer Discussion Panel -->
                <div style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 16px; padding: 1.8rem; text-align: left; margin: 2rem 0; box-shadow: 0 10px 30px rgba(0,0,0,0.5); backdrop-filter: blur(12px);">
                    <div style="display:flex; align-items:center; gap:0.6rem; border-bottom: 1px solid rgba(56,189,248,0.2); padding-bottom: 0.8rem; margin-bottom: 1.5rem;">
                        <span style="font-size: 1.8rem;">💬</span>
                        <div>
                            <h2 style="font-family: 'Noto Serif TC', serif; font-size: 1.4rem; color: #7dd3fc; margin: 0; font-weight: 700;">
                                ${isEn ? 'Mechanism Discussion & Reflection' : '機制層討論與反思 (Mechanism Discussion)'}
                            </h2>
                            <p style="font-size: 0.85rem; color: #94a3b8; margin: 0.2rem 0 0 0;">
                                ${isEn ? 'Please guide team members to reflect on choice paths, technical deskilling, and cultural preservation:' : '請引導成員針對造船選擇與文化知識演變進行對話與討論：'}
                            </p>
                        </div>
                    </div>

                    <!-- Core Discussion Question -->
                    <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 1.2rem; margin-bottom: 1.2rem;">
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom: 0.6rem;">
                            <span style="background: #ef4444; color: #fff; font-size: 0.75rem; font-weight: bold; padding: 0.2rem 0.6rem; border-radius: 20px; text-transform: uppercase;">
                                ${isEn ? 'Core Discussion' : '核心提問'}
                            </span>
                            <h3 style="font-size: 1.1rem; color: #fca5a5; margin: 0; font-weight: 700; line-height: 1.5;">
                                ${isEn ? '“There were three ways to finish the boat. What did each one keep, and what did each one give up? How does ‘deskilling’ happen in the game?”' : '「這次有三種完工的方式。每一種各留下了什麼、又放掉了什麼？在遊戲裡，『去技能化』是怎麼發生的？」'}
                            </h3>
                        </div>
                        <div style="background: rgba(0, 0, 0, 0.25); border-left: 4px solid #ef4444; padding: 0.9rem; border-radius: 6px; color: #e2e8f0; font-size: 0.92rem; line-height: 1.6;">
                            <strong style="color: #f87171; display: block; margin-bottom: 0.4rem;">
                                ${isEn ? '💡 Guidance Direction & Key Insights:' : '💡 引導方向與機制意涵：'}
                            </strong>
                            <ul style="margin: 0; padding-left: 1.2rem; display: flex; flex-direction: column; gap: 0.4rem;">
                                <li>
                                    <strong>${isEn ? 'Meaning of “Irreparable” tag: ' : '「不可修復」標記的意涵：'}</strong>
                                    ${isEn 
                                        ? 'Industrial resin seals seam cracks permanently and cannot be disassembled for repair. Traditional planked boats can be taken apart, replaced piece-by-piece, and launched again, whereas resin boats are discarded once damaged.'
                                        : '讓學生說出「不可修復」標記的意涵：現代工業樹脂填縫雖然快速，但木塊接縫被永久黏死，無法像傳統拼板舟一樣拆解換木維修。船壞了只能棄置，失去了與木材與海洋長久互動與維修的能力。'}
                                </li>
                                <li>
                                    <strong>${isEn ? 'Knowledge Loss (Deskilling): ' : '跳過工序與技術知識的消失：'}</strong>
                                    ${isEn 
                                        ? 'Buying industrial resin skips essential traditional steps (gathering, peeling, scraping, twining fiber), halting Knowledge Point (KP) growth. Without practice and intergenerational learning, living craft knowledge silently breaks.'
                                        : '選擇買樹脂等同跳過了「剝麻、刮絲、撚線」等重要工序，技術點數 (KP) 停止累積。少了實作體驗與長輩請益傳承，傳統身體記憶與工藝技術知識便悄然消失與斷裂。'}
                                </li>
                                <li>
                                    <strong>${isEn ? 'The path in between: ' : '中間的那條路：'}</strong>
                                    ${isEn
                                        ? 'Machine-processing the natural fibre still uses Avaka and keeps the boat repairable, but skips the hands-on drying and twining. Ask: is this “losing culture” or “culture changing”? Change is normal; the point is to know what the core value is, why you chose this, and what you accept in return.'
                                        : '用機器加工天然纖維，仍然使用 Avaka、船也還能拆修，但少了手工曝曬與撚繩的經驗。請學生想一想：這是「文化流失」還是「文化在變」？文化變遷是正常的，重點是知道核心價值是什麼、自己為什麼這樣選、選了之後要承擔什麼。'}
                                </li>
                                <li>
                                    <strong>${isEn ? 'Why did you score what you scored: ' : '你的分數是怎麼來的：'}</strong>
                                    ${isEn
                                        ? 'Look at each player’s “Score Sources”. Asking, bringing a gift to the Elder and helping the Elder all earned points. Why would a community reward these acts?'
                                        : '請看每個人的「得分來源」。請益、帶禮物回饋耆老、幫忙長者都會加分。為什麼部落會看重這些事？'}
                                </li>
                            </ul>
                        </div>
                    </div>

                    <!-- Extended Reflection Question -->
                    <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 1.2rem;">
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom: 0.6rem;">
                            <span style="background: #0284c7; color: #fff; font-size: 0.75rem; font-weight: bold; padding: 0.2rem 0.6rem; border-radius: 20px; text-transform: uppercase;">
                                ${isEn ? 'Extended Reflection' : '延伸提問'}
                            </span>
                            <h3 style="font-size: 1.1rem; color: #7dd3fc; margin: 0; font-weight: 700; line-height: 1.5;">
                                ${isEn ? '“In real-life Lanyu, or in your own daily life, are there similar examples? What skills or knowledge have slowly vanished because they were replaced by convenient alternatives?”' : '「在真實的蘭嶼，或是你自己的生活圈裡，有沒有類似的例子？有什麼技術或知識，因為被更方便的東西取代，而慢慢消失了？」'}
                            </h3>
                        </div>
                        <div style="background: rgba(0, 0, 0, 0.25); border-left: 4px solid #0284c7; padding: 0.9rem; border-radius: 6px; color: #e2e8f0; font-size: 0.92rem; line-height: 1.6;">
                            <strong style="color: #38bdf8; display: block; margin-bottom: 0.4rem;">
                                ${isEn ? '🌏 Real-world Connections & Critical Thinking:' : '🌏 生活連結與思辨：'}
                            </strong>
                            <p style="margin: 0;">
                                ${isEn 
                                    ? 'Encourage participants to connect with traditional handicrafts, local ecological knowledge, architecture, or modern conveniences (food delivery, disposable tableware, digital navigation) — reflecting on convenience vs. loss of self-reliance skills.'
                                    : '引導學員嘗試聯想：傳統手工藝、在地生態知識、傳統建築工法，或是現代便利科技（如外送、免洗餐具、電子導航）所帶來的便利，以及背後隱含的傳統技能與自給能力慢慢消失的代價。'}
                            </p>
                        </div>
                    </div>

                    <!-- Who can I talk to -->
                    <div style="background: rgba(167, 139, 250, 0.08); border: 1px solid rgba(167, 139, 250, 0.3); border-radius: 12px; padding: 1.2rem; margin-top: 1.2rem;">
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom: 0.6rem;">
                            <span style="background: #7c3aed; color: #fff; font-size: 0.75rem; font-weight: bold; padding: 0.2rem 0.6rem; border-radius: 20px; text-transform: uppercase;">
                                ${isEn ? 'Who can I talk to' : '可以跟誰討論'}
                            </span>
                            <h3 style="font-size: 1.1rem; color: #c4b5fd; margin: 0; font-weight: 700; line-height: 1.5;">
                                ${isEn ? '“In the game you could learn from the Elder and from the Middle Generation. If you wanted to think about your own culture, who around you could you go to, and what would each of them tell you?”' : '「遊戲裡你可以向耆老學，也可以向中生代學。如果你想思考自己的文化，身邊可以找誰？他們各自會告訴你什麼？」'}
                            </h3>
                        </div>
                        <div style="background: rgba(0, 0, 0, 0.25); border-left: 4px solid #7c3aed; padding: 0.9rem; border-radius: 6px; color: #e2e8f0; font-size: 0.92rem; line-height: 1.6;">
                            <p style="margin: 0;">
                                ${isEn
                                    ? 'Elders can say what has been lost and why it mattered. The middle generation has lived in two cultures, so they can also say what it could be turned into. Invite students to name real people they could ask.'
                                    : '老人家能說出什麼東西不見了、它為什麼重要；中生代有兩種文化的生活經驗，還能進一步說出「可以轉化成什麼」。請學生說出身邊真的可以去請教的人。'}
                            </p>
                        </div>
                    </div>
                </div>

                <button class="btn primary" style="width:100%" onclick="location.reload()">${restartBtnText}</button>
            </div>
        </div>
    `;

    setTimeout(() => {
        const canvas = document.getElementById('prismatic-burst-canvas');
        if (canvas && window.PrismaticBurstShader) {
            prismaticBurstInstance = new PrismaticBurstShader(canvas, {
                intensity: 2.5,
                speed: 0.35,
                animationType: 'rotate3d',
                colors: ['#064e3b', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d4af37'],
                distort: 4.0,
                rayCount: 5,
                noiseAmount: 0.7
            });
        }

        const kpCanvas = document.getElementById('kp-chart-canvas');
        if (kpCanvas) {
            drawKPChart(kpCanvas, state.players);
        }
    }, 50);
}

function getRoleName(role) {
    const isEn = currentLang === 'en';
    if(role === 'elder') return isEn ? 'Elder Artisan' : '資深工匠';
    if(role === 'youth') return isEn ? 'Young Apprentice' : '文化復振青年';
    return isEn ? 'Middle Generation' : '中生代';
}

function getPathBadge(p) {
    const isEn = currentLang === 'en';
    if (p.industrial || p.path_choice === 'industrial') {
        return { border: '#94a3b8', bg: 'rgba(148,163,184,0.15)', color: '#e2e8f0',
                 label: isEn ? '🧴 Industrial resin path (seams glued shut / cannot be repaired)' : '🧴 工業樹脂路線 (接縫黏死 / 無法拆修)' };
    }
    if (p.path_choice === 'hybrid') {
        return { border: '#fbbf24', bg: 'rgba(251,191,36,0.15)', color: '#fde68a',
                 label: isEn ? '⚙️ Machine-processed natural fibre path (still Avaka / repairable)' : '⚙️ 機器加工天然纖維路線 (仍用 Avaka / 可拆修)' };
    }
    if (p.finished) {
        return { border: '#4ade80', bg: 'rgba(74,222,128,0.15)', color: '#86efac',
                 label: isEn ? '🌿 Traditional Avaka Path' : '🌿 傳統 Avaka 傳承路線' };
    }
    return { border: '#64748b', bg: 'rgba(100,116,139,0.15)', color: '#cbd5e1',
             label: isEn ? '⏳ Not finished' : '⏳ 未完工' };
}

// ── Avatar Preview Modal ───────────────────────────────────────────────────
const ROLE_COLORS = { elder: '#d97706', middle: '#0ea5e9', youth: '#86efac' };

// Delegated click: fires when player clicks their own name trigger in the sidebar
document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.player-avatar-trigger');
    if (!trigger) return;
    const name = trigger.dataset.playerName || '';
    const role = trigger.dataset.playerRole || '';
    openAvatarPreview(name, role);
});

function openAvatarPreview(playerName, role) {
    const modal   = document.getElementById('avatar-preview-modal');
    const nameEl  = document.getElementById('avatar-preview-name');
    const roleEl  = document.getElementById('avatar-preview-role');
    const traitsEl = document.getElementById('avatar-preview-traits');
    if (!modal) return;

    // Populate header
    const roleColor = ROLE_COLORS[role] || '#94a3b8';
    nameEl.textContent = playerName;
    roleEl.innerHTML = `<span style="color:${roleColor}; font-weight:600;">${getRoleName(role)}</span>`;

    // Populate traits from the saved avatar state
    traitsEl.innerHTML = (currentAvatarSelections.traits || []).map(t =>
        `<span style="background:rgba(255,255,255,0.06);padding:0.15rem 0.5rem;border-radius:6px;font-size:0.72rem;color:var(--text-muted);border:1px solid rgba(255,255,255,0.08);">${t}</span>`
    ).join('');

    // Show modal
    modal.classList.add('open');
    modal.style.display = 'flex';

    // Re-use the avatar3d engine — point it at the preview canvas
    // Destroy any running instance first, then re-init on the new canvas
    if (typeof destroyAvatar3D === 'function') destroyAvatar3D();

    // Swap the canvas id so initAvatar3D picks up the preview canvas
    const previewCanvas = document.getElementById('avatar-preview-canvas');
    if (previewCanvas) {
        const originalId = 'avatar-canvas';
        // Temporarily rename so initAvatar3D() finds it
        previewCanvas.id = originalId;
        if (typeof initAvatar3D === 'function') initAvatar3D();
        // Rename back after init so the original creator page isn't confused
        requestAnimationFrame(() => { previewCanvas.id = 'avatar-preview-canvas'; });
    }
}

function closeAvatarPreview() {
    const modal = document.getElementById('avatar-preview-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.style.display = 'none';
    if (typeof destroyAvatar3D === 'function') destroyAvatar3D();
}

document.getElementById('avatar-preview-close')?.addEventListener('click', closeAvatarPreview);

// Click outside the inner card to close
document.getElementById('avatar-preview-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('avatar-preview-modal')) closeAvatarPreview();
});

// ── Variable Proximity Hover / Proximity Text Animation system ────────────────
(function initVariableProximity() {
    let mousePos = { x: -1000, y: -1000 }; // Initialize far off-screen
    let lastMousePos = { x: null, y: null };
    
    function updatePosition(clientX, clientY) {
        mousePos.x = clientX;
        mousePos.y = clientY;
    }
    
    // Track mouse position on window
    window.addEventListener('mousemove', (ev) => updatePosition(ev.clientX, ev.clientY));
    window.addEventListener('mousedown', (ev) => updatePosition(ev.clientX, ev.clientY));
    
    // Track touch position for mobile support
    window.addEventListener('touchmove', (ev) => {
        if (ev.touches.length > 0) {
            updatePosition(ev.touches[0].clientX, ev.touches[0].clientY);
        }
    });
    window.addEventListener('touchstart', (ev) => {
        if (ev.touches.length > 0) {
            updatePosition(ev.touches[0].clientX, ev.touches[0].clientY);
        }
    });

    const radius = 220;       // Detection radius in pixels

    function proximityLoop() {
        // Skip layout calculations if mouse position hasn't changed
        if (mousePos.x === lastMousePos.x && mousePos.y === lastMousePos.y) {
            requestAnimationFrame(proximityLoop);
            return;
        }
        lastMousePos.x = mousePos.x;
        lastMousePos.y = mousePos.y;

        const titleContainer = document.querySelector('.title-wrapper');
        const letterSpans = document.querySelectorAll('.glow-text .proximity-letter');
        
        if (titleContainer && letterSpans.length > 0) {
            letterSpans.forEach(span => {
                const rect = span.getBoundingClientRect();
                const letterCenterX = rect.left + rect.width / 2;
                const letterCenterY = rect.top + rect.height / 2;

                // Compute standard Euclidean distance in viewport space
                const dx = mousePos.x - letterCenterX;
                const dy = mousePos.y - letterCenterY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                let scale = 1.0;
                let translateY = 0;
                let shadowGlow = 'rgba(6,182,212,0.45)';

                if (distance < radius) {
                    // Quadratic ease-out falloff for organic ripple wave feel
                    const falloff = 1 - (distance / radius);
                    const easeFalloff = falloff * falloff;
                    
                    scale = 1 + 0.16 * easeFalloff;           // Scale up by up to 16%
                    translateY = -12 * easeFalloff;            // Dynamic wave rise up to 12px
                    shadowGlow = `rgba(6,182,212,${0.45 + 0.35 * easeFalloff})`; // Stronger glow on hover
                }

                span.style.fontWeight = '900';
                span.style.fontVariationSettings = "'wght' 900";
                span.style.transform = `translateY(${translateY}px) scale(${scale})`;
                span.style.textShadow = `0 0 24px ${shadowGlow}`;
            });
        }
        
        requestAnimationFrame(proximityLoop);
    }
    
    // Start the high-performance requestAnimationFrame loop
    requestAnimationFrame(proximityLoop);
})();

// ─── ProfileCard 3D Holographic Parallax Tilt Engine ───────────────────────
function initPlayerCardsTilt() {
    const cards = document.querySelectorAll('.pc-card-wrapper');
    cards.forEach(card => {
        const shell = card.querySelector('.pc-card-shell');
        const innerCard = card.querySelector('.pc-card');
        if (!shell || !innerCard) return;

        // Coordinate range-mapping helper
        const adjustVal = (v, fMin, fMax, tMin, tMax) => {
            return parseFloat((tMin + ((tMax - tMin) * (v - fMin)) / (fMax - fMin)).toFixed(3));
        };

        // Pointer move handler
        card.addEventListener('pointermove', e => {
            const rect = shell.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const width = rect.width || 1;
            const height = rect.height || 1;

            const percentX = Math.min(Math.max((100 / width) * x, 0), 100);
            const percentY = Math.min(Math.max((100 / height) * y, 0), 100);

            const centerX = percentX - 50;
            const centerY = percentY - 50;

            card.style.setProperty('--pointer-x', `${percentX}%`);
            card.style.setProperty('--pointer-y', `${percentY}%`);
            card.style.setProperty('--background-x', `${adjustVal(percentX, 0, 100, 35, 65)}%`);
            card.style.setProperty('--background-y', `${adjustVal(percentY, 0, 100, 35, 65)}%`);
            card.style.setProperty('--pointer-from-center', `${Math.min(Math.hypot(percentY - 50, percentX - 50) / 50, 1).toFixed(3)}`);
            card.style.setProperty('--pointer-from-top', `${(percentY / 100).toFixed(3)}`);
            card.style.setProperty('--pointer-from-left', `${(percentX / 100).toFixed(3)}`);
            card.style.setProperty('--rotate-x', `${(-(centerX / 5)).toFixed(3)}deg`);
            card.style.setProperty('--rotate-y', `${(centerY / 4).toFixed(3)}deg`);
            card.style.setProperty('--card-opacity', '1');
        });

        // Pointer enter
        card.addEventListener('pointerenter', () => {
            shell.classList.add('active');
            shell.classList.add('entering');
            setTimeout(() => {
                shell.classList.remove('entering');
            }, 180);
        });

        // Pointer leave
        card.addEventListener('pointerleave', () => {
            card.style.setProperty('--card-opacity', '0');
            shell.classList.remove('active');
            // Smoothly settle back to center
            card.style.setProperty('--rotate-x', '0deg');
            card.style.setProperty('--rotate-y', '0deg');
            card.style.setProperty('--pointer-x', '50%');
            card.style.setProperty('--pointer-y', '50%');
        });
    });
}

// ─── Lobby Side Widgets (Ocean Observations & Ticker Events) ──────────────────
let lobbyWidgetsAnimationId = null;
let lobbyWidgetsIntervals = [];

function getLanyuTidePhase() {
    // 基準滿潮時間: 2026-06-01 04:00:00 UTC+8
    const baseHighTide = new Date("2026-06-01T04:00:00+08:00").getTime();
    const now = Date.now();
    const diffHours = (now - baseHighTide) / (1000 * 60 * 60);
    
    // 半日潮週期為 12.42 小時
    const tidePeriod = 12.42;
    const phase = (diffHours % tidePeriod) / tidePeriod * 2 * Math.PI;
    
    const cosVal = Math.cos(phase);
    const sinVal = Math.sin(phase);
    
    if (cosVal > 0.7) {
        return 3; // 滿潮 (High Tide)
    } else if (cosVal < -0.7) {
        return 2; // 乾潮 (Low Tide)
    } else if (sinVal > 0) {
        return 1; // 退潮 (Ebb Tide)
    } else {
        return 0; // 漲潮 (Flood Tide)
    }
}

function getLanyuMoonPhase() {
    // 基準新月時間: 2026-05-17 19:13:00 UTC+8
    const baseNewMoon = new Date("2026-05-17T19:13:00+08:00").getTime();
    const now = Date.now();
    const diffDays = (now - baseNewMoon) / (1000 * 60 * 60 * 24);
    const moonAge = (diffDays % 29.53059) / 29.53059;
    
    // 均分 8 等分 (0:新月, 1:眉月, 2:上弦, 3:盈凸, 4:滿月, 5:虧凸, 6:下弦, 7:殘月)
    return Math.round(moonAge * 8) % 8;
}

function initLobbyWidgets() {
    console.log("[LobbyWidgets] initLobbyWidgets() called.");
    clearLobbyWidgets();

    // 1. Sine wave animation for left widget canvas
    const canvas = document.getElementById('widget-wave-canvas');
    if (canvas) {
        console.log("[LobbyWidgets] Canvas wave element detected, starting drawWave loop.");
        const ctx = canvas.getContext('2d');
        let angle = 0;

        function drawWave() {
            if (!document.getElementById('lobby-left-widget') || 
                window.getComputedStyle(document.getElementById('lobby-left-widget')).display === 'none') {
                lobbyWidgetsAnimationId = requestAnimationFrame(drawWave);
                return;
            }

            // Handle high-dpi display
            const dpr = window.devicePixelRatio || 1;
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
                canvas.width = width * dpr;
                canvas.height = height * dpr;
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.scale(dpr, dpr);

            // Draw wave lines
            ctx.lineWidth = 1.5;
            
            // Draw Wave 1 (Deep Blue/Cyan)
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.beginPath();
            for (let x = 0; x < width; x++) {
                const y = height / 2 + Math.sin(x * 0.03 + angle) * 5 + Math.cos(x * 0.01 + angle * 0.5) * 2;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Draw Wave 2 (Bright Cyan/Green)
            ctx.strokeStyle = 'rgba(74, 222, 128, 0.25)';
            ctx.beginPath();
            for (let x = 0; x < width; x++) {
                const y = height / 2 + Math.sin(x * 0.02 - angle * 0.8) * 4 + Math.cos(x * 0.015 - angle * 0.3) * 2;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            ctx.restore();
            angle += 0.04;
            lobbyWidgetsAnimationId = requestAnimationFrame(drawWave);
        }
        drawWave();
    } else {
        console.warn("[LobbyWidgets] Canvas wave element (#widget-wave-canvas) NOT found.");
    }

    // 2. Weather Ocean parameters simulation & real fetch
    const tideEl = document.getElementById('widget-tide');
    const waveEl = document.getElementById('widget-wave');
    const windEl = document.getElementById('widget-wind');
    const tempEl = document.getElementById('widget-temp');
    const moonEl = document.getElementById('widget-moon');

    let currentTideIndex = getLanyuTidePhase();
    let currentMoonIndex = getLanyuMoonPhase();
    let baseWaveHt = 1.8;
    let baseWindSpd = 12;
    let baseTempC = 26.4;

    let waveHt = baseWaveHt;
    let windSpd = baseWindSpd;
    let tempC = baseTempC;

    function updateWidgetValues() {
        const t = translations[currentLang];
        if (!t || !t.widgets) return;
        
        if (tideEl && t.widgets.tides) {
            tideEl.textContent = t.widgets.tides[currentTideIndex];
        }
        if (moonEl && t.widgets.moons) {
            moonEl.textContent = t.widgets.moons[currentMoonIndex];
        }
        if (waveEl) waveEl.textContent = `${waveHt.toFixed(1)} m`;
        if (windEl) windEl.textContent = `${windSpd} kt`;
        if (tempEl) tempEl.textContent = `${tempC.toFixed(1)} °C`;
    }

    // Apply translations on initial load
    updateWidgetValues();

    // Fetch real-time sea data from Open-Meteo
    async function fetchRealSeaData() {
        try {
            console.log("[LobbyWidgets] Fetching real Lanyu ocean data from Open-Meteo...");
            // Lanyu Coordinates: Latitude 22.037, Longitude 121.562
            const [marineRes, weatherRes] = await Promise.all([
                fetch("https://marine-api.open-meteo.com/v1/marine?latitude=22.037&longitude=121.562&current=wave_height"),
                fetch("https://api.open-meteo.com/v1/forecast?latitude=22.037&longitude=121.562&current=temperature_2m,wind_speed_10m")
            ]);
            
            if (marineRes.ok && weatherRes.ok) {
                const marineData = await marineRes.json();
                const weatherData = await weatherRes.json();
                
                if (marineData && marineData.current && marineData.current.wave_height !== undefined) {
                    baseWaveHt = marineData.current.wave_height;
                }
                if (weatherData && weatherData.current) {
                    if (weatherData.current.wind_speed_10m !== undefined) {
                        // km/h to knots
                        baseWindSpd = Math.round(weatherData.current.wind_speed_10m * 0.54);
                    }
                    if (weatherData.current.temperature_2m !== undefined) {
                        baseTempC = weatherData.current.temperature_2m;
                    }
                }
                console.log(`[LobbyWidgets] Real-time Lanyu data loaded: Wave: ${baseWaveHt}m, Wind: ${baseWindSpd}kt, Temp: ${baseTempC}°C`);
                
                // Immediately apply
                waveHt = baseWaveHt;
                windSpd = baseWindSpd;
                tempC = baseTempC;
                updateWidgetValues();
            } else {
                console.warn("[LobbyWidgets] Real-time fetch failed, keeping fallback simulation values.");
            }
        } catch (err) {
            console.error("[LobbyWidgets] Failed to fetch real Lanyu sea data:", err);
        }
    }
    
    fetchRealSeaData();

    const weatherInterval = setInterval(() => {
        const t = translations[currentLang];
        if (!t || !t.widgets || !t.widgets.tides) return;
        
        currentTideIndex = getLanyuTidePhase();
        currentMoonIndex = getLanyuMoonPhase();

        // Subtly fluctuate values on top of real values
        waveHt = Math.max(0.2, baseWaveHt + (Math.sin(Date.now() * 0.001) * 0.08) + (Math.random() - 0.5) * 0.03);
        windSpd = Math.max(0, Math.round(baseWindSpd + (Math.cos(Date.now() * 0.001) * 1) + (Math.random() > 0.5 ? 0.5 : -0.5)));
        tempC = baseTempC + (Math.sin(Date.now() * 0.0005) * 0.08);

        updateWidgetValues();
    }, 3000);
    lobbyWidgetsIntervals.push(weatherInterval);

    // 3. Online craft stats & ticker simulation
    const activeEl = document.getElementById('widget-active-craftsmen');
    const boatsEl = document.getElementById('widget-total-boats');
    const hempEl = document.getElementById('widget-hemp-qty');
    const tickerScroll = document.getElementById('widget-ticker-scroll');

    let activeCount = 7;
    let boatsCount = 42;
    let hempCount = 156;
    let tickerList = [];

    // Initialize ticker logs safely
    const t = translations[currentLang];
    if (t && t.widgets && t.widgets.tickerMessages) {
        tickerList.push(t.widgets.tickerMessages[0]);
        tickerList.push(t.widgets.tickerMessages[1]);
        tickerList.push(t.widgets.tickerMessages[2]);
    }

    function renderTicker() {
        if (!tickerScroll) return;
        tickerScroll.innerHTML = tickerList.map(msg => `<div class="ticker-item">${msg}</div>`).join('');
    }
    renderTicker();

    const statsInterval = setInterval(() => {
        // Fluctuate active players (5 to 11)
        activeCount = Math.max(5, Math.min(11, activeCount + Math.floor((Math.random() - 0.5) * 3)));
        if (activeEl) activeEl.textContent = `${activeCount} ${currentLang === 'zh' ? '人' : 'Active'}`;

        // Occasionally increment completed boats
        if (Math.random() > 0.9) {
            boatsCount++;
            if (boatsEl) boatsEl.textContent = `${boatsCount} ${currentLang === 'zh' ? '艘' : 'Boats'}`;
        }

        // Increment hemp harvest count
        hempCount += Math.floor(Math.random() * 3);
        if (hempEl) hempEl.textContent = `${hempCount} ${currentLang === 'zh' ? '捆' : 'Bales'}`;

        // Push new ticker item safely
        const tCur = translations[currentLang];
        if (!tCur || !tCur.widgets || !tCur.widgets.tickerMessages) return;
        const randomMsg = tCur.widgets.tickerMessages[Math.floor(Math.random() * tCur.widgets.tickerMessages.length)];
        
        // Push and shift ticker list
        tickerList.push(randomMsg);
        if (tickerList.length > 5) {
            tickerList.shift();
        }

        // Animate scroll
        if (tickerScroll) {
            tickerScroll.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
            tickerScroll.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                renderTicker();
                tickerScroll.style.transition = 'none';
                tickerScroll.style.transform = 'translateY(0)';
            }, 450);
        }
    }, 4000);
    lobbyWidgetsIntervals.push(statsInterval);

    // Expose language updater safely
    window.updateWidgetLanguages = () => {
        console.log("[LobbyWidgets] updateWidgetLanguages() called.");
        const tNew = translations[currentLang];
        if (!tNew || !tNew.widgets) return;
        if (tideEl && tNew.widgets.tides) tideEl.textContent = tNew.widgets.tides[currentTideIndex];
        if (moonEl && tNew.widgets.moons) moonEl.textContent = tNew.widgets.moons[currentMoonIndex];
        if (activeEl) activeEl.textContent = `${activeCount} ${currentLang === 'zh' ? '人' : 'Active'}`;
        if (boatsEl) boatsEl.textContent = `${boatsCount} ${currentLang === 'zh' ? '艘' : 'Boats'}`;
        if (hempEl) hempEl.textContent = `${hempCount} ${currentLang === 'zh' ? '捆' : 'Bales'}`;
        
        // Translate currently visible ticker list
        const oldLang = currentLang === 'zh' ? 'en' : 'zh';
        if (translations[oldLang] && translations[oldLang].widgets && translations[oldLang].widgets.tickerMessages &&
            tNew.widgets.tickerMessages) {
            tickerList = tickerList.map(msg => {
                const index = translations[oldLang].widgets.tickerMessages.indexOf(msg);
                if (index !== -1) {
                    return tNew.widgets.tickerMessages[index];
                }
                return msg;
            });
        }
        renderTicker();
    };
    console.log("[LobbyWidgets] initLobbyWidgets() finished executing.");
}

function clearLobbyWidgets() {
    console.log("[LobbyWidgets] clearLobbyWidgets() called.");
    if (lobbyWidgetsAnimationId) {
        cancelAnimationFrame(lobbyWidgetsAnimationId);
        lobbyWidgetsAnimationId = null;
    }
    lobbyWidgetsIntervals.forEach(clearInterval);
    lobbyWidgetsIntervals = [];
    window.updateWidgetLanguages = null;
}


// ───────────────────────── Shared forest ─────────────────────────
const FOREST_MAX = 5;
const FOREST_TEXT = {
    zh: {
        label: '森林狀態',
        levels: { lush: '茂盛', ok: '普通', aged: '老化' },
        tended: '這個月已經有人上山照顧林地',
        untended: '這個月還沒有人上山；整個月沒人去，森林會 −1',
        closed: '2 月封山，森林不增不減',
        agedNote: '森林老化：砍伐多耗 1 AP',
        summaryTitle: '這一年的山林',
        summary: {
            lush: '這一年一直有人上山。因為需要 Avaka，所以有人去砍伐、去照顧林地，森林維持著可以更新的狀態。所有人獲得 2 分。',
            ok: '這一年上山的人時有時無。林地還撐得住，但已經看得出少了人照顧的地方。',
            aged: '這一年幾乎沒有人上山。不需要材料，就沒有人去看山上的狀況；林地無人照顧，森林老化了，山和人的關係也遠了。'
        }
    },
    en: {
        label: 'Forest health',
        levels: { lush: 'thriving', ok: 'fair', aged: 'aged' },
        tended: 'Someone has already gone up to tend the plots this month',
        untended: 'Nobody has gone up yet this month; if no one does, the forest loses 1',
        closed: 'Forest closed in Month 2: no change',
        agedNote: 'Aged forest: chopping costs 1 more AP',
        summaryTitle: 'The forest this year',
        summary: {
            lush: 'People kept going up all year. Because they needed Avaka, someone chopped and tended the plots, and the forest stayed able to renew itself. Everyone gains 2 points.',
            ok: 'People went up now and then this year. The plots are holding, but you can already see where no one has been looking after them.',
            aged: 'Hardly anyone went up this year. With no need for the material, nobody checked on the mountain; the plots went untended and the forest aged, and people and the mountain drifted apart.'
        }
    }
};

function forestLevel(value) {
    if (value >= 4) return 'lush';
    if (value <= 1) return 'aged';
    return 'ok';
}

function renderForestStatus(state) {
    const el = document.getElementById('forest-status');
    if (!el) return;
    const ft = FOREST_TEXT[currentLang] || FOREST_TEXT.zh;
    const value = typeof state.forest === 'number' ? state.forest : 3;
    const level = forestLevel(value);
    const trees = '🌳'.repeat(value) + '▫️'.repeat(FOREST_MAX - value);
    let note = state.month === 2 ? ft.closed : (state.forest_tended ? ft.tended : ft.untended);
    if (level === 'aged') note += '｜' + ft.agedNote;
    const color = level === 'lush' ? '#86efac' : (level === 'aged' ? '#fca5a5' : '#fde68a');
    el.innerHTML = `<strong style="color:${color};">${ft.label} ${trees} ${value}/${FOREST_MAX}（${ft.levels[level]}）</strong><br><span style="opacity:0.8;">${note}</span>`;
}

function forestSummaryHtml(state) {
    const ft = FOREST_TEXT[currentLang] || FOREST_TEXT.zh;
    const value = typeof state.forest === 'number' ? state.forest : 3;
    const level = state.forest_level || forestLevel(value);
    const trees = '🌳'.repeat(value) + '▫️'.repeat(FOREST_MAX - value);
    return `<div style="background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.3); border-radius: 16px; padding: 1.3rem 1.5rem; text-align: left; margin: 2rem 0;">
                    <h2 style="font-family: 'Noto Serif TC', serif; font-size: 1.3rem; color: #86efac; margin: 0 0 0.6rem 0; font-weight: 700;">🌲 ${ft.summaryTitle}　${trees} ${value}/${FOREST_MAX}（${ft.levels[level]}）</h2>
                    <p style="margin: 0; color: #e2e8f0; line-height: 1.7;">${ft.summary[level]}</p>
                </div>`;
}

// ───────────────────────── Shop: hear both generations before finishing ─────────────────────────
const SHOP_VOICES = {
    zh: {
        cancel: '再想想', ok: '就這樣完工', elder: '耆老', middle: '中生代', result: '這條路的結果',
        resin: {
            title: '🧴 用工業樹脂完工？',
            elder: '「以前是用 Avaka 壓實花椒的纖維來填縫，船板壞了可以拆下來換。膠乾了以後，就拆不開了。」',
            middle: '「樹脂拿了就能用，不用等季節。很多人就是這樣改用的。只是船從可以一直修的東西，變成用壞就丟的東西。」',
            result: '立刻完工，+5 分。船取得「不可修復」標記。'
        },
        machine: {
            title: '⚙️ 用機器加工 Avaka 纖維完工？',
            elder: '「材料還是山上的 Avaka，這點我放心。只是曝曬和撚繩的那段功夫，你的手沒有學到。」',
            middle: '「材料還是我們自己的，只是換一種方式處理。省下來的時間，你要拿來做什麼？」',
            result: '立刻完工，+12 分（中生代 +15 分）。船仍可拆修，但跳過了手工的④⑤兩道工序。'
        }
    },
    en: {
        cancel: 'Think again', ok: 'Finish this way', elder: 'Elder', middle: 'Middle Generation', result: 'What this path leads to',
        resin: {
            title: '🧴 Finish with industrial resin?',
            elder: '"We used to pack the seams with prickly-ash fibre pressed in by Avaka, so a damaged plank could be taken out and replaced. Once glue sets, nothing comes apart."',
            middle: '"Resin works the moment you open it, no waiting for the season. That is how many people switched. But the boat goes from something you keep repairing to something you throw away."',
            result: 'Finished at once, +5 points. The boat gets the "Irreparable" tag.'
        },
        machine: {
            title: '⚙️ Finish with machine-processed Avaka fibre?',
            elder: '"The material is still Avaka from the mountain, and that I trust. But your hands never learned the drying and the twining."',
            middle: '"It is still our own material, only handled another way. What will you do with the time you save?"',
            result: 'Finished at once, +12 points (Middle Generation +15). The boat stays repairable, but hand steps ④ and ⑤ are skipped.'
        }
    }
};
let pendingShopItem = null;

function openShopConfirm(item) {
    const modal = document.getElementById('shop-confirm-modal');
    if (!modal) { sendAction({ type: 'buy', item }); return; }
    const v = SHOP_VOICES[currentLang] || SHOP_VOICES.zh;
    const d = v[item] || v.resin;
    pendingShopItem = item;
    document.getElementById('shop-confirm-title').textContent = d.title;
    document.getElementById('shop-confirm-content').innerHTML = `
        <p style="margin:0 0 0.8rem;"><strong style="color:#fbbf24;">🧓 ${v.elder}：</strong>${d.elder}</p>
        <p style="margin:0 0 0.8rem;"><strong style="color:#c4b5fd;">👷 ${v.middle}：</strong>${d.middle}</p>
        <p style="margin:0; padding:0.7rem 0.9rem; border-left:4px solid var(--primary); background:rgba(212,175,55,0.1); border-radius:4px;"><strong>${v.result}：</strong>${d.result}</p>`;
    document.getElementById('shop-confirm-cancel').textContent = v.cancel;
    document.getElementById('shop-confirm-ok').textContent = v.ok;
    modal.style.display = 'flex';
}

// ───────────────────────── Knowledge base ─────────────────────────
const KB_TEXT = {
    zh: {
        title: '📚 知識庫', close: '關閉', openBtn: '📚 知識庫',
        tabs: { avaka: 'Avaka 是什麼', steps: '六道工序', months: '十二個月', paths: '三條完工路徑', score: '得分與傳統教養' },
        avaka: `
            <p><strong>Avaka</strong>（也寫作 Abaka、Abaca）中文常稱馬尼拉麻或絲芭蕉，學名 <em>Musa textilis</em>，是芭蕉科的植物。雖然叫作「麻」，用的其實是葉鞘的纖維。</p>
            <p><strong>長什麼樣子：</strong>外型像香蕉樹，但通常較小、較纖細，高約 2.5 到 8 公尺；葉片較窄、較尖，呈深綠色。果實小、充滿黑色種子，不能吃。假莖由一層層葉鞘疊成，纖維就從葉鞘取得。</p>
            <p><strong>長在哪裡：</strong>原產於菲律賓，蘭嶼是它自然分布的北界之一。在蘭嶼，它種在家族照顧的林地裡。</p>
            <p><strong>可以做什麼：</strong>它的纖維強韌、耐海水，過去用來做繫船繩、槳架繩和錨繩（kolili）、船帆、漁網與釣線，也用在拼板舟船板之間的填縫，還能做成背心等衣物。</p>
            <p><strong>怎麼取纖維：</strong>在開花之前砍下假莖（開花後纖維品質會下降），剝下葉鞘，去掉肉質的部分，只留下纖維，曬乾後再處理。</p>`,
        stepsIntro: '以下是遊戲中六道工序的做法說明。',
        monthsIntro: '每個月的遊戲效果，以及這個月在蘭嶼夜曆裡的祭儀與勞動。',
        effect: '遊戲效果',
        paths: `
            <p><strong>🌟 傳統 Avaka：</strong>六道工序全部手工完成（⑤需 KP 3、⑥需 KP 8）。+20 分。船可以拆、可以修。</p>
            <p><strong>⚙️ 機器加工天然纖維：</strong>完成山林三道工序後，帶 2 份材料到商店，KP 達 5。+12 分（中生代 +15 分）。仍然使用 Avaka、船可拆修，但少了手工曝曬與撚繩的經驗。</p>
            <p><strong>🧴 工業樹脂：</strong>完成山林三道工序後，帶 2 份材料到商店。+5 分。很快完工，但接縫黏死，壞了無法拆修。</p>
            <p>三條路都要先完成山林的三道工序，最快也要到 7 月才能完工。9 月與 10 月不能在商店完工，10 月也不能填縫。沒有哪一條路是標準答案，重點是知道自己為什麼這樣選、選了之後要承擔什麼。</p>`,
        score: `
            <p><strong>向耆老請益（雙方各 +1 分）：</strong>知識要主動去問才會有；願意教的人同樣被肯定。</p>
            <p><strong>向中生代請益（雙方各 +1 分）：</strong>中生代有兩種文化的生活經驗，傳得快，也知道怎麼把傳統轉化成新的做法。</p>
            <p><strong>送材料給耆老（+1 分，6 月 +2 分）：</strong>請教老人家本來就要準備禮物；回饋願意教你的人。當月再向耆老請益，還能多學到 1 KP。</p>
            <p><strong>幫忙長者（+1 分，6 月 +2 分）：</strong>幫助年紀大的人、接下重擔，是成為一個人應有的涵養。</p>
            <p><strong>照顧山林（結算時森林 4 以上，全員 +2 分）：</strong>因為需要材料，所以會去照顧林地；大家都不上山，森林就會老化。</p>
            <p><strong>科學轉譯（成功 +4 分）：</strong>用科學的觀點，印證祖先累積的經驗是有道理的。</p>
            <p><strong>每月小組任務（達成全員 +1 分）：</strong>每個月有一件要全組一起完成的事。一個人做不到的，大家一起就做得到。</p>
            <p>請益與指導的加分，每人每月最多計 2 次。</p>
            <p><strong>講述（耆老 +1 分，每月 1 次）：</strong>老人家說話的時候，大家聚到他身邊聽；封山的 2 月與禁忌的 10 月，正是聽的時候。</p>
            <p><strong>搭把手（+1 分，每月計 1 次）：</strong>在同一個地點幫隊友做工序，他這個月的下一道工序少 2 AP。</p>
            <p><strong>補種 Avaka：</strong>不加分，但算作有人照顧林地，下個月起第一次砍伐多得 1 份材料。</p>`
    },
    en: {
        title: '📚 Knowledge Base', close: 'Close', openBtn: '📚 Knowledge',
        tabs: { avaka: 'What is Avaka', steps: 'The six steps', months: 'The twelve months', paths: 'Three ways to finish', score: 'Scoring & upbringing' },
        avaka: `
            <p><strong>Avaka</strong> (also Abaka or Abaca), known as Manila hemp, is <em>Musa textilis</em>, a plant of the banana family. Despite the name "hemp", the fibre comes from its leaf sheaths.</p>
            <p><strong>What it looks like:</strong> like a banana plant but usually smaller and more slender, about 2.5 to 8 m tall, with narrower, more pointed dark-green leaves. The fruit is small, full of black seeds and not edible. The pseudo-stem is made of overlapping leaf sheaths, and the fibre is taken from them.</p>
            <p><strong>Where it grows:</strong> native to the Philippines; Lanyu is one of the northern limits of its natural range. On Lanyu it grows in plots looked after by families.</p>
            <p><strong>What it is used for:</strong> the fibre is strong and resists seawater. It was used for mooring, oarlock and anchor ropes (kolili), sails, nets and fishing lines, for caulking between the planks of the plank boat, and for garments such as vests.</p>
            <p><strong>How the fibre is taken:</strong> the pseudo-stem is cut before flowering (fibre quality drops afterwards), the sheaths are peeled off, the pulp is removed so that only the fibre remains, and it is dried before further work.</p>`,
        stepsIntro: 'How each of the six craft steps in the game is done.',
        monthsIntro: 'Each month\'s effect in the game, and its rituals and work in the Lanyu calendar.',
        effect: 'Game effect',
        paths: `
            <p><strong>🌟 Traditional Avaka:</strong> all six steps by hand (⑤ needs KP 3, ⑥ needs KP 8). +20 points. The boat can be taken apart and repaired.</p>
            <p><strong>⚙️ Machine-processed natural fibre:</strong> after the three forest steps, bring 2 materials to the Store with KP 5. +12 points (Middle Generation +15). Still Avaka and still repairable, but the hands-on drying and twining are skipped.</p>
            <p><strong>🧴 Industrial resin:</strong> after the three forest steps, bring 2 materials to the Store. +5 points. Quick, but the seams are glued shut and cannot be repaired.</p>
            <p>All three paths start with the three forest steps, so the earliest finish is Month 7. The Store cannot finish boats in Months 9 and 10, and caulking is banned in Month 10. None of the paths is the right answer; what matters is knowing why you chose it and what you accept in return.</p>`,
        score: `
            <p><strong>Asking the Elder (+1 point each):</strong> knowledge comes only to those who ask; those willing to teach are honoured too.</p>
            <p><strong>Asking the Middle Generation (+1 point each):</strong> they have lived in two cultures, pass things on quickly, and know how to turn tradition into new practice.</p>
            <p><strong>Giving a material to the Elder (+1, or +2 in Month 6):</strong> you bring a gift when you ask an elder; you give back to those who teach you. Asking the Elder that month also yields 1 more KP.</p>
            <p><strong>Helping the Elder (+1, or +2 in Month 6):</strong> helping the old and taking on the heavy work is part of becoming a person.</p>
            <p><strong>Tending the forest (+2 for everyone if it ends at 4 or above):</strong> people look after the plots because they need the material; when nobody goes up, the forest ages.</p>
            <p><strong>Scientific Translation (+4 on success):</strong> science confirming that the ancestors' experience was well founded.</p>
            <p><strong>Monthly group mission (+1 for everyone):</strong> each month there is one thing the whole group has to get done together.</p>
            <p>Points for asking and guiding count at most twice per player per month.</p>
            <p><strong>Storytelling (Elder +1, once a month):</strong> when the elder speaks, everyone gathers round to listen; Months 2 and 10, when work is forbidden, are the time for it.</p>
            <p><strong>Lending a hand (+1, once a month):</strong> help a teammate at the same location; their next step this month costs 2 AP less.</p>
            <p><strong>Replanting Avaka:</strong> no points, but it counts as tending the plots and your first chop from next month on yields 1 extra material.</p>`
    }
};
let kbCurrentTab = 'avaka';

function renderKnowledge(tab) {
    const modal = document.getElementById('kb-modal');
    if (!modal) return;
    kbCurrentTab = tab || kbCurrentTab;
    const isEn = currentLang === 'en';
    const kt = KB_TEXT[currentLang] || KB_TEXT.zh;
    document.getElementById('kb-title').textContent = kt.title;
    document.getElementById('close-kb-btn').textContent = kt.close;
    document.getElementById('kb-tabs').innerHTML = Object.entries(kt.tabs).map(([key, label]) =>
        `<button class="btn ${key === kbCurrentTab ? 'primary' : 'secondary outline'} kb-tab-btn" data-tab="${key}" style="padding:0.3rem 0.8rem; font-size:0.85rem; height:auto;">${label}</button>`).join('');
    let html = '';
    if (kbCurrentTab === 'steps') {
        html = `<p>${kt.stepsIntro}</p>` + ['chop', 'rub', 'strip', 'dry', 'twine', 'caulk'].map(step => {
            const btn = document.querySelector(`.craft-btn[data-step="${step}"]`);
            if (!btn) return '';
            return `<p style="white-space:pre-line;"><strong>${btn.textContent.trim()}</strong>\n${btn.title || ''}</p>`;
        }).join('');
    } else if (kbCurrentTab === 'months') {
        html = `<p>${kt.monthsIntro}</p>` + GAME_RULES.map((rule, i) => {
            const lore = monthLoreData[i + 1];
            const loreTitle = lore ? (isEn ? lore.title_en : lore.title_zh) : '';
            const loreText = lore ? (isEn ? lore.desc_en : lore.desc_zh) : '';
            return `<div style="margin-bottom:1rem; padding-bottom:0.8rem; border-bottom:1px solid rgba(255,255,255,0.1);">
                <strong style="color:var(--secondary);">${i + 1}. ${rule.name} ${loreTitle}</strong>
                <div style="background:rgba(212,175,55,0.1); border-left:4px solid var(--primary); padding:6px 10px; margin:6px 0; border-radius:4px;"><strong>${kt.effect}：</strong>${isEn ? rule.desc_en : rule.desc_zh}</div>
                <div>${loreText}</div></div>`;
        }).join('');
    } else {
        html = kt[kbCurrentTab] || '';
    }
    document.getElementById('kb-content').innerHTML = html;
    document.getElementById('kb-content').scrollTop = 0;
}

document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.id === 'open-kb-btn') {
        renderKnowledge(kbCurrentTab);
        document.getElementById('kb-modal').style.display = 'flex';
    } else if (t.id === 'close-kb-btn') {
        document.getElementById('kb-modal').style.display = 'none';
    } else if (t.classList && t.classList.contains('kb-tab-btn')) {
        renderKnowledge(t.dataset.tab);
    } else if (t.id === 'shop-confirm-cancel') {
        document.getElementById('shop-confirm-modal').style.display = 'none';
        pendingShopItem = null;
    } else if (t.id === 'shop-confirm-ok') {
        document.getElementById('shop-confirm-modal').style.display = 'none';
        if (pendingShopItem) sendAction({ type: 'buy', item: pendingShopItem });
        pendingShopItem = null;
    }
});


// ───────────────────────── Group missions, badges, titles ─────────────────────────
const MISSION_TEXT = {
    zh: { label: '本月小組任務', reward: '達成全員 +1 分', done: '已達成！全員 +1 分',
          ask: n => `本月全組合計請益 ${n} 次`, gift: () => '本月有人送材料給耆老', help: () => '本月有人幫忙長者',
          forest: () => '本月有人上山砍伐、照顧林地', teach: () => '本月耆老指導至少 1 次', steps: n => `本月全組合計完成 ${n} 道工序`,
          names: { ask: '開口問', gift: '帶禮物來', help: '接下重擔', forest: '上山看看', teach: '把話傳下去', steps: '一起動手' } },
    en: { label: "This month's group mission", reward: '+1 point for everyone', done: 'Completed! +1 point for everyone',
          ask: n => `The group asks ${n} time(s) in total this month`, gift: () => 'Someone gives a material to the Elder this month', help: () => 'Someone helps the Elder this month',
          forest: () => 'Someone goes up to chop and tend the plots this month', teach: () => 'The Elder guides at least once this month', steps: n => `The group completes ${n} craft step(s) in total this month`,
          names: { ask: 'Speak up and ask', gift: 'Bring a gift', help: 'Take on the load', forest: 'Go up and look', teach: 'Pass the word on', steps: 'Hands together' } }
};
const BADGE_TEXT = {
    zh: { label: '徽章', toast: '獲得徽章', names: { ask: '開口問', gift: '帶禮物來', help: '接下重擔', forest: '照顧山林', teach: '把話傳下去', translate: '看見道理', finish: '船下水了' } },
    en: { label: 'Badges', toast: 'Badge earned', names: { ask: 'Spoke up and asked', gift: 'Brought a gift', help: 'Took on the load', forest: 'Tended the forest', teach: 'Passed the word on', translate: 'Saw the reason', finish: 'Boat launched' } }
};
const BADGE_ICONS = { ask: '🙋', gift: '🎁', help: '💪', forest: '🌳', teach: '🗣️', translate: '🔬', finish: '⛵' };
const TITLE_TEXT = {
    zh: { label: '稱號', names: { heritage: '最會傳承', giving: '最懂回饋', helper: '長者的幫手', forest: '山林守護者' } },
    en: { label: 'Titles', names: { heritage: 'Best at passing it on', giving: 'Best at giving back', helper: "The Elder's helper", forest: 'Guardian of the forest' } }
};

function missionNameEn(zhName) {
    const key = Object.keys(MISSION_TEXT.zh.names).find(k => MISSION_TEXT.zh.names[k] === zhName);
    return key ? MISSION_TEXT.en.names[key] : zhName;
}
function badgeNameEn(zhName) {
    // translateLog swaps place names first, so 「照顧山林」 arrives as 「照顧Mountain Forest」
    zhName = zhName.replace(/Mountain Forest/g, '山林');
    const key = Object.keys(BADGE_TEXT.zh.names).find(k => BADGE_TEXT.zh.names[k] === zhName);
    return key ? BADGE_TEXT.en.names[key] : zhName;
}

function renderMission(state) {
    const el = document.getElementById('mission-banner');
    if (!el) return;
    const m = state.mission;
    if (!m) { el.style.display = 'none'; return; }
    const mt = MISSION_TEXT[currentLang] || MISSION_TEXT.zh;
    const desc = mt[m.id] ? mt[m.id](m.target) : m.desc;
    const name = mt.names[m.id] || m.name;
    el.style.display = 'block';
    el.style.color = m.done ? '#86efac' : '#fde68a';
    el.innerHTML = `🎯 <strong>${mt.label}「${name}」</strong>：${desc}　${m.done ? '✅ ' + mt.done : `(${m.progress}/${m.target}) · ${mt.reward}`}`;
}

function badgeLineHtml(p) {
    const badges = p.badges || [];
    if (!badges.length) return '';
    const bt = BADGE_TEXT[currentLang] || BADGE_TEXT.zh;
    return `<br><span title="${badges.map(b => bt.names[b] || b).join('、')}">🏅 ${badges.map(b => BADGE_ICONS[b] || '🏅').join(' ')}</span>`;
}

const announcedBadges = { key: null, seen: new Set() };
function announceNewBadges(state, p) {
    const key = state.room_code + ':' + p.name;
    const badges = p.badges || [];
    if (announcedBadges.key !== key) {
        // first sight of this game (or a rejoin): do not replay old badges
        announcedBadges.key = key;
        announcedBadges.seen = new Set(badges.length > 1 ? badges : []);
    }
    const bt = BADGE_TEXT[currentLang] || BADGE_TEXT.zh;
    badges.forEach(b => {
        if (!announcedBadges.seen.has(b)) {
            announcedBadges.seen.add(b);
            showToast(`🏅 ${bt.toast}：${BADGE_ICONS[b] || ''} ${bt.names[b] || b}`);
        }
    });
}

function playerHonoursHtml(p) {
    const bt = BADGE_TEXT[currentLang] || BADGE_TEXT.zh;
    const tt = TITLE_TEXT[currentLang] || TITLE_TEXT.zh;
    const titles = (p.titles || []).map(t => `<span style="display:inline-block; margin:0.2rem 0.3rem 0 0; padding:0.15rem 0.6rem; border-radius:12px; border:1px solid #fbbf24; background:rgba(251,191,36,0.15); color:#fde68a; font-size:0.8rem;">🏆 ${tt.names[t] || t}</span>`).join('');
    const badges = (p.badges || []).map(b => `<span style="display:inline-block; margin:0.2rem 0.3rem 0 0; padding:0.15rem 0.6rem; border-radius:12px; border:1px solid rgba(148,163,184,0.5); background:rgba(148,163,184,0.12); color:#e2e8f0; font-size:0.8rem;">${BADGE_ICONS[b] || '🏅'} ${bt.names[b] || b}</span>`).join('');
    if (!titles && !badges) return '';
    return `<div style="margin-top:0.5rem;">${titles}${badges}</div>`;
}


// ───────────────────────── Batch 4: quiz, event cards, replanting, lending a hand, mini-game ─────────────────────────
// Option order here must match QUIZ_ANSWERS in server.py (the server only knows the index of the right one).
const QUIZ_TEXT = {
    zh: {
        title: '📝 請益小問答', hint: '答對多得 1 KP，答錯沒有損失。', right: '答對了！多得 1 KP。', wrong: '這次沒答對，正確答案是：', close: '知道了',
        q1: { q: 'Avaka 的纖維是從植物的哪個部位取得的？', o: ['葉鞘', '果實', '根'] },
        q2: { q: '為什麼要在開花之前砍下假莖？', o: ['開花後纖維品質會下降', '開花後砍不動', '開花後會有毒'] },
        q3: { q: '下面哪一樣不是過去用 Avaka 纖維做的？', o: ['錨繩', '船板之間的填縫', '船槳'] },
        q4: { q: 'Avaka 的纖維適合用在船上，主要是因為？', o: ['強韌、耐海水', '顏色好看', '很輕會浮'] },
        q5: { q: '2 月招魚祭期間，為什麼不能上山？', o: ['這段時間禁止進入山林', '山上沒有 Avaka', '下雨路滑'] },
        q6: { q: '5 月梅雨季，還沒曬乾的材料會怎樣？', o: ['容易腐爛，要先防潮', '長得更快', '自己變乾'] },
        q7: { q: '用傳統 Avaka 填縫的船，壞了可以怎麼辦？', o: ['拆開來修', '只能整艘丟掉', '塗上樹脂就好'] },
        q8: { q: '用工業樹脂完工的船，和傳統做法最大的不同是？', o: ['接縫黏死，壞了無法拆修', '船比較慢', '不能下水'] },
        q9: { q: '蘭嶼在 Avaka 的自然分布上是什麼位置？', o: ['自然分布的北界之一', '最南邊', '全世界只有蘭嶼有'] },
        q10: { q: 'Avaka 的外型像哪一種植物？', o: ['香蕉樹', '竹子', '椰子樹'] },
        q11: { q: 'Avaka 的果實可以吃嗎？', o: ['不能，果實小而且充滿黑色種子', '可以，很甜', '煮熟才能吃'] },
        q12: { q: '遊戲裡 10 月為什麼不能完工？', o: ['這個月不允許落成', '天氣太冷', '材料用完了'] },
        q13: { q: '機器加工天然纖維的船，和工業樹脂的船相比？', o: ['仍然使用 Avaka，壞了可以拆修', '一樣無法拆修', '不需要任何材料'] },
        q14: { q: '6 月好月節，遊戲裡哪些事的得分會加倍？', o: ['送材料給耆老、幫忙長者', '砍伐', '在商店完工'] },
        q15: { q: '森林狀態為什麼會下降？', o: ['整個月沒有人上山照顧林地', '砍得太多', '下太多雨'] }
    },
    en: {
        title: '📝 Ask quiz', hint: 'A correct answer gives +1 KP; a wrong one costs nothing.', right: 'Correct! +1 KP.', wrong: 'Not this time. The right answer is:', close: 'Got it',
        q1: { q: 'Which part of the Avaka plant does the fibre come from?', o: ['The leaf sheaths', 'The fruit', 'The roots'] },
        q2: { q: 'Why is the pseudo-stem cut before the plant flowers?', o: ['Fibre quality drops after flowering', 'It is too hard to cut afterwards', 'It becomes poisonous'] },
        q3: { q: 'Which of these was NOT made from Avaka fibre?', o: ['Anchor rope', 'Caulking between the planks', 'Oars'] },
        q4: { q: 'Avaka fibre suits boats mainly because it is…', o: ['Strong and resists seawater', 'Nice in colour', 'Light and floats'] },
        q5: { q: 'Why can nobody go up the mountain during the fish-summoning month (Month 2)?', o: ['Entering the forest is forbidden then', 'There is no Avaka up there', 'The paths are slippery'] },
        q6: { q: 'What happens to materials that are not yet dried in the plum-rain month (Month 5)?', o: ['They rot easily and must be protected', 'They grow faster', 'They dry by themselves'] },
        q7: { q: 'A boat caulked with traditional Avaka gets damaged. What can be done?', o: ['Take it apart and repair it', 'Throw the whole boat away', 'Just coat it with resin'] },
        q8: { q: 'What is the biggest difference of a boat finished with industrial resin?', o: ['Its seams are glued shut and cannot be repaired', 'It is slower', 'It cannot be launched'] },
        q9: { q: 'Where does Lanyu sit in the natural range of Avaka?', o: ['One of its northern limits', 'Its southern end', 'The only place it grows'] },
        q10: { q: 'Which plant does Avaka look like?', o: ['A banana plant', 'Bamboo', 'A coconut palm'] },
        q11: { q: 'Can the fruit of Avaka be eaten?', o: ['No: it is small and full of black seeds', 'Yes, it is sweet', 'Only when cooked'] },
        q12: { q: 'Why can no boat be finished in Month 10 in the game?', o: ['Launching is not allowed this month', 'It is too cold', 'The materials have run out'] },
        q13: { q: 'How does a boat of machine-processed natural fibre compare with a resin one?', o: ['It is still Avaka and can be taken apart and repaired', 'It cannot be repaired either', 'It needs no material at all'] },
        q14: { q: 'In the Good Month (Month 6), which actions score double in the game?', o: ['Giving a material to the Elder and helping the Elder', 'Chopping', 'Finishing at the Store'] },
        q15: { q: 'Why does forest health go down?', o: ['Nobody went up to tend the plots for a whole month', 'Too much chopping', 'Too much rain'] }
    }
};

const EVENT_TEXT = {
    zh: {
        title: '📜 本月事件',
        m2:  { t: '灘頭正在舉行招魚祭', a: '到灘頭參加', ad: '少 2 AP，+1 分', b: '整理工具', bd: '留在工作室整理工具，下個月多回復 1 AP' },
        m10: { t: '這個月大家在燒製貝灰', a: '幫忙燒貝灰', ad: '少 2 AP，+1 分', b: '請教長輩', bd: '趁空檔請教長輩：少 1 AP，+1 KP' },
        m3:  { t: '族人找你一起出海捕飛魚', a: '一起出海', ad: '少 2 AP，+1 分', b: '留下來做工', bd: '沒有變化' },
        m6:  { t: '好月節要分享收成', a: '分享收成', ad: '把 1 份材料分給全組材料最少的人，+1 分', b: '留著自己用', bd: '沒有變化' },
        m8:  { t: '有人問你傳統做法有什麼道理', a: '花時間說明', ad: '少 1 AP，+1 KP', b: '下次再說', bd: '沒有變化' },
        m11: { t: '晚上老人家在講以前的事', a: '留下來聽', ad: '少 1 AP，+1 KP', b: '早點休息', bd: '下個月多回復 1 AP' }
    },
    en: {
        title: "📜 This month's event",
        m2:  { t: 'The fish-summoning ceremony is being held on the shore', a: 'Join in at the shore', ad: '−2 AP, +1 point', b: 'Tidy the tools', bd: 'Stay in the workshop and tidy the tools: +1 AP recovery next month' },
        m10: { t: 'This month everyone is burning shell lime', a: 'Help burn shell lime', ad: '−2 AP, +1 point', b: 'Ask an elder', bd: 'Use the quiet time to ask an elder: −1 AP, +1 KP' },
        m3:  { t: 'Your relatives ask you to go out for flying fish', a: 'Go fishing together', ad: '−2 AP, +1 point', b: 'Stay and work', bd: 'No change' },
        m6:  { t: 'It is the Good Month: time to share the harvest', a: 'Share the harvest', ad: 'Give 1 material to the teammate with the fewest, +1 point', b: 'Keep it for yourself', bd: 'No change' },
        m8:  { t: 'Someone asks why the traditional way is done the way it is', a: 'Take time to explain', ad: '−1 AP, +1 KP', b: 'Maybe next time', bd: 'No change' },
        m11: { t: 'In the evening the elders are telling stories of the old days', a: 'Stay and listen', ad: '−1 AP, +1 KP', b: 'Rest early', bd: '+1 AP recovery next month' }
    }
};

const B4_TEXT = {
    zh: {
        plant: '🌱 補種 Avaka (1 AP | 每月 1 次 · 下次砍伐 +1 材料)', plantDone: '🌱 本月已補種',
        assist: '🙌 搭把手 (1 AP)', assisted: '🙌 下一道工序 −2 AP',
        tell: (kp) => `🗣️ 講述 <span style="font-size:0.8rem;opacity:0.7;font-weight:normal;">(2 AP → 身邊的人各 +${kp} KP · +1 分)</span>`, tellDone: '🗣️ 本月已講述',
        mgTitle: '🎯 抓準時機', mgHint: '指針走到綠色區域時按下。成功退回 1 AP，失敗沒有損失。', mgGo: '就是現在！', mgSkip: '跳過',
        mgWin: '抓得剛好！退回 1 AP。', mgLose: '差了一點，沒有損失。',
        mgStep: { chop: '下刀的位置', rub: '摩擦的力道', strip: '撕絲的力道', dry: '收起來的時間', twine: '搓撚的鬆緊', caulk: '塞進縫裡的深淺' }
    },
    en: {
        plant: '🌱 Replant Avaka (1 AP | once a month · next chop +1 material)', plantDone: '🌱 Replanted this month',
        assist: '🙌 Lend a hand (1 AP)', assisted: '🙌 Next step −2 AP',
        tell: (kp) => `🗣️ Tell stories <span style="font-size:0.8rem;opacity:0.7;font-weight:normal;">(2 AP → +${kp} KP for everyone nearby · +1 pt)</span>`, tellDone: '🗣️ Told this month',
        mgTitle: '🎯 Right moment', mgHint: 'Press when the pointer is in the green zone. Success returns 1 AP; a miss costs nothing.', mgGo: 'Now!', mgSkip: 'Skip',
        mgWin: 'Spot on! 1 AP returned.', mgLose: 'Just missed. Nothing lost.',
        mgStep: { chop: 'Where to cut', rub: 'How hard to rub', strip: 'How hard to pull', dry: 'When to take it in', twine: 'How tight to twist', caulk: 'How deep to press' }
    }
};

function eventOptionEn(zhName) {
    for (const id of ['m2', 'm3', 'm6', 'm8', 'm10', 'm11']) {
        if (EVENT_TEXT.zh[id].a === zhName) return EVENT_TEXT.en[id].a;
        if (EVENT_TEXT.zh[id].b === zhName) return EVENT_TEXT.en[id].b;
    }
    return zhName;
}
function eventNotesEn(notes) {
    return notes
        .replace(/消耗 (\d+) AP/, '−$1 AP')
        .replace(/把 (\d+) 份材料分給 ([^，]+)/, 'gave $1 material to $2')
        .replace(/獲得 (\d+) KP/, '+$1 KP')
        .replace(/獲得 (\d+) 分/, '+$1 point')
        .replace(/下個月多回復 (\d+) AP/, '+$1 AP recovery next month')
        .replace(/，/g, ', ');
}

// Lend-a-hand button (and the tag on whoever has been helped) inside a player card
function assistHtml(state, myP, p, id, isMe) {
    const t = B4_TEXT[currentLang] || B4_TEXT.zh;
    const helped = (p.assist_month || 0) === state.month;
    let html = '';
    if (helped) {
        html += `<span style="font-size:0.72rem; padding:0.2rem 0.55rem; border-radius:6px; background:rgba(34,197,94,0.15); color:#86efac; border:1px solid rgba(34,197,94,0.4);">${t.assisted}</span>`;
    } else if (!isMe && myP && myP.location === p.location && !p.finished) {
        html += `<button class="assist-btn" data-id="${id}" style="font-size:0.75rem; padding:0.3rem 0.8rem; border-radius:6px; background:rgba(34,197,94,0.15); color:#86efac; border:1px solid rgba(34,197,94,0.4); cursor:pointer; font-weight:bold;">${t.assist}</button>`;
    }
    return html;
}

const tellBtnEl = document.getElementById('tell-btn');
if (tellBtnEl) {
    tellBtnEl.addEventListener('click', (e) => {
        playActionSound();
        showFloatingIcon(e, '🗣️');
        sendAction({ type: 'tell' });
    });
}

document.querySelectorAll('.plant-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        playActionSound();
        showFloatingIcon(e, '🌱');
        sendAction({ type: 'plant' });
    });
});

function b4Modal(id, innerHtml) {
    let modal = document.getElementById(id);
    if (!modal) {
        modal = document.createElement('div');
        modal.id = id;
        // below the month-opening card (z-index 3000) so that one is read first
        modal.style.cssText = 'position:fixed; inset:0; z-index:2500; display:flex; align-items:center; justify-content:center; background:rgba(2,6,23,0.72); backdrop-filter:blur(4px); padding:1rem;';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `<div style="width:min(520px, 100%); max-height:88vh; overflow-y:auto; padding:1.4rem 1.5rem; border-radius:16px; background:linear-gradient(160deg, rgba(15,23,42,0.98), rgba(10,15,30,0.98)); border:1px solid rgba(212,175,55,0.45); box-shadow:0 20px 60px rgba(0,0,0,0.6); color:#e2e8f0;">${innerHtml}</div>`;
    return modal;
}
function b4Close(id) {
    const modal = document.getElementById(id);
    if (modal) modal.remove();
}
const B4_BTN = 'display:block; width:100%; text-align:left; margin-top:0.6rem; padding:0.75rem 1rem; border-radius:10px; border:1px solid rgba(212,175,55,0.4); background:rgba(212,175,55,0.08); color:#fef3c7; font-size:0.95rem; cursor:pointer;';

const promptState = { quizSeq: 0, quizResultSeq: 0, eventKey: '', mgSeq: 0, mgTimer: null };

function renderPrompts(state) {
    const me = state.players[myId];
    const t = B4_TEXT[currentLang] || B4_TEXT.zh;

    // replant button
    document.querySelectorAll('.plant-btn').forEach(btn => {
        const done = me && (me.plant_month || 0) === state.month;
        btn.textContent = done ? t.plantDone : t.plant;
        btn.style.opacity = (done || state.month === 2) ? '0.45' : '1';
    });
    if (!me) return;

    // the elder's storytelling
    const tellBtn = document.getElementById('tell-btn');
    if (tellBtn) {
        if (me.role === 'elder') {
            const done = (me.tell_month || 0) === state.month;
            const heard = Object.values(state.players).some(o => o.id !== me.id && o.role !== 'elder' && o.location === me.location);
            tellBtn.style.display = 'block';
            tellBtn.style.opacity = (done || !heard) ? '0.45' : '1';
            tellBtn.innerHTML = done ? t.tellDone : t.tell((state.month === 2 || state.month === 10) ? 2 : 1);
        } else {
            tellBtn.style.display = 'none';
        }
    }

    // quiz
    if (me.quiz && me.quiz.seq !== promptState.quizSeq) {
        promptState.quizSeq = me.quiz.seq;
        showQuiz(me.quiz);
    }
    if (me.quiz_result && me.quiz_result.seq !== promptState.quizResultSeq) {
        const fresh = me.quiz_result.seq === promptState.quizSeq;
        promptState.quizResultSeq = me.quiz_result.seq;
        if (fresh) showQuizResult(me.quiz_result);
    }
    if (!me.quiz && !(me.quiz_result && me.quiz_result.seq === promptState.quizSeq) ) b4Close('quiz-modal');

    // event card
    const eventKey = me.event ? `${state.room_code}:${me.event.id}` : '';
    if (eventKey && eventKey !== promptState.eventKey) showEventCard(me.event.id);
    if (!eventKey) b4Close('event-choice-modal');
    promptState.eventKey = eventKey;

    // mini-game
    if (me.minigame && me.minigame.seq !== promptState.mgSeq) {
        promptState.mgSeq = me.minigame.seq;
        showMiniGame(me.minigame);
    }
}

function showQuiz(quiz) {
    const qt = QUIZ_TEXT[currentLang] || QUIZ_TEXT.zh;
    const item = qt[quiz.id];
    if (!item) return;
    const buttons = quiz.order.map(i => `<button class="quiz-opt" data-choice="${i}" style="${B4_BTN}">${item.o[i]}</button>`).join('');
    const modal = b4Modal('quiz-modal', `
        <h3 style="margin:0 0 0.3rem; color:#fde68a;">${qt.title}</h3>
        <p style="margin:0 0 0.9rem; font-size:0.8rem; color:#94a3b8;">${qt.hint}</p>
        <p style="margin:0 0 0.4rem; font-size:1.05rem; line-height:1.6;">${item.q}</p>
        ${buttons}`);
    modal.querySelectorAll('.quiz-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.querySelectorAll('.quiz-opt').forEach(b => { b.disabled = true; b.style.opacity = '0.5'; });
            socket.emit('action', { type: 'quiz_answer', choice: Number(btn.dataset.choice) });
        });
    });
}

function showQuizResult(result) {
    const qt = QUIZ_TEXT[currentLang] || QUIZ_TEXT.zh;
    const item = qt[result.id];
    if (!item) return;
    const body = result.correct
        ? `<p style="margin:0.4rem 0 0; font-size:1.05rem; color:#86efac;">✅ ${qt.right}</p>`
        : `<p style="margin:0.4rem 0 0; font-size:1rem; color:#fca5a5;">${qt.wrong}</p><p style="margin:0.3rem 0 0; font-size:1.05rem; color:#fde68a;">${item.o[result.answer]}</p>`;
    const modal = b4Modal('quiz-modal', `
        <h3 style="margin:0 0 0.6rem; color:#fde68a;">${qt.title}</h3>
        <p style="margin:0; font-size:0.95rem; color:#cbd5e1; line-height:1.6;">${item.q}</p>
        ${body}
        <button id="quiz-close" style="${B4_BTN} text-align:center;">${qt.close}</button>`);
    modal.querySelector('#quiz-close').addEventListener('click', () => b4Close('quiz-modal'));
}

function showEventCard(eventId) {
    const et = EVENT_TEXT[currentLang] || EVENT_TEXT.zh;
    const ev = et[eventId];
    if (!ev) return;
    const modal = b4Modal('event-choice-modal', `
        <h3 style="margin:0 0 0.6rem; color:#fde68a;">${et.title}</h3>
        <p style="margin:0 0 0.5rem; font-size:1.1rem; line-height:1.6;">${ev.t}</p>
        <button class="event-opt" data-choice="a" style="${B4_BTN}"><strong>${ev.a}</strong><br><span style="font-size:0.82rem; color:#cbd5e1;">${ev.ad}</span></button>
        <button class="event-opt" data-choice="b" style="${B4_BTN}"><strong>${ev.b}</strong><br><span style="font-size:0.82rem; color:#cbd5e1;">${ev.bd}</span></button>`);
    modal.querySelectorAll('.event-opt').forEach(btn => {
        // the card stays open if the server refuses (not enough AP / no material); it closes once the event is settled
        btn.addEventListener('click', () => socket.emit('action', { type: 'event_choice', choice: btn.dataset.choice }));
    });
}

// Timing game: the pointer sweeps back and forth; its position is computed from the clock, not from frames.
const MG_PERIOD = 1300, MG_ZONE = [0.40, 0.62], MG_LIMIT = 6000;
function showMiniGame(mg) {
    const t = B4_TEXT[currentLang] || B4_TEXT.zh;
    clearTimeout(promptState.mgTimer);
    const start = performance.now();
    const modal = b4Modal('minigame-modal', `
        <h3 style="margin:0 0 0.3rem; color:#fde68a;">${t.mgTitle}：${t.mgStep[mg.step] || ''}</h3>
        <p style="margin:0 0 1rem; font-size:0.82rem; color:#94a3b8;">${t.mgHint}</p>
        <div style="position:relative; height:26px; border-radius:13px; background:rgba(148,163,184,0.2); overflow:hidden;">
            <div style="position:absolute; top:0; bottom:0; left:${MG_ZONE[0] * 100}%; width:${(MG_ZONE[1] - MG_ZONE[0]) * 100}%; background:rgba(34,197,94,0.55);"></div>
            <div id="mg-pointer" style="position:absolute; top:-2px; bottom:-2px; width:6px; margin-left:-3px; border-radius:3px; background:#fde68a; box-shadow:0 0 8px #fde68a; left:0; animation:mg-sweep ${MG_PERIOD}ms linear infinite alternate;"></div>
        </div>
        <style>@keyframes mg-sweep { from { left: 0%; } to { left: 100%; } }</style>
        <p id="mg-msg" style="margin:0.8rem 0 0; min-height:1.4rem; font-size:1rem;"></p>
        <div style="display:flex; gap:0.6rem;">
            <button id="mg-go" style="${B4_BTN} text-align:center; flex:2; font-weight:bold;">${t.mgGo}</button>
            <button id="mg-skip" style="${B4_BTN} text-align:center; flex:1; border-color:rgba(148,163,184,0.4); background:rgba(148,163,184,0.08); color:#cbd5e1;">${t.mgSkip}</button>
        </div>`);
    let settled = false;
    const finish = (success, showMsg) => {
        if (settled) return;
        settled = true;
        clearTimeout(promptState.mgTimer);
        socket.emit('action', { type: 'minigame_result', success });
        if (!showMsg) { b4Close('minigame-modal'); return; }
        const pointer = modal.querySelector('#mg-pointer');
        if (pointer) pointer.style.animationPlayState = 'paused';
        const msg = modal.querySelector('#mg-msg');
        if (msg) { msg.textContent = success ? t.mgWin : t.mgLose; msg.style.color = success ? '#86efac' : '#fca5a5'; }
        setTimeout(() => b4Close('minigame-modal'), 900);
    };
    modal.querySelector('#mg-go').addEventListener('click', () => {
        const phase = ((performance.now() - start) % (MG_PERIOD * 2)) / MG_PERIOD;   // 0..2
        const pos = phase <= 1 ? phase : 2 - phase;                                    // triangle wave 0..1
        finish(pos >= MG_ZONE[0] && pos <= MG_ZONE[1], true);
    });
    modal.querySelector('#mg-skip').addEventListener('click', () => finish(false, false));
    promptState.mgTimer = setTimeout(() => finish(false, false), MG_LIMIT);
}
