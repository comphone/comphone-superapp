// ============================================================
// offline_db_v2.js — Enhanced Offline Mode V2
// COMPHONE SUPER APP V5.13.0-phase35
// Phase 35.2: Mobile Offline Mode V2
// ============================================================

'use strict';

const OFFLINE_DB_V2 = {
  db: null,
  DB_NAME: 'comphone_offline_v2',
  DB_VERSION: 3,
  STORES: {
    QUEUE: 'action_queue',
    CACHE: 'data_cache',
    JOBS: 'offline_jobs',
    CUSTOMERS: 'offline_customers',
    INVENTORY: 'offline_inventory',
    SYNC_LOG: 'sync_log'
  },
  syncing: false,
  maxRetries: 5,
  retryDelay: 1000
};

// ===== INIT DATABASE =====
async function initOfflineDBV2() {
  return new Promise((resolve, reject) => {
    if (OFFLINE_DB_V2.db) { resolve(OFFLINE_DB_V2.db); return; }

    const req = indexedDB.open(OFFLINE_DB_V2.DB_NAME, OFFLINE_DB_V2.DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      const oldVersion = e.oldVersion;

      // Store 1: action_queue (existing)
      if (!db.objectStoreNames.contains(OFFLINE_DB_V2.STORES.QUEUE)) {
        const store = db.createObjectStore(OFFLINE_DB_V2.STORES.QUEUE, {
          keyPath: 'id',
          autoIncrement: true
        });
        store.createIndex('by_time', 'time', { unique: false });
        store.createIndex('by_status', 'status', { unique: false });
        store.createIndex('by_action', 'action', { unique: false });
      }

      // Store 2: data_cache (existing)
      if (!db.objectStoreNames.contains(OFFLINE_DB_V2.STORES.CACHE)) {
        const cacheStore = db.createObjectStore(OFFLINE_DB_V2.STORES.CACHE, {
          keyPath: 'key'
        });
        cacheStore.createIndex('by_expires', 'expires', { unique: false });
      }

      // Store 3: offline_jobs (NEW - V2)
      if (!db.objectStoreNames.contains(OFFLINE_DB_V2.STORES.JOBS)) {
        const jobsStore = db.createObjectStore(OFFLINE_DB_V2.STORES.JOBS, {
          keyPath: 'id'
        });
        jobsStore.createIndex('by_status', 'status', { unique: false });
        jobsStore.createIndex('by_created', 'createdAt', { unique: false });
        jobsStore.createIndex('by_customer', 'customer_phone', { unique: false });
      }

      // Store 4: offline_customers (NEW - V2)
      if (!db.objectStoreNames.contains(OFFLINE_DB_V2.STORES.CUSTOMERS)) {
        const custStore = db.createObjectStore(OFFLINE_DB_V2.STORES.CUSTOMERS, {
          keyPath: 'phone'
        });
        custStore.createIndex('by_name', 'name', { unique: false });
      }

      // Store 5: offline_inventory (NEW - V2)
      if (!db.objectStoreNames.contains(OFFLINE_DB_V2.STORES.INVENTORY)) {
        const invStore = db.createObjectStore(OFFLINE_DB_V2.STORES.INVENTORY, {
          keyPath: 'item_code'
        });
        invStore.createIndex('by_qty', 'qty', { unique: false });
      }

      // Store 6: sync_log (NEW - V2)
      if (!db.objectStoreNames.contains(OFFLINE_DB_V2.STORES.SYNC_LOG)) {
        const syncStore = db.createObjectStore(OFFLINE_DB_V2.STORES.SYNC_LOG, {
          keyPath: 'id',
          autoIncrement: true
        });
        syncStore.createIndex('by_time', 'timestamp', { unique: false });
      }
    };

    req.onsuccess = (e) => {
      OFFLINE_DB_V2.db = e.target.result;
      console.log('[OfflineDB V2] Initialized successfully');
      resolve(OFFLINE_DB_V2.db);
    };

    req.onerror = (e) => {
      console.error('[OfflineDB V2] Init error:', e.target.error);
      reject(e.target.error);
    };
  });
}

