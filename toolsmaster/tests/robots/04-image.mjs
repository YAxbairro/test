import { page, download, robot, assert, FX } from '../lib/harness.mjs';
export default async function (env) {
  const r = robot('Image Master'); const p = await page(env, 'imagemaster.html');
  const alpha = buf => p.evaluate(async a => { const bm = await createImageBitmap(new Blob([new Uint8Array(a)])); const c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height; const x = c.getContext('2d'); x.drawImage(bm, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; return { corner: d[3], center: d[((c.height >> 1) * c.width + (c.width >> 1)) * 4 + 3] }; }, [...buf]);
  await r.check('remover fundo com IA', async () => { await p.evaluate(() => nav('rmbg', null)); await p.setInputFiles('#page-rmbg input[type=file]', FX + '/person.jpg'); await p.waitForTimeout(500); const d = await download(p, () => p.click('#page-rmbg button.btn-primary'), 300000); assert(d, 'sem download — ' + (await p.textContent('#rmbg-status')).trim()); const a = await alpha(d.buf); assert(a.corner === 0 && a.center > 200, 'recorte errado ' + JSON.stringify(a)); return JSON.stringify(a); });
  for (const id of ['enhance', 'filters', 'adjust', 'sharpen', 'rotate-flip', 'watermark', 'border', 'colorsplit']) await r.check(id, async () => {
    await p.evaluate(id => nav(id, null), id); await p.setInputFiles(`#page-${id} input[type=file]`, FX + '/photo.jpg'); await p.waitForTimeout(800);
    await p.locator(`#page-${id} button.btn-primary`).first().click(); await p.waitForTimeout(800);
    const has = await p.evaluate(id => [...document.querySelectorAll('#page-' + id + ' canvas, #page-' + id + ' img')].some(e => e.offsetParent && (e.width > 1 || e.naturalWidth > 1)), id);
    assert(has, 'sem resultado visível'); return 'ok';
  });
  await r.check('OCR', async () => { await p.evaluate(() => nav('ocr', null)); await p.setInputFiles('#ocr-input', FX + '/texto.png'); await p.click('#page-ocr button.btn-primary'); await p.waitForFunction(() => /✓|✗|Não encontrei/.test(document.getElementById('ocr-status').textContent), null, { timeout: 300000 }); const t = await p.inputValue('#ocr-out'); assert(/Cabo Verde/.test(t) && /Praia/.test(t), 'texto: ' + t); return t.replace(/\n/g, ' / '); });
  await r.check('sem erros JS', async () => { assert(!p.errors.length, p.errors.join(' | ')); return 'ok'; });
  await p.close(); return r;
}
