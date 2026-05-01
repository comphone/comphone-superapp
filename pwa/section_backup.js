/**
 * Backup & Recovery Section — Phase 34 Frontend
 * Renders Backup & Recovery UI in PC Dashboard Admin Panel
 * Version: v5.12.0-phase34
 * Date: 2026-05-01
 */

let BACKUP_CHART = null;

/**
 * Render Backup & Recovery Section
 */
function renderBackupSection() {
  const container = document.getElementById('main-content');
  if (!container) return;
  
  container.innerHTML = `
    <div class="section-header">
      <h2 data-i18n="Backup & Recovery">สำรองข้อมูลและกู้คืน</h2>
      <div class="section-actions">
        <button class="btn-refresh" onclick="loadBackupData()">
          <i class="bi bi-arrow-clockwise"></i> <span data-i18n="Refresh">รีเฟรช</span>
        </button>
        <button class="btn-pwa" style="background:#10b981;" onclick="createBackupNow()">
          <i class="bi bi-cloud-upload"></i> <span data-i18n="Create Backup">สำรองข้อมูลเดี๋ยวนี้</span>
        </button>
      </div>
    </div>
    
    <!-- Health Status -->
    <div id="backup-health" class="card-box" style="margin-bottom:16px;">
      <div class="card-title">
        <i class="bi bi-heart-pulse"></i> <span data-i18n="Backup Health Status">สถานะสุขภาพการสำรองข้อมูล</span>
      </div>
      <div id="health-status-content">
        <div class="loading-state">
          <div class="spinner-pc"></div>
          <p data-i18n="Checking backup health...">กำลังตรวจสอบสุขภาพ...</p>
        </div>
      </div>
    </div>
    
    <!-- Backup List -->
    <div class="card-box">
      <div class="card-title">
        <i class="bi bi-clock-history"></i> <span data-i18n="Backup History">ประวัติการสำรองข้อมูล</span>
        <span class="badge-count" id="backup-count">0</span>
      </div>
      <div id="backup-list-content">
        <div class="loading-state">
          <div class="spinner-pc"></div>
          <p data-i18n="Loading backups...">กำลังโหลดข้อมูลการสำรอง...</p>
        </div>
      </div>
    </div>
    
    <!-- Restore Modal -->
    <div id="restore-modal" class="modal-overlay hidden" onclick="closeRestoreModal()">
      <div class="modal-sheet" onclick="event.stopPropagation()" style="padding:0 0 24px;">
        <div class="modal-handle"></div>
        <div class="modal-title" data-i18n="Restore from Backup">กู้คืนข้อมูลจากสำรอง</div>
        <div style="padding:0 16px;">
          <div id="restore-backup-name" style="font-weight:600;margin-bottom:12px;"></div>
          <p data-i18n="Restore Warning" style="color:#ef4444;font-size:13px;margin-bottom:16px;">
            ⚠️ คำเตือน: การกู้คืนจะเขียนทับข้อมูลปัจจุบันทั้งหมด กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการ
          </p>
          <button class="btn-setup" style="background:#ef4444;width:100%;" onclick="confirmRestore()">
            <i class="bi bi-cloud-download"></i> <span data-i18n="Confirm Restore">ยืนยันการกู้คืน</span>
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Apply translations
  if (window.LanguageManager && window.LanguageManager.applyTranslations) {
    setTimeout(() => window.LanguageManager.applyTranslations(), 100);
  }
  
  // Load data
  loadBackupData();
}

/**
 * Load Backup Data (Health + List)
 */
async function loadBackupData() {
  try {
    // Load health status
    const healthResult = await callGas('checkBackupHealth');
    renderHealthStatus(healthResult);
    
    // Load backup list
    const listResult = await callGas('listBackups');
    if (listResult && listResult.success) {
      renderBackupList(listResult.backups || []);
    }
  } catch (e) {
    console.error('[Backup] Error loading data:', e);
  }
}

/**
 * Render Health Status
 */
function renderHealthStatus(result) {
  const container = document.getElementById('health-status-content');
  if (!container) return;
  
  if (!result || !result.success) {
    container.innerHTML = `
      <div style="color:#ef4444;padding:12px;">
        <i class="bi bi-exclamation-triangle"></i> 
        <span data-i18n="Health check failed">การตรวจสอบล้มเหลว</span>: ${result?.error || 'Unknown error'}
      </div>
    `;
    return;
  }
  
  const health = result.health || {};
  const status = health.status || 'UNKNOWN';
  const statusColor = {
    'HEALTHY': '#10b981',
    'WARNING': '#f59e0b',
    'CRITICAL': '#ef4444',
    'ERROR': '#ef4444'
  }[status] || '#6b7280';
  
  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
      <div style="width:12px;height:12px;border-radius:50%;background:${statusColor};"></div>
      <div style="font-weight:700;font-size:16px;color:${statusColor};">${status}</div>
      <div style="margin-left:auto;font-size:12px;color:#6b7280;">
        <span data-i18n="Last check">ตรวจสอบล่าสุด</span>: ${new Date().toLocaleString('th-TH')}
      </div>
    </div>
    <div class="grid-2" style="gap:12px;">
      <div class="info-row">
        <span class="info-label" data-i18n="Latest Backup">สำรองล่าสุด</span>:
        <span class="info-value">${health.latest_backup ? health.latest_backup.name : '-'}</span>
      </div>
      <div class="info-row">
        <span class="info-label" data-i18n="Hours Since Last">ชั่วโมงที่ผ่านมา</span>:
        <span class="info-value">${health.hours_since_last || 0} <span data-i18n="hours">ชั่วโมง</span></span>
      </div>
      <div class="info-row">
        <span class="info-label" data-i18n="Total Backups">จำนวนสำรองทั้งหมด</span>:
        <span class="info-value">${health.total_backups || 0}</span>
      </div>
      <div class="info-row">
        <span class="info-label" data-i18n="Issues">ปัญหา</span>:
        <span class="info-value">${(health.issues || []).length} <span data-i18n="issues">รายการ</span></span>
      </div>
    </div>
    ${(health.issues || []).length > 0 ? `
    <div style="margin-top:12px;padding:10px;background:#fef2f2;border-radius:8px;">
      <div style="font-weight:600;color:#ef4444;margin-bottom:8px;" data-i18n="Issues found">พบปัญหา:</div>
      ${(health.issues || []).map(issue => `<div style="font-size:12px;color:#991b1b;">• ${issue}</div>`).join('')}
    </div>
    ` : ''}
  `;
}

