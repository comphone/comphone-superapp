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
    const r = await callGas('getCRMFollowUpSchedule', {});
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

async function renderSettingsSection() {
  document.getElementById('main-content').innerHTML = `
    <div class="loading-state">
      <div class="spinner-pc"></div>
      <p>กำลังโหลดการตั้งค่า...</p>
    </div>`;

  // Fetch all settings data in parallel
  const [guardResp, healthResp, usersResp] = await Promise.all([
    callGas('guardstatus').catch(()=>null),
    callGas('healthCheck').catch(()=>null),
    callGas('listUsers').catch(()=>null)
  ]);

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
        <tr><td style="color:#6b7280;padding:6px 12px;width:140px">Version</td><td style="font-weight:600">v${(GAS_CONFIG?.version || '491')} (GAS) / v5.6.8 (PWA)</td></tr>
        <tr><td style="color:#6b7280;padding:6px 12px">GAS URL</td><td style="font-size:11px;word-break:break-all;color:#6b7280">${GAS_URL||''}</td></tr>
        <tr><td style="color:#6b7280;padding:6px 12px">Spreadsheet</td><td><a href="https://docs.google.com/spreadsheets/d/19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA" target="_blank" style="color:#1e40af;font-size:12px">เปิด Google Sheets ↗</a></td></tr>
        <tr><td style="color:#6b7280;padding:6px 12px">Deploy Date</td><td>${GAS_CONFIG?.deployDate || '-'}</td></tr>
        <tr><td style="color:#6b7280;padding:6px 12px">Bundle Cache</td><td>${healthResp?.elapsed_ms < 500 ? '✅ HIT (cached)' : '🔄 MISS (fresh)'}</td></tr>
      </table>
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
        <button onclick="window.open('https://docs.google.com/spreadsheets/d/19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA','_blank')" style="background:#059669;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">
          <i class="bi bi-table"></i> Open Google Sheets
        </button>
        <button onclick="window.open('https://github.com/comphone/comphone-superapp','_blank')" style="background:#333;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">
          <i class="bi bi-github"></i> GitHub
        </button>
      </div>
    </div>`;

  document.getElementById('main-content').innerHTML = html;
}

function _clearAllCaches() {
  if(!confirm('ล้าง cache ทั้งหมด? หน้าจะ reload')) return;
  localStorage.clear();
  caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
  DASHBOARD_DATA = null;
  location.reload();
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
(function updateVersionBadge() {
  const badge = document.getElementById('version_badge');
  if (!badge) return;
  const aiOk = !!(window.AI_EXECUTOR && window.AI_EXECUTOR.execute);
  const lockOk = !!(window.__TRUSTED_ACTIONS && Object.keys(window.__TRUSTED_ACTIONS).length > 0);
  const aiClass = aiOk ? 'ok' : 'err';
  const lockClass = lockOk ? 'ok' : 'err';
  badge.innerHTML = `${window.__APP_VERSION || 'v?'} | AI:<span class="${aiClass}">${aiOk?'OK':'FAIL'}</span> | LOCK:<span class="${lockClass}">${lockOk?'OK':'FAIL'}</span>`;
})();
window.addEventListener('load', function() {
  setTimeout(function() {
    const badge = document.getElementById('version_badge');
    if (!badge) return;
    const aiOk = !!(window.AI_EXECUTOR && window.AI_EXECUTOR.execute);
    const lockOk = !!(window.__TRUSTED_ACTIONS && Object.keys(window.__TRUSTED_ACTIONS).length > 0);
    const aiClass = aiOk ? 'ok' : 'err';
    const lockClass = lockOk ? 'ok' : 'err';
    badge.innerHTML = `${window.__APP_VERSION || 'v?'} | AI:<span class="${aiClass}">${aiOk?'OK':'FAIL'}</span> | LOCK:<span class="${lockClass}">${lockOk?'OK':'FAIL'}</span>`;
  }, 1500);
});
