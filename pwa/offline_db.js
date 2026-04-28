// ============================================================
// offline_db.js — IndexedDB Offline Queue & Sync Engine
// COMPHONE SUPER APP V5.5
// แทนที่ localStorage ด้วย IndexedDB สำหรับ offline actions
// ============================================================

'use strict';

const OFFLINE_DB = {
  db: null,
  DB_NAME: 'comphone_offline',
  DB_VERSION: 2,  // v2: match SW version
  STORE_QUEUE: 'action_queue',
  STORE_CACHE: 'data_cache',
  syncing: false,
};

// ===== INIT =====
async function initOfflineDB() {
  return new Promise((resolve, reject) => {
    if (OFFLINE_DB.db) { resolve(OFFLINE_DB.db); return; }

    const req = indexedDB.open(OFFLINE_DB.DB_NAME, OFFLINE_DB.DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Store 1: action_queue — คิว actions ที่รอ sync
      if (!db.objectStoreNames.contains(OFFLINE_DB.STORE_QUEUE)) {
        const store = db.createObjectStore(OFFLINE_DB.STORE_QUEUE, {
          keyPath: 'id', autoIncrement: true
        });
        store.createIndex('by_time', 'time', { unique: false });
        store.createIndex('by_status', 'status', { unique: false });
      }

      // Store 2: data_cache — cache ข้อมูลจาก GAS API
      if (!db.objectStoreNames.contains(OFFLINE_DB.STORE_CACHE)) {
        const cacheStore = db.createObjectStore(OFFLINE_DB.STORE_CACHE, {
          keyPath: 'key'
        });
        cacheStore.createIndex('by_expires', 'expires', { unique: false });
      }
    };

    req.onsuccess = (e) => {
      OFFLINE_DB.db = e.target.result;
      resolve(OFFLINE_DB.db);
    };

    req.onerror = (e) => {
      console.error('[OfflineDB] Init error:', e.target.error);
      reject(e.target.error);
    };
  });
}

// ===== QUEUE: เพิ่ม Action เข้า Queue =====
async function saveOfflineAction(actionData) {
  try {
    const db = await initOfflineDB();
    const tx = db.transaction(OFFLINE_DB.STORE_QUEUE, 'readwrite');
    const store = tx.objectStore(OFFLINE_DB.STORE_QUEUE);

    const record = {
      action: actionData.action || actionData.type || 'unknown',
      params: actionData.params || actionData,
      status: 'pending',     // pending | syncing | done | failed
      retries: 0,
      maxRetries: 3,
      time: actionData.time || Date.now(),
      createdAt: Date.now()
    };

    await new Promise((res, rej) => {
      const req = store.add(record);
      req.onsuccess = res;
      req.onerror = rej;
    });

    // อัปเดต badge count
    updateOfflineBadge_();

    // พยายาม sync ทันทีถ้าออนไลน์
    if (navigator.onLine) {
      setTimeout(syncOfflineQueueLegacy, 500);
    }

  } catch (err) {
    // Fallback: localStorage
    console.warn('[OfflineDB] Fallback to localStorage:', err);
    const queue = JSON.parse(localStorage.getItem('comphone_offline_queue') || '[]');
    queue.push({ ...actionData, time: Date.now() });
    localStorage.setItem('comphone_offline_queue', JSON.stringify(queue));
  }
}

// ===== QUEUE: ดึง pending actions ทั้งหมด =====
async function getPendingActions() {
  try {
    const db = await initOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_DB.STORE_QUEUE, 'readonly');
      const store = tx.objectStore(OFFLINE_DB.STORE_QUEUE);
      const idx = store.index('by_status');
      const req = idx.getAll('pending');
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // Fallback: localStorage
    const queue = JSON.parse(localStorage.getItem('comphone_offline_queue') || '[]');
    return queue.map((item, i) => ({ id: i, ...item, status: 'pending' }));
  }
}

// ===== QUEUE: อัปเดตสถานะ action =====
async function updateActionStatus_(id, status, error) {
  try {
    const db = await initOfflineDB();
    const tx = db.transaction(OFFLINE_DB.STORE_QUEUE, 'readwrite');
    const store = tx.objectStore(OFFLINE_DB.STORE_QUEUE);

    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const record = getReq.result;
      if (!record) return;
      record.status = status;
      if (error) record.lastError = error;
      if (status === 'failed') record.retries = (record.retries || 0) + 1;
      if (status === 'done') record.syncedAt = Date.now();
      store.put(record);
    };
  } catch (err) {
    console.warn('[OfflineDB] updateActionStatus error:', err);
  }
}

// ===== SYNC: Replay pending actions ไปยัง GAS =====
async function syncOfflineQueueLegacy() {
  if (OFFLINE_DB.syncing || !navigator.onLine) return;
  OFFLINE_DB.syncing = true;

  try {
    const pending = await getPendingActions();
    if (pending.length === 0) {
      OFFLINE_DB.syncing = false;
      return;
    }

    showOfflineBar(true, `กำลัง Sync ${pending.length} รายการ...`);

    let successCount = 0;
    let failCount = 0;

    for (const item of pending) {
      if (item.retries >= item.maxRetries) {
        await updateActionStatus_(item.id, 'failed', 'Max retries exceeded');
        failCount++;
        continue;
      }

      try {
        await updateActionStatus_(item.id, 'syncing');

        // เรียก GAS API
        const res = await callAPI(item.action, item.params || {});

        if (res && res.success) {
          await updateActionStatus_(item.id, 'done');
          successCount++;
        } else {
          const errMsg = (res && res.error) || 'API returned failure';
          await updateActionStatus_(item.id, 'failed', errMsg);
          failCount++;
        }
      } catch (err) {
        await updateActionStatus_(item.id, 'failed', err.message);
        failCount++;
      }

      // หน่วงเวลาเล็กน้อยระหว่าง requests
      await new Promise(r => setTimeout(r, 300));
    }

    // แสดงผลลัพธ์
    if (successCount > 0) {
      showToast(`✅ Sync สำเร็จ ${successCount} รายการ${failCount > 0 ? ` (ล้มเหลว ${failCount})` : ''}`);
    }

    updateOfflineBadge_();
    showOfflineBar(false);

  } catch (err) {
    console.error('[OfflineDB] Sync error:', err);
  } finally {
    OFFLINE_DB.syncing = false;
  }
}

