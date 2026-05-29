#!/usr/bin/env node
/**
 * Sprint 191 AI Vision Inbox Render Smoke
 * Executes section_vision.js in a small browser-like VM and verifies that
 * the PC/mobile Vision surfaces can render the operator inbox without auth.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint191_ai_vision_inbox_render_smoke_latest.json');

function makeElement(id) {
  return {
    id,
    innerHTML: '',
    textContent: '',
    value: '',
    style: {},
    prepend(node) {
      this.innerHTML = `${node.textContent || node.innerHTML || ''}${this.innerHTML}`;
    },
  };
}

function createSandbox() {
  const elements = new Map();
  const sandbox = {
    console,
    setTimeout(fn) { if (typeof fn === 'function') fn(); return 0; },
    alert() {},
    confirm() { return false; },
    prompt() { return null; },
    navigator: { clipboard: { writeText() {} } },
    localStorage: { getItem() { return ''; }, setItem() {} },
    APP: { user: { username: 'render-smoke' } },
    innerWidth: 390,
    document: {
      createElement() { return makeElement('created'); },
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, makeElement(id));
        return elements.get(id);
      },
    },
    callApi: async action => {
      if (action === 'getVisionReviewQueue') {
        return {
          success: true,
          queue: [
            { visionLogId: 'VL-NEED-JOB', type: 'QC', decision: 'NEED_REVIEW', confidence: 0.72, source: 'LINE Sales', createdAt: '2026-05-29T09:00:00+07:00' },
            { visionLogId: 'VL-LINKED', type: 'SLIP', decision: 'APPROVED', jobId: 'J0001', confidence: 0.96, source: 'PWA', createdAt: '2026-05-29T09:05:00+07:00' },
            { visionLogId: 'VL-FAILED', type: 'QC', decision: 'FAILED', jobId: 'J0002', confidence: 0.21, source: 'LINE Tech', createdAt: '2026-05-29T09:10:00+07:00' },
          ],
        };
      }
      if (action === 'getVisionLineIngressStatus') {
        return { success: true, queued: 1, processed: 2, failed: 1 };
      }
      if (action === 'getVisionFieldContext') {
        return { success: true, context_available: false };
      }
      return { success: true };
    },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.__elements = elements;
  return sandbox;
}

function check(id, ok, detail = '') {
  return { id, ok: Boolean(ok), detail };
}

(async function main() {
  const source = fs.readFileSync(path.join(ROOT, 'pwa', 'section_vision.js'), 'utf8');
  const sandbox = createSandbox();
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'section_vision.js' });

  const pcHtml = sandbox.renderVisionSection();
  sandbox.document.getElementById('vision-review-summary');
  sandbox.document.getElementById('vision-review-queue');
  sandbox.document.getElementById('vision-line-ingress-status');
  await sandbox.loadVisionReviewQueue();
  await sandbox.loadVisionLineIngressStatus();
  const summaryHtml = sandbox.__elements.get('vision-review-summary').innerHTML;
  const queueHtml = sandbox.__elements.get('vision-review-queue').innerHTML;
  const ingressHtml = sandbox.__elements.get('vision-line-ingress-status').innerHTML;
  sandbox.setVisionQueueFilter('needs-job');
  const needsJobHtml = sandbox.__elements.get('vision-review-queue').innerHTML;

  sandbox.document.getElementById('vision-content');
  sandbox.renderMobileVisionPage();
  const mobileHtml = sandbox.__elements.get('vision-content').innerHTML;

  const checks = [
    check('pc-shell-renders', pcHtml.includes('AI Vision Center') && pcHtml.includes('Vision Review Inbox')),
    check('mobile-shell-renders', mobileHtml.includes('AI Vision Center') && mobileHtml.includes('Vision Review Inbox')),
    check('review-summary-filters', ['Need JobID', 'Review', 'Failed', 'Linked', 'Approved'].every(token => summaryHtml.includes(token))),
    check('queue-status-badges', ['needs-job', 'approved', 'failed'].every(token => queueHtml.includes(token))),
    check('queue-actions', ['queueLinkVisionToTimeline', 'submitQueuedVisionReview', 'loadVisionFieldContext'].every(token => queueHtml.includes(token))),
    check('line-ingress-renders', ingressHtml.includes('LINE ingress') && ingressHtml.includes('Queued 1') && ingressHtml.includes('Failed 1')),
    check('filter-renders-needs-job-only', needsJobHtml.includes('VL-NEED-JOB') && !needsJobHtml.includes('VL-LINKED')),
  ];
  const failures = checks.filter(item => !item.ok);
  const report = {
    sprint: 191,
    name: 'AI Vision Inbox Render Smoke',
    generated_at: new Date().toISOString(),
    score: Math.round(((checks.length - failures.length) / checks.length) * 100),
    checks,
    failures,
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
  if (failures.length) {
    console.error('[Sprint 191] FAILED');
    failures.forEach(item => console.error(` - ${item.id}`));
    console.error(`[Sprint 191] report: ${path.relative(ROOT, REPORT)}`);
    process.exit(1);
  }
  console.log(`[Sprint 191] OK ${report.score}/100 - AI Vision Inbox render smoke passed`);
  console.log(`[Sprint 191] report: ${path.relative(ROOT, REPORT)}`);
})();
