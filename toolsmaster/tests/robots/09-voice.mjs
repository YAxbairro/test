import { page, download, robot, assert } from '../lib/harness.mjs';
export default async function (env) {
  const r = robot('Voice Master'); const p = await page(env, 'voicemaster.html');
  const dur = buf => p.evaluate(async a => { const ac = new OfflineAudioContext(1, 1, 22050); return (await ac.decodeAudioData(new Uint8Array(a).buffer)).duration; }, [...buf]);
  async function gen(pageId, prefix, setup) { await p.evaluate(id => nav(id, null), pageId); await setup(); await p.evaluate(pre => { const s = document.getElementById(pre + '-status'); if (s) s.textContent = ''; }, prefix); await p.click(`#page-${pageId} button.btn-primary`); await p.waitForFunction(pre => /✓|✗/.test(document.getElementById(pre + '-status')?.textContent || ''), prefix, { timeout: 300000 }); const st = (await p.textContent('#' + prefix + '-status')).trim(); assert(st.startsWith('✓'), st); return download(p, () => p.evaluate(pre => dlAudio(pre), prefix)); }
  let base = 0;
  await r.check('PT-PT → MP3', async () => { const d = await gen('tts', 'tts', async () => { await p.fill('#tts-text', 'Bom dia, Cabo Verde! O Tools Master já fala português de Portugal.'); await p.selectOption('#tts-format', 'mp3'); }); assert(d.buf.toString('hex').startsWith('494433'), 'não é MP3'); base = await dur(d.buf); assert(base > 1, 'áudio curto demais'); return base.toFixed(2) + 's'; });
  await r.check('velocidade 1,5×', async () => { const d = await gen('tts', 'tts', async () => { await p.selectOption('#tts-format', 'wav'); await p.evaluate(() => document.getElementById('tts-speed').value = '1.5'); }); const t = await dur(d.buf); assert(Math.abs(t - base / 1.5) < 0.4, 'duração ' + t.toFixed(2) + ' vs esperado ' + (base / 1.5).toFixed(2)); return t.toFixed(2) + 's'; });
  await r.check('SSML com pausa de 2 s', async () => { const d = await gen('ssml', 'ssml', async () => { await p.fill('#ssml-text', '<speak>Primeira frase.<break time="2s"/>Segunda frase.</speak>'); await p.selectOption('#ssml-voice', 'pt_PT-tugão-medium'); }); const t = await dur(d.buf); assert(t > 3, 'pausa não aplicada: ' + t.toFixed(2)); return t.toFixed(2) + 's'; });
  await r.check('clonagem sem chave explica o que falta', async () => { await p.evaluate(() => nav('clone', null)); await p.click('#page-clone button.btn-primary'); const t = await p.textContent('#clone-status'); assert(t.includes('ElevenLabs'), t); return 'ok'; });
  await r.check('sem erros JS', async () => { assert(!p.errors.length, p.errors.join(' | ')); return 'ok'; });
  await p.close(); return r;
}
