/* Tools Master — ffmpeg no browser (ffmpeg.wasm). Converte áudio/vídeo localmente, sem enviar ficheiros para servidores.
   O motor (~32 MB) é descarregado do jsDelivr na primeira utilização e fica em cache do browser. */
(function () {
  const CORE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';
  let ff = null, loading = null;

  async function toBlobURL(url, type) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ao descarregar ' + url.split('/').pop());
    return URL.createObjectURL(new Blob([await resp.arrayBuffer()], { type }));
  }
  async function fetchFile(file) { return new Uint8Array(await file.arrayBuffer()); }

  async function load(onStatus) {
    if (ff) return ff;
    if (loading) return loading;
    loading = (async () => {
      if (!window.FFmpegWASM) throw new Error('motor de vídeo não carregou (vendor/ffmpeg em falta)');
      const inst = new FFmpegWASM.FFmpeg();
      onStatus && onStatus('A descarregar o motor de vídeo (32 MB, só na primeira vez)...');
      const coreURL = await toBlobURL(CORE + '/ffmpeg-core.js', 'text/javascript');
      const wasmURL = await toBlobURL(CORE + '/ffmpeg-core.wasm', 'application/wasm');
      await inst.load({ coreURL, wasmURL });
      ff = inst;
      return ff;
    })();
    try { return await loading; }
    catch (e) { loading = null; throw new Error('não foi possível carregar o motor de vídeo: ' + (e.message || e)); }
  }

  /* Corre ffmpeg sobre um ficheiro. buildArgs(inName, outName) devolve os argumentos. Devolve um Blob. */
  async function run(file, outExt, buildArgs, { onStatus, onProgress, mime } = {}) {
    const inst = await load(onStatus);
    const inExt = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const inName = 'in.' + inExt, outName = 'out.' + outExt;
    const logs = [];
    const onLog = ({ message }) => { logs.push(message); if (logs.length > 60) logs.shift(); };
    const onProg = ({ progress }) => onProgress && onProgress(Math.max(0, Math.min(1, progress)));
    inst.on('log', onLog); inst.on('progress', onProg);
    try {
      onStatus && onStatus('A ler o ficheiro...');
      await inst.writeFile(inName, await fetchFile(file));
      onStatus && onStatus('A processar...');
      const code = await inst.exec(buildArgs(inName, outName));
      if (code !== 0) throw new Error('ffmpeg terminou com erro. ' + (logs.filter(l => /error|invalid|no such|not found|unknown/i.test(l)).slice(-2).join(' ') || logs.slice(-2).join(' ')));
      const data = await inst.readFile(outName);
      if (!data || !data.length) throw new Error('o resultado veio vazio');
      return new Blob([data.buffer], { type: mime || 'application/octet-stream' });
    } finally {
      inst.off('log', onLog); inst.off('progress', onProg);
      try { await inst.deleteFile(inName); } catch (e) { /* ficheiro pode não existir se a escrita falhou */ }
      try { await inst.deleteFile(outName); } catch (e) { /* idem para o resultado */ }
    }
  }

  window.TMFF = { load, run };
})();
