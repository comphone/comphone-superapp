/* ===== BUSINESS AI MODULE — COMPHONE SUPER APP v5.6 PHASE 27 ===== */
'use strict';

// ============================================================
// AI TECH COMPANION
// ============================================================
function openAICompanion() {
  showModal('modal-ai-companion', `
    <div class="modal-title">🤖 AI Tech Companion</div>
    <div style="padding:0 16px">
      <div id="ai-chat-history" style="max-height:300px;overflow-y:auto;margin-bottom:12px;background:#f9fafb;border-radius:12px;padding:12px;font-size:13px">
        <div style="color:#6b7280;text-align:center;padding:20px">คุณสามารถถามเรื่องซ่อม วิธีแก้ไข หรือประวัติการซ่อมได้</div>
      </div>
      <div style="display:flex;gap:8px">
        <input type="text" id="ai-question-input" placeholder="เช่น อาการซ่อมจอบาดทำยังไง?" style="flex:1;border:1.5px solid #e5e7eb;border-radius:12px;padding:10px 14px;font-size:13px" onkeydown="if(event.key==='Enter')sendAIQuestion()">
        <button class="btn-setup" onclick="sendAIQuestion()" style="padding:10px 16px"><i class="bi bi-send-fill"></i></button>
      </div>
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
        <button onclick="quickAsk('อาการซ่อมล่าสุด')" class="chip-btn">อาการล่าสุด</button>
        <button onclick="quickAsk('วิธีแก้ไขช่าง')" class="chip-btn">วิธีแก้ไข</button>
        <button onclick="quickAsk('ช่างที่เคยทำงานนี้')" class="chip-btn">ช่างที่เคยทำ</button>
      </div>
    </div>
  `);
}

function quickAsk(q) {
  document.getElementById('ai-question-input').value = q;
  sendAIQuestion();
}

async function sendAIQuestion() {
  const input = document.getElementById('ai-question-input');
  const q = input.value.trim();
  if (!q) return;
  input.value = '';

  const history = document.getElementById('ai-chat-history');
  history.innerHTML += `<div style="text-align:right;margin:6px 0"><span style="background:#dbeafe;color:#1e40af;padding:6px 12px;border-radius:12px 12px 0 12px;display:inline-block;font-size:13px">${escapeHtml(q)}</span></div>`;
  history.scrollTop = history.scrollHeight;

  showLoadingInChat();
  try {
    const res = await window.GAS_EXECUTE('askAI', { question: q, context: {} });
    removeLoadingInChat();
    if (res && res.success && res.data) {
      history.innerHTML += `<div style="margin:6px 0"><span style="background:#f3f4f6;color:#374151;padding:6px 12px;border-radius:12px 12px 12px 0;display:inline-block;font-size:13px;white-space:pre-wrap">${escapeHtml(res.data.answer)}</span></div>`;
      if (res.data.confidence < 0.5) {
        history.innerHTML += `<div style="font-size:11px;color:#d97706;margin-top:4px">⚠️ ความมั่นใจต่ำ — กรุณาตรวจสอบกับช่าง</div>`;
      }
    } else {
      history.innerHTML += `<div style="margin:6px 0"><span style="background:#fee2e2;color:#991b1b;padding:6px 12px;border-radius:12px 12px 12px 0;display:inline-block;font-size:13px">${escapeHtml(res && res.error ? res.error : 'ไม่สามารถตอบได้')}</span></div>`;
    }
  } catch (err) {
    removeLoadingInChat();
    history.innerHTML += `<div style="margin:6px 0"><span style="background:#fee2e2;color:#991b1b;padding:6px 12px;border-radius:12px 12px 12px 0;display:inline-block;font-size:13px">ขัดข้องการเชื่อมต่อ AI</span></div>`;
  }
  history.scrollTop = history.scrollHeight;
}

function showLoadingInChat() {
  const history = document.getElementById('ai-chat-history');
  history.innerHTML += `<div id="ai-chat-loading" style="margin:6px 0"><span style="background:#f3f4f6;color:#6b7280;padding:6px 12px;border-radius:12px 12px 12px 0;display:inline-block;font-size:13px"><i class="bi bi-three-dots animate-pulse"></i> กำลังคิด...</span></div>`;
  history.scrollTop = history.scrollHeight;
}

