#!/usr/bin/env node
/**
 * Sprint 212 Auth-Aware Startup Guard
 * Prevents protected dashboard reads before login and keeps Background Sync
 * registration demand-driven instead of requesting permission on every boot.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint212_auth_aware_startup_guard_latest.json');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

async function verifyWarrantyRuntime(warrantySource) {
  const domListeners = {};
  const windowListeners = {};
  const banner = {
    innerHTML: '',
    classList: { add() {}, remove() {} }
  };
  let token = '';
  let protectedCalls = 0;

  const context = {
    console,
    setTimeout,
    clearTimeout,
    getAuthToken: () => token,
    localStorage: { getItem: () => null },
    callAPI: async action => {
      if (action === 'getWarrantyDue') protectedCalls += 1;
      return { success: true, warranties: [] };
    },
    document: {
      addEventListener(name, fn) { domListeners[name] = fn; },
      removeEventListener() {},
      getElementById(id) { return id === 'warranty-alert-banner' ? banner : null; },
      body: { insertAdjacentHTML() {}, appendChild() {} }
    },
    window: {
      addEventListener(name, fn) { windowListeners[name] = fn; }
    }
  };
  context.window.window = context.window;
  vm.runInNewContext(warrantySource, context, { filename: 'pwa/warranty_ui.js' });

  if (typeof domListeners.DOMContentLoaded !== 'function') {
    return { ok: false, detail: 'DOMContentLoaded handler missing' };
  }
  await domListeners.DOMContentLoaded();
  const preAuthCalls = protectedCalls;

  token = 'test-session-token';
  if (typeof windowListeners['comphone:authenticated'] !== 'function') {
    return { ok: false, detail: 'authenticated event handler missing', preAuthCalls };
  }
  await windowListeners['comphone:authenticated']();
  return {
    ok: preAuthCalls === 0 && protectedCalls === 1,
    preAuthCalls,
    postAuthCalls: protectedCalls
  };
}

async function main() {
  const files = {
    warranty: read('pwa/warranty_ui.js'),
    auth: read('pwa/auth.js'),
    install: read('pwa/pwa_install.js'),
    app: read('pwa/app.js'),
    offline: read('pwa/offline_db.js'),
    offlineV2: read('pwa/offline_db_v2.js'),
    regression: read('scripts/regression-guard.sh'),
    staticGuard: read('scripts/pwa_static_guard.js'),
    workflow: read('.github/workflows/auto-deploy.yml'),
    blueprint: read('BLUEPRINT.md')
  };

  const runtime = await verifyWarrantyRuntime(files.warranty);
  const checks = [
    { id: 'warranty-no-protected-read-before-auth', ok: runtime.ok, detail: runtime },
    {
      id: 'auth-emits-ready-event',
      ok: files.auth.includes("new CustomEvent('comphone:authenticated'") &&
        files.auth.includes('window.dispatchEvent')
    },
    {
      id: 'background-sync-demand-driven',
      ok: files.install.includes('function requestOfflineBackgroundSync()') &&
        files.install.includes('if (_hasPendingOfflineQueue_()) requestOfflineBackgroundSync();') &&
        !files.install.includes("console.warn('[PWA] BG Sync registration failed:")
    },
    {
      id: 'all-offline-queues-request-sync',
      ok: files.app.includes('window.requestOfflineBackgroundSync();') &&
        files.offline.includes('window.requestOfflineBackgroundSync();') &&
        files.offlineV2.includes('window.requestOfflineBackgroundSync();')
    },
    {
      id: 'sprint211-and-212-regression-wiring',
      ok: files.regression.includes('sprint211_system_step_test') &&
        files.regression.includes('sprint212_auth_aware_startup_guard') &&
        files.staticGuard.includes('sprint211_system_step_test.js') &&
        files.staticGuard.includes('sprint212_auth_aware_startup_guard.js') &&
        files.workflow.includes('sprint212_auth_aware_startup_guard.js')
    },
    {
      id: 'blueprint-current',
      ok: files.blueprint.includes('Sprint 212') && files.blueprint.includes('Auth-Aware Startup')
    }
  ];

  const failures = checks.filter(check => !check.ok);
  const report = {
    sprint: 212,
    name: 'Auth-Aware Startup Guard',
    generated_at: new Date().toISOString(),
    score: Math.round(((checks.length - failures.length) / checks.length) * 100),
    checks,
    failures
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

  if (failures.length) {
    console.error(`[Sprint 212] FAILED ${report.score}/100`);
    failures.forEach(failure => console.error(` - ${failure.id}`));
    process.exit(1);
  }
  console.log(`[Sprint 212] OK ${report.score}/100 - Auth-aware startup guard passed`);
}

main().catch(error => {
  console.error('[Sprint 212] fatal:', error && error.stack ? error.stack : error);
  process.exit(1);
});
