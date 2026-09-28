import { page, robot, assert } from '../lib/harness.mjs';
/* Sem chave real no ambiente de testes: simula a resposta da Groq para validar o circuito (pedido → resposta no ecrã). */
export default async function (env) {
  const r = robot('Text Master + CV Master (IA)'); let last = null;
  await env.ctx.route('https://api.groq.com/**', async rt => { last = JSON.parse(rt.request().postData() || '{}'); await rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ choices: [{ message: { content: 'RESPOSTA SIMULADA' } }] }) }); });
  const p = await page(env, 'textmaster.html'); await p.evaluate(() => TM.setKey('groq', 'gsk_teste'));
  const pages = await p.evaluate(() => [...document.querySelectorAll('.page')].map(x => x.id.replace('page-', '')).filter(x => x !== 'home'));
  for (const id of pages) await r.check('text/' + id, async () => {
    await p.evaluate(id => nav(id, null), id); const pg = p.locator('#page-' + id);
    for (const el of await pg.locator('textarea:not([readonly]), input[type=text]').all()) if (await el.isVisible() && await el.isEditable()) await el.fill('A Eagle Marketing cria sites e vídeos com IA na Praia.');
    await pg.locator('button.btn-primary').first().click(); await p.waitForTimeout(1000);
    const out = await pg.evaluate(el => [...el.querySelectorAll('textarea')].some(t => t.value.includes('SIMULADA')));
    assert(out, 'resposta não apareceu — ' + ((await pg.locator('.status').first().textContent()) || '').trim()); return 'ok';
  });
  const c = await page(env, 'cvmaster.html');
  for (const id of ['cover', 'linkedin', 'tailor', 'improve-cv']) await r.check('cv/' + id, async () => { await c.evaluate(id => nav(id, null), id); const pg = c.locator('#page-' + id); for (const el of await pg.locator('input[type=text], textarea:not([readonly])').all()) if (await el.isVisible() && await el.isEditable()) await el.fill('Yax'); await pg.locator('button.btn-primary').first().click(); await c.waitForTimeout(1000); const ok = await pg.evaluate(el => [...el.querySelectorAll('textarea')].some(t => t.value.includes('SIMULADA'))); assert(ok, 'resposta não apareceu'); return 'ok'; });
  await r.check('cv/ATS análise real', async () => { await c.evaluate(() => nav('ats', null)); await c.fill('#ats-cv', 'Yanick Silva\nyanick@eagle.cv +238 999 9999\nExperiência\n2019-2026 Diretor criativo. Liderei 40 campanhas, aumentei vendas 30%.\nFormação\nLicenciatura 2015'); await c.fill('#ats-job', 'Procuramos diretor criativo com experiência em campanhas, vídeo e marketing digital.'); await c.click('#page-ats button.btn-primary'); const a = await c.textContent('#ats-result'); await c.click('#page-ats button.btn-primary'); const b = await c.textContent('#ats-result'); assert(a === b, 'pontuação muda a cada clique (aleatória?)'); return a.match(/\d+\/100/)?.[0]; });
  await r.check('sem erros JS', async () => { const e = [...p.errors, ...c.errors]; assert(!e.length, e.join(' | ')); return 'ok'; });
  await p.close(); await c.close(); return r;
}
