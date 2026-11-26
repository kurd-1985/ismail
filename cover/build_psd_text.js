// Build a layered 300-dpi PSD with EDITABLE Photoshop text layers (via ag-psd).
// Each text layer carries real text data (font, size, colour, alignment, rotation) plus a
// pre-rendered preview, so it looks right on opening and can be edited in Photoshop.
// usage: NODE_PATH=<dir with ag-psd> node build_psd_text.js <out.psd>
const {chromium} = require('playwright');
const {writePsdBuffer} = require('ag-psd');
const {PNG} = require('./png-lite');           // tiny PNG decoder (zlib) in this folder
const fs = require('fs');

const OUT = process.argv[2] || 'cover-photoshop.psd';
const W = 377, H = 252, CSS_MM = 96 / 25.4, K = 300 / 96;   // CSS px -> 300 dpi px

const IMAGES = [   // [layer name, selector, extra css]
  ['Spine band', '.spine', '.spine *{visibility:hidden!important}'],
  ['Front image - village', 'svg.art'],
  ['Front - gold line', '.vrule'],
  ['Front - short gold line', '.subblock .rule'],
  ['Spine - publisher logo', '.spine .plogo'],
  ['Back - gold line', '.erule'],
  ['Back - author photo', '.authorbox img'],
  ['Back - red line', '.authorbox .ar'],
];
const TEXTS = [    // [layer name, selector, rotation, justification, extra css]
  ['TEXT Front - title line 1', '.vtitle .t1', 'ccw', 'right'],
  ['TEXT Front - title line 2', '.vtitle .t2', 'ccw', 'right'],
  ['TEXT Front - subtitle', '.sub', null, 'center'],
  ['TEXT Front - years', '.years', null, 'center'],
  ['TEXT Front - author label', '.front .author small', null, 'center'],
  ['TEXT Front - author name', '.front .author', null, 'center', '.front .author small{visibility:hidden!important}'],
  ['TEXT Spine - title', '.spine .st', 'ccw', 'right'],
  ['TEXT Spine - author', '.spine .sa', 'ccw', 'right'],
  ['TEXT Back - quote', '.q', null, 'justify-right'],
  ['TEXT Back - blurb 1', '.blurb p:nth-child(1)', null, 'justify-right'],
  ['TEXT Back - blurb 2', '.blurb p:nth-child(2)', null, 'justify-right'],
  ['TEXT Back - blurb 3', '.blurb p:nth-child(3)', null, 'justify-right'],
  ['TEXT Back - English title', '.eng .et', 'cw', 'left'],
  ['TEXT Back - English subtitle', '.eng .es', 'cw', 'left'],
  ['TEXT Back - English author', '.eng .ea', 'cw', 'left'],
  ['TEXT Back - author name', '.authorbox .an', null, 'center'],
  ['TEXT Back - price', '.price', null, 'right'],
];
const PS = (fam, w) => /Naskh/.test(fam) ? 'NotoNaskhArabic-Regular'
  : 'Vazirmatn-' + ({400: 'Regular', 500: 'Medium', 700: 'Bold', 800: 'ExtraBold', 900: 'Black'}[w] || 'Regular');

