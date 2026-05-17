#!/usr/bin/env node
/*
 * Sprint 108 Database Schema Registry Guard
 *
 * Static, read-only guard for the production Google Sheets data layer.
 * It prevents schema drift by checking that source code uses the single
 * production spreadsheet and only references registered sheet names.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint108_database_schema_registry_guard_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint108_database_schema_registry_guard_latest.md');
const REGISTRY_FILE = path.join(ROOT, 'docs', 'database_schema_registry.json');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function listFiles(dir, suffix) {
  const base = path.join(ROOT, dir);
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base)
    .filter(name => name.endsWith(suffix))
    .map(name => path.join(dir, name).replace(/\\/g, '/'));
}

function extractSheetNames(rel, text) {
  const names = [];
  const direct = /(?:getSheetByName|insertSheet)\(\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = direct.exec(text))) names.push({ file: rel, name: match[1], kind: match[0].startsWith('insertSheet') ? 'create' : 'read' });
  const constants = /\b(?:var|const|let)\s+[A-Z0-9_]*SHEET[A-Z0-9_]*\s*=\s*['"]([^'"]+)['"]/g;
  while ((match = constants.exec(text))) names.push({ file: rel, name: match[1], kind: 'constant' });
  return names;
}

function extractSpreadsheetIds(rel, text) {
  const ids = [];
  const re = /(?:spreadsheets\/d\/|openById\(\s*['"]|_FALLBACK_SS_ID\s*=\s*['"])([A-Za-z0-9_-]{35,})(?:['"/)]|$)/g;
  let match;
  while ((match = re.exec(text))) {
    const id = match[1];
    if (id.startsWith('AKfy')) continue;
    ids.push({ file: rel, id });
  }
  return ids;
}

function has(text, pattern) {
  return pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
}

function main() {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
  const canonical = new Set(Object.keys(registry.canonical_tables || {}));
  const support = new Set(Object.keys(registry.support_tables || {}));
  const aliases = registry.aliases || {};
  const aliasNames = new Set(Object.keys(aliases));
  const allowedSheets = new Set([...canonical, ...support, ...aliasNames]);
  const expectedSpreadsheetId = registry.spreadsheet && registry.spreadsheet.id;

  const files = [
    'BLUEPRINT.md',
    'Config.gs',
    'clasp-ready/Config.gs',
    'pwa/section_settings.js',
    ...listFiles('clasp-ready', '.gs'),
  ];

  const findings = [];
  const warnings = [];
  const failures = [];
  const allSheets = [];
  const spreadsheetIds = [];

  for (const rel of files) {
    const text = read(rel);
    allSheets.push(...extractSheetNames(rel, text));
    spreadsheetIds.push(...extractSpreadsheetIds(rel, text));
  }

  function fail(code, detail) {
    failures.push({ code, detail });
  }

  function warn(code, detail) {
    warnings.push({ code, detail });
  }

  const rootConfig = read('Config.gs');
  const claspConfig = read('clasp-ready/Config.gs');
  const blueprint = read('BLUEPRINT.md');
  const staticGuard = read('scripts/pwa_static_guard.js');
  const workflow = read('.github/workflows/auto-deploy.yml');
  const regression = read('scripts/regression-guard.sh');

  if (!has(rootConfig, 'SHEET_ALIASES') || !has(rootConfig, 'getCanonicalSheetName') || !has(rootConfig, 'findComphoneSheetByName')) {
    fail('root-config-registry-missing', 'Config.gs must expose SHEET_ALIASES, getCanonicalSheetName(), and findComphoneSheetByName().');
  }
  if (!has(claspConfig, 'SHEET_ALIASES') || !has(claspConfig, 'getCanonicalSheetName') || !has(claspConfig, 'findComphoneSheetByName')) {
    fail('clasp-config-registry-missing', 'clasp-ready/Config.gs must expose SHEET_ALIASES, getCanonicalSheetName(), and findComphoneSheetByName().');
  }
  if (!has(blueprint, expectedSpreadsheetId)) {
    fail('blueprint-spreadsheet-id-missing', 'BLUEPRINT.md must document the active production Spreadsheet ID.');
  }
  if (!has(staticGuard, 'sprint108_database_schema_registry_guard.js') ||
      !has(workflow, 'sprint108_database_schema_registry_guard.js') ||
      !has(regression, 'sprint108_database_schema_registry_guard.js')) {
    fail('ci-wiring-missing', 'Sprint 108 guard must be wired into static guard, GitHub Actions, and regression guard.');
  }

  for (const item of allSheets) {
    if (allowedSheets.has(item.name)) {
      if (aliasNames.has(item.name)) {
        warn('legacy-sheet-alias', `${item.file}: ${item.name} -> ${aliases[item.name]}`);
      }
      findings.push(item);
      continue;
    }
    if (/^(DB_|DBJOBS|VISION_|SYSTEM_|LineChatHistory|PROP_)/.test(item.name)) {
      fail('unregistered-sheet-name', `${item.file}: ${item.name} is not registered in docs/database_schema_registry.json`);
    }
  }

  const uniqueIds = [...new Set(spreadsheetIds.map(row => row.id))];
  for (const id of uniqueIds) {
    if (id !== expectedSpreadsheetId) {
      warn('non-production-spreadsheet-id', `Found non-production spreadsheet-like ID: ${id}`);
    }
  }
  if (!uniqueIds.includes(expectedSpreadsheetId)) {
    fail('production-spreadsheet-id-not-found', 'No source/documentation reference to the registered production Spreadsheet ID was found.');
  }

  const activeSpreadsheetFiles = files
    .filter(rel => rel.startsWith('clasp-ready/'))
    .filter(rel => read(rel).includes('SpreadsheetApp.getActiveSpreadsheet()'));
  for (const rel of activeSpreadsheetFiles) {
    warn('active-spreadsheet-context', `${rel} uses SpreadsheetApp.getActiveSpreadsheet(); prefer getComphoneSheet() for production modules.`);
  }

  const status = failures.length ? 'fail' : 'warning';
  const score = Math.max(0, 100 - failures.length * 25 - Math.min(warnings.length, 10));
  const report = {
    generated_at: new Date().toISOString(),
    version: registry.version,
    status,
    score,
    spreadsheet_id: expectedSpreadsheetId,
    scanned_files: files.length,
    registered_tables: canonical.size + support.size,
    aliases: Object.keys(aliases).length,
    sheet_references: findings.length,
    warnings,
    failures,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# Sprint 108 Database Schema Registry Guard',
    '',
    `- Generated: ${report.generated_at}`,
    `- Status: ${report.status}`,
    `- Score: ${report.score}/100`,
    `- Spreadsheet ID: ${report.spreadsheet_id}`,
    `- Scanned files: ${report.scanned_files}`,
    `- Registered tables: ${report.registered_tables}`,
    `- Aliases: ${report.aliases}`,
    `- Sheet references: ${report.sheet_references}`,
    `- Warnings: ${report.warnings.length}`,
    `- Failures: ${report.failures.length}`,
    '',
    '## Warnings',
    '',
    ...(warnings.length ? warnings.map(row => `- ${row.code}: ${row.detail}`) : ['- None']),
    '',
    '## Failures',
    '',
    ...(failures.length ? failures.map(row => `- ${row.code}: ${row.detail}`) : ['- None']),
    '',
  ].join('\n'), 'utf8');

  console.log(`[Sprint 108 Schema Guard] ${status.toUpperCase()} score=${score}/100 warnings=${warnings.length} failures=${failures.length}`);
  if (failures.length) process.exit(1);
}

main();
