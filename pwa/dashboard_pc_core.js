/**
 * dashboard_pc_core.js — Core PC Dashboard functions
 * Extracted from dashboard_pc.html inline script #3
 * Version: v5.13.0-phase36
 * Date: 2026-05-04
 *
 * Functions: getGAS_URL, updatePcVersionBadge, loadSection, loadDashboard, _doLogin
 * Globals: CHARTS, DASHBOARD_DATA, __DATA_SCHEMA, __ACTION_MAP
 */

'use strict';

// ===== CONFIG =====
// GAS_URL now delegates to api_client.js getGasUrl()
// Use function instead of const to always get latest URL (avoids cache issues)
function getGAS_URL() { return getGasUrl(); }
let CHARTS = {};
let DASHBOARD_DATA = null;

// ===== DATA SCHEMA & ACTION MAP (FOR AI_EXECUTOR) ====
window.__DATA_SCHEMA = {
  stock: ['product_id', 'name', 'qty', 'min_level'],
  job: ['job_id', 'status', 'technician', 'sla_due'],
  order: ['order_id', 'customer', 'total', 'status']
};
window.__ACTION_MAP = {
  getStockList: { api: 'getStockList', type: 'read' },
  updateJobStatus: { api: 'updateJobStatus', type: 'write' },
  posCheckout: { api: 'posCheckout', type: 'write' }
};

// Update PC version badge from version_config.js at runtime
function updatePcVersionBadge() {
  const badge = document.getElementById('version_badge');
  if (badge) {
    const version = window.COMPHONE_VERSION || window.__APP_VERSION || 'unknown';
    badge.textContent = version;
    badge.className = 'version-badge';
  }
}

// Auto-call on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updatePcVersionBadge);
} else {
  updatePcVersionBadge();
}

// ===== SECTION NAVIGATION WITH RENDERER ROUTING =====
function loadSection(sectionName) {
  console.log('[Dashboard] Loading section:', sectionName);
  
  // Hide all sections
  const sections = document.querySelectorAll('.dashboard-section, .section-content');
  sections.forEach(sec => sec.style.display = 'none');
  
  // Show target section
  const target = document.getElementById('section-' + sectionName) || 
                 document.getElementById(sectionName + '-section');
  if (target) {
    target.style.display = 'block';
  } else {
    console.warn('[Dashboard] Section not found:', sectionName);
  }
  
  // Update active nav
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(sectionName)) {
      item.classList.add('active');
    }
  });

  // ── Route: call appropriate render function ──
  const data = window.DASHBOARD_DATA || {};
  const main = document.getElementById('main-content');
  const renderers = {
    'dashboard':   () => { loadDashboardPage(); },
    'jobs':        () => { if (typeof renderJobsSection === 'function') { const c = document.getElementById('jobs-content'); if (c) c.innerHTML = renderJobsSection(data); } },
    'po':          () => { if (typeof renderPOSection === 'function') renderPOSection(data); },
    'inventory':   () => { if (typeof renderInventorySection === 'function') renderInventorySection(data); },
    'billing':     () => { if (typeof renderBillingSection === 'function') { const c = document.getElementById('billing-content') || document.getElementById('section-billing'); if (c) c.innerHTML = renderBillingSection(data); } },
    'warranty':    () => { if (typeof renderWarrantySection === 'function') { const c = document.getElementById('warranty-content') || document.getElementById('section-warranty'); if (c) c.innerHTML = renderWarrantySection(data); } },
    'revenue':     () => { if (typeof renderRevenueSection === 'function') renderRevenueSection(data); },
    'tax':         () => { if (main) main.innerHTML = '<div class="card-box"><h3><i class="bi bi-calculator"></i> ภาษี (VAT/WHT)</h3><p>คลิกปุ่มด้านล่างเพื่อเริ่มคำนวณ</p><button onclick="_showTaxCalculator()" style="background:#059669;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px"><i class="bi bi-calculator"></i> เปิดเครื่องคิดเลขภาษี</button></div>'; },
    'reports':     () => { if (typeof renderReportsSection === 'function') { const c = document.getElementById('reports-content') || document.getElementById('section-reports'); if (c) c.innerHTML = renderReportsSection(data); } },
    'analytics':   () => { if (typeof renderAnalyticsSection === 'function') { const c = document.getElementById('analytics-content') || document.getElementById('section-analytics'); if (c) renderAnalyticsSection(data); } },
    'performance': () => { if (typeof renderPerformanceSection === 'function') renderPerformanceSection(data); },
    'backup':      () => { if (typeof renderBackupSection === 'function') renderBackupSection(); },
    'crm':         () => { if (typeof renderCRMSection === 'function') renderCRMSection(data); },
    'attendance':  () => { if (typeof renderAttendanceSection === 'function') { const c = document.getElementById('attendance-content') || document.getElementById('section-attendance'); if (c) renderAttendanceSection(data); } },
    'settings':    () => { if (typeof renderSettingsSection === 'function') renderSettingsSection(); },
  };

  const renderer = renderers[sectionName];
  if (renderer) {
    try { renderer(); } catch(e) { console.error('[Dashboard] Render error:', sectionName, e); }
  }
}

function loadDashboard() {
  console.log('[Dashboard] Loading main dashboard...');
  loadSection('dashboard');
}

// ===== LOGIN HANDLER =====
function _doLogin(event) {
  event.preventDefault();
  console.log('[Dashboard] Attempting login...');
  
  const username = document.getElementById('login-user')?.value;
  const password = document.getElementById('login-pass')?.value;
  
  if (!username || !password) {
    alert('กรุณากรอก username และ password');
    return;
  }
  
  // Use getGasUrl() dynamically to avoid cached const URL
  const gasUrl = typeof getGasUrl === 'function' ? getGasUrl() : (window.GAS_CONFIG && window.GAS_CONFIG.url) || '';
  if (!gasUrl) {
    alert('GAS URL ไม่ได้ตั้งค่า');
    return;
  }
  
  const qs = new URLSearchParams({ action: 'loginUser', username: username, password: password, _t: Date.now() }).toString();
  const btn = document.querySelector('.login-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'กำลังเข้าสู่ระบบ...'; }
  
  fetch(gasUrl + '?' + qs, { redirect: 'follow' })
    .then(res => res.json())
    .then(res => {
      if (btn) { btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ'; }
      if (res.success || res.valid) {
        localStorage.setItem('comphone_auth_session', JSON.stringify(res));
        const loginOverlay = document.getElementById('login-overlay');
        if (loginOverlay) loginOverlay.style.display = 'none';
        loadDashboard();
      } else {
        alert('เข้าสู่ระบบไม่สำเร็จ: ' + (res.error || res.message || 'Unknown error'));
      }
    })
    .catch(err => {
      if (btn) { btn.disabled = false; btn.textContent = 'เข้าสู่ระบบ'; }
      console.error('[Login] Error:', err);
      alert('เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + err.message);
    });
}
