// Native zero-dependency IndexedDB storage for chat image attachments
// Prevents image attachments from consuming LocalStorage 5MB quota and breaking persistence.

const DB_NAME = 'loreforge_media_db'
const STORE_NAME = 'chat_images'
const DB_VERSION = 1

// In-memory fallback for environments without IndexedDB (e.g. Node.js tests)
const memoryFallback = new Map()
// Track keys confirmed to be written in storage to avoid redundant writes
const persistedKeys = new Set()

function isIndexedDBAvailable() {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined' && window.indexedDB !== null
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      return reject(new Error('IndexedDB unavailable'))
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export const imageStorage = {
  isKeyPersisted(key) {
    if (!key) return false
    return persistedKeys.has(key) || memoryFallback.has(key)
  },

  async hasImage(key) {
    if (!key) return false
    if (this.isKeyPersisted(key)) return true
    if (!isIndexedDBAvailable()) return false
    try {
      const db = await openDB()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.count(key)
        req.onsuccess = () => {
          const exists = req.result > 0
          if (exists) persistedKeys.add(key)
          resolve(exists)
        }
        req.onerror = () => resolve(false)
      })
    } catch {
      return false
    }
  },

  async saveImage(key, dataUrl) {
    if (!key || !dataUrl) return false
    if (!isIndexedDBAvailable()) {
      memoryFallback.set(key, dataUrl)
      persistedKeys.add(key)
      return true
    }
    try {
      const db = await openDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const req = store.put(dataUrl, key)
        req.onsuccess = () => {
          persistedKeys.add(key)
          resolve(true)
        }
        req.onerror = () => reject(req.error)
      })
    } catch (e) {
      console.warn('Failed to save image in IndexedDB, using memory fallback:', e)
      memoryFallback.set(key, dataUrl)
      persistedKeys.add(key)
      return true
    }
  },

  async getImage(key) {
    if (!key) return null
    if (!isIndexedDBAvailable() || memoryFallback.has(key)) {
      const item = memoryFallback.get(key) || null
      if (item) persistedKeys.add(key)
      return item
    }
    try {
      const db = await openDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.get(key)
        req.onsuccess = () => {
          const result = req.result || memoryFallback.get(key) || null
          if (result) persistedKeys.add(key)
          resolve(result)
        }
        req.onerror = () => reject(req.error)
      })
    } catch (e) {
      console.warn('Failed to get image from IndexedDB:', e)
      return memoryFallback.get(key) || null
    }
  },

  async deleteImage(key) {
    if (!key) return false
    persistedKeys.delete(key)
    memoryFallback.delete(key)
    if (!isIndexedDBAvailable()) return true
    try {
      const db = await openDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const req = store.delete(key)
        req.onsuccess = () => resolve(true)
        req.onerror = () => reject(req.error)
      })
    } catch {
      return false
    }
  },

  async deleteImages(keys = []) {
    if (!Array.isArray(keys) || keys.length === 0) return true
    const validKeys = keys.filter(Boolean)
    for (const key of validKeys) {
      persistedKeys.delete(key)
      memoryFallback.delete(key)
    }
    if (!isIndexedDBAvailable()) return true
    try {
      const db = await openDB()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        for (const key of validKeys) {
          store.delete(key)
        }
        tx.oncomplete = () => resolve(true)
        tx.onerror = () => resolve(false)
      })
    } catch {
      return false
    }
  },
}
