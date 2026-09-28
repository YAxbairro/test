/* Tools Master — remoção de fundo.
   1) remove.bg (se houver chave no hub) — melhor qualidade, 50 imagens/mês grátis.
   2) IA local no browser (@imgly/background-removal, licença AGPL-3.0) — grátis, ilimitado; o modelo (~40 MB) é
      descarregado na primeira utilização e fica em cache. */
(function () {
  const IMGLY = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';
  let imglyMod = null;

  async function viaRemoveBg(file, key) {
    const fd = new FormData();
    fd.append('image_file', file);
    fd.append('size', 'auto');
    const resp = await fetch('https://api.remove.bg/v1.0/removebg', { method: 'POST', headers: { 'X-Api-Key': key }, body: fd });
    if (!resp.ok) throw new Error('remove.bg: ' + await TM.readError(resp));
    return await resp.blob();
  }

  async function viaLocalAI(file, onStatus) {
    if (!imglyMod) {
      onStatus && onStatus('A carregar a IA de remoção de fundo (~40 MB, só na primeira vez)...');
      try { imglyMod = await import(IMGLY); }
      catch (e) { throw new Error('não foi possível carregar a IA de remoção de fundo: ' + e.message); }
    }
    onStatus && onStatus('A IA está a recortar a imagem...');
    return await imglyMod.removeBackground(file, {
      model: 'isnet_fp16',
      output: { format: 'image/png' },
      progress: (key, cur, total) => { if (onStatus && key.startsWith('fetch') && total) onStatus('A descarregar o modelo... ' + Math.round(cur / total * 100) + '%'); },
    });
  }

  /* Devolve um Blob PNG com fundo transparente. Lança erro com a razão real se falhar. */
  async function removeBackground(file, { onStatus } = {}) {
    const key = window.TM ? TM.getKey('removebg') : '';
    if (key) {
      try { onStatus && onStatus('A enviar para remove.bg...'); return await viaRemoveBg(file, key); }
      catch (e) { console.warn(e); onStatus && onStatus(e.message + ' — a usar a IA local...'); }
    }
    return await viaLocalAI(file, onStatus);
  }

  /* Aplica uma cor de fundo (ou transparente) a um PNG recortado e devolve um canvas. */
  async function compose(pngBlob, bg) {
    const bmp = await createImageBitmap(pngBlob);
    const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    const ctx = c.getContext('2d');
    if (bg && bg !== 'transparent') { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.drawImage(bmp, 0, 0);
    return c;
  }

  window.TMRMBG = { removeBackground, compose };
})();
