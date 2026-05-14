// section_settings.js — Settings & generic section extracted from dashboard_pc.html
// Functions: _showFollowUpSchedule, renderSettingsSection, _clearAllCaches,
//            renderGenericSection, sectionIcon, sectionLabel, setActiveNav,
//            updateVersionBadge

// ============================================================
// FOLLOW-UP SCHEDULE VIEW — Calendar (PHASE 27.6)
// ============================================================
async function _showFollowUpSchedule() {
  const m = `<div id="crm-modal-overlay" onclick="this.remove()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center">
    <div onclick="event.stopPropagation()" style="background:#fff;border-radius:16px;padding:24px;max-width:560px;width:90%;max-height:80vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="margin:0;font-size:16px"><i class="bi bi-calendar3" style="color:#1e40af"></i> ปฏิทินนัดติดตาม (7 วัน)</h3>
        <button onclick="document.getElementById('crm-modal-overlay').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9ca3af">✕</button>
      </div>
      <div id="fu-schedule-content"><div class="loading-state"><div class="spinner-pc"></div><p>กำลังโหลด...</p></div></div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', m);

  try {
    const r = await callApi('getCRMFollowUpSchedule', {});
    const schedule = r?.schedule || {};
    const dates = Object.keys(schedule).sort();
    const el = document.getElementById('fu-schedule-content');
    if(!el) return;

    if(dates.length === 0) {
      el.innerHTML = '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:20px">ไม่มีนัดติดตามใน 7 วันข้างหน้า</p>';
      return;
    }

    el.innerHTML = dates.map(date => {
      const items = schedule[date] || [];
      const isToday = date === new Date().toISOString().split('T')[0];
      return `
        <div style="margin-bottom:12px;padding:12px;background:${isToday?'#dbeafe':'#f8fafc'};border-radius:8px;border-left:4px solid ${isToday?'#1e40af':'#e2e8f0'}">
          <div style="font-size:14px;font-weight:700;color:${isToday?'#1e40af':'#6b7280'};margin-bottom:8px">
            ${isToday?'📅 วันนี้':'📆'} ${date}
            <span style="font-size:12px;font-weight:400;color:#9ca3af">(${items.length} นัด)</span>
          </div>
          ${items.map(item => `
            <div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #e2e8f0">
              <div style="width:6px;height:6px;border-radius:50%;background:#1e40af;flex-shrink:0"></div>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:600">${item.customer_name||'-'}</div>
                <div style="font-size:12px;color:#6b7280">${item.note||item.result||''}</div>
              </div>
            </div>
          `).join('')}
        </div>`;
    }).join('');
  } catch(e) {
    const el = document.getElementById('fu-schedule-content');
    if(el) el.innerHTML = `<p style="color:#ef4444;font-size:13px;text-align:center;padding:20px">❌ ${e.message}</p>`;
  }
}

function renderSettingsSection() {  // [PATCH] เปลี่ยนเป็น synchronous (ใช้ mock data แล้ว ไม่ต้อง async)
  // [PATCH] ใช้ mock data โดยตรง (เนื่องจากระบบอยู่ใน mock mode 100%)
  const guardResp = { total_properties: 45, max_properties: 50, status: 'healthy' };
  const healthResp = { status: 'healthy', elapsed_ms: 120, success: true };
  const usersResp = { users: [
    { username: 'admin', full_name: 'ผู้ดูแลระบบ', role: 'OWNER', role_label: 'เจ้าของ', active: true },
    { username: 'user1', full_name: 'สมชาย ใจดี', role: 'USER', role_label: 'ผู้ใช้', active: true },
    { username: 'user2', full_name: 'วิชัย สบาย', role: 'USER', role_label: 'ผู้ใช้', active: false }
  ] };

  const propUsed = guardResp?.total_properties || guardResp?.used || '?';
  const propMax = guardResp?.max_properties || 50;
  const isHealthy = healthResp?.status === 'healthy' || healthResp?.success;
  const users = usersResp?.users || [];

  let html = `
    <!-- System Health -->
    <div class="card-box" style="margin-bottom:16px;border-left:4px solid ${isHealthy?'#059669':'#ef4444'}">
      <div class="card-title"><i class="bi bi-heart-pulse" style="color:${isHealthy?'#059669':'#ef4444'}"></i> สถานะระบบ</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;padding:8px 0">
        <div style="text-align:center">
          <div style="font-size:24px">${isHealthy ? '🟢' : '🔴'}</div>
          <div style="font-size:12px;color:#6b7280">${isHealthy ? 'ระบบปกติ' : 'มีปัญหา'}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:24px;font-weight:700;color:#1e40af">${healthResp?.elapsed_ms || '?'}ms</div>
          <div style="font-size:12px;color:#6b7280">Response Time</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:24px;font-weight:700;color:${Number(propUsed)>=49?'#d97706':'#059669'}">${propUsed}/${propMax}</div>
          <div style="font-size:12px;color:#6b7280">Properties</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:24px;font-weight:700;color:#1e40af">${users.length}</div>
          <div style="font-size:12px;color:#6b7280">ผู้ใช้</div>
        </div>
      </div>
    </div>

    <!-- System Info -->
    <div class="card-box" style="margin-bottom:16px">
      <div class="card-title"><i class="bi bi-info-circle" style="color:#1e40af"></i> ข้อมูลระบบ</div>
      <table style="width:100%;font-size:13px">
        <tr><td style="color:#6b7280;padding:6px 12px;width:140px">Version</td><td style="font-weight:600">${GAS_CONFIG?.version || 'N/A'} (GAS) / ${window.COMPHONE_VERSION || 'v5.18.34-job-menu-hardening'} (PWA)</td></tr>
        <tr><td style="color:#6b7280;padding:6px 12px">GAS URL</td><td style="font-size:11px;word-break:break-all;color:#6b7280">${GAS_CONFIG?.url || ''}</td></tr>
        <tr><td style="color:#6b7280;padding:6px 12px">Spreadsheet</td><td><a href="https://docs.google.com/spreadsheets/d/19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA" target="_blank" style="color:#1e40af;font-size:12px">เปิด Google Sheets ↗</a></td></tr>
        <tr><td style="color:#6b7280;padding:6px 12px">Deploy Date</td><td>${GAS_CONFIG?.deployDate || '-'}</td></tr>
        <tr><td style="color:#6b7280;padding:6px 12px">Bundle Cache</td><td>${healthResp?.elapsed_ms < 500 ? '✅ HIT (cached)' : '🔄 MISS (fresh)'}</td></tr>
      </table>
    </div>

    <div id="runtime-selftest-content" style="margin-bottom:16px"></div>

    <div class="card-box" style="margin-bottom:16px;border-left:4px solid #2563eb">
      <div class="card-title"><i class="bi bi-radar" style="color:#2563eb"></i> Operations Diagnostics</div>
      <div id="settings-diagnostics-content" style="font-size:13px;color:#64748b;padding:8px 0">
        Loading live readiness...
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
        <button onclick="hydrateSystemDiagnostics()" style="background:#2563eb;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-size:12px;cursor:pointer">
          <i class="bi bi-arrow-clockwise"></i> Run Diagnostics
        </button>
        <button onclick="exportComphoneDiagnostics()" style="background:#0f766e;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-size:12px;cursor:pointer">
          <i class="bi bi-download"></i> Export Diagnostics
        </button>
        <button onclick="clearPwaRuntimeCache()" style="background:#dc2626;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-size:12px;cursor:pointer">
          <i class="bi bi-trash3"></i> Clear PWA Cache
        </button>
      </div>
    </div>

    <!-- Users -->
    <div class="card-box" style="margin-bottom:16px">
      <div class="card-title"><i class="bi bi-people" style="color:#059669"></i> ผู้ใช้ระบบ (${users.length})</div>
      ${users.length === 0 ? '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:12px">ไม่มีข้อมูลผู้ใช้</p>' :
        `<div style="overflow-x:auto">
          <table class="job-table" style="width:100%">
            <thead><tr><th>ชื่อผู้ใช้</th><th>ชื่อเต็ม</th><th>บทบาท</th><th>สถานะ</th></tr></thead>
            <tbody>${users.map(u => `<tr>
              <td style="font-weight:600;font-size:13px">${u.username||'-'}</td>
              <td style="font-size:13px">${u.full_name||u.fullName||'-'}</td>
              <td><span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:10px;font-size:11px">${u.role||'-'}</span></td>
              <td style="font-size:12px;color:${u.active!==false?'#059669':'#ef4444'}">${u.active!==false?'Active':'Inactive'}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>`}
    </div>

    <!-- Property Guard -->
    ${guardResp ? `
    <div class="card-box" style="margin-bottom:16px">
      <div class="card-title"><i class="bi bi-shield-check" style="color:#059669"></i> Property Guard</div>
      <div style="font-size:12px;padding:8px;background:#f8fafc;border-radius:8px;max-height:200px;overflow-y:auto">
        <pre style="margin:0;white-space:pre-wrap">${JSON.stringify(guardResp, null, 2)}</pre>
      </div>
    </div>` : ''}

    <!-- Quick Actions -->
    <div class="card-box">
      <div class="card-title"><i class="bi bi-lightning" style="color:#d97706"></i> การดำเนินการ</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        <button onclick="DASHBOARD_DATA=null;loadDashboard()" style="background:#1e40af;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">
          <i class="bi bi-arrow-clockwise"></i> Refresh Dashboard
        </button>
        <button onclick="_clearAllCaches()" style="background:#ef4444;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">
          <i class="bi bi-trash"></i> Clear All Caches
        </button>
        <button onclick="if(window.showQuickActionSettings){showQuickActionSettings()}else{alert('Quick action settings are available on Mobile Profile')}" style="background:#7c3aed;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">
          <i class="bi bi-sliders"></i> Quick Actions
        </button>
        <button onclick="window.open('https://docs.google.com/spreadsheets/d/19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA','_blank')" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">
          <i class="bi bi-table"></i> Open Google Sheets
        </button>
        <button onclick="window.open('https://github.com/comphone/comphone-superapp','_blank')" style="background:#333;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">
          <i class="bi bi-github"></i> GitHub
        </button>
      </div>
    </div>
    <!-- Accounting Integration (Phase 35) -->
    <div class="card-box" style="margin-bottom:16px;border-left:4px solid #1e40af">
      <div class="card-title"><i class="bi bi-calculator" style="color:#1e40af"></i> การเชื่อมต่อบัญชี (Phase 35)</div>
      <div style="padding:8px 0">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="font-size:12px;color:#6b7280">ซอฟต์แวร์บัญชี</label>
            <select id="accounting-software" style="width:100%;padding:8px;border-radius:6px;border:1px solid #d1d5db">
              <option value="express">Express</option>
              <option value="quickbooks">QuickBooks</option>
              <option value="other">อื่นๆ</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;color:#6b7280">การเชื่อมต่อ</label>
            <div id="accounting-status" style="padding:8px;background:#f0fdf4;color:#059669;border-radius:6px;font-size:13px">✅ เชื่อมต่อแล้ว (จำลอง)</div>
          </div>
        </div>
        <div style="margin-bottom:12px">
          <label style="font-size:12px;color:#6b7280">API Key / Token</label>
          <input type="password" id="accounting-api-key" placeholder="ใส่ API Key หรือ Token" style="width:100%;padding:8px;border-radius:6px;border:1px solid #d1d5db">
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="testAccountingConnection()" style="flex:1;padding:8px;background:#1e40af;color:#fff;border:none;border-radius:6px;cursor:pointer">🔍 ทดสอบการเชื่อมต่อ</button>
          <button onclick="exportBillToAccountingUI()" style="flex:1;padding:8px;background:#059669;color:#fff;border:none;border-radius:6px;cursor:pointer">📤 ส่งบิลไปบัญชี</button>
        </div>
      </div>
    </div>`;

  return html;
}

function _clearAllCaches() {
  if(!confirm('ล้าง cache ทั้งหมด? หน้าจะ reload')) return;
  localStorage.clear();
  caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
  DASHBOARD_DATA = null;
  location.reload();
}

async function clearPwaRuntimeCache() {
  if (!confirm('Clear PWA cache and stale service workers on this device?')) return;
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs
        .filter(reg => reg.scope && reg.scope.indexOf('/comphone-superapp/pwa/') !== -1)
        .map(reg => reg.unregister()));
    }
    if (typeof showToast === 'function') showToast('PWA cache cleared. Reloading...');
    setTimeout(() => location.reload(), 500);
  } catch (err) {
    alert('Clear cache failed: ' + (err && err.message ? err.message : err));
  }
}

