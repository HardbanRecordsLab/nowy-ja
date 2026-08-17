// Przechowywanie infografik i wideo ćwiczeń w IndexedDB (działa offline, bez backendu).
const MediaStore = (() => {
  const DB_NAME = 'forma60-media';
  const STORE = 'media';
  let dbPromise = null;
  const urlCache = new Map();

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function id(code, kind) { return `${code}__${kind}`; }

  async function save(code, kind, file) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ id: id(code, kind), code, kind, blob: file, mime: file.type, updatedAt: Date.now() });
      tx.oncomplete = () => { urlCache.delete(id(code, kind)); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  }

  async function get(code, kind) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id(code, kind));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function getURL(code, kind) {
    const key = id(code, kind);
    if (urlCache.has(key)) return urlCache.get(key);
    const rec = await get(code, kind);
    if (!rec) return null;
    const url = URL.createObjectURL(rec.blob);
    urlCache.set(key, url);
    return url;
  }

  async function remove(code, kind) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id(code, kind));
      tx.oncomplete = () => { urlCache.delete(id(code, kind)); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  }

  async function has(code, kind) {
    const rec = await get(code, kind);
    return !!rec;
  }

  return { save, getURL, remove, has };
})();