/**
 * Render Backup List
 */
function renderBackupList(backups) {
  const container = document.getElementById('backup-list-content');
  const countBadge = document.getElementById('backup-count');
  if (!container) return;
  
  if (countBadge) countBadge.textContent = backups.length;
  
  if (backups.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:24px;color:#6b7280;">
        <i class="bi bi-inbox" style="font-size:2rem;display:block;margin-bottom:8px;"></i>
        <span data-i18n="No backups found">ไม่พบรายการสำรองข้อมูล</span>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <table class="job-table">
      <thead>
        <tr>
          <th data-i18n="Backup Name">ชื่อสำรอง</th>
          <th data-i18n="Created">วันที่สร้าง</th>
          <th data-i18n="Sheets Backed Up">ชีทที่สำรอง</th>
          <th data-i18n="Actions">การดำเนินการ</th>
        </tr>
      </thead>
      <tbody>
        ${backups.map((backup, idx) => `
        <tr>
          <td>
            <div style="font-weight:600;">${backup.name}</div>
            <div style="font-size:11px;color:#6b7280;">ID: ${backup.id.substring(0, 20)}...</div>
          </td>
          <td>${backup.created ? new Date(backup.created).toLocaleString('th-TH') : '-'}</td>
          <td>${backup.metadata?.sheets_backed_up || 0} <span data-i18n="sheets">ชีท</span></td>
          <td>
            <button class="btn-setup" style="padding:5px 10px;font-size:12px;" onclick="showRestoreModal('${backup.id}', '${backup.name}')">
              <i class="bi bi-cloud-download"></i> <span data-i18n="Restore">กู้คืน</span>
            </button>
            <a href="${backup.url || backup.metadata?.folder_url || '#'}" target="_blank" style="margin-left:8px;">
              <button class="btn-setup" style="padding:5px 10px;font-size:12px;background:#6b7280;">
                <i class="bi bi-box-arrow-up-right"></i> <span data-i18n="Open">เปิด</span>
              </button>
            </a>
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Create Backup Now
 */
async function createBackupNow() {
  if (!confirm('คุณแน่ใจหรือไม่ที่จะสำรองข้อมูลเดี๋ยวนี้?')) return;
  
  try {
    const result = await callGas('createBackup');
    if (result && result.success) {
      alert('✅ ' + (result.message || 'สำรองข้อมูลสำเร็จ'));
      loadBackupData();
    } else {
      alert('❌ ' + (result?.error || 'สำรองข้อมูลล้มเหลว'));
    }
  } catch (e) {
    alert('❌ Error: ' + e.message);
  }
}

/**
 * Show Restore Modal
 */
function showRestoreModal(backupId, backupName) {
  window.__RESTORE_BACKUP_ID__ = backupId;
  const nameEl = document.getElementById('restore-backup-name');
  if (nameEl) {
    nameEl.textContent = backupName || 'Unknown';
  }
  const modal = document.getElementById('restore-modal');
  if (modal) modal.classList.remove('hidden');
}

/**
 * Close Restore Modal
 */
function closeRestoreModal() {
  const modal = document.getElementById('restore-modal');
  if (modal) modal.classList.add('hidden');
  window.__RESTORE_BACKUP_ID__ = null;
}

/**
 * Confirm Restore
 */
async function confirmRestore() {
  const backupId = window.__RESTORE_BACKUP_ID__;
  if (!backupId) return;
  
  if (!confirm('คุณแน่ใจหรือไม่ที่จะกู้คืนข้อมูลจากสำรองนี้? การกระทำนี้ไม่สามารถย้อนกลับได้!')) return;
  
  try {
    const result = await callGas('restoreBackup', { backupId: backupId });
    if (result && result.success) {
      alert('✅ ' + (result.message || 'กู้คืนข้อมูลสำเร็จ'));
      closeRestoreModal();
      loadBackupData();
    } else {
      alert('❌ ' + (result?.error || 'กู้คืนข้อมูลล้มเหลว'));
    }
  } catch (e) {
    alert('❌ Error: ' + e.message);
  }
}

/**
 * Register Backup section in loadSection
 */
if (typeof window.SECTION_REGISTRY === 'undefined') {
  window.SECTION_REGISTRY = {};
}
window.SECTION_REGISTRY['backup'] = renderBackupSection;

console.log('[Backup Section] Loaded');
