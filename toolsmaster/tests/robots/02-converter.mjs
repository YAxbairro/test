import { page, download, robot, assert, FX } from '../lib/harness.mjs';
export default async function (env) {
  const r = robot('Converter Master'); const p = await page(env, 'convertermaster.html');
  const px = (buf, x, y) => p.evaluate(async ([a, x, y]) => { const bm = await createImageBitmap(new Blob([new Uint8Array(a)])); const c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height; const g = c.getContext('2d'); g.drawImage(bm, 0, 0); return [...g.getImageData(x, y, 1, 1).data].slice(0, 3).join(','); }, [[...buf], x, y]);
  async function one(file, fmt) { await p.reload(); await p.evaluate(() => nav('img-convert', null)); await p.setInputFiles('#page-img-convert input[type=file]', FX + '/' + file); await p.click(`#ic-formats .fmt-btn:text-is("${fmt}")`); await p.click('#page-img-convert button.btn-primary'); await p.waitForSelector('#ic-results .result-dl', { timeout: 60000 }); return download(p, () => p.click('#ic-results .result-dl')); }
  await r.check('PNG transparente → JPG com fundo branco', async () => { const d = await one('transp.png', 'JPG'); assert(d, 'sem download'); const c = await px(d.buf, 5, 5); assert(c === '255,255,255', 'canto = ' + c); return c; });
  await r.check('HEIC → JPG', async () => { const d = await one('sample.heic', 'JPG'); assert(d && d.buf[0] === 0xff && d.buf[1] === 0xd8, 'não é JPEG'); return d.buf.length + 'B'; });
  await r.check('SVG → PNG', async () => { await p.evaluate(() => nav('img-svg', null)); await p.setInputFiles('#svg-input', FX + '/logo.svg'); const d = await download(p, () => p.click('#page-img-svg button.btn-primary')); assert(d && d.buf.subarray(1, 4).toString() === 'PNG', 'não é PNG'); return 'ok'; });
  const media = [['audio-convert', 'ac', 'tone.wav', 'MP3', '494433'], ['audio-convert', 'ac', 'tone.wav', 'FLAC', '664c61'], ['audio-extract', 'ae', 'clip.mp4', 'MP3', '494433'], ['video-convert', 'vc', 'clip.mp4', 'WEBM', '1a45df'], ['video-compress', 'vcmp', 'clip.mp4', null, null], ['video-gif', 'vg', 'clip.mp4', null, '474946'], ['video-trim', 'vt', 'clip.mp4', null, null]];
  for (const [pg, pre, file, fmt, magic] of media) await r.check(pg + (fmt ? ' ' + fmt : ''), async () => {
    await p.evaluate(id => nav(id, null), pg); await p.setInputFiles('#' + pre + '-input', FX + '/' + file);
    if (fmt) await p.click(`#page-${pg} .fmt-btn:text-is("${fmt}")`);
    if (pre === 'vt') { await p.fill('#vt-start', '1'); await p.fill('#vt-end', '3'); }
    if (pre === 'vg') await p.fill('#vg-dur', '2');
    const d = await download(p, () => p.click(`#page-${pg} button.btn-primary`), 240000);
    assert(d, 'sem download — ' + (await p.textContent('#' + pre + '-status')).trim());
    if (magic) assert(d.buf.toString('hex').startsWith(magic), 'formato errado: ' + d.buf.subarray(0, 4).toString('hex'));
    return d.name + ' ' + d.buf.length + 'B';
  });
  for (const [pg, pre, file] of [['doc-word', 'dw', 'proposta.docx'], ['doc-excel', 'de', 'planos.xlsx']]) await r.check(pg + ' local', async () => {
    await p.evaluate(id => nav(id, null), pg); await p.setInputFiles('#' + pre + '-input', FX + '/' + file);
    const popP = env.ctx.waitForEvent('page', { timeout: 10000 }).catch(() => null); await p.click(`#page-${pg} button.btn-primary`); const pop = await popP;
    assert(pop, 'nenhuma janela aberta — ' + (await p.textContent('#' + pre + '-status')).trim());
    await p.waitForTimeout(800); const t = await pop.evaluate(() => document.body.innerText); await pop.close();
    assert(/Proposta|Starter/.test(t), 'conteúdo não aparece'); return 'ok';
  });
  await r.check('sem erros JS', async () => { assert(!p.errors.length, p.errors.join(' | ')); return 'ok'; });
  await p.close(); return r;
}