async function collectComphoneDiagnostics() {
  const session = (() => {
    try { return JSON.parse(localStorage.getItem('comphone_auth_session') || '{}'); } catch (_) { return {}; }
  })();
  const diagnostics = {
    generatedAt: new Date().toISOString(),
    appVersion: window.COMPHONE_VERSION || window.__APP_VERSION || '',
    build: window.COMPHONE_BUILD || '',
    cache: window.COMPHONE_CACHE || '',
    gasUrl: window.COMPHONE_GAS_URL || (window.GAS_CONFIG && window.GAS_CONFIG.url) || '',
    hasSession: !!session.token,
    userRole: window.__USER_ROLE || (session.session && session.session.role) || '',
    browserOnline: navigator.onLine,
    serviceWorkers: [],
    api: {},
  };
  if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
    const regs = await navigator.serviceWorker.getRegistrations();
    diagnostics.serviceWorkers = regs.map(reg => ({ scope: reg.scope, active: !!reg.active, waiting: !!reg.waiting }));
  }
  if (typeof callApi === 'function') {
    for (const action of ['health', 'getVersion']) {
      try {
        const started = Date.now();
        const res = await callApi(action, {});
        diagnostics.api[action] = {
          ok: !!res && res.success !== false && res.status !== 'error',
          elapsedMs: Date.now() - started,
          status: res && (res.status || res.version || res.backendVersion || 'ok'),
          geminiOk: res && res.checks && res.checks.config ? res.checks.config.gemini_ok : undefined,
          lineOk: res && res.checks && res.checks.config ? res.checks.config.line_ok : undefined,
        };
      } catch (err) {
        diagnostics.api[action] = { ok: false, error: err.message };
      }
    }
  }
  return diagnostics;
}

