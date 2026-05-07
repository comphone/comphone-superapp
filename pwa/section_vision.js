// section_vision.js - AI Vision dashboard for PC and mobile
// Provides read-safe status panels and guarded image analysis entry points.

(function initVisionSection(global) {
  'use strict';

  const VISION_STATE = {
    selectedFile: null,
    selectedDataUrl: '',
    lastStats: null,
    lastVersion: null,
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function unwrapResponse(res) {
    if (!res) return {};
    if (res.data && typeof res.data === 'object' && !res.stats) return Object.assign({}, res, res.data);
    return res;
  }

  async function visionApi(action, payload) {
    if (typeof global.callAPI === 'function') return unwrapResponse(await global.callAPI(action, payload || {}));
    if (typeof global.callApi === 'function') return unwrapResponse(await global.callApi(action, payload || {}));
    throw new Error('API client is not loaded');
  }

  function statValue(stats, key, fallback) {
    return stats && stats[key] != null ? stats[key] : fallback;
  }

  function buildStatCards(stats) {
    const cards = [
      ['Total', statValue(stats, 'total', 0), 'bi-images', '#2563eb'],
      ['Approved', statValue(stats, 'approved', 0), 'bi-check-circle-fill', '#059669'],
      ['Need Review', statValue(stats, 'needReview', 0), 'bi-person-check-fill', '#d97706'],
      ['Failed', statValue(stats, 'failed', 0), 'bi-exclamation-triangle-fill', '#dc2626'],
      ['Approval %', statValue(stats, 'approvalRate', '0'), 'bi-graph-up-arrow', '#7c3aed'],
      ['Avg Confidence', statValue(stats, 'avgConfidence', '0'), 'bi-cpu-fill', '#0f766e'],
    ];

    return `<div class="vision-kpi-grid">
      ${cards.map(([label, value, icon, color]) => `
        <div class="vision-kpi-card">
          <i class="bi ${icon}" style="color:${color}"></i>
          <span>${esc(label)}</span>
          <strong>${esc(value)}</strong>
        </div>
      `).join('')}
    </div>`;
  }

  function buildTypeList(stats) {
    const byType = (stats && stats.byType) || {};
    const rows = Object.keys(byType).sort().map(type => `
      <div class="vision-type-row">
        <span>${esc(type)}</span>
        <strong>${esc(byType[type])}</strong>
      </div>
    `).join('');
    return rows || '<div class="vision-empty">No classified Vision records in this period.</div>';
  }

  function buildVisionShell(mode) {
    const isMobile = mode === 'mobile';
    return `
      <style>
        .vision-panel{display:grid;gap:14px}
        .vision-hero{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px;border-radius:12px;background:linear-gradient(135deg,#0f172a,#164e63);color:#fff}
        .vision-hero h3,.vision-hero h5{margin:0;font-weight:800}
        .vision-hero p{margin:4px 0 0;color:rgba(255,255,255,.72);font-size:13px}
        .vision-actions{display:flex;flex-wrap:wrap;gap:8px}
        .vision-btn{border:0;border-radius:10px;padding:9px 12px;font-weight:700;background:#2563eb;color:#fff;display:inline-flex;align-items:center;gap:7px;cursor:pointer}
        .vision-btn.secondary{background:#f1f5f9;color:#0f172a}
        .vision-btn.warn{background:#f59e0b;color:#111827}
        .vision-btn:disabled{opacity:.55;cursor:not-allowed}
        .vision-kpi-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
        .vision-kpi-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:13px;min-height:88px;display:flex;flex-direction:column;gap:4px;box-shadow:0 8px 22px rgba(15,23,42,.06)}
        .vision-kpi-card i{font-size:20px}
        .vision-kpi-card span{font-size:12px;color:#64748b}
        .vision-kpi-card strong{font-size:22px;color:#0f172a}
        .vision-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);gap:14px}
        .vision-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px;box-shadow:0 8px 22px rgba(15,23,42,.05)}
        .vision-card h4,.vision-card h6{margin:0 0 10px;font-weight:800;color:#0f172a}
        .vision-muted{font-size:12px;color:#64748b}
        .vision-type-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #eef2f7;font-size:13px}
        .vision-empty{padding:16px;text-align:center;color:#94a3b8;background:#f8fafc;border-radius:10px}
        .vision-result{white-space:pre-wrap;font-size:12px;background:#0f172a;color:#dbeafe;padding:12px;border-radius:10px;max-height:260px;overflow:auto}
        .vision-file{width:100%;border:1px dashed #94a3b8;border-radius:10px;padding:12px;background:#f8fafc}
        .vision-preview{max-width:100%;max-height:190px;border-radius:10px;margin-top:10px;display:none}
        @media(max-width:760px){.vision-hero{align-items:flex-start;flex-direction:column}.vision-grid,.vision-kpi-grid{grid-template-columns:1fr}.vision-card{border-radius:10px}.vision-btn{width:100%;justify-content:center}}
      </style>
      <div class="vision-panel ${isMobile ? 'vision-mobile' : 'vision-pc'}">
        <div class="vision-hero">
          <div>
            ${isMobile ? '<h5><i class="bi bi-stars"></i> AI Vision Center</h5>' : '<h3><i class="bi bi-stars"></i> AI Vision Center</h3>'}
            <p>Photo intelligence, slip verification, QC pipeline, and human review status.</p>
          </div>
          <div class="vision-actions">
            <button class="vision-btn" onclick="refreshVisionPanel()"><i class="bi bi-arrow-clockwise"></i> Refresh</button>
            <button class="vision-btn secondary" onclick="checkVisionVersions()"><i class="bi bi-cpu"></i> Version</button>
          </div>
        </div>
        <div id="vision-status" class="vision-muted">Loading AI Vision status...</div>
        <div id="vision-readiness" class="vision-muted">Checking Gemini readiness...</div>
        <div id="vision-stats">${buildStatCards({})}</div>
        <div class="vision-grid">
          <div class="vision-card">
            <h4><i class="bi bi-camera-fill"></i> Vision Actions</h4>
            <div class="vision-actions" style="margin-bottom:12px">
              <button class="vision-btn" onclick="openVisionCamera('job')"><i class="bi bi-camera"></i> Work Photo</button>
              <button class="vision-btn" onclick="openVisionCamera('slip')"><i class="bi bi-receipt"></i> Slip Scan</button>
              <button class="vision-btn secondary" onclick="goVisionBilling()"><i class="bi bi-cash-coin"></i> Billing</button>
              <button class="vision-btn secondary" onclick="goVisionReports()"><i class="bi bi-graph-up"></i> Reports</button>
            </div>
            <div class="vision-muted">For direct AI analysis, choose an image and run the selected pipeline. This may write Vision logs on the backend.</div>
            <div style="display:grid;gap:10px;margin-top:12px">
              <select id="vision-pipeline-type" class="vision-file">
                <option value="QC">QC work photo</option>
                <option value="SLIP">Payment slip</option>
                <option value="PRODUCT">Product / inventory image</option>
              </select>
              <input id="vision-file-input" class="vision-file" type="file" accept="image/*" onchange="handleVisionFileSelected(this)">
              <img id="vision-preview" class="vision-preview" alt="Vision preview">
              <button id="vision-run-btn" class="vision-btn warn" onclick="runSelectedVisionPipeline()" disabled><i class="bi bi-magic"></i> Analyze Selected Image</button>
            </div>
          </div>
          <div class="vision-card">
            <h6>Classification by Type</h6>
            <div id="vision-type-list">${buildTypeList({})}</div>
          </div>
        </div>
        <div class="vision-card">
          <h6>AI Response</h6>
          <div id="vision-result" class="vision-result">No AI response yet.</div>
        </div>
      </div>`;
  }

  function renderVisionSection() {
    return buildVisionShell('pc');
  }

  function renderMobileVisionPage() {
    const container = document.getElementById('vision-content') || document.getElementById('page-vision');
    if (!container) return;
    container.innerHTML = buildVisionShell('mobile');
    setTimeout(refreshVisionPanel, 0);
  }

  async function refreshVisionPanel(days) {
    const status = document.getElementById('vision-status');
    if (status) status.textContent = 'Loading AI Vision status...';
    checkVisionReadiness();
    try {
      const res = await visionApi('getVisionDashboardStats', { days: days || 7 });
      if (res && res.success === false) throw new Error(res.error || 'Vision stats failed');
      const stats = res.stats || {};
      VISION_STATE.lastStats = stats;
      const statsEl = document.getElementById('vision-stats');
      const typeEl = document.getElementById('vision-type-list');
      if (statsEl) statsEl.innerHTML = buildStatCards(stats);
      if (typeEl) typeEl.innerHTML = buildTypeList(stats);
      if (status) status.textContent = `AI Vision online - ${esc(res.period || '7 days')} window`;
    } catch (error) {
      if (status) status.textContent = 'AI Vision status unavailable: ' + error.message;
      const result = document.getElementById('vision-result');
      if (result) result.textContent = error.stack || error.message;
    }
  }

  async function checkVisionReadiness() {
    const el = document.getElementById('vision-readiness');
    if (!el) return;
    try {
      const health = await visionApi('health', {});
      const config = health && health.checks && health.checks.config;
      const geminiOk = !!(config && config.gemini_ok);
      const lineOk = !!(config && config.line_ok);
      const missing = (config && config.missing) || [];
      el.innerHTML = `
        <span style="display:inline-flex;align-items:center;gap:7px;padding:8px 10px;border-radius:10px;background:${geminiOk ? '#ecfdf5' : '#fef2f2'};color:${geminiOk ? '#047857' : '#b91c1c'};font-weight:700">
          <i class="bi ${geminiOk ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}"></i>
          Gemini Vision ${geminiOk ? 'ready' : 'not configured'}
        </span>
        <span style="display:inline-flex;align-items:center;gap:7px;margin-left:6px;padding:8px 10px;border-radius:10px;background:${lineOk ? '#eff6ff' : '#fff7ed'};color:${lineOk ? '#1d4ed8' : '#c2410c'};font-weight:700">
          <i class="bi ${lineOk ? 'bi-chat-dots-fill' : 'bi-chat-dots'}"></i>
          LINE ${lineOk ? 'ready' : 'partial'}
        </span>
        ${missing.length ? `<span style="margin-left:6px;color:#b91c1c">Missing: ${missing.map(esc).join(', ')}</span>` : ''}`;
    } catch (error) {
      el.textContent = 'Vision readiness unavailable: ' + error.message;
    }
  }

  async function checkVisionVersions() {
    const result = document.getElementById('vision-result');
    if (result) result.textContent = 'Checking Vision backend versions...';
    try {
      const [pipeline, learning] = await Promise.all([
        visionApi('getVisionPipelineVersion', {}),
        visionApi('getVisionLearningVersion', {}),
      ]);
      VISION_STATE.lastVersion = { pipeline, learning };
      if (result) result.textContent = JSON.stringify(VISION_STATE.lastVersion, null, 2);
    } catch (error) {
      if (result) result.textContent = error.stack || error.message;
    }
  }

  function openVisionCamera(type) {
    if (typeof global.openCamera === 'function') {
      global.openCamera(type || 'job');
      return;
    }
    alert('Camera is available in the mobile PWA.');
  }

  function goVisionBilling() {
    if (typeof global.goPage === 'function') return global.goPage('billing', document.getElementById('nav-more'));
    if (typeof global.loadSection === 'function') return global.loadSection('billing');
  }

  function goVisionReports() {
    if (typeof global.goPage === 'function') return global.goPage('reports', document.getElementById('nav-more'));
    if (typeof global.loadSection === 'function') return global.loadSection('reports');
  }

  function handleVisionFileSelected(input) {
    const file = input && input.files && input.files[0];
    const btn = document.getElementById('vision-run-btn');
    const preview = document.getElementById('vision-preview');
    VISION_STATE.selectedFile = null;
    VISION_STATE.selectedDataUrl = '';
    if (btn) btn.disabled = true;
    if (preview) preview.style.display = 'none';
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image is larger than 5MB.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      VISION_STATE.selectedFile = file;
      VISION_STATE.selectedDataUrl = String(reader.result || '');
      if (preview) {
        preview.src = VISION_STATE.selectedDataUrl;
        preview.style.display = 'block';
      }
      if (btn) btn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  async function runSelectedVisionPipeline() {
    if (!VISION_STATE.selectedFile || !VISION_STATE.selectedDataUrl) return;
    const typeEl = document.getElementById('vision-pipeline-type');
    const result = document.getElementById('vision-result');
    const type = (typeEl && typeEl.value) || 'QC';
    const base64 = VISION_STATE.selectedDataUrl.split(',')[1] || '';
    if (!base64) return;
    if (!confirm('Run AI Vision analysis for the selected image? This may write Vision logs.')) return;
    if (result) result.textContent = 'Running AI Vision pipeline...';
    try {
      const res = await visionApi('runVisionPipeline', {
        type,
        input: {
          base64,
          mimeType: VISION_STATE.selectedFile.type || 'image/jpeg',
          fileName: VISION_STATE.selectedFile.name || 'vision-upload.jpg',
        },
        context: {
          source: 'pwa_vision_panel',
          ui: global.innerWidth < 760 ? 'mobile' : 'pc',
        },
      });
      if (result) result.textContent = JSON.stringify(res, null, 2);
      refreshVisionPanel();
    } catch (error) {
      if (result) result.textContent = error.stack || error.message;
    }
  }

  function hydrateVisionPanel() {
    setTimeout(refreshVisionPanel, 0);
  }

  global.renderVisionSection = renderVisionSection;
  global.renderMobileVisionPage = renderMobileVisionPage;
  global.refreshVisionPanel = refreshVisionPanel;
  global.checkVisionVersions = checkVisionVersions;
  global.checkVisionReadiness = checkVisionReadiness;
  global.openVisionCamera = openVisionCamera;
  global.goVisionBilling = goVisionBilling;
  global.goVisionReports = goVisionReports;
  global.handleVisionFileSelected = handleVisionFileSelected;
  global.runSelectedVisionPipeline = runSelectedVisionPipeline;
  global.hydrateVisionPanel = hydrateVisionPanel;
})(typeof window !== 'undefined' ? window : globalThis);
