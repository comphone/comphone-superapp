#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const install = fs.readFileSync(path.join(ROOT, 'pwa', 'pwa_install.js'), 'utf8');
const version = fs.readFileSync(path.join(ROOT, 'pwa', 'version_config.js'), 'utf8');

const checks = [
  ['update-button-uses-update-flow', install.includes("addEventListener('click', _requestServiceWorkerUpdate_)")],
  ['registration-update-before-reload', install.indexOf('await reg.update()') > install.indexOf('async function _requestServiceWorkerUpdate_')],
  ['waiting-worker-activates', install.includes("reg.waiting.postMessage({ type: 'SKIP_WAITING' })")],
  ['installing-worker-waits-for-state', install.includes("worker.addEventListener('statechange', activateWhenReady)")],
  ['button-has-progress-state', install.includes("button.textContent = 'กำลังอัปเดต...'")],
  ['failed-update-repairs-registration', install.includes('_repairServiceWorker_(error)')]
  ,['network-only-version-bridge', version.includes('window.COMPHONE_FORCE_PWA_UPDATE = async function')]
  ,['legacy-button-capture-bridge', version.includes("target.closest('#pwa-update-btn')") && version.includes('event.stopImmediatePropagation()')]
  ,['install-delegates-to-version-bridge', install.includes("typeof window.COMPHONE_FORCE_PWA_UPDATE === 'function'")]
];
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('[Sprint 218] FAILED');
  failed.forEach(([id]) => console.error(` - ${id}`));
  process.exit(1);
}
console.log('[Sprint 218] OK - Service Worker update-click race guard passed');
