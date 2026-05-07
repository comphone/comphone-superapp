(function initRuntimeSelfTest(global) {
  'use strict';

  const STATE = {
    running: false,
    lastRun: null,
    results: [],
  };

  const CHECKS = [
    {
      id: 'runtime-config',
      label: 'Runtime Config',
      run: async () => {
        const version = global.COMPHONE_VERSION || global.__APP_VERSION || '';
        const build = global.COMPHONE_BUILD || '';
        const gasUrl = global.COMPHONE_GAS_URL || (global.GAS_CONFIG && global.GAS_CONFIG.url) || '';
        return {
          ok: !!version && !!build && /^https:\/\/script\.google\.com\/macros\/s\//.test(gasUrl),
          details: `PWA ${version || '-'} / build ${build || '-'} / GAS ${gasUrl ? 'configured' : 'missing'}`,
        };
      },
    },
    {
      id: 'auth-session',
      label: 'Auth Session',
      run: async () => {
        const session = readJson('comphone_auth_session');
        const user = (global.APP && global.APP.user) || readJson('comphone_user');
        const hasSession = !!(session && session.token);
        const role = (user && (user.role || user.gasRole || user.roleLabel)) || (session && session.role) || '-';
        return {
          ok: !!user || hasSession,
          warn: !hasSession,
          details: `user=${user ? 'yes' : 'no'} token=${hasSession ? 'yes' : 'no'} role=${role}`,
        };
      },
    },
    {
      id: 'api-health',
      label: 'API Health',
      run: async () => {
        const started = Date.now();
        const res = await global.callApi('health', {});
        const elapsed = Date.now() - started;
        return {
          ok: !!res && res.success !== false,
          details: `${elapsed}ms ${res && (res.status || res.version || res.message || 'OK')}`,
        };
      },
    },
    {
      id: 'api-version',
      label: 'API Version',
      run: async () => {
        const started = Date.now();
        const res = await global.callApi('getVersion', {});
        const elapsed = Date.now() - started;
        const version = res && (res.version || res.app_version || res.data && res.data.version);
        return {
          ok: !!res && res.success !== false,
          warn: !version,
          details: `${elapsed}ms backend=${version || 'unknown'}`,
        };
      },
    },
    {
      id: 'menu-contract',
      label: 'Menu Contract',
      run: async () => {
        const contract = global.COMPHONE_API_CONTRACT;
        const menus = contract && Array.isArray(contract.menus) ? contract.menus : [];
        const mobilePages = document.querySelectorAll('[id^="page-"]').length;
        const pcSections = document.querySelectorAll('[id^="section-"]').length;
        return {
          ok: menus.length >= 6 && (mobilePages >= 10 || pcSections >= 10),
          details: `contract menus=${menus.length} mobile pages=${mobilePages} pc sections=${pcSections}`,
        };
      },
    },
    {
      id: 'menu-smoke',
      label: 'Menu API Smoke',
      run: async () => {
        const session = readJson('comphone_auth_session');
        if (!session || !session.token) {
          return { ok: true, warn: true, details: 'protected smoke skipped: no session token' };
        }
        const contract = global.COMPHONE_API_CONTRACT;
        const required = (contract && contract.menus || [])
          .flatMap(menu => (menu.actions || []).map(action => Object.assign({ menu: menu.id, menuLabel: menu.label }, action)))
          .filter(action => action.required && action.read)
          .slice(0, 6);
        const failures = [];
        for (const item of required) {
          const payload = sanitizePayload(item.payload || {});
          try {
            const res = await global.callApi(item.action, payload);
            if (!res || res.success === false) failures.push(item.action);
          } catch (e) {
            failures.push(item.action);
          }
        }
        return {
          ok: failures.length === 0,
          details: failures.length ? `failed: ${failures.join(', ')}` : `required read actions OK (${required.length})`,
        };
      },
    },
    {
      id: 'service-worker',
      label: 'Service Worker / Cache',
      run: async () => {
        if (!('serviceWorker' in navigator)) return { ok: true, warn: true, details: 'not supported' };
        const regs = await navigator.serviceWorker.getRegistrations();
        const cacheNames = 'caches' in global ? await caches.keys() : [];
        return {
          ok: regs.length > 0 || location.hostname === '127.0.0.1' || location.hostname === 'localhost',
          warn: regs.length === 0,
          details: `registrations=${regs.length} caches=${cacheNames.length} expected=${global.CACHE_VERSION || '-'}`,
        };
      },
    },
    {
      id: 'ai-safety',
      label: 'AI Safety Layer',
      run: async () => {
        const policy = !!global.POLICY_ENGINE || !!global.__TRUSTED_ACTIONS;
        const lock = !!global.LOCK_VERSION || !!global.GAS_EXECUTE || !!global.__TRUSTED_ACTIONS;
        const telemetry = typeof global.reportError === 'function' || typeof global.callApi === 'function';
        return {
          ok: lock && telemetry,
          warn: !policy,
          details: `lock=${lock ? 'yes' : 'no'} policy=${policy ? 'yes' : 'partial'} telemetry=${telemetry ? 'yes' : 'no'}`,
        };
      },
    },
    {
      id: 'ai-vision-runtime',
      label: 'AI Vision Runtime',
      run: async () => {
        const session = readJson('comphone_auth_session');
        if (!session || !session.token) {
          return { ok: true, warn: true, details: 'Vision protected checks skipped: no session token' };
        }
        const failures = [];
        const stats = await global.callApi('getVisionDashboardStats', { days: 7 });
        if (!stats || stats.success === false) failures.push('stats');
        const pipeline = await global.callApi('getVisionPipelineVersion', {});
        if (!pipeline || pipeline.success === false) failures.push('pipeline');
        const learning = await global.callApi('getVisionLearningVersion', {});
        if (!learning || learning.success === false) failures.push('learning');
        const total = stats && stats.stats ? stats.stats.total || 0 : 0;
        return {
          ok: failures.length === 0,
          details: failures.length ? `failed: ${failures.join(', ')}` : `Vision reads OK; 7-day records=${total}`,
        };
      },
    },
  ];

  function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }

  function sanitizePayload(payload) {
    return Object.keys(payload).reduce((acc, key) => {
      acc[key] = payload[key] === '__SMOKE_EMPTY__' ? '' : payload[key];
      return acc;
    }, {});
  }

  function score(results) {
    if (!results.length) return 0;
    const points = results.reduce((sum, item) => sum + (item.ok ? (item.warn ? 80 : 100) : 20), 0);
    return Math.round(points / results.length);
  }

  function statusOf(result) {
    if (result.ok && !result.warn) return 'ok';
    if (result.ok && result.warn) return 'warn';
    return 'fail';
  }

  function renderRuntimeSelfTestPanel(container) {
    if (!container) return;
    const results = STATE.results || [];
    const currentScore = score(results);
    container.innerHTML = `
      <div class="runtime-selftest-panel">
        <div class="runtime-selftest-head">
          <div>
            <div class="runtime-selftest-title"><i class="bi bi-radar"></i> Runtime Self-Test</div>
            <div class="runtime-selftest-sub">Checks session, API, menu contract, cache, and AI safety from the live browser runtime.</div>
          </div>
          <div class="runtime-selftest-score ${currentScore >= 90 ? 'ok' : currentScore >= 70 ? 'warn' : 'fail'}">${results.length ? currentScore : '--'}</div>
        </div>
        <div class="runtime-selftest-actions">
          <button id="runtime-selftest-run" class="runtime-selftest-btn" ${STATE.running ? 'disabled' : ''}>
            <i class="bi bi-play-fill"></i> ${STATE.running ? 'Running...' : 'Run Self-Test'}
          </button>
          <button id="runtime-selftest-export" class="runtime-selftest-btn secondary" ${results.length ? '' : 'disabled'}>
            <i class="bi bi-download"></i> Export
          </button>
        </div>
        <div class="runtime-selftest-meta">${STATE.lastRun ? `Last run: ${new Date(STATE.lastRun).toLocaleString('th-TH')}` : 'Not tested yet'}</div>
        <div id="runtime-selftest-results">
          ${results.length ? renderRows(results) : renderEmpty()}
        </div>
      </div>`;

    document.getElementById('runtime-selftest-run')?.addEventListener('click', () => runRuntimeSelfTest(container));
    document.getElementById('runtime-selftest-export')?.addEventListener('click', exportRuntimeSelfTest);
  }

  function renderEmpty() {
    return `
      <div class="runtime-selftest-empty">
        <i class="bi bi-shield-check"></i>
        <strong>Ready to verify the system foundation</strong>
        <span>Run this after login or deployment to catch runtime issues before users do.</span>
      </div>`;
  }

  function renderRows(results) {
    return results.map(result => `
      <div class="runtime-selftest-row ${statusOf(result)}">
        <div>
          <strong>${result.label}</strong>
          <span>${result.details || '-'}</span>
        </div>
        <div class="runtime-selftest-status">${statusOf(result).toUpperCase()}</div>
      </div>`).join('');
  }

  async function runRuntimeSelfTest(container) {
    if (STATE.running) return;
    STATE.running = true;
    STATE.results = [];
    renderRuntimeSelfTestPanel(container);

    const results = [];
    for (const check of CHECKS) {
      const started = Date.now();
      try {
        const res = await check.run();
        results.push(Object.assign({
          id: check.id,
          label: check.label,
          elapsedMs: Date.now() - started,
        }, res));
      } catch (e) {
        results.push({
          id: check.id,
          label: check.label,
          ok: false,
          elapsedMs: Date.now() - started,
          details: e && e.message ? e.message : String(e),
        });
      }
      STATE.results = results.slice();
      renderRuntimeSelfTestPanel(container);
    }

    STATE.lastRun = Date.now();
    STATE.running = false;
    renderRuntimeSelfTestPanel(container);
  }

  function exportRuntimeSelfTest() {
    const payload = {
      generated_at: new Date().toISOString(),
      score: score(STATE.results),
      app_version: global.COMPHONE_VERSION || global.__APP_VERSION || '',
      build: global.COMPHONE_BUILD || '',
      gas_version: global.COMPHONE_GAS_VER || (global.GAS_CONFIG && global.GAS_CONFIG.version) || '',
      results: STATE.results,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'comphone-runtime-selftest-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function showRuntimeSelfTestModal() {
    const existing = document.getElementById('runtime-selftest-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', `
      <div id="runtime-selftest-modal" class="runtime-selftest-modal" role="dialog" aria-modal="true">
        <div class="runtime-selftest-sheet">
          <div class="runtime-selftest-modal-head">
            <strong>Runtime Self-Test</strong>
            <button type="button" aria-label="Close" onclick="document.getElementById('runtime-selftest-modal')?.remove()">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div id="runtime-selftest-modal-content"></div>
        </div>
      </div>`);
    renderRuntimeSelfTestPanel(document.getElementById('runtime-selftest-modal-content'));
  }

  global.RUNTIME_SELF_TEST = STATE;
  global.renderRuntimeSelfTestPanel = renderRuntimeSelfTestPanel;
  global.runRuntimeSelfTest = runRuntimeSelfTest;
  global.exportRuntimeSelfTest = exportRuntimeSelfTest;
  global.showRuntimeSelfTestModal = showRuntimeSelfTestModal;
})(window);
