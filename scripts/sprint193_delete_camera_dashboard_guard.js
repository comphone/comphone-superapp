#!/usr/bin/env node
/**
 * Sprint 193 Delete/Camera/Dashboard Guard
 * Protects the operator-facing fixes requested after Sprint 192:
 * - main mobile navigation must open a job, not the camera
 * - camera remains available inside job detail
 * - admin/owner cleanup tools are visible from the grouped menu
 * - mobile job delete uses the centralized API client with archive wording
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint193_delete_camera_dashboard_guard_latest.json');

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function has(text, token) {
  return text.includes(token);
}

const files = {
  index: read('pwa/index.html'),
  app: read('pwa/app.js'),
  actions: read('pwa/app_actions.js'),
  jobs: read('pwa/app_jobs.js'),
  admin: read('pwa/admin_panel.js'),
  backend: read('clasp-ready/JobsHandler.gs'),
  smokeCleanup: read('clasp-ready/SmokeCleanup.gs'),
  workflow: read('.github/workflows/auto-deploy.yml'),
  regression: read('scripts/regression-guard.sh'),
  staticGuard: read('scripts/pwa_static_guard.js'),
  blueprint: read('BLUEPRINT.md'),
};

const navButtonMatch = files.index.match(/<button class="nav-btn nav-camera-btn"[\s\S]*?<\/button>/);
const navButton = navButtonMatch ? navButtonMatch[0] : '';

const checks = [
  {
    id: 'main-nav-opens-job-not-camera',
    ok: has(navButton, 'onclick="openNewJob()"') &&
      has(navButton, 'bi-plus-lg') &&
      !has(navButton, "openCamera('job')") &&
      !has(navButton, 'bi-camera-fill'),
  },
  {
    id: 'camera-stays-inside-job-detail',
    ok: has(files.jobs, 'openCameraForJob') &&
      has(files.jobs, 'onclick="openCameraForJob(${jobArg});closeModal') &&
      has(files.actions, 'function openCameraForJob(jobId)') &&
      has(files.index, 'id="camera-input"'),
  },
  {
    id: 'camera-page-not-restored-as-main-state',
    ok: has(files.app, 'const RESTORABLE_PAGES = new Set') &&
      !/RESTORABLE_PAGES[\s\S]*'camera'/.test(files.app.split('const MENU_GROUPS =')[0]),
  },
  {
    id: 'cleanup-tools-visible-for-admin-owner',
    ok: has(files.app, "'cleanup-tools'") &&
      has(files.app, 'openCleanupTools') &&
      has(files.actions, 'function openCleanupTools()') &&
      has(files.actions, 'admin-smoke-cleanup') &&
      has(files.admin, 'id="admin-smoke-cleanup"') &&
      has(files.admin, 'cleanupSmokeTestRecords'),
  },
  {
    id: 'job-delete-api-client-safe',
    ok: has(files.jobs, 'function mobileJobApi') &&
      has(files.jobs, "mobileJobApi('deleteJob'") &&
      has(files.jobs, 'callAPI') &&
      has(files.jobs, 'callApi') &&
      has(files.jobs, 'archive-before-delete protection'),
  },
  {
    id: 'backend-delete-remains-archive-protected',
    ok: has(files.backend, 'function deleteJob') &&
      has(files.backend, 'getOrCreateJobArchiveSheet_') &&
      has(files.backend, "confirmText !== 'DELETE_JOB'") &&
      has(files.backend, 'archive.appendRow') &&
      has(files.backend, 'deleteRow(rowIndex)'),
  },
  {
    id: 'smoke-cleanup-remains-confirm-gated',
    ok: has(files.smokeCleanup, 'DELETE_REVIEWED_SMOKE_RECORDS') &&
      has(files.smokeCleanup, 'archiveSmokeCleanupRow_') &&
      has(files.smokeCleanup, 'smokeCleanupRowHasMarker_'),
  },
  {
    id: 'fab-no-longer-opens-camera',
    ok: has(files.actions, 'const actions = { tech: openNewJob, admin: openNewJob, acct: createReceipt, exec: viewDashboard }'),
  },
  {
    id: 'ci-wiring',
    ok: has(files.workflow, 'sprint193_delete_camera_dashboard_guard.js') &&
      has(files.regression, 'sprint193_delete_camera_dashboard_guard') &&
      has(files.staticGuard, 'sprint193_delete_camera_dashboard_guard.js'),
  },
  {
    id: 'blueprint-current',
    ok: has(files.blueprint, 'Sprint 193') &&
      has(files.blueprint, 'Delete/Camera/Dashboard'),
  },
];

const failures = checks.filter(check => !check.ok);
const report = {
  sprint: 193,
  name: 'Delete/Camera/Dashboard Guard',
  generated_at: new Date().toISOString(),
  score: Math.round(((checks.length - failures.length) / checks.length) * 100),
  checks,
  failures,
};

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

if (failures.length) {
  console.error('[Sprint 193] FAILED');
  failures.forEach(failure => console.error(` - ${failure.id}`));
  console.error(`[Sprint 193] report: ${path.relative(ROOT, REPORT)}`);
  process.exit(1);
}

console.log(`[Sprint 193] OK ${report.score}/100 - Delete/camera/dashboard guard passed`);
console.log(`[Sprint 193] report: ${path.relative(ROOT, REPORT)}`);
