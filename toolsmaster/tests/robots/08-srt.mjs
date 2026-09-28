import { page, robot, assert, FX } from '../lib/harness.mjs';
export default async function (env) {
  const r = robot('SRT Sync');
  await env.ctx.route('https://api.groq.com/**', rt => rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ language: 'portuguese', segments: [{ start: 0, end: 2.5, text: ' Olá, bem-vindos.' }, { start: 2.5, end: 7.9, text: ' Hoje falamos de Cabo Verde e das nove ilhas do arquipélago, uma frase longa.' }, { start: 65.2, end: 3671.75, text: ' Fim.' }] }) }));
  const p = await page(env, 'srt-sync-groq.html'); await p.evaluate(() => TM.setKey('groq', 'gsk_teste')); await p.reload();
  await r.check('chave partilhada do hub preenchida', async () => { assert(await p.inputValue('#apiKey') === 'gsk_teste', 'chave não veio do hub'); return 'ok'; });
  await r.check('SRT válido', async () => {
    await p.setInputFiles('input[type=file]', FX + '/tone.wav'); await p.waitForTimeout(400);
    await p.locator('button:has-text("Gerar"), button:has-text("Sincronizar"), button:has-text("Transcrever")').first().click(); await p.waitForTimeout(2500);
    const srt = await p.evaluate(() => typeof srtContent !== 'undefined' ? srtContent : ''); assert(srt, 'sem SRT');
    const blocks = srt.trim().split(/\n\n+/); const re = /^(\d+)\n(\d\d:\d\d:\d\d,\d{3}) --> (\d\d:\d\d:\d\d,\d{3})\n.+/s;
    const t = s => { const [h, m, x] = s.split(':'); const [sec, ms] = x.split(','); return +h * 3600 + +m * 60 + +sec + ms / 1000; };
    let prevEnd = -1; blocks.forEach((b, i) => { const m = re.exec(b); assert(m, 'bloco inválido: ' + JSON.stringify(b)); assert(+m[1] === i + 1, 'numeração'); assert(t(m[3]) > t(m[2]), 'duração zero/negativa no bloco ' + (i + 1)); assert(t(m[2]) >= prevEnd, 'sobreposição no bloco ' + (i + 1)); prevEnd = t(m[3]); });
    return blocks.length + ' blocos';
  });
  await r.check('sem erros JS', async () => { assert(!p.errors.length, p.errors.join(' | ')); return 'ok'; });
  await p.close(); return r;
}
