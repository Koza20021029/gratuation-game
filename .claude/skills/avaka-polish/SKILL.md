---
name: avaka-polish
description: 改《Avaka：島嶼的維度》的畫面、3D 島頁、互動或效能之前先讀。記錄怎麼在本機跑和量測、設計上不能破的規則、效能預算、以及哪種工作該搭配哪個已安裝的 skill。Use before any visual, 3D, interaction or performance change to the Avaka game, lobby, island page or rules site.
---

# Avaka 打磨守則

先讀 `avaka-multiplayer/PRODUCT.md`（對象、原則、族語用字）。待辦清單與證據在 `docs/網頁檢視與提升建議_2026-11-15.md`，做完一項就在那份文件標記。

## 在本機跑

- 預覽工具從 `.claude/launch.json` 啟動時讀不到 Desktop 底下的檔案（`Operation not permitted`）。改用 Bash 背景啟動，再用瀏覽器開網址：
  `cd avaka-multiplayer && PYTHONUNBUFFERED=1 PORT=5055 ./.venv/bin/python server.py`
- 頁面：`/`（大廳與遊戲）、`/island`（3D 島）、`/rules/`、`/rules/player.html`、`/rules/class.html`。
- 島頁網址參數：`?month=1..12`、`?focus=<地點 id>`、`?story=1..5`、`?view=era`、`?quality=low|medium|high`、`?lang=zh|en`。
- 島頁除錯入口 `window.avakaIsland`：`select(id)`、`setMonth(n)`、`overview()`、`openStory(i)`、`setEra('past')`、`drawOnce()`（回傳這一幀的 calls／triangles）、`perf`（目前 fps 與降級層級）、`quality`。
- 進遊戲最快的方法：大廳填名字、選角色、「自己開一間新的」→ 確認角色 → 「開始這一年」。一個人就能開局。
- 做完記得關掉伺服器：`kill $(lsof -tiTCP:5055 -sTCP:LISTEN)`。

## 量測時要注意

- 瀏覽器面板在背景或被蓋住時，動畫會被節流到約 1 fps，而且 `document.hidden` 可能還是 false。這時**不要引用 FPS**，島頁還會自己降畫質（看 `avakaIsland.perf.level`，不是 0 就重新整理再量）。
- 可信的數字：`drawOnce()` 的三角形數與繪製呼叫數、`performance.getEntriesByType('resource')` 的檔案大小、`curl -I` 的回應標頭。
- 正式站 https://avaka.onrender.com 睡著時第一個請求要 40 秒以上；量速度前先打一次再量。

## 效能預算（全景，`drawOnce()` 量）

| | 2026-11-15 基準 | 2026-11-16 現況 | 目標 |
|---|---|---|---|
| 島頁繪製呼叫 | 高 80、手機 90 | 82–85 | 不超過 120 |
| 島頁三角形／幀 | 高 115 萬、中 61 萬 | 高 72.7 萬、中 44.1 萬、低 29.8 萬 | 高 ≤ 70 萬、中 ≤ 35 萬 |
| 首頁在捏臉之前載入的 JS | 約 1.1 MB（未壓縮） | 不含 three 與 avatar3d | 維持 |
| 遊戲中的影片 | 38 MB | 已換成島的即時畫面；影片只在沒有 WebGL 時才載入 | 維持 |

島頁的陰影貼圖**不會每幀更新**（`island.js` 的 `shadowDirty`）。新增任何會改變「誰投影」的狀態切換（顯示／隱藏靜態物件、換光線），要設 `shadowDirty = true`。會動的東西不要 `castShadow`，用 `crowd.shade(root, 寬, 深)` 加腳下的假陰影。

月份的光線在 `env.js` 的 `LOOKS`：`bold` 是這個月要不要保留強烈氣氛（0 柔和、1 照表上的顏色），`dusk` 會開星星和船上的火把。目前 2、3、5、10 月是放開做的月份。

新增任何模型：走 `kit.js` 的 `part()`／`createCrowd` 的 `slot()`，不要另外 `new Mesh`，否則繪製呼叫會一路漲。

## 設計上不能破的規則

