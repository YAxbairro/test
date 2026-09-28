import { page, download, robot, assert, FX } from '../lib/harness.mjs';
export default async function (env) {
  const r = robot('Resize Master'); const p = await page(env, 'resizemaster.html');
  for (const net of ['instagram', 'facebook', 'youtube', 'tiktok', 'twitter', 'linkedin', 'pinterest', 'whatsapp']) await r.check(net, async () => {
    await p.evaluate(id => nav(id, null), net); await p.setInputFiles(`#page-${net} input[type=file]`, FX + '/photo.jpg'); await p.waitForTimeout(500);
    const d = await download(p, () => p.click(`#page-${net} button.btn-primary`)); assert(d && d.buf.subarray(0, 2).toString() === 'PK', 'sem ZIP'); return d.buf.length + 'B';
  });
  await r.check('HEIC', async () => { await p.evaluate(() => nav('instagram', null)); await p.setInputFiles('#page-instagram input[type=file]', FX + '/sample.heic'); await p.waitForTimeout(3000); const d = await download(p, () => p.click('#page-instagram button.btn-primary')); assert(d, 'sem download'); return 'ok'; });
  await r.check('custom + botão de download', async () => { await p.evaluate(() => nav('custom', null)); await p.setInputFiles('#page-custom input[type=file]', FX + '/photo.jpg'); await p.waitForTimeout(500); await p.click('#page-custom button.btn-primary'); await p.waitForTimeout(800); const d = await download(p, () => p.locator('#page-custom .preview-dl').first().click(), 10000); assert(d, 'download do custom não funciona'); return d.name; });
  await r.check('sem erros JS', async () => { assert(!p.errors.length, p.errors.join(' | ')); return 'ok'; });
  await p.close(); return r;
}
