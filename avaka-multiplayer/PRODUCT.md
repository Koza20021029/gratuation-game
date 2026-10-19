# Product

<!-- impeccable:product-schema 1 -->

Written 2026-10-19 from decisions Koza confirmed in the project thread (2026-10-12 to 10-19); nothing here was asked in a separate interview.

## Platform

web

## Users

- **Players:** Taiwanese junior-high students (九年級, 生活科技), three to a group, each on their own device, in a 90-minute (two-period) class. Also players at exhibitions and Lanyu workshops.
- **Teachers / hosts:** run the class from the lesson plan (`文本/產出/教案/` latest), project the game, pause at key months to read narration and lead discussion.

## Product Purpose

《Avaka：島嶼的維度》 is a graduation project: a multiplayer browser game in which players build a Tao (雅美／達悟) plank boat over one year of the Tao night calendar, following the six steps of processing Avaka (Manila hemp, Musa textilis) fibre. It teaches that traditional knowledge has to be asked for and passed between generations, and lets students feel the trade between the slow traditional path and faster modern materials. Success: students finish a year, can say why they chose their path, and connect it to cultural continuity.

## Positioning

The only game built from field research on Avaka fibre processing in Lanyu: its months, steps, Tao terms and endings come from the research team's fieldwork and literature, and the Manila hemp plant is the visual and thematic centre.

## Operating Context

- Live at https://avaka.onrender.com (Render free tier; Flask + Socket.IO). The rules site moves into the same site at `/rules`.
- School networks and school devices (Chromebooks, tablets, phones); first load must be light.
- Bilingual 中文 / English; the game stores the language in `localStorage` key `avaka_lang`, theme in `avaka_lobby_theme`.

## Capabilities and Constraints

- Rules source of truth: `../遊戲規則與邏輯.md`; the game server is the final judge of rules.
- Rules site has two parts (Koza, 2026-10-19): 玩家規則 for students, and 課堂版 for teachers (the old 情境腳本 folded in, rewritten to match the lesson plan). The walking-tour (走讀) version and everything about physical cards are dropped.
- Tao terms are settled: ① ipana'ape, ③ chingdasan, ⑤ 撚線 oviden, ⑥ Mamaruk／tumbek su varok; kolili means rope; varok is 蘭嶼花椒. Use 「撚」, never 「捻」.
- Ethnic name is written 雅美／達悟族.

## Brand Commitments

- The Manila hemp (abacá) plant is the core motif (Koza, 2026-10-13), not a generic Lanyu seascape.
- Must feel crafted and engaging to junior-high students, not "AI-looking" (Koza's words); Koza asked for impeccable and 21st.dev to be used.
- The rules site is designed on the premise that it becomes part of the game's site.

## Evidence on Hand

- Real content: `../遊戲規則與邏輯.md`, the old rules site (`~/Desktop/遊戲規則/`), the lesson plan, field photos in `../docs/jpg/`, in-game films `static/assets/lanyu_1.mp4`, `lanyu_2.mp4`.
- No testimonials, scores or usage data exist; do not invent any.

## Product Principles

1. Knowledge is passed between people: asking, telling and helping are the heart of the rules.
2. No path is labelled wrong; each choice shows what it keeps and what it gives up.
3. Accuracy to fieldwork and Tao terms over decoration.
4. Light enough for a school network and readable by a fourteen-year-old.

## Accessibility & Inclusion

Readable on phones and projected screens; both languages complete; works with reduced motion.
