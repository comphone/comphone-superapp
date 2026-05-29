#!/usr/bin/env node
/**
 * Sprint 190 AI Vision Review Inbox Guard
 * Blocks regressions in the operator-facing Vision inbox that explains
 * what happened after LINE/PWA image ingress.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint190_ai_vision_review_inbox_guard_latest.json');

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function has(text, token) {
  return text.includes(token);
}

const files = {
  vision: read('pwa/section_vision.js'),
  contract: read('pwa/api_contract.js'),
  workflow: read('.github/workflows/auto-deploy.yml'),
  regression: read('scripts/regression-guard.sh'),
  blueprint: read('BLUEPRINT.md'),
};

const checks = [
  {
    id: 'review-inbox-state',
    ok: has(files.vision, 'reviewQueue') && has(files.vision, "reviewFilter: 'all'") && has(files.vision, 'lineIngress'),
  },
  {
    id: 'queue-normalization',
    ok: has(files.vision, 'normalizeVisionQueue') && has(files.vision, 'getVisionQueueStatus') && has(files.vision, 'needs-job'),
  },
  {
    id: 'operator-filters',
    ok: has(files.vision, 'buildReviewInboxSummary') && has(files.vision, 'setVisionQueueFilter') && has(files.vision, 'vision-inbox-filter'),
  },
  {
    id: 'line-ingress-visible',
    ok: has(files.vision, 'getVisionLineIngressStatus') && has(files.vision, 'buildLineIngressStatus') && has(files.vision, 'LINE ingress'),
  },
  {
    id: 'queue-actions-safe',
    ok: has(files.vision, 'selectQueuedVisionItem') && has(files.vision, 'queueLinkVisionToTimeline') && has(files.vision, 'submitQueuedVisionReview'),
  },
  {
    id: 'api-contract-covered',
    ok: has(files.contract, 'getVisionReviewQueue') && has(files.contract, 'getVisionLineIngressStatus'),
  },
  {
    id: 'ci-wiring',
    ok: has(files.workflow, 'sprint190_ai_vision_review_inbox_guard.js') && has(files.regression, 'sprint190_ai_vision_review_inbox_guard'),
  },
  {
    id: 'blueprint-handoff',
    ok: has(files.blueprint, 'Sprint 190') && has(files.blueprint, 'AI Vision Review Inbox'),
  },
];

const failures = checks.filter(check => !check.ok);
const report = {
  sprint: 190,
  name: 'AI Vision Review Inbox Guard',
  generated_at: new Date().toISOString(),
  score: Math.round(((checks.length - failures.length) / checks.length) * 100),
  checks,
  failures,
};

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

if (failures.length) {
  console.error('[Sprint 190] FAILED');
  failures.forEach(failure => console.error(` - ${failure.id}`));
  console.error(`[Sprint 190] report: ${path.relative(ROOT, REPORT)}`);
  process.exit(1);
}

console.log(`[Sprint 190] OK ${report.score}/100 - AI Vision Review Inbox guard passed`);
console.log(`[Sprint 190] report: ${path.relative(ROOT, REPORT)}`);