function removeLoadingInChat() {
  const el = document.getElementById('ai-chat-loading');
  if (el) el.remove();
}

// ============================================================
// SMART ASSIGN V2
// ============================================================
function openSmartAssignV2() {
  showModal('modal-smart-assign', `
    <div class="modal-title">📊 Smart Assign V2</div>
    <div style="padding:0 16px">
      <div class="form-group-custom">
        <label>Job ID (เว้นว่าง)</label>
        <div class="input-wrap"><i class="bi bi-upc-scan"></i><input type="text" id="sa-job-id" placeholder="J0001" value="${APP.lastJobId || ''}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group-custom"><label>Latitude</label><input type="number" id="sa-lat" placeholder="16.0" step="0.0001" style="border-radius:12px;border:1.5px solid #e5e7eb;padding:10px 14px"></div>
        <div class="form-group-custom"><label>Longitude</label><input type="number" id="sa-lng" placeholder="103.0" step="0.0001" style="border-radius:12px;border:1.5px solid #e5e7eb;padding:10px 14px"></div>
      </div>
      <div class="form-group-custom">
        <label>อาการ / Symptom</label>
        <div class="input-wrap"><i class="bi bi-chat-left-text"></i><input type="text" id="sa-symptom" placeholder="เช่น จอบาดไม่ติด"></div>
      </div>
      <div class="form-group-custom">
        <label>ทักษะที่ต้องการ (คั่ดด้วยจุลภาค)</label>
        <div class="input-wrap"><i class="bi bi-stars"></i><input type="text" id="sa-skills" placeholder="cctv, network, wifi"></div>
      </div>
      <div class="form-group-custom">
        <label>ความสำคัญ</label>
        <select id="sa-priority" class="form-select" style="border-radius:12px;border:1.5px solid #e5e7eb;padding:10px 14px">
          <option value="ปกติ">ปกติ</option>
          <option value="ด่วน">ด่วน</option>
          <option value="ด่วนมาก">ด่วนมาก</option>
        </select>
      </div>
      <button class="btn-setup" onclick="runSmartAssignV2()" style="margin-top:8px">
        <i class="bi bi-magic"></i> วิเคราะห์ช่างที่เหมาะสม
      </button>
      <div id="sa-result" style="margin-top:12px"></div>
    </div>
  `);
}

async function runSmartAssignV2() {
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> กำลังคำนวณ...';

  const payload = {
    job_id: document.getElementById('sa-job-id').value.trim(),
    lat: parseFloat(document.getElementById('sa-lat').value || 0),
    lng: parseFloat(document.getElementById('sa-lng').value || 0),
    symptom: document.getElementById('sa-symptom').value.trim(),
    required_skills: document.getElementById('sa-skills').value.split(',').map(s => s.trim()).filter(Boolean),
    priority: document.getElementById('sa-priority').value
  };

  try {
    const res = await window.GAS_EXECUTE('smartAssignV2', payload);
    const container = document.getElementById('sa-result');
    if (res && res.success && res.data) {
      container.innerHTML = `
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:12px;margin-bottom:8px">
          <div style="font-weight:700;color:#065f46">✅ ผลการวิเคราะห์ (${res.total_techs} ช่าง)</div>
          <div style="font-size:11px;color:#6b7280">น้ำหนักการ: ระยะทาง ${res.data.factors.distance} | งานค้าง ${res.data.factors.workload} | SLA Risk ${res.data.factors.sla_risk} | ทักษะ ${res.data.factors.skill_match}</div>
        </div>
        ${res.data.recommendations.map((r, i) => `
          <div style="background:#fff;border:1.5px solid ${i === 0 ? '#10b981' : '#e5e7eb'};border-radius:12px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;border-radius:50%;background:${i === 0 ? '#10b981' : '#e5e7eb'};color:${i === 0 ? '#fff' : '#374151'};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px">${i + 1}</div>
            <div style="flex:1">
              <div style="font-weight:700;font-size:14px">${r.techName}</div>
              <div style="font-size:11px;color:#6b7280">ระยะทาง ${r.distKm} km · ETA ${r.etaMin} นาที · งานค้าง ${r.workload}/${r.maxJobs} · SLA Risk ${r.slaRisk}</div>
              <div style="font-size:11px;color:#d97706">🔍 ${r.reason}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:20px;font-weight:900;color:${i === 0 ? '#10b981' : '#6b7280'}">${r.score}</div>
              <div style="font-size:10px;color:#9ca3af">points</div>
            </div>
          </div>
        `).join('')}
      `;
    } else {
      container.innerHTML = `<div class="alert-card danger">⚠️ ${escapeHtml(res && res.error ? res.error : 'ไม่สามารถวิเคราะห์ได้')}</div>`;
    }
  } catch (err) {
    document.getElementById('sa-result').innerHTML = `<div class="alert-card danger">⚠️ ขัดข้องการ: ${escapeHtml(err.message || err)}</div>`;
  }
  btn.disabled = false;
  btn.innerHTML = '<i class="bi bi-magic"></i> วิเคราะห์ช่างที่เหมาะสม';
}

