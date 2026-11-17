// アプリのアイコン（icon-192.png・icon-512.png）を作る。紺の地に、ギザギザのふちの切手と〒の印。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#123554"/>
      <rect x="22" y="16" width="56" height="68" rx="2" fill="#fffdf7" stroke="#fffdf7" stroke-width="6" stroke-dasharray="4 3"/>
      <rect x="29" y="23" width="42" height="54" fill="#f6d77a"/>
      <text x="50" y="62" font-size="34" font-weight="900" text-anchor="middle" fill="#b23a24" font-family="sans-serif">〒</text></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
