const fs = require('fs');
const path = require('path');
const { getPdfBrowser, releasePdfBrowser } = require(path.join(__dirname, '../backend/dist/services/pdfBrowser.js'));

(async () => {
  const fontsCss = fs.readFileSync('backend/src/fairexit/fonts.css', 'utf8');
  const html = `<!doctype html>
<html>
<head>
  <style>
    ${fontsCss}
    h1 { font-family: 'Newsreader', serif; font-size: 32pt; }
    p { font-family: 'DM Sans', sans-serif; font-size: 11pt; }
  </style>
</head>
<body>
  <h1>Your offer, <i>organized.</i></h1>
  <p>We read your letter and your contract, checked them against the law.</p>
</body>
</html>`;

  const b = await getPdfBrowser();
  const page = await b.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.evaluate('document.fonts.ready.then(() => true)');
  const pdfBuf = await page.pdf({ format: 'Letter' });
  fs.writeFileSync('tmp/test_font.pdf', pdfBuf);
  await page.close();
  await releasePdfBrowser();
  console.log('PDF written, size:', pdfBuf.length);
  process.exit(0);
})();