// ============================================================
// AUTO CSAT
// ============================================================
function openCSAT() {
  showModal('modal-csat', `
    <div class="modal-title">⭐ ความพึงพอใจ (CSAT)</div>
    <div style="padding:0 16px">
      <div id="csat-metrics" style="margin-bottom:12px"></div>
      <div class="section-label">ส่งแบบสอบถาม</div>
      <div class="form-group-custom">
        <label>Job ID</label>
        <div class="input-wrap"><i class="bi bi-upc-scan"></i><input type="text" id="csat-job-id" placeholder="J0001"></div>
      </div>
      <div class="form-group-custom">
        <label>ชื่อลูกค้า</label>
        <div class="input-wrap"><i class="bi bi-person-fill"></i><input type="text" id="csat-customer" placeholder="ชื่อลูกค้า"></div>
      </div>
      <div class="form-group-custom">
        <label>LINE User ID (ถ้ามี)</label>
        <div class="input-wrap"><i class="bi bi-line"></i><input type="text" id="csat-line-id" placeholder="Uxxxxxxxxxxxxxxxx"></div>
      </div>
      <button class="btn-setup" onclick="sendCSATNow()" style="margin-top:8px">
        <i class="bi bi-send-fill"></i> ส่งแบบสอบถาม
      </button>
      <div id="csat-send-result" style="margin-top:8px"></div>
    </div>
  `);
  loadCSATMetrics();
}

async function loadCSATMetrics() {
  const container = document.getElementById('csat-metrics');
  if (!container) return;
  try {
    const res = await window.GAS_EXECUTE('getCSATSummary', { period: '30d' });
    if (res && res.success && res.data) {
      container.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
          <div style="background:#f0fdf4;border-radius:12px;padding:10px;text-align:center">
            <div style="font-size:10px;color:#6b7280">คะแนนเฉลี่ย</div>
            <div style="font-size:18px;font-weight:900;color:#10b981">${res.data.avg_score.toFixed(1)}</div>
          </div>
          <div style="background:#eff6ff;border-radius:12px;padding:10px;text-align:center">
            <div style="font-size:10px;color:#6b7280">จำนวนตอบ</div>
            <div style="font-size:18px;font-weight:900;color:#3b82f6">${res.data.total_responses}</div>
          </div>
          <div style="background:#fef3c7;border-radius:12px;padding:10px;text-align:center">
            <div style="font-size:10px;color:#6b7280">NPS</div>
            <div style="font-size:18px;font-weight:900;color:#d97706">${res.data.nps}</div>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `<div style="font-size:12px;color:#9ca3af;text-align:center">ยังไม่มีข้อมูล CSAT</div>`;
    }
  } catch (e) {
    container.innerHTML = `<div style="font-size:12px;color:#9ca3af;text-align:center">ไม่สามารถโหลดข้อมูล</div>`;
  }
}

async function sendCSATNow() {
  const btn = event.target;
  btn.disabled = true;
  try {
    const res = await window.GAS_EXECUTE('sendCSAT', {
      job_id: document.getElementById('csat-job-id').value.trim(),
      customer_name: document.getElementById('csat-customer').value.trim(),
      customer_line_user_id: document.getElementById('csat-line-id').value.trim(),
      channel: 'line'
    });
    const out = document.getElementById('csat-send-result');
    if (res && res.success && res.data) {
      out.innerHTML = `<div style="background:#d1fae5;color:#065f46;padding:10px;border-radius:12px;font-size:13px">✅ ส่งแล้ว! Token: <code>${res.data.csat_token}</code></div>`;
    } else {
      out.innerHTML = `<div class="alert-card danger">⚠️ ${escapeHtml(res && res.error ? res.error : 'ไม่สามารถส่งได้')}</div>`;
    }
  } catch (err) {
    document.getElementById('csat-send-result').innerHTML = `<div class="alert-card danger">⚠️ ${escapeHtml(err.message || err)}</div>`;
  }
  btn.disabled = false;
}