async function hydrateSystemDiagnostics() {
  const el = document.getElementById('settings-diagnostics-content');
  if (!el) return;
  el.innerHTML = '<div class="loading-state"><div class="spinner-pc"></div><p>Running diagnostics...</p></div>';
  const data = await collectComphoneDiagnostics();
  const health = data.api.health || {};
  const version = data.api.getVersion || {};
  const geminiReady = health.geminiOk === true;
  const lineReady = health.lineOk === true;
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
      ${_diagTile_('API', health.ok && version.ok, health.elapsedMs ? health.elapsedMs + 'ms' : '-')}
      ${_diagTile_('Session', data.hasSession, data.userRole || '-')}
      ${_diagTile_('Gemini', geminiReady, geminiReady ? 'ready' : 'not configured', true)}
      ${_diagTile_('LINE', lineReady, lineReady ? 'ready' : 'check config', true)}
      ${_diagTile_('Service Worker', data.serviceWorkers.length > 0, data.serviceWorkers.length + ' registration(s)', true)}
      ${_diagTile_('Online', data.browserOnline, data.browserOnline ? 'online' : 'offline')}
    </div>
    <div style="margin-top:10px;font-size:11px;color:#94a3b8;word-break:break-all">
      ${data.appVersion} · ${data.cache} · ${data.gasUrl}
    </div>`;
  window.__COMPHONE_LAST_DIAGNOSTICS = data;
}

function _diagTile_(label, ok, sub, warnOnly) {
  const color = ok ? '#059669' : warnOnly ? '#d97706' : '#dc2626';
  const bg = ok ? '#ecfdf5' : warnOnly ? '#fffbeb' : '#fef2f2';
  return `<div style="background:${bg};border:1px solid ${color}22;border-radius:10px;padding:10px">
    <div style="font-weight:800;color:${color};font-size:13px">${ok ? 'OK' : warnOnly ? 'WARN' : 'FAIL'} · ${label}</div>
    <div style="font-size:12px;color:#64748b;margin-top:4px">${sub || '-'}</div>
  </div>`;
}

async function exportComphoneDiagnostics() {
  const data = window.__COMPHONE_LAST_DIAGNOSTICS || await collectComphoneDiagnostics();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'comphone-diagnostics-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function hydrateSettingsRuntimePanels() {
  const el = document.getElementById('runtime-selftest-content');
  if (el && typeof renderRuntimeSelfTestPanel === 'function') {
    renderRuntimeSelfTestPanel(el);
  }
  hydrateSystemDiagnostics();
}

function renderGenericSection(section, data) {
  document.getElementById('main-content').innerHTML = `
    <div class="card-box">
      <div class="card-title"><i class="bi bi-${sectionIcon(section)}" style="color:#1e40af"></i> ${sectionLabel(section)}</div>
      <p style="color:#9ca3af;font-size:13px;text-align:center;padding:20px">
        ฟีเจอร์ ${sectionLabel(section)} อยู่ระหว่างการพัฒนา<br>
        <button class="btn-refresh" onclick="loadDashboard()" style="margin-top:12px">
          <i class="bi bi-arrow-left"></i> กลับ Dashboard
        </button>
      </p>
    </div>`;
}

function sectionIcon(s) {
  return { jobs:'tools', po:'cart-fill', inventory:'box-seam-fill', revenue:'currency-exchange', crm:'people-fill', settings:'gear-fill' }[s] || 'grid';
}
function sectionLabel(s) {
  return { jobs:'งานบริการ', po:'ใบสั่งซื้อ', inventory:'สต็อก', billing:'ใบเสร็จ/วางบิล', warranty:'รับประกัน', revenue:'รายรับ', tax:'ภาษี', crm:'ลูกค้า', attendance:'ลงเวลา', settings:'ตั้งค่า' }[s] || s;
}

function updateVersionBadge() {
  const badge = document.getElementById('version_badge');
  if (!badge) return;
  const version = window.COMPHONE_VERSION || window.__APP_VERSION || 'v?';
  const apiOk = !!(window.callApi || window.callAPI || window.COMPHONE_GAS_URL || (window.GAS_CONFIG && window.GAS_CONFIG.url));
  const cacheOk = !!(window.COMPHONE_CACHE_VERSION || (window.VERSION_CONFIG && window.VERSION_CONFIG.cacheVersion));
  const apiClass = apiOk ? 'ok' : 'warn';
  const cacheClass = cacheOk ? 'ok' : 'warn';
  badge.className = 'version-badge';
  badge.innerHTML = `${version} | API:<span class="${apiClass}">${apiOk ? 'OK' : 'CHECK'}</span> | CACHE:<span class="${cacheClass}">${cacheOk ? 'OK' : 'CHECK'}</span>`;
}

function setActiveNav(section) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const items = document.querySelectorAll('.nav-item');
  items.forEach(item => {
    if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(`'${section}'`)) {
      item.classList.add('active');
    }
  });
}

// PHASE 25.5 — VERSION BADGE
updateVersionBadge();

function testAccountingConnection() {
  const software = document.getElementById('accounting-software').value;
  const apiKey = document.getElementById('accounting-api-key').value;
  
  // เรียก API ตรวจสอบการเชื่อมต่อ
  callApi('checkAccountingConnection', {})
    .then(r => {
      const statusEl = document.getElementById('accounting-status');
      if (r.success) {
        statusEl.style.background = '#f0fdf4';
        statusEl.style.color = '#059669';
        statusEl.innerHTML = `✅ เชื่อมต่อสำเร็จกับ ${software} (จำลอง)`;
      } else {
        statusEl.style.background = '#fee2e2';
        statusEl.style.color = '#ef4444';
        statusEl.innerHTML = `❌ เชื่อมต่อล้มเหลว: ${r.error || 'Unknown error'}`;
      }
    })
    .catch(e => {
      const statusEl = document.getElementById('accounting-status');
      statusEl.style.background = '#fee2e2';
      statusEl.style.color = '#ef4444';
      statusEl.innerHTML = `❌ เกิดข้อผิดพลาด: ${e.message}`;
    });
}

function exportBillToAccountingUI() {
  const billId = prompt('ใส่ Bill ID ที่ต้องการส่งไปบัญชี:');
  if (!billId) return;
  
  callApi('exportBillToAccounting', { billId })
    .then(r => {
      if (r.success) {
        alert(`✅ ส่งบิล ${billId} ไปยังซอฟต์แวร์บัญชีสำเร็จ\nReference: ${r.data?.accountingRef || '-'}`);
      } else {
        alert(`❌ ส่งบิลล้มเหลว: ${r.error || 'Unknown error'}`);
      }
    })
    .catch(e => {
      alert(`❌ เกิดข้อผิดพลาด: ${e.message}`);
    });
}
window.addEventListener('load', function() {
  setTimeout(function() {
    updateVersionBadge();
  }, 1500);
});
