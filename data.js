// 切手いくら？の問題を作る（ブラウザと node の両方で使う）。
// 料金と大きさの決まりは、日本郵便の料金表（下の SRC）で確かめた数字だけ（2026-11-17 に読んだ。税込）。
//  - 定形：長さ14〜23.5cm・幅9〜12cm・厚さ1cmまで・50gまで → 110円
//  - 定形外（規格内）：長辺34cm・短辺25cm・厚さ3cm・1kgまで / 定形外（規格外）：長辺60cm・3辺の合計90cm・4kgまで
//  - はがき 85円・往復はがき 170円。速達・特定記録・簡易書留・一般書留は、もとの料金に足す
//  - スマートレター 210円（25×17cm・厚さ2cm・1kg）・レターパックライト 430円（34×24.8cm・厚さ3cm・4kg）・レターパックプラス 600円（34×24.8cm・4kg）
// 郵便物の大きさ・重さは練習用の作り話。答えはコードで料金表から計算して決める。人・会社・お店の名前は出さない。
// 1問は、郵便物を見て料金を選ぶ。正解したら2段目「どの種類の郵便？」を選ぶ。
// 乱数 R は呼ぶ回数が毎回同じになるように使う（sort の比較の中では引かない）。同じ tag なら、どの端末でも同じ問題になる。
// KINDS・言い回しの並びは最後に足すだけにする（並べ替え・削除をすると過去の日の問題が変わる）。
(function (root) {
  "use strict";
  const LV = ["やさしい", "ふつう", "むずかしい"];

  // 出典（画面の「なぜ」に出す）
  const SRC = {
    fee: ["日本郵便「手紙・はがきの料金」", "https://www.post.japanpost.jp/send/fee/kokunai/one_two.html"],
    size: ["日本郵便「手紙・はがきの大きさ・重さ」", "https://www.post.japanpost.jp/service/standard/one_size.html"],
    opt: ["日本郵便「オプションサービスの料金」", "https://www.post.japanpost.jp/send/fee/kokunai/option.html"],
    card: ["日本郵便「はがき」", "https://www.post.japanpost.jp/service/send/domestic/mail/postcard/index.html"],
  };

  // ---- 料金表（税込・円）----
  const TEIKEI = 110, HAGAKI = 85, OFUKU = 170;
  const NAI = [[50, 140], [100, 180], [150, 270], [250, 320], [500, 510], [1000, 750]]; // 定形外（規格内）
  const GAI = [[50, 260], [100, 290], [150, 390], [250, 450], [500, 660], [1000, 920], [2000, 1350], [4000, 1750]]; // 定形外（規格外）
  const OPT = { tokutei: { n: "特定記録", y: 210 }, kani: { n: "簡易書留", y: 350 }, ippan: { n: "一般書留", y: 480 } };
  const sokuOf = (g) => (g <= 250 ? 300 : g <= 1000 ? 400 : 690); // 速達の追加料金
  const PACK = { smart: { n: "スマートレター", y: 210, L: 25, W: 17, T: 2, g: 1000 }, lpl: { n: "レターパックライト", y: 430, L: 34, W: 24.8, T: 3, g: 4000 }, lpp: { n: "レターパックプラス", y: 600, L: 34, W: 24.8, T: 99, g: 4000 } };

  // 2段目「どの種類の郵便？」
  const GROUPS = {
    teikei: { name: "定形", sub: "長さ14〜23.5cm・幅9〜12cm・厚さ1cm・50gまで" },
    nai: { name: "定形外（規格内）", sub: "長辺34cm・短辺25cm・厚さ3cm・1kgまで" },
    gai: { name: "定形外（規格外）", sub: "長辺60cm・3辺の合計90cm・4kgまで" },
    hagaki: { name: "はがき", sub: "決まった大きさの、はがき" },
  };

  // 大きさ（長さ L・幅 W・厚さ T は cm、重さ g は g）から種類を決める。出せないものは null
  function clsOf(L, W, T, g) {
    if (L >= 14 && L <= 23.5 && W >= 9 && W <= 12 && T <= 1 && g <= 50) return "teikei";
    if (L <= 34 && W <= 25 && T <= 3 && g <= 1000) return "nai";
    if (L <= 60 && L + W + T <= 90 && g <= 4000) return "gai";
    return null;
  }
  const bandOf = (tbl, g) => tbl.find(([w]) => g <= w);
  function priceOf(c, g) { if (c === "teikei") return TEIKEI; if (c === "hagaki") return HAGAKI; const b = bandOf(c === "nai" ? NAI : GAI, g); return b ? b[1] : null; }
  const wlabel = (w) => (w >= 1000 ? w / 1000 + "kg" : w + "g");
  // 料金の言い方（なぜ に出す）
  function feeWhy(c, g) { if (c === "teikei") return "定形は50gまで110円"; const b = bandOf(c === "nai" ? NAI : GAI, g); return `${GROUPS[c].name}の${wlabel(b[0])}以内は${yen(b[1])}`; }

  const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
  const pick = (R, a) => a[ri(R, 0, a.length - 1)];
  function shuffle(R, a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = ri(R, 0, i); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  function pickN(R, a, n) { return shuffle(R, a).slice(0, n); }
  // 数を「1,350」の形に（端末の言語設定で変わらないように自前で書く）
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const yen = (n) => fmt(n) + "円";
  const cm = (x) => String(Math.round(x * 10) / 10);
  // 選び肢をそろえる（正解を先頭に入れ、重ならない・0より大きいものだけ n 個）
  function optsOf(R, ans, cands, n) { const out = [ans]; for (const c of cands) { if (out.length >= n) break; if (c && !out.includes(c)) out.push(c); } return shuffle(R, out); }
  const yens = (a) => a.filter((x) => x > 0).map(yen);
  const MEDIA = ["友だちへの手紙", "お礼の手紙", "書類を送る", "本を送る", "写真を送る", "旅先から"];
  // 大きさの一言
  const sizeText = (L, W, T, g) => `長さ${cm(L)}cm・幅${cm(W)}cm・厚さ${cm(T)}cm、重さ${fmt(g)}g`;
  // 郵便物の絵（大きさの比べがわかるように、長さと幅をそのまま縮めて描く。文字は読み上げ用に aria-label にも入れる）
  function svgOf(L, W, T, g) {
    const s = 3, w = Math.max(40, L * s), h = Math.max(26, W * s), x = (200 - w) / 2 + 20, y = (120 - h) / 2 + 10;
    return `<svg viewBox="0 0 240 150" width="240" height="150" role="img" aria-label="${sizeText(L, W, T, g)}の郵便物"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#fffdf6" stroke="#5a4a2f" stroke-width="2"/><path d="M${x} ${y} L${x + w / 2} ${y + h / 2} L${x + w} ${y}" fill="none" stroke="#5a4a2f" stroke-width="1.5"/><rect x="${x + w - 18}" y="${y + 4}" width="14" height="16" fill="none" stroke="#b8322a" stroke-dasharray="3 2"/><text x="120" y="${y + h + 16}" text-anchor="middle" font-size="12" fill="#333">${cm(L)}cm × ${cm(W)}cm・厚さ${cm(T)}cm・${fmt(g)}g</text></svg>`;
  }
  // 大きさを作る
  const teikeiSize = (R) => [pick(R, [23.5, 23.5, 23, 22, 20.5, 19, 16.5, 14.8]), pick(R, [12, 12, 11.5, 11, 10.5, 10, 9]), pick(R, [0.2, 0.3, 0.5, 0.6, 0.8])];
  const naiSize = (R) => [pick(R, [33.2, 34, 33, 32, 31, 27, 24]), pick(R, [24, 25, 24, 23, 22, 19, 17]), pick(R, [0.5, 1, 1.5, 2, 2.5, 3])];
  const naiW = (R) => pick(R, [30, 45, 60, 80, 95, 120, 140, 180, 220, 240, 300, 450, 480, 650, 900, 1000]);

  // ---- 種類ごとの問題の作り方。R：乱数、lv：むずかしさ。q：問い、opts：選び肢、ans：答え、grp：2段目の答え、v：作った中身の印 ----
  const MK = {
    // 定形の封筒
    teikei(R) {
      const [L, W, T] = teikeiSize(R), g = ri(R, 4, 50), m = ri(R, 0, MEDIA.length - 1);
      return { media: MEDIA[m], q: `${sizeText(L, W, T, g)}の封筒の手紙。切手はいくら？`, svg: svgOf(L, W, T, g), opts: optsOf(R, yen(TEIKEI), yens([HAGAKI, priceOf("nai", 50), priceOf("nai", 100)]), 3), ans: yen(TEIKEI), grp: "teikei", v: `${L}:${W}:${T}:${g}:${m}`,
        why: `長さ14〜23.5cm・幅9〜12cm・厚さ1cm・50gまでに入るので定形。定形は${TEIKEI}円です。` };
    },
    // はがき
    hagaki(R) {
      const m = ri(R, 0, 5), who = ["おばあちゃん", "先生", "友だち", "いとこ", "お世話になった人", "家族"][m];
      return { media: "はがき", q: `${who}に、はがきを1枚出す。切手（料金）はいくら？`, opts: optsOf(R, yen(HAGAKI), yens([TEIKEI, 63, priceOf("nai", 50)]), 3), ans: yen(HAGAKI), grp: "hagaki", v: `${m}`,
        why: `通常はがきは${HAGAKI}円です（決まった大きさをこえると手紙のあつかい）。` };
    },
    // 定形を何通か
    nantsu(R) {
      const [L, W, T] = teikeiSize(R), g = ri(R, 5, 40), n = ri(R, 2, 5), m = ri(R, 0, MEDIA.length - 1), a = TEIKEI * n;
      return { media: MEDIA[m], q: `${sizeText(L, W, T, g)}の封筒の手紙を${n}通出す。切手代は合わせていくら？`, svg: svgOf(L, W, T, g), opts: optsOf(R, yen(a), yens([HAGAKI * n, priceOf("nai", 50) * n, a + TEIKEI, a - TEIKEI]), 3), ans: yen(a), grp: "teikei", v: `${L}:${W}:${T}:${g}:${n}:${m}`,
        why: `定形は1通${TEIKEI}円。${TEIKEI}×${n}＝${fmt(a)}円です。` };
    },
    // 定形外（規格内）
    nai(R) {
      const [L, W, T] = naiSize(R), g = naiW(R), m = ri(R, 0, MEDIA.length - 1), y = priceOf("nai", g), i = NAI.findIndex((b) => b[1] === y);
      return { media: MEDIA[m], q: `${sizeText(L, W, T, g)}の封筒。切手はいくら？`, svg: svgOf(L, W, T, g), opts: optsOf(R, yen(y), yens([NAI[i + 1] && NAI[i + 1][1], NAI[i - 1] && NAI[i - 1][1], priceOf("gai", g), 110, NAI[i + 2] && NAI[i + 2][1]]), 4), ans: yen(y), grp: "nai", v: `${L}:${W}:${T}:${g}:${m}`,
        why: `定形より大きく、長辺34cm・短辺25cm・厚さ3cm・1kgまでに入るので定形外（規格内）。${feeWhy("nai", g)}です。` };
    },
    // 定形の大きさでも、重いと定形外
    omoi(R) {
      const [L, W, T] = teikeiSize(R), g = pick(R, [51, 55, 60, 70, 80, 95, 100, 110, 130, 150]), m = ri(R, 0, MEDIA.length - 1), y = priceOf("nai", g);
      return { media: MEDIA[m], q: `${sizeText(L, W, T, g)}の封筒（写真や紙をたくさん入れた）。切手はいくら？`, svg: svgOf(L, W, T, g), opts: optsOf(R, yen(y), yens([110, 140, y === 180 ? 270 : 180, 220, priceOf("gai", g)]), 4), ans: yen(y), grp: "nai", v: `${L}:${W}:${T}:${g}:${m}`,
        why: `大きさは定形でも、定形は50gまで。${g}gなので定形外（規格内）で、${feeWhy("nai", g)}です。` };
    },
    // 定形の大きさでも、厚いと定形外
    atsui(R) {
      const [L, W] = teikeiSize(R), T = pick(R, [1.2, 1.5, 2, 2.5, 3]), g = ri(R, 20, 50), m = ri(R, 0, MEDIA.length - 1);
      return { media: MEDIA[m], q: `${sizeText(L, W, T, g)}の封筒（小さな品物を入れた）。切手はいくら？`, svg: svgOf(L, W, T, g), opts: optsOf(R, yen(priceOf("nai", g)), yens([TEIKEI, priceOf("nai", 100), 260, 220]), 4), ans: yen(priceOf("nai", g)), grp: "nai", v: `${L}:${W}:${T}:${g}:${m}`,
        why: `定形は厚さ1cmまで。${cm(T)}cmなので定形外（規格内）で、${feeWhy("nai", g)}です。` };
    },
    // 往復はがき
    ofuku(R) {
      const m = ri(R, 0, 5), what = ["同窓会の出欠を聞く", "集まりの出欠を聞く", "返事をもらいたい", "申しこみの返事をもらう", "クラス会の出欠を聞く", "行事の出欠を聞く"][m];
      return { media: "はがき", q: `${what}ために、往復はがきを1組出す。料金はいくら？`, opts: optsOf(R, yen(OFUKU), yens([HAGAKI, TEIKEI, 220, priceOf("nai", 50)]), 4), ans: yen(OFUKU), grp: "hagaki", v: `${m}`,
        why: `往復はがきは1組${OFUKU}円です（行きと帰りの2枚分）。` };
    },
    // 定形＋速達
    sokutatsu(R) {
      const [L, W, T] = teikeiSize(R), g = ri(R, 5, 50), m = ri(R, 0, MEDIA.length - 1);
      return { media: MEDIA[m], q: `${sizeText(L, W, T, g)}の封筒を、急ぐので速達で出す。切手はいくら？`, svg: svgOf(L, W, T, g), opts: optsOf(R, yen(TEIKEI + sokuOf(g)), yens([TEIKEI, sokuOf(g), 440, 510]), 4), ans: yen(TEIKEI + sokuOf(g)), grp: "teikei", v: `${L}:${W}:${T}:${g}:${m}`,
        why: `定形${TEIKEI}円に、速達（250gまで）の${sokuOf(g)}円を足して${fmt(TEIKEI + sokuOf(g))}円です。` };
    },
    // 定形外（規格外）
    gai(R) {
      const t = ri(R, 0, 1), m = ri(R, 0, MEDIA.length - 1);
      const L = t ? pick(R, [36, 40, 42, 45, 50, 55, 60]) : pick(R, [24, 27, 30, 33]), W = t ? pick(R, [20, 22, 24, 25]) : pick(R, [17, 20, 22, 24]), T = t ? pick(R, [1, 2, 3, 4]) : pick(R, [3.5, 4, 5, 6, 8]);
      const g = pick(R, [45, 90, 140, 200, 250, 400, 500, 800, 1000, 1500, 2000, 3000, 4000]), y = priceOf("gai", g), i = GAI.findIndex((b) => b[1] === y);
      return { media: pick(R, ["品物を送る", "本を送る", "書類を送る"]), q: `${sizeText(L, W, T, g)}の包み。切手はいくら？`, svg: svgOf(L, W, T, g), opts: optsOf(R, yen(y), yens([priceOf("nai", g), ...[1, -1, 2, -2, -3].map((d) => GAI[i + d] && GAI[i + d][1])]), 4), ans: yen(y), grp: "gai", v: `${L}:${W}:${T}:${g}:${m}`,
        why: `${t ? `長辺が${cm(L)}cmで34cmをこえる` : `厚さが${cm(T)}cmで3cmをこえる`}ので定形外（規格外）。${feeWhy("gai", g)}です。` };
    },
    // 書留・特定記録
    kakitome(R) {
      const o = pick(R, ["tokutei", "kani", "ippan"]), base = ri(R, 0, 1), m = ri(R, 0, MEDIA.length - 1);
      const [L, W, T] = base ? naiSize(R) : teikeiSize(R), g = base ? pick(R, [40, 90, 140, 200, 300, 480]) : ri(R, 5, 50), c = base ? "nai" : "teikei", y = priceOf(c, g), a = y + OPT[o].y;
      const why2 = { tokutei: "差し出した記録を残す", kani: "差し出しと配達の記録を残し、5万円までつぐなう", ippan: "差し出しから配達までの記録を残し、10万円までつぐなう" }[o];
      return { media: "大事な書類", q: `${sizeText(L, W, T, g)}の封筒を、${OPT[o].n}にして出す。合わせていくら？`, svg: svgOf(L, W, T, g), opts: optsOf(R, yen(a), yens([y, y + 210, y + 350, y + 480, a + 110]), 4), ans: yen(a), grp: c, v: `${o}:${L}:${W}:${T}:${g}:${m}`,
        why: `${GROUPS[c].name}の${yen(y)}に、${OPT[o].n}（${why2}）の${yen(OPT[o].y)}を足して${yen(a)}です。` };
    },
    // 足りない分
    tarinai(R) {
      const c = pick(R, ["nai", "nai", "gai"]), m = ri(R, 0, MEDIA.length - 1);
      const [L, W, T] = c === "nai" ? naiSize(R) : [pick(R, [40, 45, 50]), pick(R, [22, 25]), pick(R, [2, 3])], g = c === "nai" ? pick(R, [60, 90, 120, 200, 300, 600, 900]) : pick(R, [80, 140, 240, 450, 900]), y = priceOf(c, g), have = pick(R, [85, 110, 140].filter((x) => x < y)), a = y - have;
      return { media: MEDIA[m], q: `${sizeText(L, W, T, g)}の封筒に、${have}円の切手を1枚はった。あと何円分はればいい？`, svg: svgOf(L, W, T, g), opts: optsOf(R, yen(a), yens([y - 110 === a ? y - 85 : y - 110, 110 - have || 25, a + 40, priceOf(c === "nai" ? "gai" : "nai", g) - have, a - 30]), 4), ans: yen(a), grp: c, v: `${c}:${L}:${W}:${T}:${g}:${have}:${m}`,
        why: `${GROUPS[c].name}で${feeWhy(c, g)}。${yen(y)}−${have}円＝${yen(a)}です。` };
    },
    // いちばん安い送り方
    kurabe(R) {
      const m = ri(R, 0, 2);
      const [L, W, T, g] = pick(R, [[21, 15, 1.8, 300], [21, 15, 1.5, 450], [24, 17, 2, 600], [21, 15, 2, 900], [33, 24, 2.5, 700], [33, 24, 3, 900], [31, 22, 2.8, 520], [24, 16, 1, 120], [30, 21, 2, 280], [30, 21, 0.8, 60]]);
      const c = clsOf(L, W, T, g), cands = [[`${GROUPS[c].name}の切手`, priceOf(c, g)]];
      for (const k of ["smart", "lpl", "lpp"]) { const p = PACK[k]; if (L <= p.L && W <= p.W && T <= p.T && g <= p.g) cands.push([p.n, p.y]); }
      const best = cands.reduce((a, b) => (b[1] < a[1] ? b : a)), label = (x) => `${x[0]} ${yen(x[1])}`;
      const all = [[`${GROUPS[c].name}の切手`, priceOf(c, g)], ...["smart", "lpl", "lpp"].map((k) => [PACK[k].n, PACK[k].y])];
      return { media: ["本を送る", "品物を送る", "書類を送る"][m], q: `${sizeText(L, W, T, g)}の物を送る（入れても大きさはこのまま）。入る送り方のうち、いちばん安いのは？`, svg: svgOf(L, W, T, g), opts: shuffle(R, all.map(label)), ans: label(best), grp: c, v: `${L}:${W}:${T}:${g}:${m}`,
        why: `入るのは ${cands.map(label).join("・")}。いちばん安いのは${label(best)}です（スマートレターは25×17cm・厚さ2cm・1kgまで、レターパックライトは34×24.8cm・厚さ3cm・4kgまで）。` };
    },
    // 重い物＋速達
    sokutatsu2(R) {
      const c = ri(R, 0, 1) ? "nai" : "gai", m = ri(R, 0, MEDIA.length - 1);
      const [L, W, T] = c === "nai" ? naiSize(R) : [pick(R, [36, 40, 45]), pick(R, [24, 25]), pick(R, [2, 3])], g = c === "nai" ? pick(R, [120, 200, 260, 400, 500, 800, 1000]) : pick(R, [200, 300, 600, 1000, 1500, 3000]), y = priceOf(c, g), s = sokuOf(g), a = y + s;
      return { media: MEDIA[m], q: `${sizeText(L, W, T, g)}の封筒を、速達で出す。合わせていくら？`, svg: svgOf(L, W, T, g), opts: optsOf(R, yen(a), yens([y + 300, y + 400, y + 690, y, a + 110].filter((x) => x !== a)), 4), ans: yen(a), grp: c, v: `${c}:${L}:${W}:${T}:${g}:${m}`,
        why: `${feeWhy(c, g)}。速達は${g <= 250 ? "250g" : g <= 1000 ? "1kg" : "4kg"}まで${yen(s)}を足すので、${yen(a)}です。` };
    },
  };

  const KINDS = [
    { id: "teikei", lv: 0, name: "定形の手紙", src: ["fee", "size"], look: "長さ14〜23.5cm・幅9〜12cm・厚さ1cm・50gまでなら定形です。", key: "定形 ＝ 110円" },
    { id: "hagaki", lv: 0, name: "はがき", src: ["card"], look: "はがきは手紙より安い料金です。", key: "通常はがき ＝ 85円" },
    { id: "nantsu", lv: 0, name: "何通か出す", src: ["fee"], look: "1通の料金に、通の数をかけます。", key: "110円 × 通の数" },
    { id: "nai", lv: 1, name: "定形外（規格内）", src: ["fee", "size"], look: "長辺34cm・短辺25cm・厚さ3cm・1kgまでなら規格内。重さで料金が決まります。", key: "50g 140・100g 180・150g 270・250g 320・500g 510・1kg 750円" },
    { id: "omoi", lv: 1, name: "定形の大きさで重い", src: ["fee", "size"], look: "定形は50gまでです。", key: "50gをこえたら定形外（規格内）：100gまで180円・150gまで270円" },
    { id: "atsui", lv: 1, name: "定形の大きさで厚い", src: ["fee", "size"], look: "定形は厚さ1cmまでです。", key: "厚さ1cmをこえたら定形外（規格内）：50gまで140円" },
    { id: "ofuku", lv: 1, name: "往復はがき", src: ["card"], look: "行きと帰りの2枚がつながったはがきです。", key: "往復はがき ＝ 1組170円" },
    { id: "sokutatsu", lv: 1, name: "速達", src: ["fee", "opt"], look: "もとの料金に、速達の料金を足します。", key: "定形110円 ＋ 速達300円（250gまで）" },
    { id: "gai", lv: 2, name: "定形外（規格外）", src: ["fee", "size"], look: "長辺34cm・短辺25cm・厚さ3cmのどれかをこえたら規格外です。", key: "50g 260・100g 290・150g 390・250g 450・500g 660・1kg 920・2kg 1,350・4kg 1,750円" },
    { id: "kakitome", lv: 2, name: "書留・特定記録", src: ["fee", "opt"], look: "もとの料金に、書留などの料金を足します。", key: "特定記録 ＋210円・簡易書留 ＋350円・一般書留 ＋480円" },
    { id: "tarinai", lv: 2, name: "足りない切手", src: ["fee", "size"], look: "まず、この郵便物の料金を出します。", key: "料金 − はった切手 ＝ 足りない分" },
    { id: "kurabe", lv: 2, name: "いちばん安い送り方", src: ["fee", "size"], look: "大きさ・厚さ・重さが入る送り方だけを比べます。", key: "スマートレター 210円（25×17cm・2cm・1kg）・レターパックライト 430円（34×24.8cm・3cm・4kg）・プラス 600円" },
    { id: "sokutatsu2", lv: 2, name: "重い物の速達", src: ["fee", "opt"], look: "速達の料金は重さで変わります。", key: "速達：250gまで ＋300円・1kgまで ＋400円・4kgまで ＋690円" },
  ];
  for (const k of KINDS) k.make = MK[k.id];
  const BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));
  const kindsOf = (lv) => KINDS.filter((k) => k.lv === lv).map((k) => k.id);

  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // 1問を作る。tag は「種類|種」（例 "teikei|2026-11-17:d0"）。同じ tag ならいつも同じ問題
  function make(tag) {
    const [kind] = String(tag).split("|"), k = Object.prototype.hasOwnProperty.call(BY, kind) ? BY[kind] : null;
    if (!k) return null;
    const p = k.make(rng(seedOf(tag)), k.lv);
    return { tag, kind, lv: k.lv, name: k.name, look: k.look, key: k.key, type: "act", rev: false, src: k.src.map((s) => SRC[s]), ...p };
  }
  // 同じ問題かを見分ける鍵（種類・言い方・選び肢の組）
  const keyOf = (P) => `${P.kind}:${P.q}:${P.opts.slice().sort().join("/")}`;

  // 今日の5問（やさしい2・ふつう2・むずかしい1）。種類は重ねない
  function dailyTags(date) {
    const R = rng(seedOf("day:" + date)), e = pickN(R, kindsOf(0), 2), n = pickN(R, kindsOf(1), 2), h = pickN(R, kindsOf(2), 1);
    return [...e, ...n, ...h].map((id, i) => `${id}|${date}:d${i}`);
  }
  // 上級の3問（むずかしいだけ・今日の5問のむずかしいとは別の種類）
  function hardTags(date) {
    const dh = dailyTags(date)[4].split("|")[0], R = rng(seedOf("hard:" + date)), h = pickN(R, kindsOf(2).filter((x) => x !== dh), 3);
    return h.map((id, i) => `${id}|${date}:h${i}`);
  }

  const KIT = { KINDS, BY, GROUPS, LV, SRC, NAI, GAI, PACK, OPT, clsOf, priceOf, kindsOf, seedOf, rng, make, keyOf, dailyTags, hardTags, pickN };
  if (typeof module !== "undefined" && module.exports) module.exports = KIT; else root.KIT = KIT;
})(typeof self !== "undefined" ? self : this);