// ============================================================
// AUTO TOR
// ============================================================
function openTOR() {
  showModal('modal-tor', `
    <div class="modal-title">📋 ออก TOR</div>
    <div style="padding:0 16px">
      <div id="tor-list" style="margin-bottom:12px"></div>
      <div class="section-label">สร้าง TOR ใหม่</div>
      <div class="form-group-custom">
        <label>ชื่อโครงการ</label>
        <div class="input-wrap"><i class="bi bi-briefcase-fill"></i><input type="text" id="tor-project" placeholder="เช่น ติดตั้งกล้องวงจรประสาท 4 จุด"></div>
      </div>
      <div class="form-group-custom">
        <label>ลูกค้า/หน่วยงาน</label>
        <div class="input-wrap"><i class="bi bi-building"></i><input type="text" id="tor-client" placeholder="ชื่อลูกค้า"></div>
      </div>
      <div class="form-group-custom">
        <label>ขอบเขต (Scope)</label>
        <textarea id="tor-scope" rows="2" style="border-radius:12px;border:1.5px solid #e5e7eb;padding:10px 14px;width:100%;font-size:13px" placeholder="รายละเอียดงาน..."></textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="form-group-custom"><label>งบประมาณ (บาท)</label><input type="number" id="tor-budget" placeholder="50000" style="border-radius:12px;border:1.5px solid #e5e7eb;padding:10px 14px"></div>
        <div class="form-group-custom"><label>ระยะเวลา</label><input type="text" id="tor-timeline" placeholder="30 วัน" style="border-radius:12px;border:1.5px solid #e5e7eb;padding:10px 14px"></div>
      </div>
      <div class="form-group-custom">
        <label>ทีมงาน (คั่ดด้วยจุลภาค)</label>
        <div class="input-wrap"><i class="bi bi-people-fill"></i><input type="text" id="tor-team" placeholder="วิศวกร, ช่าง A, ช่าง B"></div>
      </div>
      <button class="btn-setup" onclick="generateTORNow()" style="margin-top:8px">
        <i class="bi bi-file-earmark-text-fill"></i> ออก TOR
      </button>
      <div id="tor-result" style="margin-top:12px"></div>
    </div>
  `);
  loadTORList();
}

async function loadTORList() {
  const container = document.getElementById('tor-list');
  if (!container) return;
  try {
    const res = await window.GAS_EXECUTE('listTOR', { status: '' });
    if (res && res.success && res.data && res.data.count > 0) {
      container.innerHTML = `
        <div style="font-size:12px;font-weight:700;margin-bottom:6px">รายการ TOR ล่าสุด (${res.data.count})</div>
        ${res.data.items.slice(0, 5).map(t => `
          <div style="background:#f9fafb;border-radius:10px;padding:10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-weight:700;font-size:13px">${t.project}</div>
              <div style="font-size:11px;color:#6b7280">${t.client} · ฿${Number(t.budget||0).toLocaleString()} · ${t.timeline}</div>
            </div>
            <div style="display:flex;gap:6px">
              <span style="font-size:10px;padding:2px 8px;border-radius:10px;background:${t.status==='exported'?'#d1fae5;color:#065f46':'#fef3c7;color:#92400e'}">${t.status}</span>
              ${t.pdf_url ? `<a href="${t.pdf_url}" target="_blank" style="font-size:11px;color:#3b82f6">ดู PDF</a>` : ''}
            </div>
          </div>
        `).join('')}
      `;
    } else {
      container.innerHTML = `<div style="font-size:12px;color:#9ca3af;text-align:center">ยังไม่มี TOR</div>`;
    }
  } catch (e) {
    container.innerHTML = `<div style="font-size:12px;color:#9ca3af;text-align:center">ไม่สามารถโหลดรายการ</div>`;
  }
}