// ===== OFFLINE JOB CREATION (V2 NEW) =====
async function createOfflineJob(jobData) {
  try {
    const db = await initOfflineDBV2();
    const tx = db.transaction(OFFLINE_DB_V2.STORES.JOBS, 'readwrite');
    const store = tx.objectStore(OFFLINE_DB_V2.STORES.JOBS);

    // Generate temp ID for offline job
    const tempId = 'OFFLINE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const job = {
      id: tempId,
      customer_name: jobData.customer_name || 'ลูกค้าไม่ระบุ',
      customer_phone: jobData.customer_phone || '',
      device: jobData.device || '',
      symptom: jobData.symptom || jobData.title || 'อาการไม่ระบุ',
      status: 'OFFLINE_PENDING',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isOffline: true,
      ...jobData
    };

    await new Promise((res, rej) => {
      const req = store.put(job);
      req.onsuccess = res;
      req.onerror = rej;
    });

    // Also add to sync queue
    await saveOfflineActionV2({
      action: 'createJob',
      params: job,
      type: 'job_creation',
      offlineId: tempId
    });

    showToast('💾 บันทึกงาน offline แล้ว (จะ sync เมื่อออนไลน์)');
    updateOfflineBadgeV2();
    
    return { success: true, jobId: tempId, offline: true };
  } catch (err) {
    console.error('[OfflineDB V2] Create job error:', err);
    showToast('❌ ไม่สามารถบันทึกงาน offline ได้', 'error');
    return { success: false, error: err.message };
  }
}

// ===== OFFLINE JOB VIEWING (V2 NEW) =====
async function getOfflineJobs(filters = {}) {
  try {
    const db = await initOfflineDBV2();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_DB_V2.STORES.JOBS, 'readonly');
      const store = tx.objectStore(OFFLINE_DB_V2.STORES.JOBS);
      const req = store.getAll();

      req.onsuccess = () => {
        let jobs = req.result || [];
        
        // Apply filters
        if (filters.status) {
          jobs = jobs.filter(j => j.status === filters.status);
        }
        if (filters.phone) {
          jobs = jobs.filter(j => j.customer_phone === filters.phone);
        }
        
        // Sort by createdAt descending
        jobs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        resolve(jobs);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[OfflineDB V2] Get jobs error:', err);
    return [];
  }
}

// ===== OFFLINE CUSTOMER CACHE (V2 NEW) =====
async function cacheCustomerV2(customer) {
  try {
    const db = await initOfflineDBV2();
    const tx = db.transaction(OFFLINE_DB_V2.STORES.CUSTOMERS, 'readwrite');
    const store = tx.objectStore(OFFLINE_DB_V2.STORES.CUSTOMERS);
    
    await new Promise((res, rej) => {
      const req = store.put({
        ...customer,
        cachedAt: Date.now()
      });
      req.onsuccess = res;
      req.onerror = rej;
    });
  } catch (err) {
    console.warn('[OfflineDB V2] Cache customer error:', err);
  }
}

