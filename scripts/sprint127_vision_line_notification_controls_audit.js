#!/usr/bin/env node
/*
 * Sprint 127 Vision + LINE Notification Controls Audit
 *
 * Guards per-room LINE notification toggles. Muting a room must suppress only
 * outbound LINE pushes while backend Vision processing, queues, and audit logs
 * continue normally.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(ROOT, 'test_reports', 'sprint127_vision_line_notification_controls_latest.json');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, needle) {
  return typeof needle === 'string' ? text.includes(needle) : needle.test(text);
}

const checks = [];
function check(name, pass, detail) {
  checks.push({ name, pass: Boolean(pass), detail });
}

const files = {
  lineCenter: read('clasp-ready/LineCommandCenter.gs'),
  lineCenterRoot: read('LineCommandCenter.gs'),
  visionPipeline: read('clasp-ready/VisionPipeline.gs'),
  visionPipelineRoot: read('VisionPipeline.gs'),
  routerSplit: read('clasp-ready/RouterSplit.gs'),
  routerSplitRoot: read('RouterSplit.gs'),
  sectionLine: read('pwa/section_line_center.js'),
  apiContract: read('pwa/api_contract.js'),
  app: read('pwa/app.js'),
  lineSmoke: read('scripts/pwa_line_room_smoke.js'),
  staticGuard: read('scripts/pwa_static_guard.js'),
  regressionGuard: read('scripts/regression-guard.sh'),
  autoDeploy: read('.github/workflows/auto-deploy.yml'),
  blueprint: read('BLUEPRINT.md'),
};

check(
  'room-notification-settings-api',
  has(files.lineCenter, 'function getLineNotificationSettings') &&
    has(files.lineCenter, 'function updateLineNotificationSettings') &&
    has(files.lineCenter, 'LINE_NOTIFY_') &&
    has(files.lineCenter, 'notification-only-toggle'),
  'Backend must expose per-room notification settings without storing real room IDs in repo.'
);

check(
  'mute-suppresses-only-push',
  has(files.lineCenter, 'room notifications disabled; backend log retained') &&
    has(files.lineCenter, 'LINE_NOTIFICATION_SUPPRESSED') &&
    has(files.lineCenter, 'backendContinues: true') &&
    has(files.visionPipeline, 'room notifications disabled; Vision processing and logs retained'),
  'Muted rooms must skip outbound LINE push only while backend processing and audit logging continue.'
);

check(
  'vision-router-respects-mute',
  has(files.visionPipeline, '_lineCenterIsRoomNotificationEnabled_') &&
    has(files.visionPipeline, '_lineCenterRecordSuppressedNotification_') &&
    has(files.visionPipeline, 'AI_VISION_LINE_NOTIFICATION'),
  'AI Vision LINE routing must use the central room notification toggle.'
);

check(
  'root-clasp-aligned',
  files.lineCenter === files.lineCenterRoot &&
    files.visionPipeline === files.visionPipelineRoot &&
    files.routerSplit === files.routerSplitRoot,
  'Root and clasp-ready GAS sources must stay aligned for deployment.'
);

check(
  'router-contract',
  has(files.routerSplit, "'getLineNotificationSettings'") &&
    has(files.routerSplit, "'updateLineNotificationSettings'"),
  'RouterSplit must expose notification read/update actions.'
);

check(
  'pwa-controls',
  has(files.sectionLine, 'toggleLineRoomNotification') &&
    has(files.sectionLine, 'backend still logs') &&
    has(files.sectionLine, 'notifications off') &&
    has(files.sectionLine, 'updateLineNotificationSettings'),
  'PC/mobile LINE Center must show per-room notification toggles and explain that backend logs continue.'
);

check(
  'api-contract-and-smoke',
  has(files.apiContract, 'getLineNotificationSettings') &&
    has(files.apiContract, 'updateLineNotificationSettings') &&
    has(files.apiContract, 'toggles outbound room notifications only') &&
    has(files.app, 'getLineNotificationSettings: true') &&
    has(files.lineSmoke, 'getLineNotificationSettings'),
  'API contract, read-action classification, and smoke harness must know the notification settings boundary.'
);

check(
  'ci-wiring',
  has(files.staticGuard, 'SPRINT127_VISION_LINE_NOTIFICATION_CONTROLS') &&
    has(files.regressionGuard, 'sprint127_vision_line_notification_controls_audit.js') &&
    has(files.autoDeploy, 'scripts/sprint127_vision_line_notification_controls_audit.js'),
  'Sprint 127 audit must be wired into static guard, regression guard, and GitHub Actions.'
);

check(
  'blueprint-current',
  has(files.blueprint, 'Phase 127 Vision + LINE Notification Controls') &&
    has(files.blueprint, 'notification-only-toggle') &&
    has(files.blueprint, 'sprint127_vision_line_notification_controls_audit.js'),
  'BLUEPRINT.md must document muted-room behavior and current guard coverage.'
);

const failed = checks.filter(item => !item.pass);
const report = {
  generated_at: new Date().toISOString(),
  sprint: 127,
  title: 'Vision + LINE Notification Controls Audit',
  score: `${checks.length - failed.length}/${checks.length}`,
  checks,
};

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');

console.log('Sprint 127 Vision + LINE Notification Controls Audit');
console.log(`Score: ${report.score}`);
for (const item of checks) {
  console.log(`${item.pass ? 'OK ' : 'FAIL'} ${item.name} - ${item.detail}`);
}
console.log(`[Sprint 127] report: ${path.relative(ROOT, REPORT_PATH).replace(/\\/g, '/')}`);

if (failed.length) process.exitCode = 1;