async function generateTORNow() {
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> กำลังออก TOR...';

  const payload = {
    project_name: document.getElementById('tor-project').value.trim(),
    client: document.getElementById('tor-client').value.trim(),
    scope: document.getElementById('tor-scope').value.trim(),
    budget: parseFloat(document.getElementById('tor-budget').value || 0),
    timeline: document.getElementById('tor-timeline').value.trim(),
    team: document.getElementById('tor-team').value.split(',').map(s => s.trim()).filter(Boolean)
  };

  try {
    const res = await window.GAS_EXECUTE('generateTOR', payload);
    const out = document.getElementById('tor-result');
    if (res && res.success && res.data) {
      out.innerHTML = `
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:12px;margin-bottom:8px">
          <div style="font-weight:700;color:#065f46">✅ ออก TOR แล้ว (${res.data.tor_id})</div>
          <div style="font-size:12px;color:#374151;margin-top:6px">${res.data.fields.project} · ${res.data.fields.client} · ฿${Number(res.data.fields.budget||0).toLocaleString()}</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn-setup" style="flex:1;background:#3b82f6" onclick="exportTORPdf('${res.data.tor_id}', \`${escapeHtml(res.data.html_preview)}\`)">
            <i class="bi bi-file-earmark-pdf-fill"></i> ออก PDF
          </button>
          <button class="btn-setup" style="flex:1;background:#6b7280" onclick="previewTOR(\`${escapeHtml(res.data.html_preview)}\`)">
            <i class="bi bi-eye-fill"></i> ดูตัวอย่าง
          </button>
        </div>
      `;
      loadTORList();
    } else {
      out.innerHTML = `<div class="alert-card danger">⚠️ ${escapeHtml(res && res.error ? res.error : 'ไม่สามารถออก TOR ได้')}</div>`;
    }
  } catch (err) {
    document.getElementById('tor-result').innerHTML = `<div class="alert-card danger">⚠️ ${escapeHtml(err.message || err)}</div>`;
  }
  btn.disabled = false;
  btn.innerHTML = '<i class="bi bi-file-earmark-text-fill"></i> ออก TOR';
}

async function exportTORPdf(torId, htmlContent) {
  try {
    showToast('กำลังออก PDF...');
    const res = await window.GAS_EXECUTE('exportTORpdf', { tor_id: torId, html_content: htmlContent });
    if (res && res.success && res.data) {
      showToast('✅ ออก PDF แล้ว!');
      window.open(res.data.pdf_url, '_blank');
    } else {
      showToast('❌ ไม่สามารถออก PDF: ' + (res && res.error ? res.error : ''));
    }
  } catch (err) {
    showToast('❌ ขัดข้องการออก PDF');
  }
}