// ===== CACHE: บันทึก API response ลง cache =====
async function cacheAPIResponse(key, data, ttlMinutes = 30) {
  try {
    const db = await initOfflineDB();
    const tx = db.transaction(OFFLINE_DB.STORE_CACHE, 'readwrite');
    const store = tx.objectStore(OFFLINE_DB.STORE_CACHE);

    store.put({
      key,
      data,
      cachedAt: Date.now(),
      expires: Date.now() + (ttlMinutes * 60 * 1000)
    });
  } catch (err) {
    console.warn('[OfflineDB] Cache write error:', err);
  }
}

// ===== CACHE: ดึงข้อมูลจาก cache =====
async function getCachedData(key) {
  try {
    const db = await initOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(OFFLINE_DB.STORE_CACHE, 'readonly');
      const store = tx.objectStore(OFFLINE_DB.STORE_CACHE);
      const req = store.get(key);
      req.onsuccess = () => {
        const record = req.result;
        if (!record) { resolve(null); return; }
        if (Date.now() > record.expires) { resolve(null); return; } // expired
        resolve(record.data);
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

// ===== CACHE: ล้าง cache ที่หมดอายุ =====
async function cleanExpiredCache() {
  try {
    const db = await initOfflineDB();
    const tx = db.transaction(OFFLINE_DB.STORE_CACHE, 'readwrite');
    const store = tx.objectStore(OFFLINE_DB.STORE_CACHE);
    const idx = store.index('by_expires');
    const range = IDBKeyRange.upperBound(Date.now());
    const req = idx.openCursor(range);
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) { cursor.delete(); cursor.continue(); }
    };
  } catch (err) {
    console.warn('[OfflineDB] cleanExpiredCache error:', err);
  }
}

// ===== BADGE: อัปเดต offline queue count =====
async function updateOfflineBadge_() {
  try {
    const pending = await getPendingActions();
    const count = pending.length;
    // แสดงใน offline bar หรือ badge
    const bar = document.getElementById('offline-bar');
    if (bar && count > 0) {
      const countEl = bar.querySelector('.offline-queue-count');
      if (countEl) countEl.textContent = `(${count} รายการรอ Sync)`;
    }
  } catch (err) {
    // ignore
  }
}

// ===== STATS: ดูสถิติ queue =====
async function getQueueStats() {
  try {
    const db = await initOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(OFFLINE_DB.STORE_QUEUE, 'readonly');
      const store = tx.objectStore(OFFLINE_DB.STORE_QUEUE);
      const req = store.getAll();
      req.onsuccess = () => {
        const all = req.result || [];
        resolve({
          total: all.length,
          pending: all.filter(i => i.status === 'pending').length,
          done: all.filter(i => i.status === 'done').length,
          failed: all.filter(i => i.status === 'failed').length
        });
      };
      req.onerror = () => resolve({ total: 0, pending: 0, done: 0, failed: 0 });
    });
  } catch (err) {
    return { total: 0, pending: 0, done: 0, failed: 0 };
  }
}

// ===== MIGRATE: ย้ายข้อมูลจาก localStorage ไป IndexedDB =====
async function migrateLocalStorageQueue() {
  const lsQueue = localStorage.getItem('comphone_offline_queue');
  if (!lsQueue) return;

  try {
    const items = JSON.parse(lsQueue);
    if (!Array.isArray(items) || items.length === 0) return;

    for (const item of items) {
      await saveOfflineAction(item);
    }

    localStorage.removeItem('comphone_offline_queue');
    console.log('[OfflineDB] Migrated', items.length, 'items from localStorage');
  } catch (err) {
    console.warn('[OfflineDB] Migration error:', err);
  }
}

// ===== NETWORK LISTENER =====
let networkToastTimer = null;
window.addEventListener('online', () => {
  showOfflineBar(false);
  // เคลียร์ toast เก่าก่อนแสดงใหม่ (ป้องกันซ้อน)
  if (networkToastTimer) clearTimeout(networkToastTimer);
  const existing = document.getElementById('toast-network');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.id = 'toast-network';
  t.className = 'toast-msg';
  t.textContent = '🌐 ออนไลน์แล้ว — กำลัง Sync...';
  document.body.appendChild(t);
  networkToastTimer = setTimeout(() => { t.remove(); networkToastTimer = null; }, 2500);
  setTimeout(syncOfflineQueueLegacy, 1000);
});

window.addEventListener('offline', () => {
  showOfflineBar(true, 'ออฟไลน์ — บันทึกไว้ใน Queue');
});

// ===== INIT ON LOAD =====
document.addEventListener('DOMContentLoaded', async () => {
  await initOfflineDB();
  await migrateLocalStorageQueue();
  await cleanExpiredCache();

  // Sync ทันทีถ้าออนไลน์
  if (navigator.onLine) {
    setTimeout(syncOfflineQueueLegacy, 2000);
  }
});
