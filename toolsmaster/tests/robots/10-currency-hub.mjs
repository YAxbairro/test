import { page, robot, assert } from '../lib/harness.mjs';
export default async function (env) {
  const r = robot('Currency Master + Hub'); const p = await page(env, 'toolsmaster.html');
  await r.check('hub abre as 11 ferramentas', async () => { const n = await p.locator('.hub-card').count(); assert(n === 11, n + ' cartões'); const bad = []; for (const k of ['srt', 'qr', 'pdf', 'converter', 'resize', 'text', 'image', 'sign', 'voice', 'cv', 'currency']) { await p.evaluate(k => openTool(k), k); await p.waitForTimeout(700); if ((await p.textContent('#bc-tool')) === 'Hub') bad.push(k); await p.keyboard.press('Escape'); } assert(!bad.length, 'não abriram: ' + bad); return '11/11'; });
  await r.check('gestor de chaves guarda e partilha', async () => { await p.click('text=⚙ Chaves de API'); await p.fill('#key-groq', 'gsk_robo'); await p.click('text=Guardar'); await p.keyboard.press('Escape'); await p.keyboard.press('6'); await p.waitForTimeout(1200); const k = await p.frame({ url: /textmaster/ }).evaluate(() => TM.getKey('groq')); assert(k === 'gsk_robo', 'chave não partilhada'); await p.evaluate(() => TM.setKey('groq', '')); return 'ok'; });
  const c = await page(env, 'currencymaster.html'); await c.waitForTimeout(2500);
  await r.check('100 EUR = 11 026,50 CVE (paridade)', async () => { const t = (await c.textContent('#res-big')).replace(/\s/g, ''); assert(t.startsWith('11026,50'), t); return t; });
  await r.check('taxas do dia carregadas', async () => { const m = await c.textContent('#meta'); assert(/Taxas de \d{4}-\d\d-\d\d/.test(m), m); assert(await c.locator('#from option').count() > 100, 'poucas moedas'); return m.slice(0, 25); });
  await r.check('sem erros JS', async () => { const e = [...p.errors, ...c.errors]; assert(!e.length, e.join(' | ')); return 'ok'; });
  await p.close(); await c.close(); return r;
}
