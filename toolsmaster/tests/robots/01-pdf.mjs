import { page, download, robot, assert, FX } from '../lib/harness.mjs';
export default async function (env) {
  const r = robot('PDF Master'); const p = await page(env, 'pdfmaster.html');
  const pdfjs = (buf, pw) => p.evaluate(async ([a, pw]) => { try { const d = await pdfjsLib.getDocument({ data: new Uint8Array(a), password: pw }).promise; return d.numPages; } catch (e) { return e.name; } }, [[...buf], pw]);
  async function op(id, files, setup) {
    await p.evaluate(id => nav(id, null), id); const pg = p.locator('#page-' + id);
    if (files) await pg.locator('input[type=file]').first().setInputFiles(files.map(f => FX + '/' + f));
    await p.waitForTimeout(600); if (setup) await setup(pg);
    const d = await download(p, () => pg.locator('button.btn-primary, button.btn-full').first().click());
    const st = ((await pg.locator('.status').first().textContent().catch(() => '')) || '').trim();
    return { d, st };
  }
  const simple = [['merge', ['a.pdf', 'b.pdf'], 5], ['split', ['a.pdf']], ['organize', ['a.pdf'], 3], ['watermark', ['a.pdf'], 3], ['addtext', ['a.pdf'], 3], ['addimage', ['a.pdf'], 3], ['pagenumbers', ['a.pdf'], 3], ['headerfooter', ['a.pdf'], 3], ['img2pdf', null, 2], ['pdf2img', ['a.pdf']], ['rotate', ['a.pdf'], 3], ['crop', ['a.pdf'], 3], ['scale', ['a.pdf'], 3], ['metadata', ['a.pdf'], 3], ['blank', null, 1]];
  for (const [id, files, pages] of simple) await r.check(id, async () => {
    const f = id === 'img2pdf' ? ['photo.jpg', 'transp.png'] : id === 'addimage' ? null : files;
    const { d, st } = await op(id, f, id === 'addimage' ? async pg => { const ins = pg.locator('input[type=file]'); await ins.nth(0).setInputFiles(FX + '/a.pdf'); if (await ins.count() > 1) await ins.nth(1).setInputFiles(FX + '/photo.jpg'); await p.waitForTimeout(500); } : null);
    assert(d, 'sem download — ' + st);
    if (pages) { const n = await pdfjs(d.buf); assert(n === pages, 'pdf.js leu ' + n + ' páginas, esperado ' + pages); }
    return d.name + ' ' + d.buf.length + 'B';
  });
  await r.check('extract', async () => { const { d, st } = await op('extract', ['a.pdf'], pg => pg.locator('#ext-pages').fill('1,3')); assert(d, st); assert(await pdfjs(d.buf) === 2, 'páginas erradas'); return 'ok'; });
  await r.check('protect (encriptação real)', async () => { const { d, st } = await op('protect', ['a.pdf'], pg => pg.locator('#prt-user-pw').fill('1234')); assert(d, st); assert(await pdfjs(d.buf) === 'PasswordException', 'abre sem senha!'); assert(await pdfjs(d.buf, '1234') === 3, 'não abre com senha'); return 'pede senha'; });
  await r.check('permissions', async () => { const { d, st } = await op('permissions', ['a.pdf'], pg => pg.locator('#prm-pw').fill('dono')); assert(d, st); assert(d.buf.toString('latin1').includes('/Encrypt'), 'sem /Encrypt'); return 'ok'; });
  await r.check('compress (real)', async () => { const { d, st } = await op('compress', ['heavy.pdf'], pg => pg.locator('#cmp-level').selectOption('medium')); assert(d, st); assert(d.buf.length < 1000000, 'não reduziu: ' + d.buf.length); return st; });
  await r.check('forms', async () => { const { d, st } = await op('forms', ['form.pdf'], async pg => { await p.waitForTimeout(700); await pg.locator('input[id^=frm-]:not([type=file])').first().fill('Yax'); }); assert(d, st); const t = await p.evaluate(async a => { const d = await pdfjsLib.getDocument({ data: new Uint8Array(a) }).promise; const tc = await (await d.getPage(1)).getTextContent(); return tc.items.map(i => i.str).join(' '); }, [...d.buf]); assert(t.includes('Yax'), 'texto não aparece no PDF'); return 'ok'; });
  await r.check('sem erros JS', async () => { assert(!p.errors.length, p.errors.join(' | ')); return 'ok'; });
  await p.close(); return r;
}
