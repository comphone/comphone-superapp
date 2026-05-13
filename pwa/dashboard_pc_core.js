/**
 * dashboard_pc_core.js - PC Dashboard runtime
 * Version: v5.18.7-authguard
 * Date: 2026-05-06
 *
 * Keep PC dashboard behavior here. dashboard_pc.html should remain markup plus
 * asset loading, not a second copy of navigation/login/session logic.
 */

'use strict';

(function initPcDashboardCore(global) {
  const AUTH_SESSION_KEY = 'comphone_auth_session';
  const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000;
  const LAST_SECTION_KEY = 'comphone_last_pc_section';
  const PC_SECTIONS = new Set([
    'dashboard', 'jobs', 'po', 'inventory', 'billing', 'warranty',
    'revenue', 'tax', 'reports', 'analytics', 'performance', 'vision', 'line-center', 'backup',
    'crm', 'attendance', 'settings'
  ]);
  const SECTION_TITLES = {
    dashboard: '<i class="bi bi-bar-chart-fill" style="color:#f97316;margin-right:8px"></i>Executive Dashboard',
    jobs: '<i class="bi bi-tools" style="color:#2563eb;margin-right:8px"></i>งานบริการ',
    po: '<i class="bi bi-cart-fill" style="color:#db2777;margin-right:8px"></i>สั่งซื้อ',
    inventory: '<i class="bi bi-box-seam-fill" style="color:#0284c7;margin-right:8px"></i>สต็อก',
    billing: '<i class="bi bi-receipt" style="color:#d97706;margin-right:8px"></i>ใบเสร็จ/วางบิล',
    warranty: '<i class="bi bi-shield-check" style="color:#059669;margin-right:8px"></i>รับประกัน',
    revenue: '<i class="bi bi-currency-exchange" style="color:#059669;margin-right:8px"></i>รายรับ',
    tax: '<i class="bi bi-receipt-cutoff" style="color:#059669;margin-right:8px"></i>คำนวณภาษี (VAT / WHT)',
    reports: '<i class="bi bi-file-earmark-text" style="color:#2563eb;margin-right:8px"></i>รายงาน',
    analytics: '<i class="bi bi-graph-up" style="color:#7c3aed;margin-right:8px"></i>Analytics',
    performance: '<i class="bi bi-speedometer2" style="color:#0f766e;margin-right:8px"></i>Performance',
    vision: '<i class="bi bi-stars" style="color:#0f766e;margin-right:8px"></i>AI Vision',
    'line-center': '<i class="bi bi-broadcast-pin" style="color:#3730a3;margin-right:8px"></i>LINE Center',
    backup: '<i class="bi bi-cloud-arrow-up" style="color:#64748b;margin-right:8px"></i>สำรองข้อมูล',
    crm: '<i class="bi bi-people-fill" style="color:#059669;margin-right:8px"></i>ลูกค้า',
    attendance: '<i class="bi bi-clock" style="color:#475569;margin-right:8px"></i>ลงเวลาทำงาน',
    settings: '<i class="bi bi-gear-fill" style="color:#2563eb;margin-right:8px"></i>ตั้งค่า',
  };

  const FALLBACK_DASHBOARD = {
    jobs: { total: 15, pending: 3, inProgress: 5, done: 7 },
    revenue: { today: 45000, week: 280000, month: 1200000 },
    tax: { vat: 31500, wht: 12000 },
    performance: { avgTime: '2.5h', satisfaction: 4.8 },
  };

  global.CHARTS = global.CHARTS || {};
  global.DASHBOARD_DATA = global.DASHBOARD_DATA || null;

  global.__DATA_SCHEMA = global.__DATA_SCHEMA || {
    stock: ['product_id', 'name', 'qty', 'min_level'],
    job: ['job_id', 'status', 'technician', 'sla_due'],
    order: ['order_id', 'customer', 'total', 'status'],
  };

  global.__ACTION_MAP = global.__ACTION_MAP || {
    getStockList: { api: 'getStockList', type: 'read' },
    updateJobStatus: { api: 'updateJobStatus', type: 'write' },
    posCheckout: { api: 'posCheckout', type: 'write' },
  };

  function getGAS_URL() {
    if (typeof global.getGasUrl === 'function') return global.getGasUrl();
    return (global.GAS_CONFIG && global.GAS_CONFIG.url) || global.COMPHONE_GAS_URL || '';
  }

  function setLoginBusy(isBusy) {
    const btn = document.getElementById('login-btn') || document.querySelector('.login-btn');
    if (!btn) return;
    btn.disabled = !!isBusy;
    btn.textContent = isBusy ? 'Signing in...' : 'Login';
  }

  function hideLoginOverlay() {
    const loginOverlay = document.getElementById('login-overlay');
    if (loginOverlay) loginOverlay.style.display = 'none';
  }

  function showLoginOverlay() {
    const loginOverlay = document.getElementById('login-overlay');
    if (loginOverlay) loginOverlay.style.display = 'flex';
  }

  function updatePcVersionBadge() {
    const badge = document.getElementById('version_badge');
    if (!badge) return;
    const version = global.COMPHONE_VERSION || global.__APP_VERSION || 'unknown';
    badge.textContent = version;
    badge.className = 'version-badge';
  }

  function renderSection(sectionName, data, main) {
    const renderers = {
      dashboard: () => {
        if (typeof global.loadDashboardPage === 'function') global.loadDashboardPage();
        else if (main) main.innerHTML = '<h2>Dashboard</h2><p>Dashboard renderer is not loaded.</p>';
      },
      jobs: () => {
        if (typeof global.renderJobsSection === 'function') {
          const c = document.getElementById('jobs-content');
          if (c) c.innerHTML = global.renderJobsSection(data);
        } else if (main) main.innerHTML = '<h3>Jobs</h3><p>Module is not loaded. Open Settings > Operations Diagnostics.</p>';
      },
      po: () => {
        if (typeof global.renderPOSection === 'function') global.renderPOSection(data);
        else if (main) main.innerHTML = '<h3>PO</h3><p>Module is not loaded. Open Settings > Operations Diagnostics.</p>';
      },
      inventory: () => {
        if (typeof global.renderInventorySection === 'function') global.renderInventorySection(data);
        else if (main) main.innerHTML = '<h3>Inventory</h3><p>Module is not loaded. Open Settings > Operations Diagnostics.</p>';
      },
      billing: () => {
        const c = document.getElementById('billing-content') || document.getElementById('section-billing');
        if (typeof global.renderBillingSection === 'function' && c) c.innerHTML = global.renderBillingSection(data);
        else if (main) main.innerHTML = '<h3>Billing</h3><p>Module is not loaded. Open Settings > Operations Diagnostics.</p>';
      },
      warranty: () => {
        const c = document.getElementById('warranty-content') || document.getElementById('section-warranty');
        if (typeof global.renderWarrantySection === 'function' && c) c.innerHTML = global.renderWarrantySection(data);
        else if (main) main.innerHTML = '<h3>Warranty</h3><p>Module is not loaded. Open Settings > Operations Diagnostics.</p>';
      },
      revenue: () => {
        if (typeof global.renderRevenueSection === 'function') global.renderRevenueSection(data);
        else if (main) main.innerHTML = '<h3>Revenue</h3><p>Module is not loaded. Open Settings > Operations Diagnostics.</p>';
      },
      tax: () => {
        if (typeof global.renderTaxSection === 'function') global.renderTaxSection(data);
        else if (main) main.innerHTML = '<h3>Tax</h3><p>Module is not loaded. Open Settings > Operations Diagnostics.</p>';
      },
      reports: () => {
        const c = document.getElementById('reports-content') || document.getElementById('section-reports');
        if (typeof global.renderReportModule === 'function') global.renderReportModule(data);
        else if (typeof global.renderReportsSection === 'function' && c) c.innerHTML = global.renderReportsSection(data);
        else if (main) main.innerHTML = '<h3>Reports</h3><p>Module is not loaded. Open Settings > Operations Diagnostics.</p>';
      },
      analytics: () => {
        const c = document.getElementById('analytics-content') || document.getElementById('section-analytics');
        if (typeof global.renderAnalyticsSection === 'function' && c) c.innerHTML = global.renderAnalyticsSection(data);
        else if (main) main.innerHTML = '<h3>Analytics</h3><p>Module is not loaded. Open Settings > Operations Diagnostics.</p>';
      },
      performance: () => {
        if (typeof global.renderPerformanceSection === 'function') global.renderPerformanceSection(data);
        else if (main) main.innerHTML = '<h3>Performance</h3><p>Module is not loaded. Open Settings > Operations Diagnostics.</p>';
      },
      vision: () => {
        const c = document.getElementById('vision-content') || document.getElementById('section-vision') || main;
        if (typeof global.renderVisionSection === 'function' && c) {
          c.innerHTML = global.renderVisionSection(data);
          if (typeof global.hydrateVisionPanel === 'function') global.hydrateVisionPanel();
        } else if (main) main.innerHTML = '<h3>AI Vision</h3><p>Vision module is not loaded.</p>';
      },
      'line-center': () => {
        const c = document.getElementById('line-center-content') || document.getElementById('section-line-center') || main;
        if (typeof global.renderLineCenterSection === 'function' && c) {
          c.innerHTML = global.renderLineCenterSection(data);
          if (typeof global.hydrateLineCenterPanel === 'function') global.hydrateLineCenterPanel();
        } else if (main) main.innerHTML = '<h3>LINE Center</h3><p>LINE module is not loaded.</p>';
      },
      backup: () => {
        if (typeof global.renderBackupSection === 'function') global.renderBackupSection();
        else if (main) main.innerHTML = '<h3>Backup</h3><p>Module is not loaded. Open Settings > Operations Diagnostics.</p>';
      },
      crm: () => {
        if (typeof global.renderCRMSection === 'function') global.renderCRMSection(data);
        else if (main) main.innerHTML = '<h3>CRM</h3><p>Module is not loaded. Open Settings > Operations Diagnostics.</p>';
      },
      attendance: () => {
        const c = document.getElementById('attendance-content') || document.getElementById('section-attendance');
        if (typeof global.renderAttendanceSection === 'function' && c) c.innerHTML = global.renderAttendanceSection(data);
        else if (main) main.innerHTML = '<h3>Attendance</h3><p>Module is not loaded. Open Settings > Operations Diagnostics.</p>';
      },
      settings: () => {
        if (typeof global.renderSettingsSection === 'function' && main) {
          main.innerHTML = global.renderSettingsSection();
          if (typeof global.hydrateSettingsRuntimePanels === 'function') global.hydrateSettingsRuntimePanels();
        }
        else if (main) main.innerHTML = '<h3>Settings</h3><p>Module is not loaded. Open Settings > Operations Diagnostics.</p>';
      },
    };

    const renderer = renderers[sectionName];
    if (!renderer) return;

    try {
      renderer();
    } catch (error) {
      console.error('[Dashboard] Render error:', sectionName, error);
      if (main) main.innerHTML = '<p>Error loading section.</p>';
    }
  }

  function loadSection(sectionName) {
    if (!PC_SECTIONS.has(sectionName)) sectionName = 'dashboard';
    console.log('[Dashboard] Loading section:', sectionName);

    document.querySelectorAll('.dashboard-section, .section-content').forEach((section) => {
      section.style.display = 'none';
    });

    const target = document.getElementById('section-' + sectionName) ||
      document.getElementById(sectionName + '-section');
    if (target) target.style.display = 'block';
    else if (!renderersCanUseMain(sectionName)) console.warn('[Dashboard] Section not found:', sectionName);

    const title = document.getElementById('topbar-title');
    if (title && SECTION_TITLES[sectionName]) title.innerHTML = SECTION_TITLES[sectionName];

    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.remove('active');
      const onclick = item.getAttribute('onclick') || '';
      if (onclick.includes(sectionName)) item.classList.add('active');
    });

    const data = global.DASHBOARD_DATA || FALLBACK_DASHBOARD;
    const main = document.getElementById('main-content');
    renderSection(sectionName, data, main);
    try {
      localStorage.setItem(LAST_SECTION_KEY, sectionName);
      if (history && history.replaceState) history.replaceState({ section: sectionName }, '', location.href);
    } catch (_) {}
  }

  function renderersCanUseMain(sectionName) {
    return ['tax', 'settings', 'backup', 'revenue', 'performance'].includes(sectionName);
  }

  function loadDashboard() {
    console.log('[Dashboard] Loading main dashboard...');
    const savedSection = localStorage.getItem(LAST_SECTION_KEY);
    loadSection(PC_SECTIONS.has(savedSection) ? savedSection : 'dashboard');

    if (typeof global.callApi !== 'function') return;
    global.callApi({ action: 'getDashboardBundle' })
      .then((data) => {
        global.DASHBOARD_DATA = data || global.DASHBOARD_DATA;
        if (typeof global.renderDashboard === 'function') global.renderDashboard(data);
      })
      .catch((error) => console.error('[Dashboard] Bundle load error:', error));
  }

  function _doLogin(event) {
    if (event && event.preventDefault) event.preventDefault();
    console.log('[Dashboard] Attempting login...');

    const username = (document.getElementById('login-user') || {}).value || '';
    const password = (document.getElementById('login-pass') || {}).value || '';

    if (!username.trim() || !password.trim()) {
      alert('Please enter username and password.');
      return;
    }

    const gasUrl = getGAS_URL();
    if (!gasUrl) {
      alert('GAS URL is not configured.');
      return;
    }

    const qs = new URLSearchParams({
      action: 'loginUser',
      username: username.trim(),
      password,
      _t: Date.now(),
    }).toString();

    setLoginBusy(true);
    fetch(gasUrl + '?' + qs, { redirect: 'follow' })
      .then((res) => res.json())
      .then((res) => {
        setLoginBusy(false);
        if (res && (res.success || res.valid)) {
          res.loginAt = Date.now();
          localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(res));
          hideLoginOverlay();
          loadDashboard();
          return;
        }
        alert('Login failed: ' + ((res && (res.error || res.message)) || 'Unknown error'));
      })
      .catch((error) => {
        setLoginBusy(false);
        console.error('[Login] Error:', error);
        alert('Login error: ' + error.message);
      });
  }

  function _doLogout() {
    if (!confirm('เธญเธญเธเธเธฒเธเธฃเธฐเธเธ COMPHONE Dashboard?\n\nเธเธฒเธเธ—เธตเนเธขเธฑเธเนเธกเนเนเธ”เนเธเธฑเธเธ—เธถเธเธญเธฒเธเธซเธฒเธขเนเธ')) return;
    localStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(LAST_SECTION_KEY);
    showLoginOverlay();
  }

  function sessionAgeMs(session) {
    const raw = session.loginAt || session.login_at || 0;
    const parsed = new Date(raw).getTime() || Number(raw) || 0;
    return Date.now() - parsed;
  }

  function verifySavedSession() {
    console.log('[Dashboard] Checking saved session...');
    try {
      const sessionStr = localStorage.getItem(AUTH_SESSION_KEY);
      if (!sessionStr) {
        showLoginOverlay();
        return;
      }

      const session = JSON.parse(sessionStr);
      if (!session.token || sessionAgeMs(session) >= MAX_SESSION_AGE_MS) {
        localStorage.removeItem(AUTH_SESSION_KEY);
        showLoginOverlay();
        return;
      }

      const gasUrl = getGAS_URL();
      if (!gasUrl) {
        hideLoginOverlay();
        loadDashboard();
        return;
      }

      const qs = new URLSearchParams({
        action: 'verifySession',
        token: session.token,
        _t: Date.now(),
      }).toString();

      fetch(gasUrl + '?' + qs, { redirect: 'follow' })
        .then((res) => res.json())
        .then((res) => {
          if (res && (res.success || res.valid)) {
            console.log('[Dashboard] Session verified - skip login');
            hideLoginOverlay();
            loadDashboard();
            return;
          }

          if (res && (res._errorKind === 'offline' || res._errorKind === 'timeout')) {
            console.warn('[Dashboard] Session verify temporary failure - using local session');
            hideLoginOverlay();
            loadDashboard();
            return;
          }

          console.warn('[Dashboard] Session invalid - show login');
          localStorage.removeItem(AUTH_SESSION_KEY);
          showLoginOverlay();
        })
        .catch((error) => {
          console.warn('[Dashboard] Server unreachable - using local session:', error.message);
          hideLoginOverlay();
          loadDashboard();
        });
    } catch (error) {
      console.error('[Dashboard] Session check error:', error);
      localStorage.removeItem(AUTH_SESSION_KEY);
      showLoginOverlay();
    }
  }

  function bootPcDashboard() {
    updatePcVersionBadge();
    window.addEventListener('beforeunload', (event) => {
      const activeSection = localStorage.getItem(LAST_SECTION_KEY);
      if (activeSection && activeSection !== 'dashboard') {
        event.preventDefault();
        event.returnValue = '';
      }
    });
    verifySavedSession();
  }

  global.getGAS_URL = getGAS_URL;
  global.updatePcVersionBadge = updatePcVersionBadge;
  global.loadSection = loadSection;
  global.loadDashboard = loadDashboard;
  global._doLogin = _doLogin;
  global._doLogout = _doLogout;
  global.verifyPcDashboardSession = verifySavedSession;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootPcDashboard);
  } else {
    bootPcDashboard();
  }
})(window);
