#!/usr/bin/env node
/*
 * Sprint 109 Data Repair Console Plan
 *
 * Read-only operator plan for production data repairs. It turns the latest
 * quality/cleanup reports into a menu-by-menu repair console checklist without
 * mutating Google Sheets.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const OUT_JSON = path.join(REPORT_DIR, 'sprint109_data_repair_console_plan_latest.json');
const OUT_MD = path.join(REPORT_DIR, 'sprint109_data_repair_console_plan_latest.md');
const SPRINT106 = path.join(REPORT_DIR, 'sprint106_production_data_quality_latest.json');
const SPRINT107 = path.join(REPORT_DIR, 'sprint107_controlled_data_cleanup_plan_latest.json');

function loadJson(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return { parse_error: err.message };
  }
}

function buildTasks(s106, s107) {
  const tasks = [];
  const notes = [];

  if (!s106) notes.push('Sprint 106 report missing; run production data quality guard before live repair.');
  if (!s107) notes.push('Sprint 107 report missing; run controlled cleanup planner before live repair.');

  const planned = s107 && Array.isArray(s107.actions) ? s107.actions : [];
  for (const action of planned) {
    tasks.push({
      menu: action.scope === 'billing' ? 'Billing' : 'Reports',
      source: action.source,
      row_number: action.row_number || null,
      priority: action.scope === 'billing' ? 'P1' : 'P2',
      mode: 'manual-review',
      safe_to_automate: false,
      archive_required: true,
      operator_steps: action.scope === 'billing'
        ? [
            'Open DB_BILLING and inspect the row number listed in the plan.',
            'Confirm whether the row is an orphan, duplicate, or incomplete real billing record.',
            'Archive the row snapshot before any edit/delete.',
            'If real, backfill only from a matching DBJOBS record; if orphan, delete only after owner confirmation.'
          ]
        : [
            'Confirm whether the current month should have revenue records.',
            'Trace report inputs from DB_BILLING date/status/amount fields.',
            'Do not edit Reports.gs until the source data shape is confirmed.',
            'Record the outcome in the repair log before closing the task.'
          ],
      recommendation: action.recommended_action || ''
    });
  }

  if (s106 && Array.isArray(s106.live_results)) {
    const hasBillingWarn = s106.live_results.some(row => row.area === 'billing' && row.status_label === 'WARN');
    const hasReportWarn = s106.live_results.some(row => row.area === 'reports' && row.status_label === 'WARN');
    if (!hasBillingWarn && !hasReportWarn && tasks.length === 0) {
      notes.push('Latest Sprint 106 report has no Billing/Reports repair warnings.');
    }
  }

  return { tasks, notes };
}

function main() {
  const s106 = loadJson(SPRINT106);
  const s107 = loadJson(SPRINT107);
  const plan = buildTasks(s106, s107);
  const report = {
    generated_at: new Date().toISOString(),
    version: 'sprint109-data-repair-console-plan-1.0.0',
    status: 'ok',
    mode: 'read-only-plan',
    tasks: plan.tasks,
    notes: plan.notes,
    next_operator_menus: ['Jobs', 'Billing', 'Reports', 'Inventory/PO', 'AI Vision/LINE'],
    safety_policy: {
      production_mutation: false,
      archive_before_change: true,
      owner_confirmation_required: true,
      token_required_for_live_repair: true
    }
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_MD, [
    '# Sprint 109 Data Repair Console Plan',
    '',
    `- Generated: ${report.generated_at}`,
    `- Status: ${report.status}`,
    `- Mode: ${report.mode}`,
    `- Tasks: ${report.tasks.length}`,
    '',
    '## Tasks',
    '',
    '| Priority | Menu | Source | Row | Mode | Archive Required | Recommendation |',
    '|---|---|---|---:|---|---|---|',
    ...report.tasks.map(task => `| ${task.priority} | ${task.menu} | ${task.source} | ${task.row_number || '-'} | ${task.mode} | ${task.archive_required ? 'yes' : 'no'} | ${task.recommendation} |`),
    '',
    '## Next Operator Menus',
    '',
    ...report.next_operator_menus.map(item => `- ${item}`),
    '',
    '## Notes',
    '',
    ...(report.notes.length ? report.notes.map(note => `- ${note}`) : ['- None']),
    '',
  ].join('\n'), 'utf8');

  console.log(`[Sprint 109 Data Repair Console] OK tasks=${report.tasks.length} mode=${report.mode}`);
}

main();
