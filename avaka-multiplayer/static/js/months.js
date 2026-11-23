/* The twelve months of the game: the Yami/Tao month name and what the month changes in the rules.
 * Loaded before app.js on the game page, and by the classroom projector (/projector). The server is still the
 * judge of every rule; this is the text players read. */
const GAME_RULES = [
    {name: "Kashyman", desc_zh: "準備月：為接下來的封山存貨，執行「①砍伐剝皮」可獲得 2 份材料（原為 1 份）。", desc_en: "Prep Month: Stock up before the forest closes. ① Chop & Peel yields 2 materials instead of 1."},
    {name: "Kapowan", desc_zh: "飛魚禁令：禁止進入山林（會被強制退回灘頭），無法執行「①砍伐剝皮」。", desc_en: "Flying Fish Ban: Forest closed. Cannot enter it or perform ① Chop & Peel."},
    {name: "Pikaokaod", desc_zh: "捕撈飛魚盛期（集體勞動）：部落分工合作，執行任何一道工序，AP 消耗減少 1 點。", desc_en: "Peak Fishing (collective labour): the village shares the work, so every craft step costs 1 AP less."},
    {name: "Papataw", desc_zh: "男人勤於出海：所有「請益」多消耗 1 AP（文化復振青年向耆老 4 AP、中生代向耆老 3 AP、文化復振青年向中生代 2 AP）。下個月是梅雨季：持有材料的人，本月結束前請留下 1 AP 防潮。", desc_en: "Men at Sea: Every Ask costs +1 AP (Youth→Elder 4, Middle Generation→Elder 3, Youth→Middle Generation 2). Plum rain comes next month: if you hold materials, keep 1 AP unspent at the end of this month."},
    {name: "Pipilapila", desc_zh: "梅雨季節：進入本月時，持有材料且「未完成工序④乾燥」的人，要用上個月留下的 1 AP 防潮；上個月把 AP 用光的人，材料腐爛歸零。", desc_en: "Plum Rain Season: On entering this month, players holding materials who have not finished step ④ Drying spend 1 AP left over from last month to keep them dry; if you used up all your AP last month, your materials rot to zero."},
    {name: "Apiya vehan", desc_zh: "好月節（送禮分享的吉月）：贈送材料給耆老、幫忙長者的得分加倍（各 +2 分）。", desc_en: "Good Month Festival (a month for giving and sharing): gifts to the Elder and helping the Elder score double (+2 each)."},
    {name: "Pehhakow", desc_zh: "解禁重啟：山林解禁，執行「①砍伐剝皮」（消耗 3 AP）可獲得 2 份材料（原為 1 份）。", desc_en: "Forest Reopened: ① Chop & Peel yields 2 materials instead of 1."},
    {name: "Pitanatana", desc_zh: "土器月（物質掌握）：採陶土、燒陶器，是掌握材料性質的月份，執行「科學轉譯」必定成功。", desc_en: "Clay Vessel Month (mastering materials): the month of digging clay and firing pots. Scientific Translation always succeeds."},
    {name: "Kalimman", desc_zh: "飛魚終食祭：全部落參與祭儀，本月無法在商店完工。", desc_en: "Final Fish Feast: the whole village takes part in the ritual; you cannot finish at the store this month."},
    {name: "Kaneman", desc_zh: "禁忌之月：不允許落成，本月任何方式都不能完工（填縫、機器加工、工業樹脂皆禁止）。", desc_en: "Forbidden Month: no boat may be completed this month, by any path (caulking, machine processing and resin are all banned)."},
    {name: "Kapitowan", desc_zh: "祭神月：回合開始時，若文化復振青年／中生代與耆老處於同一個地點，可自動獲得 2 點 KP。", desc_en: "Sacred Month: Youth and Middle Generation in the same place as the Elder automatically gain +2 KP."},
    {name: "Kaowan", desc_zh: "手工藝月（最終衝刺）：「⑤理線撚繩」消耗 0 AP，而且⑤與⑥不必跨月等待，可以在本月接連完成。", desc_en: "Handicraft Month (final sprint): ⑤ Twining costs 0 AP, and steps ⑤ and ⑥ need no cross-month wait, so they can be done back to back this month."}
];
