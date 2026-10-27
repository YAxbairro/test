// Armazenamento local (IndexedDB): projetos e ficheiros de áudio.
// Tudo fica no dispositivo — funciona offline no set.
const DB = (() => {
  const NAME = 'plano-a-plano';
  let dbp;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, 1);
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

  async function tx(store, mode, fn) {
    const db = await open();
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
