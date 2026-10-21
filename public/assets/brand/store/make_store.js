// Store graphics: app screenshots (iOS 6.7" 1290x2796 + Android 1080x2340), Android feature graphic 1024x500, social share 1200x630.
const path = require('path'), fs = require('fs');
const puppeteer = require(path.join(__dirname, '..', '..', '..', 'figma-sync', 'pp', 'node_modules', 'puppeteer-core'));
const B = 'http://127.0.0.1:8813';
const OUT = __dirname; const SHOTS = path.join(OUT, '_screens'); fs.mkdirSync(SHOTS, { recursive: true });
const MARK = fs.readFileSync(path.join(OUT, '..', 'icons', 'fairexit-mark.svg'), 'utf8');
const FONT = p => 'data:font/ttf;base64,' + fs.readFileSync(path.join(OUT, '..', 'splash', 'lottie', 'fonts', p)).toString('base64');
const CSS = `@font-face{font-family:P;font-weight:400;src:url(${FONT('Poppins-Regular.ttf')})}@font-face{font-family:P;font-weight:500;src:url(${FONT('Poppins-Medium.ttf')})}
@font-face{font-family:P;font-weight:700;src:url(${FONT('Poppins-Bold.ttf')})}@font-face{font-family:P;font-weight:800;src:url(${FONT('Poppins-ExtraBold.ttf')})}
*{margin:0;box-sizing:border-box}body{font-family:P,Arial,sans-serif;color:#062c55}`;
// app screens to show, with the store caption for each
const S = [['13', 'Is your severance offer fair?', 'Find out free, in about 2 minutes.'],
           ['05', 'Answers made simple', 'One quick question at a time.'],
           ['19', 'Add your letter and contract', 'Scan them with your phone.'],
           ['22', 'Check what we read', 'Tap Yes or No. No typing.'],
           ['T3', 'Your Severance Report', 'A clear PDF, checked against official rules.'],
           ['LF', 'Talk to a lawyer, free', 'A local employment lawyer contacts you.']];
(async () => {
  const src = fs.readFileSync(path.join(OUT, '..', '..', '..', 'app-proto', 'app.js'), 'utf8');
  const list = src.slice(src.indexOf('var SCREENS0=['), src.indexOf('var O2N'));
  const ids = [...list.matchAll(/\['([A-Z0-9]+)',/g)].map(m => m[1]);
  const num = id => String(ids.indexOf(id) + 1).padStart(2, '0');
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
  const p = await b.newPage();
  // 1. raw app screens at 3x
  await p.setViewport({ width: 393, height: 852, deviceScaleFactor: 3 });
  for (const [id] of S) {
    await p.goto(`${B}/app-proto/screen.html?os=ios&cc=ca&s=${num(id)}`, { waitUntil: 'networkidle0' });
    await p.screenshot({ path: path.join(SHOTS, id + '.png') });
  }
  // 2. framed store screenshots
  const shot = id => 'data:image/png;base64,' + fs.readFileSync(path.join(SHOTS, id + '.png')).toString('base64');
  const store = (w, h, id, t1, t2) => `<html><head><style>${CSS}
    body{width:${w}px;height:${h}px;background:linear-gradient(180deg,#f7f5f0 0%,#eef6f2 100%);position:relative;overflow:hidden}
    .t{position:absolute;left:0;right:0;top:${h * .055}px;text-align:center;padding:0 ${w * .07}px}
    .t h1{font-weight:800;font-size:${w * .072}px;line-height:1.12;letter-spacing:-.01em}.t p{font-size:${w * .036}px;color:#3d4a55;margin-top:${w * .02}px}
    .ph{position:absolute;left:50%;top:${h * .22}px;width:${w * .78}px;transform:translateX(-50%);border-radius:${w * .075}px;background:#0b1622;padding:${w * .018}px;box-shadow:0 ${w * .03}px ${w * .08}px -${w * .03}px rgba(6,44,85,.45)}
    .ph img{display:block;width:100%;border-radius:${w * .06}px}</style></head>
    <body><div class="t"><h1>${t1}</h1><p>${t2}</p></div><div class="ph"><img src="${shot(id)}"></div></body></html>`;
  for (const [W, Hh, tag] of [[1290, 2796, 'ios-6.7'], [1080, 2340, 'android']]) {
    await p.setViewport({ width: W, height: Hh, deviceScaleFactor: 1 });
    let n = 1;
    for (const [id, t1, t2] of S) { await p.setContent(store(W, Hh, id, t1, t2), { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
      await p.screenshot({ path: path.join(OUT, `store-${tag}-${n++}.png`) }); }
  }
  // 3. Android feature graphic + social share image
  const banner = (w, h, small) => `<html><head><style>${CSS}body{width:${w}px;height:${h}px;background:#f7f5f0;display:flex;align-items:center;justify-content:center;gap:${w * .045}px}
    .m{width:${w * (small ? .3 : .32)}px}.m svg{width:100%;height:auto;display:block}
    h1{font-weight:800;font-size:${h * .2}px;letter-spacing:-.02em;line-height:1}h1 span{color:#10b48f}p{font-size:${h * .065}px;margin-top:${h * .04}px}p b{font-weight:500;color:#0c8f72}</style></head>
    <body><div class="m">${MARK}</div><div><h1>Fair<span>Exit</span></h1><p>Challenge your <b>severance offer</b></p></div></body></html>`;
  for (const [w, h, f] of [[1024, 500, 'android-feature-graphic.png'], [1200, 630, 'social-share-1200x630.png']]) {
    await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await p.setContent(banner(w, h), { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, f) });
  }
  await b.close(); console.log('done');
})();