function previewTOR(html) {
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

// ============================================================
// PHASE 28: AI BUSINESS METRICS DASHBOARD
// ============================================================
async function renderBusinessAICards() {
  const container = document.getElementById('business-ai-cards');
  if (!container) return;
  try {
    const res = await window.GAS_EXECUTE('getAIMetrics', { period: 'today' });
    if (res && res.success && res.data) {
      const m = res.data;
      container.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 12px 10px">
          <div class="kpi-card" style="background:linear-gradient(135deg,#3b82f6,#60a5fa);cursor:pointer" onclick="openAICompanion()">
            <div class="kpi-icon"><i class="bi bi-cpu-fill"></i></div>
            <div class="kpi-value">${m.aiUsageCount || 0}</div>
            <div class="kpi-label">AI Usage Today</div>
          </div>
          <div class="kpi-card" style="background:linear-gradient(135deg,#7c3aed,#a78bfa);cursor:pointer" onclick="openCSAT()">
            <div class="kpi-icon"><i class="bi bi-star-fill"></i></div>
            <div class="kpi-value">${m.csatAvg ? m.csatAvg.toFixed(1) : '-'}</div>
            <div class="kpi-label">CSAT Score</div>
          </div>
          <div class="kpi-card" style="background:linear-gradient(135deg,#10b981,#34d399);cursor:pointer" onclick="openSmartAssignV2()">
            <div class="kpi-icon"><i class="bi bi-robot"></i></div>
            <div class="kpi-value">${m.jobsAssignedByAI || 0}</div>
            <div class="kpi-label">Jobs Auto Assigned</div>
          </div>
          <div class="kpi-card" style="background:linear-gradient(135deg,#ea580c,#fb923c);cursor:pointer" onclick="openTOR()">
            <div class="kpi-icon"><i class="bi bi-cash-stack"></i></div>
            <div class="kpi-value">฿${Number(m.revenueFromAI || 0).toLocaleString()}</div>
            <div class="kpi-label">Revenue Impact</div>
          </div>
        </div>
      `;
    }
  } catch (e) {
    container.innerHTML = '';
  }
}

// Auto-refresh metrics every 60s
if (typeof window.__AI_METRICS_INTERVAL === 'undefined') {
  window.__AI_METRICS_INTERVAL = setInterval(function() {
    if (document.visibilityState === 'visible') {
      renderBusinessAICards();
      renderBusinessIntelligence();
    }
  }, 60000);
}

// ============================================================
// PHASE 29: AI BUSINESS INTELLIGENCE
// ============================================================
async function renderBusinessIntelligence() {
  const container = document.getElementById('business-ai-intel');
  if (!container) return;
  try {
    const res = await window.GAS_EXECUTE('analyzeBusiness', { period: 'today' });
    if (res && res.success && res.data) {
      const d = res.data;
      const hasAlerts = d.alertCount > 0;
      const hasRecs = d.recommendationCount > 0;
      
      container.innerHTML = `
        <div style="margin:0 12px 10px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div style="font-size:14px;font-weight:700">วิเคราะห์ธุรกิจ AI</div>
            <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${hasAlerts?'#fee2e2;color:#991b1b':'#d1fae5;color:#065f46'}">${hasAlerts ? d.alertCount + ' เตือน' : 'ปกติ'}</span>
          </div>
          
          ${hasAlerts ? `
            <div style="margin-bottom:10px">
              <div style="font-size:12px;font-weight:600;color:#dc2626;margin-bottom:6px">🔔 Alerts</div>
              ${d.alerts.map(a => `
                <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:10px;margin-bottom:6px">
                  <div style="font-weight:700;font-size:13px;color:#991b1b">${a.title}</div>
                  <div style="font-size:12px;color:#7f1d1d;margin-top:2px">${a.message}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${hasRecs ? `
            <div style="margin-bottom:10px">
              <div style="font-size:12px;font-weight:600;color:#d97706;margin-bottom:6px">💡 Recommendations</div>
              ${d.recommendations.slice(0, 3).map(r => `
                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px;margin-bottom:6px">
                  <div style="font-weight:700;font-size:13px;color:#92400e">${r.title}</div>
                  <div style="font-size:11px;color:#78350f;margin-top:2px">${r.detail}</div>
                  <div style="font-size:11px;color:#10b981;margin-top:4px">✅ ผลลัพธ์ที่คาด: ${r.estimatedImpact}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${Object.keys(d.predictions).length > 0 ? `
            <div>
              <div style="font-size:12px;font-weight:600;color:#7c3aed;margin-bottom:6px">🔮 Predictions</div>
              <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:10px">
                ${d.predictions.nextWeekUsage ? `<div style="font-size:12px">ทันนี้ AI คาดว่าจะใช้ ~${d.predictions.nextWeekUsage} ครั้ง</div>` : ''}
                ${d.predictions.nextWeekRevenue ? `<div style="font-size:12px">คาดรายได้ ~฿${Number(d.predictions.nextWeekRevenue).toLocaleString()}</div>` : ''}
                ${d.predictions.csatTrend ? `<div style="font-size:12px">แนวโน้ม CSAT: ${d.predictions.csatTrend === 'upward' ? '⬆️ ขึ้น' : d.predictions.csatTrend === 'downward' ? '⬇️ ลง' : '↔️ คงที่'}</div>` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }
  } catch (e) {
    container.innerHTML = '';
  }
}

// ============================================================
// HELPERS
// ============================================================
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/`/g, '&#96;');
}

function showModal(id, content) {
  let modal = document.getElementById(id);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal-overlay hidden';
    modal.innerHTML = `<div class="modal-sheet" onclick="event.stopPropagation()" style="max-height:85vh;overflow-y:auto"><div class="modal-handle"></div><div id="${id}-content"></div></div>`;
    modal.onclick = function() { closeModal(id); };
    document.body.appendChild(modal);
  }
  const inner = document.getElementById(id + '-content');
  if (inner) inner.innerHTML = content;
  modal.classList.remove('hidden');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('hidden');
}