function crop(png) {   // RGBA buffer -> tight bbox
  const {width: w, height: h, data} = png; let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, out = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y++) data.copy(out, y * cw * 4, ((y + y0) * w + x0) * 4, ((y + y0) * w + x1 + 1) * 4);
  return {left: x0, top: y0, imageData: {width: cw, height: ch, data: out}};
}

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({viewport: {width: Math.ceil(W * CSS_MM), height: Math.ceil(H * CSS_MM)}, deviceScaleFactor: K});
  await p.goto('file://' + __dirname + '/cover.html'); await p.waitForTimeout(800);
  const composite = PNG.read(await p.screenshot());
  const shot = async () => PNG.read(await p.screenshot({omitBackground: true}));
  await p.addStyleTag({content: 'html,body{background:transparent!important} body *{visibility:hidden}'});
  const only = async (sel, extra, fn) => {
    const h = await p.addStyleTag({content: `${sel},${sel} *{visibility:visible!important} ${extra || ''}`});
    await p.waitForTimeout(120); const r = await fn(); await h.evaluate(e => e.remove()); return r; };

  const children = [{name: 'Background', left: 0, top: 0, imageData: {width: composite.width, height: composite.height,
    data: new Uint8ClampedArray(composite.width * composite.height * 4).map((_, i) => [0x14, 0x12, 0x14, 255][i % 4])}}];
  for (const [name, sel, extra] of IMAGES) { const c = crop(await only(sel, extra, shot)); if (c) children.push({name, ...c}); }

  for (const [name, sel, rot, just, extra] of TEXTS) {
    const info = await p.evaluate(([sel, extra]) => {
      const el = document.querySelector(sel), cs = getComputedStyle(el), body = document.body.getBoundingClientRect();
      // text, with explicit <br> as paragraph returns; skip hidden children (e.g. the <small> label)
      let text = '', runs = [];
      const walk = (n, red) => { for (const c of n.childNodes) {
        if (c.nodeType === 3) { const t = c.textContent.replace(/\s+/g, ' '); if (t.trim() || text) { runs.push([t.length, red]); text += t; } }
        else if (c.tagName === 'BR') { runs.push([1, red]); text += '\r'; }
        else if (c.tagName !== 'SMALL' || !extra) walk(c, red || c.tagName === 'B'); } };
      walk(el, false);
      const lead = text.length - text.trimStart().length; text = text.trim();
      const r = el.getBoundingClientRect(), col = s => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
      const red = el.querySelector('b') ? col(getComputedStyle(el.querySelector('b')).color) : null;
      return {text, runs, lead, family: cs.fontFamily, weight: +cs.fontWeight, size: parseFloat(cs.fontSize),
        lh: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2, ls: parseFloat(cs.letterSpacing) || 0,
        color: col(cs.color), red, l: r.left - body.left, t: r.top - body.top, r: r.right - body.left, b: r.bottom - body.top};
    }, [sel, extra]);
    const c = crop(await only(sel, extra, shot)); if (!c) continue;
    const fs_ = info.size * K, rgb = a => ({r: a[0], g: a[1], b: a[2]});
    const ar = /[؀-ۿ]/.test(info.text);
    const base = {font: {name: PS(info.family, info.weight)}, fontSize: fs_, fillColor: rgb(info.color),
      autoLeading: false, leading: info.lh * K, tracking: Math.round(info.ls / info.size * 1000), characterDirection: ar ? 2 : 0};
    // style runs (red words) after trimming leading whitespace
    let styleRuns; if (info.red) { let skip = info.lead; styleRuns = [];
      for (const [len, isRed] of info.runs) { let l = len; if (skip) { const s = Math.min(skip, l); skip -= s; l -= s; }
        if (l) styleRuns.push({length: l, style: {...base, fillColor: rgb(isRed ? info.red : info.color)}}); }
      const tot = styleRuns.reduce((a, s) => a + s.length, 0); if (tot > info.text.length) styleRuns[styleRuns.length - 1].length -= tot - info.text.length; }
    const L = info.l * K, T = info.t * K, R = info.r * K, B = info.b * K;
    let transform, bw, bh;
    if (rot === 'ccw') { transform = [0, -1, 1, 0, L, B]; bw = B - T; bh = R - L; }      // tops face left, reads top->bottom
    else if (rot === 'cw') { transform = [0, 1, -1, 0, R, T]; bw = B - T; bh = R - L; }  // tops face right, reads top->bottom
    else { transform = [1, 0, 0, 1, L, T]; bw = R - L; bh = B - T; }
    children.push({name, ...c, text: {
      text: info.text, transform, shapeType: 'box', boxBounds: [0, 0, bw + 2, bh + 2], antiAlias: 'smooth',
      style: base, ...(styleRuns ? {styleRuns} : {}),
      paragraphStyle: {justification: just, everyLineComposer: true}}});
  }
  await b.close();

  const buf = writePsdBuffer({width: composite.width, height: composite.height,
    imageResources: {resolutionInfo: {horizontalResolution: 300, horizontalResolutionUnit: 'PPI', widthUnit: 'Inches',
      verticalResolution: 300, verticalResolutionUnit: 'PPI', heightUnit: 'Inches'},
      gridAndGuidesInformation: {grid: {horizontal: 576, vertical: 576}, guides:
        [18, 169, 177, 200, 208, 359].map(mm => ({location: mm * 300 / 25.4, direction: 'vertical'})).concat(
        [18, 234].map(mm => ({location: mm * 300 / 25.4, direction: 'horizontal'})))}},
    imageData: {width: composite.width, height: composite.height, data: new Uint8ClampedArray(composite.data)},
    children}, {generateThumbnail: false, noBackground: true});
  fs.writeFileSync(OUT, buf);
  console.log('wrote', OUT, (buf.length / 1e6).toFixed(1) + ' MB', children.length, 'layers');
})();