- 主題是 Avaka（馬尼拉麻）植株、纖維、繩，不是一般的蘭嶼海景。
- 兩套底色是刻意的：大廳／遊戲／規則用深綠夜色（`newui.css:95` 起的變數），島頁用米白日光（`island.css:3` 起的變數）。新東西只能從這兩組變數取色。
- **不要再加**青藍霓虹色（`#38bdf8`、`#22d3ee`、`#0ea5e9`、`#94a3b8`、`rgba(10,20,40…)`）和表情符號圖示；看到就順手清掉。
- 字型只用 Gloock（英文標題）、Newsreader（英文內文與斜體）、Noto Serif TC、Noto Sans TC。Outfit 是舊版留下的，不要再用。
- 族語與用字照 `PRODUCT.md`：寫「撚」不寫「捻」；族名寫「雅美／達悟族」；工序與月份名稱以 `遊戲規則與邏輯.md` 為準。
- 島上的房屋、船、人物是示意；任何看起來像「事實」的造型或文字要有出處標籤（田野觀察／口述／文獻／推論），資料在 `參考_heart-island/*_出處.md`。
- 尊重 `prefers-reduced-motion`；兩種語言都要完整；手機與投影都要讀得清楚。
- 不改遊戲規則。伺服器是規則的最終裁判；若要多送資料給前端，同步更新 `遊戲規則與邏輯.md`。

## 遊戲畫面與島頁的連動

- 遊戲右側面板是島頁的 iframe（`/island?embed=1`）。遊戲用 `postMessage({ avaka: 'island', month, focus, lang, paused })` 驅動它；島頁準備好會回 `{ avaka: 'island-ready' }`。地點對照：山林 `forest`、灘頭工作室 `beach`、商店 `shop`。
- 同一個訊息還帶 `players`（名字、角色、地點、進度、是否完工、是不是自己）：島上的小人和名牌由 `island.js` 的 `setGuests()` 畫。換月時遊戲多送一個 `sweep`（毫秒），島會先拉到全景再回來。
- 嵌入的頁面在背景時計時器會被瀏覽器壓到一分鐘一次。島頁裡跟時間有關的事要寫在繪製迴圈裡（看 `embedSweep`），不要用 `setTimeout`。
- `game-ui.js` 的畫面分四塊重畫：`#g-head`、`#g-mates`、`#g-centre`、`#g-feed`。`#g-film`（島的面板）不重畫，iframe 一旦移動或重建就會整頁重新載入。
- 環境音在 `game-ui.js` 的 `buildAmbience()`／`tuneAmbience()`，全部由雜訊合成，跟著音樂開關。月份的風和雨只是氣氛，和島頁的 `LOOKS` 一樣不是氣象紀錄。
- 單人測試遊戲畫面：在主控台呼叫 `openAvatarCreator('create', { name, role })`，按確認，再按 `#start-game-btn`。`AvakaGameUI.debug()` 可以拿到音訊節點。

## 年終畫面與工序手勢

- 年終的「這一年」在 `static/js/year-end.js`，讀 `state.year`（每月快照）與 `state.ties`（誰幫了誰）。這兩項只給畫面用，不能拿來算分；要改記法，同步 `遊戲規則與邏輯.md`。
- 測年終最快的方法：在主控台用 `io({ forceNew: true })` 開第二個連線當第二位玩家，兩邊各送 `toggle_ready` 跑完 12 個月。
- 工序小遊戲在 `app.js` 的 `showMiniGame()`：六種手勢，伺服器只收成功或失敗。改手勢時同步玩家規則頁、遊戲內規則與 `遊戲規則與邏輯.md` 的 9-4。

## 哪種工作搭哪個 skill

- 3D 效能、陰影更新、分級：`threejs-performance`
- 海、葉片、地面的著色器：`threejs-shaders`、`threejs-materials`
- 景深、泛光：`threejs-postprocessing`；月份光線與夜景：`threejs-lighting`
- 點選物件、鏡頭：`threejs-interaction`
- 介面重排、清舊樣式、手機版：`impeccable`（專案已有 `.impeccable/`）、`design:design-critique`
- 介面文字：`design:ux-copy`；無障礙：`design:accessibility-review`
- 改完請別人打分數：`jury`

## 每次改完要做的檢查

1. 電腦 1440×900 與手機 375×812 各截一次：大廳、捏臉、遊戲、島頁全景與一個近景。
2. 島頁 `drawOnce()` 的數字沒有超過預算；`perf.level` 是 0。
3. 中英文各切一次；系統開「減少動態效果」再看一次。
4. **版本號一定要改。** 帶 `?v=` 的檔案伺服器回 `immutable`、瀏覽器存一年（`server.py` 的 `cache_static_files`）。改了檔案沒改 `?v=`，使用者拿到的是舊檔。
   - 首頁：`templates/index.html` 裡的 `?v=`；`avatar3d.js` 的版本在 `app.js` 的 `AVATAR_SCRIPTS`；`lobby.css`、`game-ui.css` 的版本在 `lobby.js`、`game-ui.js` 裡。
   - 島頁：版本只寫在 `static/island/index.html`（樣式、入口腳本、import map）。子模組之間一律寫 `./world.js`，不帶版本號；新增模組時在 import map 補一行。
5. three.js 和 `avatar3d.js` 不在首頁載入，由 `app.js` 的 `loadAvatarLibs()` 在打開捏臉時才抓。首頁其他腳本不能假設 `THREE` 存在。