async function getOfflineCustomer(phone) {
  try {
    const db = await initOfflineDBV2();
    return new Promise((resolve) => {
      const tx = db.transaction(OFFLINE_DB_V2.STORES.CUSTOMERS, 'readonly');
      const store = tx.objectStore(OFFLINE_DB_V2.STORES.CUSTOMERS);
      const req = store.get(phone);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

// ===== OFFLINE INVENTORY CACHE (V2 NEW) =====
async function cacheInventoryItemV2(item) {
  try {
    const db = await initOfflineDBV2();
    const tx = db.transaction(OFFLINE_DB_V2.STORES.INVENTORY, 'readwrite');
    const store = tx.objectStore(OFFLINE_DB_V2.STORES.INVENTORY);
    
    await new Promise((res, rej) => {
      const req = store.put({
        ...item,
        cachedAt: Date.now()
      });
      req.onsuccess = res;
      req.onerror = rej;
    });
  } catch (err) {
    console.warn('[OfflineDB V2] Cache inventory error:', req);
  }
}

async function getOfflineInventory(itemCode) {
  try {
    const db = await initOfflineDBV2();
    return new Promise((resolve) => {
      const tx = db.transaction(OFFLINE_DB_V2.STORES.INVENTORY, 'readonly');
      const store = tx.objectStore(OFFLINE_DB_V2.STORES.INVENTORY);
      const req = store.get(itemCode);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

// ===== ENHANCED QUEUE (V2) =====
async function saveOfflineActionV2(actionData) {
  try {
    const db = await initOfflineDBV2();
    const tx = db.transaction(OFFLINE_DB_V2.STORES.QUEUE, 'readwrite');
    const store = tx.objectStore(OFFLINE_DB_V2.STORES.QUEUE);

    const record = {
      action: actionData.action || actionData.type || 'unknown',
      params: actionData.params || actionData,
      type: actionData.type || 'general',
      offlineId: actionData.offlineId || null,
      status: 'pending',
      retries: 0,
      maxRetries: OFFLINE_DB_V2.maxRetries,
      time: actionData.time || Date.now(),
      createdAt: Date.now()
    };

    await new Promise((res, rej) => {
      const req = store.add(record);
      req.onsuccess = (e) => {
        record.id = e.target.result;
        res(record);
      };
      req.onerror = rej;
    });

    updateOfflineBadgeV2();

    // Auto-sync if online
    if (navigator.onLine) {
      setTimeout(syncOfflineQueueV2, 500);
    }

    return record;
  } catch (err) {
    console.error('[OfflineDB V2] Save action error:', err);
    return null;
  }
}

// ===== ENHANCED SYNC (V2) =====
async function syncOfflineQueueV2() {
  if (OFFLINE_DB_V2.syncing || !navigator.onLine) return;
  OFFLINE_DB_V2.syncing = true;

  try {
    const pending = await getPendingActionsV2();
    if (pending.length === 0) {
      OFFLINE_DB_V2.syncing = false;
      return;
    }

    showOfflineBar(true, `🔄 กำลัง Sync ${pending.length} รายการ...`);
    
    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (const item of pending) {
      if (item.retries >= item.maxRetries) {
        await updateActionStatusV2(item.id, 'failed', 'Max retries exceeded');
        failCount++;
        continue;
      }

      try {
        await updateActionStatusV2(item.id, 'syncing');
        
        // Special handling for offline-created jobs
        if (item.action === 'createJob' && item.offlineId) {
          const result = await syncOfflineJobV2(item);
          if (result.success) {
            await updateActionStatusV2(item.id, 'done');
            successCount++;
          } else {
            await updateActionStatusV2(item.id, 'failed', result.error);
            failCount++;
          }
        } else {
          // Normal API call
          const res = await callApi(item.action, item.params || {});
          
          if (res && res.success) {
            await updateActionStatusV2(item.id, 'done');
            successCount++;
          } else {
            const errMsg = (res && res.error) || 'API returned failure';
            await updateActionStatusV2(item.id, 'failed', errMsg);
            failCount++;
          }
        }
      } catch (err) {
        await updateActionStatusV2(item.id, 'failed', err.message);
        failCount++;
      }

      // Delay between requests
      await new Promise(r => setTimeout(r, 300));
    }

    // Log sync results
    await logSyncV2({
      timestamp: Date.now(),
      total: pending.length,
      success: successCount,
      failed: failCount,
      skipped: skipCount
    });

    // Show results
    if (successCount > 0) {
      showToast(`✅ Sync สำเร็จ ${successCount} รายการ${failCount > 0 ? ` (ล้มเหลว ${failCount})` : ''}`);
    }
    if (failCount > 0) {
      showToast(`⚠️ มีรายการที่ sync ไม่สำเร็จ ${failCount} รายการ`, 'warning');
    }

    updateOfflineBadgeV2();
    showOfflineBar(false);

  } catch (err) {
    console.error('[OfflineDB V2] Sync error:', err);
  } finally {
    OFFLINE_DB_V2.syncing = false;
  }
}

// ===== SYNC OFFLINE JOB (V2 NEW) =====
async function syncOfflineJobV2(queueItem) {
  try {
    const db = await initOfflineDBV2();
    
    // Get the offline job data
    const job = await new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_DB_V2.STORES.JOBS, 'readonly');
      const store = tx.objectStore(OFFLINE_DB_V2.STORES.JOBS);
      const req = store.get(queueItem.offlineId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!job) {
      return { success: false, error: 'Offline job not found' };
    }

    // Call API to create job
    const res = await callApi('createJob', {
      customer_name: job.customer_name,
      customer_phone: job.customer_phone,
      device: job.device,
      symptom: job.symptom,
      ...job.params
    });

    if (res && res.success) {
      // Mark offline job as synced
      await new Promise((resolve) => {
        const tx = db.transaction(OFFLINE_DB_V2.STORES.JOBS, 'readwrite');
        const store = tx.objectStore(OFFLINE_DB_V2.STORES.JOBS);
        job.status = 'SYNCED';
        job.syncedAt = Date.now();
        job.serverId = res.job_id || res.id;
        store.put(job);
        tx.oncomplete = resolve;
      });
      return { success: true };
    } else {
      return { success: false, error: (res && res.error) || 'Unknown error' };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ===== GET PENDING ACTIONS (V2) =====
async function getPendingActionsV2() {
  try {
    const db = await initOfflineDBV2();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_DB_V2.STORES.QUEUE, 'readonly');
      const store = tx.objectStore(OFFLINE_DB_V2.STORES.QUEUE);
      const idx = store.index('by_status');
      const req = idx.getAll('pending');
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return [];
  }
}

// ===== UPDATE ACTION STATUS (V2) =====
async function updateActionStatusV2(id, status, error) {
  try {
    const db = await initOfflineDBV2();
    const tx = db.transaction(OFFLINE_DB_V2.STORES.QUEUE, 'readwrite');
    const store = tx.objectStore(OFFLINE_DB_V2.STORES.QUEUE);

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
    console.warn('[OfflineDB V2] updateActionStatus error:', err);
  }
}

// ===== SYNC LOG (V2 NEW) =====
async function logSyncV2(logData) {
  try {
    const db = await initOfflineDBV2();
    const tx = db.transaction(OFFLINE_DB_V2.STORES.SYNC_LOG, 'readwrite');
    const store = tx.objectStore(OFFLINE_DB_V2.STORES.SYNC_LOG);
    
    await new Promise((res, rej) => {
      const req = store.add(logData);
      req.onsuccess = res;
      req.onerror = rej;
    });
  } catch (err) {
    console.warn('[OfflineDB V2] logSync error:', err);
  }
}

async function getSyncLogV2(limit = 50) {
  try {
    const db = await initOfflineDBV2();
    return new Promise((resolve) => {
      const tx = db.transaction(OFFLINE_DB_V2.STORES.SYNC_LOG, 'readonly');
      const store = tx.objectStore(OFFLINE_DB_V2.STORES.SYNC_LOG);
      const idx = store.index('by_time');
      const req = idx.openCursor(null, 'prev');
      
      const logs = [];
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor && logs.length < limit) {
          logs.push(cursor.value);
          cursor.continue();
        } else {
          resolve(logs);
        }
      };
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    return [];
  }
}

// ===== BADGE UPDATE (V2) =====
async function updateOfflineBadgeV2() {
  try {
    const pending = await getPendingActionsV2();
    const offlineJobs = await getOfflineJobs();
    const total = pending.length + offlineJobs.filter(j => j.status === 'OFFLINE_PENDING').length;
    
    // Update UI badge
    const bar = document.getElementById('offline-bar');
    if (bar) {
      const countEl = bar.querySelector('.offline-queue-count');
      if (countEl) {
        countEl.textContent = total > 0 ? `(${total} รายการรอ Sync)` : '';
      }
    }

    // Update app badge if supported
    if ('setAppBadge' in navigator) {
      navigator.setAppBadge(total > 0 ? total : 0);
    }
  } catch (err) {
    console.warn('[OfflineDB V2] updateBadge error:', err);
  }
}

// ===== STATS (V2) =====
async function getOfflineStatsV2() {
  try {
    const db = await initOfflineDBV2();
    return new Promise((resolve) => {
      const tx = db.transaction([
        OFFLINE_DB_V2.STORES.QUEUE,
        OFFLINE_DB_V2.STORES.JOBS,
        OFFLINE_DB_V2.STORES.CUSTOMERS,
        OFFLINE_DB_V2.STORES.INVENTORY
      ], 'readonly');
      
      const results = {};
      let completed = 0;
      const total = 4;

      const checkDone = () => {
        completed++;
        if (completed === total) {
          resolve(results);
        }
      };

      // Queue stats
      const queueStore = tx.objectStore(OFFLINE_DB_V2.STORES.QUEUE);
      const queueReq = queueStore.getAll();
      queueReq.onsuccess = () => {
        const all = queueReq.result || [];
        results.queue = {
          total: all.length,
          pending: all.filter(i => i.status === 'pending').length,
          done: all.filter(i => i.status === 'done').length,
          failed: all.filter(i => i.status === 'failed').length
        };
        checkDone();
      };

      // Jobs stats
      const jobsStore = tx.objectStore(OFFLINE_DB_V2.STORES.JOBS);
      const jobsReq = jobsStore.getAll();
      jobsReq.onsuccess = () => {
        const all = jobsReq.result || [];
        results.jobs = {
          total: all.length,
          pending: all.filter(j => j.status === 'OFFLINE_PENDING').length,
          synced: all.filter(j => j.status === 'SYNCED').length
        };
        checkDone();
      };

      // Customers stats
      const custStore = tx.objectStore(OFFLINE_DB_V2.STORES.CUSTOMERS);
      const custReq = custStore.getAll();
      custReq.onsuccess = () => {
        results.customers = (custReq.result || []).length;
        checkDone();
      };

      // Inventory stats
      const invStore = tx.objectStore(OFFLINE_DB_V2.STORES.INVENTORY);
      const invReq = invStore.getAll();
      invReq.onsuccess = () => {
        results.inventory = (invReq.result || []).length;
        checkDone();
      };
    });
  } catch (err) {
    return { queue: {}, jobs: {}, customers: 0, inventory: 0 };
  }
}

// ===== CLEANUP (V2) =====
async function cleanOfflineDataV2(olderThanDays = 30) {
  try {
    const db = await initOfflineDBV2();
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    // Clean old synced jobs
    const jobsTx = db.transaction(OFFLINE_DB_V2.STORES.JOBS, 'readwrite');
    const jobsStore = jobsTx.objectStore(OFFLINE_DB_V2.STORES.JOBS);
    const jobsReq = jobsStore.getAll();
    jobsReq.onsuccess = () => {
      const jobs = jobsReq.result || [];
      jobs.forEach(job => {
        if (job.status === 'SYNCED' && job.syncedAt < cutoff) {
          jobsStore.delete(job.id);
        }
      });
    };

    // Clean old sync log
    const logTx = db.transaction(OFFLINE_DB_V2.STORES.SYNC_LOG, 'readwrite');
    const logStore = logTx.objectStore(OFFLINE_DB_V2.STORES.SYNC_LOG);
    const logIdx = logStore.index('by_time');
    const range = IDBKeyRange.upperBound(cutoff);
    const logReq = logIdx.openCursor(range);
    logReq.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    showToast(`🧹 ทำความสะอาดข้อมูล offline เกิน ${olderThanDays} วันแล้ว`);
  } catch (err) {
    console.warn('[OfflineDB V2] cleanup error:', err);
  }
}

// ===== NETWORK LISTENERS (V2) =====
window.addEventListener('online', () => {
  showOfflineBar(false);
  
  // Clear old toasts
  const existing = document.getElementById('toast-network');
  if (existing) existing.remove();
  
  const t = document.createElement('div');
  t.id = 'toast-network';
  t.className = 'toast-msg';
  t.textContent = '🌐 ออนไลน์แล้ว — กำลัง Sync...';
  document.body.appendChild(t);
  setTimeout(() => { t.remove(); }, 2500);
  
  // Start sync with delay
  setTimeout(syncOfflineQueueV2, 1000);
});

window.addEventListener('offline', () => {
  showOfflineBar(true, '📴 ออฟไลน์ — ระบบบันทึกแบบ offline');
});

// ===== INIT ON LOAD (V2) =====
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initOfflineDBV2();
    console.log('[OfflineDB V2] Ready');
    
    // Clean expired cache
    const db = OFFLINE_DB_V2.db;
    if (db) {
      const tx = db.transaction(OFFLINE_DB_V2.STORES.CACHE, 'readwrite');
      const store = tx.objectStore(OFFLINE_DB_V2.STORES.CACHE);
      const idx = store.index('by_expires');
      const range = IDBKeyRange.upperBound(Date.now());
      const req = idx.openCursor(range);
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) { cursor.delete(); cursor.continue(); }
      };
    }
    
    updateOfflineBadgeV2();
    
    // Auto sync if online
    if (navigator.onLine) {
      setTimeout(syncOfflineQueueV2, 2000);
    }
  } catch (err) {
    console.error('[OfflineDB V2] Init failed:', err);
  }
});

// ===== EXPORT FOR USE =====
window.createOfflineJob = createOfflineJob;
window.getOfflineJobs = getOfflineJobs;
window.cacheCustomerV2 = cacheCustomerV2;
window.getOfflineCustomer = getOfflineCustomer;
window.cacheInventoryItemV2 = cacheInventoryItemV2;
window.getOfflineInventory = getOfflineInventory;
window.syncOfflineQueueV2 = syncOfflineQueueV2;
window.getOfflineStatsV2 = getOfflineStatsV2;
window.cleanOfflineDataV2 = cleanOfflineDataV2;
