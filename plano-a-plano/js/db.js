// Armazenamento local (IndexedDB): projetos e ficheiros de áudio.
// Tudo fica no dispositivo — funciona offline no set.
const DB = (() => {
  const NAME = 'plano-a-plano';
  let dbp;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('sem IndexedDB'));
      let req;
      try { req = indexedDB.open(NAME, 1); } catch (e) { return reject(e); }
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('projects', { keyPath: 'id' });
        db.createObjectStore('audio');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }

  // Se o browser bloquear o IndexedDB (ex.: pré-visualização), usa memória e avisa.
  const mem = { projects: new Map(), audio: new Map() };
  let memoryOnly = false;
  function memTx(store, fn) {
    const m = mem[store];
    const s = {
      getAll: () => ({ result: [...m.values()].map(v => structuredClone(v)) }),
      get: k => ({ result: m.has(k) ? (store === 'audio' ? m.get(k) : structuredClone(m.get(k))) : undefined }),
      put: (v, k) => { m.set(k ?? v.id, store === 'audio' ? v : structuredClone(v)); return {}; },
      delete: k => { m.delete(k); return {}; },
    };
    return Promise.resolve(fn(s).result);
  }

  async function tx(store, mode, fn) {
    if (memoryOnly) return memTx(store, fn);
    let db;
    try { db = await open(); }
    catch {
      memoryOnly = true;
      setTimeout(() => window.dispatchEvent(new CustomEvent('pap-notice', { detail: 'Este visualizador não deixa guardar dados: o projeto perde-se ao fechar. Abre o ficheiro no Chrome/Safari para guardar.' })), 500);
      return memTx(store, fn);
    }
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const req = fn(t.objectStore(store));
      t.oncomplete = () => resolve(req && req.result);
      t.onerror = () => reject(t.error);
    });
  }

  return {
    listProjects: () => tx('projects', 'readonly', s => s.getAll()),
    getProject: id => tx('projects', 'readonly', s => s.get(id)),
    saveProject: p => tx('projects', 'readwrite', s => s.put(p)),
    deleteProject: id => tx('projects', 'readwrite', s => s.delete(id)),
    getAudio: id => tx('audio', 'readonly', s => s.get(id)),
    saveAudio: (id, blob) => tx('audio', 'readwrite', s => s.put(blob, id)),
    deleteAudio: id => tx('audio', 'readwrite', s => s.delete(id)),
  };
})();
