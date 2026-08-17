// Przechowywanie infografik, sekwencji klatek (flipbook), wideo ćwiczeń i zdjęć sylwetki
// w IndexedDB (działa offline, bez backendu).
const MediaStore = (() => {
  const DB_NAME = 'forma60-media';
  const DB_VERSION = 2;
  const STORE = 'media';
  const PHOTOS_STORE = 'photos';
  let dbPromise = null;
  const urlCache = new Map();

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(PHOTOS_STORE)) {
          const store = db.createObjectStore(PHOTOS_STORE, { keyPath: 'id' });
          store.createIndex('profileId', 'profileId', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

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

  // ---- Sekwencje klatek (flipbook animacji z 2-4 zdjęć) ----
  async function saveFrames(code, files) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ id: id(code, 'frames'), code, kind: 'frames', blobs: Array.from(files), updatedAt: Date.now() });
      tx.oncomplete = () => { urlCache.delete(id(code, 'frames')); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getFrameURLs(code) {
    const key = id(code, 'frames');
    if (urlCache.has(key)) return urlCache.get(key);
    const rec = await get(code, 'frames');
    if (!rec || !rec.blobs || !rec.blobs.length) return null;
    const urls = rec.blobs.map(b => URL.createObjectURL(b));
    urlCache.set(key, urls);
    return urls;
  }

  async function removeFrames(code) {
    return remove(code, 'frames');
  }

  // ---- Zdjęcia sylwetki (przed/po) ----
  async function addPhoto(profileId, dateStr, file) {
    const db = await openDB();
    const photoId = uid();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTOS_STORE, 'readwrite');
      tx.objectStore(PHOTOS_STORE).put({ id: photoId, profileId, date: dateStr, blob: file, mime: file.type, createdAt: Date.now() });
      tx.oncomplete = () => resolve(photoId);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getPhotos(profileId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTOS_STORE, 'readonly');
      const idx = tx.objectStore(PHOTOS_STORE).index('profileId');
      const req = idx.getAll(profileId);
      req.onsuccess = () => resolve((req.result || []).sort((a, b) => a.date.localeCompare(b.date)));
      req.onerror = () => reject(req.error);
    });
  }

  async function getPhotoURL(photo) {
    const key = 'photo__' + photo.id;
    if (urlCache.has(key)) return urlCache.get(key);
    const url = URL.createObjectURL(photo.blob);
    urlCache.set(key, url);
    return url;
  }

  async function removePhoto(photoId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTOS_STORE, 'readwrite');
      tx.objectStore(PHOTOS_STORE).delete(photoId);
      tx.oncomplete = () => { urlCache.delete('photo__' + photoId); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  }

  return {
    save, getURL, remove, has,
    saveFrames, getFrameURLs, removeFrames,
    addPhoto, getPhotos, getPhotoURL, removePhoto,
  };
})();
