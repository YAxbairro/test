/* Tools Master — utilitários de imagem partilhados.
   - HEIC/HEIF (fotos de iPhone) convertidos para JPEG no browser (heic2any, carregado só quando é preciso).
   - Exportação JPEG com fundo branco (em vez de preto) onde havia transparência. */
(function () {
  let heicLoading = null;
  const isHeic = f => /\.(heic|heif)$/i.test(f.name || '') || /image\/hei[cf]/i.test(f.type || '');

  function loadHeic2any() {
    if (window.heic2any) return Promise.resolve();
    if (!heicLoading) heicLoading = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = 'vendor/heic2any.min.js';
      s.onload = () => res(); s.onerror = () => { heicLoading = null; rej(new Error('não foi possível carregar o conversor HEIC')); };
      document.head.appendChild(s);
    });
    return heicLoading;
  }

  /* Devolve um File legível pelo browser (converte HEIC para JPEG). */
  async function normalize(file) {
    if (!isHeic(file)) return file;
    await loadHeic2any();
    try {
      const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
      const blob = Array.isArray(out) ? out[0] : out;
      return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
    } catch (e) { throw new Error('não foi possível converter a foto HEIC "' + file.name + '": ' + (e.message || e.code || e)); }
  }

  async function readDataURL(file) {
    const f = await normalize(file);
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = () => rej(new Error('não foi possível ler "' + file.name + '"')); r.readAsDataURL(f); });
  }

  /* canvas → Blob. Para JPEG, achata sobre branco. Rejeita com erro claro se o browser não gerar o ficheiro. */
  function toBlob(canvas, fmt, q) {
    let src = canvas;
    if (fmt === 'jpeg' || fmt === 'jpg') {
      src = document.createElement('canvas'); src.width = canvas.width; src.height = canvas.height;
      const ctx = src.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, src.width, src.height); ctx.drawImage(canvas, 0, 0);
      fmt = 'jpeg';
    }
    return new Promise((res, rej) => src.toBlob(b => b ? res(b) : rej(new Error('o browser não conseguiu gerar ' + fmt.toUpperCase())), 'image/' + fmt, q > 1 ? q / 100 : q));
  }

  window.TMIMG = { isHeic, normalize, readDataURL, toBlob };
})();
