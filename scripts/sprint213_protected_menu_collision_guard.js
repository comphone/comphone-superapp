#!/usr/bin/env node
/**
 * Sprint 213 Protected Menu Collision Guard
 * Locks the production fix for mobile Jobs detail and the PC-to-Mobile handoff.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint213_protected_menu_collision_guard_latest.json');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');

function loadedScripts(indexHtml) {
  return [...indexHtml.matchAll(/<script[^>]+src="([^"?]+\.js)(?:\?[^"}]*)?"/g)]
    .map(match => match[1])
    .filter(file => fs.existsSync(path.join(ROOT, 'pwa', file)));
}

function globalFunctionDefinitions(files) {
  const definitions = new Map();
  files.forEach(file => {
    const source = read(path.join('pwa', file));
    for (const match of source.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) {
      if (!definitions.has(match[1])) definitions.set(match[1], []);
      definitions.get(match[1]).push(file);
    }
  });
  return definitions;
}

function main() {
  const index = read('pwa/index.html');
  const crm = read('pwa/crm_attendance.js');
  const app = read('pwa/app.js');
  const sw = read('pwa/sw.js');
  const pc = read('pwa/dashboard_pc.html');
  const regression = read('scripts/regression-guard.sh');
  const staticGuard = read('scripts/pwa_static_guard.js');
  const workflow = read('.github/workflows/auto-deploy.yml');
  const blueprint = read('BLUEPRINT.md');
  const definitions = globalFunctionDefinitions(loadedScripts(index));
  const showJobDetailOwners = definitions.get('showJobDetail') || [];

  const checks = [
    {
      id: 'jobs-detail-global-owner-is-unique',
      ok: showJobDetailOwners.length === 1 && showJobDetailOwners[0] === 'app_jobs.js',
      detail: { owners: showJobDetailOwners }
    },
    {
      id: 'crm-job-detail-is-namespaced',
      ok: crm.includes('function showCrmJobDetail(jobId)') &&
        crm.includes('onclick="showCrmJobDetail(') &&
        !/^function\s+showJobDetail\s*\(/m.test(crm)
    },
    {
      id: 'crm-reuses-canonical-job-renderer',
      ok: crm.includes("callApi('getJobDetail', { job_id: jobId })") &&
        crm.includes('normalizeJob(res.job)') &&
        crm.includes('showJobDetailV2(job.id || jobId)') &&
        !crm.includes("getElementById('modal-job-detail')")
    },
    {
      id: 'pc-mobile-links-open-separately',
      ok: (pc.match(/href="index\.html" target="_blank" rel="noopener"/g) || []).length === 2
    },
    {
      id: 'empty-offline-queue-does-not-block-navigation',
      ok: app.includes('function hasPendingOfflineActions_()') &&
        app.includes('Array.isArray(queue) ? queue.length > 0') &&
        app.includes('const hasOfflineQueue = hasPendingOfflineActions_();') &&
        !app.includes("const hasOfflineQueue = !!localStorage.getItem('comphone_offline_queue')")
    },
    {
      id: 'service-worker-scope-is-host-agnostic',
      ok: sw.includes("new URL(self.registration.scope).pathname.replace(/\\/+$/, '')") &&
        !sw.includes("const BASE = '/comphone-superapp/pwa'")
    },
    {
      id: 'completion-gates-wired',
      ok: regression.includes('sprint213_protected_menu_collision_guard') &&
        staticGuard.includes('sprint213_protected_menu_collision_guard.js') &&
        workflow.includes('sprint213_protected_menu_collision_guard.js')
    },
    {
      id: 'blueprint-current',
      ok: blueprint.includes('Sprint 213') && blueprint.includes('Protected Menu Collision')
    }
  ];

  const failures = checks.filter(check => !check.ok);
  const report = {
    sprint: 213,
    name: 'Protected Menu Collision Guard',
    generated_at: new Date().toISOString(),
    score: Math.round(((checks.length - failures.length) / checks.length) * 100),
    checks,
    failures
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

  if (failures.length) {
    console.error(`[Sprint 213] FAILED ${report.score}/100`);
    failures.forEach(failure => console.error(` - ${failure.id}`));
    process.exit(1);
  }
  console.log('[Sprint 213] OK 100/100 - Protected menu collision guard passed');
}

main();
