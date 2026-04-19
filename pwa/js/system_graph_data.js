/**
 * system_graph_data.js — COMPHONE System Graph Data Adapter
 * Version: 5.5.8
 *
 * RULE: ใช้ callApi() จาก api_client.js เท่านั้น
 * DATA SOURCE: getSystemMetrics + health endpoints
 */
'use strict';

// ===== STATIC GRAPH STRUCTURE =====
// กำหนด nodes และ edges ของระบบ (topology)

const SYSTEM_NODES_DEF = [
  // CORE
  { id: 'Router',     type: 'core',   label: 'Router',      icon: '⚡', group: 'core' },
  { id: 'Auth',       type: 'core',   label: 'Auth',        icon: '🔐', group: 'core' },
  { id: 'Security',   type: 'core',   label: 'Security',    icon: '🛡️', group: 'core' },
  { id: 'Dashboard',  type: 'core',   label: 'Dashboard',   icon: '📊', group: 'core' },
  // MODULES
  { id: 'CRM',        type: 'module', label: 'CRM',         icon: '👥', group: 'module' },
  { id: 'Jobs',       type: 'module', label: 'Jobs',        icon: '🔧', group: 'module' },
  { id: 'Billing',    type: 'module', label: 'Billing',     icon: '💰', group: 'module' },
  { id: 'Inventory',  type: 'module', label: 'Inventory',   icon: '📦', group: 'module' },
  { id: 'Reports',    type: 'module', label: 'Reports',     icon: '📈', group: 'module' },
  { id: 'Warranty',   type: 'module', label: 'Warranty',    icon: '🛡', group: 'module' },
  { id: 'MultiBranch',type: 'module', label: 'MultiBranch', icon: '🏢', group: 'module' },
  // DATA
  { id: 'DB_JOBS',      type: 'data', label: 'DB_JOBS',      icon: '🗄️', group: 'data' },
  { id: 'DB_CUSTOMERS', type: 'data', label: 'DB_CUSTOMERS', icon: '🗄️', group: 'data' },
  { id: 'DB_INVENTORY', type: 'data', label: 'DB_INVENTORY', icon: '🗄️', group: 'data' },
];

const SYSTEM_EDGES_DEF = [
  // Router → CORE
  { from: 'Router', to: 'Auth',       type: 'AUTH_FLOW',  label: 'auth' },
  { from: 'Router', to: 'Security',   type: 'AUTH_FLOW',  label: 'security' },
  { from: 'Router', to: 'Dashboard',  type: 'API_CALL',   label: 'dashboard' },
  // Router → MODULES
  { from: 'Router', to: 'CRM',        type: 'API_CALL',   label: 'crm' },
  { from: 'Router', to: 'Jobs',       type: 'API_CALL',   label: 'jobs' },
  { from: 'Router', to: 'Billing',    type: 'API_CALL',   label: 'billing' },
  { from: 'Router', to: 'Inventory',  type: 'API_CALL',   label: 'inventory' },
  { from: 'Router', to: 'Reports',    type: 'API_CALL',   label: 'reports' },
  { from: 'Router', to: 'Warranty',   type: 'API_CALL',   label: 'warranty' },
  { from: 'Router', to: 'MultiBranch',type: 'API_CALL',   label: 'branch' },
  // Auth → modules
  { from: 'Auth',   to: 'CRM',        type: 'AUTH_FLOW',  label: 'token' },
  { from: 'Auth',   to: 'Jobs',       type: 'AUTH_FLOW',  label: 'token' },
  // MODULES → DATA
  { from: 'CRM',       to: 'DB_CUSTOMERS', type: 'DATA_FLOW', label: 'read/write' },
  { from: 'Jobs',      to: 'DB_JOBS',      type: 'DATA_FLOW', label: 'read/write' },
  { from: 'Inventory', to: 'DB_INVENTORY', type: 'DATA_FLOW', label: 'read/write' },
  { from: 'Billing',   to: 'DB_CUSTOMERS', type: 'DATA_FLOW', label: 'read' },
  { from: 'Billing',   to: 'DB_JOBS',      type: 'DATA_FLOW', label: 'read' },
  { from: 'Reports',   to: 'DB_JOBS',      type: 'DATA_FLOW', label: 'read' },
  { from: 'Reports',   to: 'DB_CUSTOMERS', type: 'DATA_FLOW', label: 'read' },
  { from: 'Reports',   to: 'DB_INVENTORY', type: 'DATA_FLOW', label: 'read' },
  { from: 'Warranty',  to: 'DB_CUSTOMERS', type: 'DATA_FLOW', label: 'read/write' },
  { from: 'MultiBranch',to: 'DB_JOBS',     type: 'DATA_FLOW', label: 'read' },
];

// ===== STATUS MAPPING =====
function _mapCheckToStatus(checkObj) {
  if (!checkObj) return 'unknown';
  if (checkObj.ok === true) return 'ok';
  if (checkObj.ok === false) return 'error';
  return 'warning';
}

function _latencyToStatus(ms) {
  if (!ms || ms < 0) return 'unknown';
  if (ms < 500) return 'ok';
  if (ms < 2000) return 'warning';
  return 'error';
}

// ===== MAIN BUILDER =====
async function buildSystemGraph() {
  let metrics = null;
  let health = null;
  let elapsed = 0;
  const t0 = Date.now();

  try {
    // ดึงข้อมูลจาก 2 endpoints พร้อมกัน
    const [m, h] = await Promise.all([
      (typeof callApi === 'function')
        ? callApi('getSystemMetrics', {}, { noAuth: true })
        : fetch(window.COMPHONE_DEFAULT_GAS_URL + '?action=getSystemMetrics').then(r => r.json()),
      (typeof callApi === 'function')
        ? callApi('health', {}, { noAuth: true })
        : fetch(window.COMPHONE_DEFAULT_GAS_URL + '?action=health').then(r => r.json()),
    ]);
    metrics = m;
    health = h;
    elapsed = Date.now() - t0;
  } catch (e) {
    console.error('[SystemGraph] API error:', e.message);
    return _buildFallbackGraph(e.message);
  }

  // ===== MAP STATUS จาก health checks =====
  const checks = (health && health.checks) ? health.checks : {};
  const healthElapsed = (health && health.elapsed_ms) ? health.elapsed_ms : elapsed;

  // status map ต่อ node
  const nodeStatusMap = {
    Router:      (health && health.status === 'healthy') ? 'ok' : 'warning',
    Auth:        _mapCheckToStatus(checks.users),
    Security:    _mapCheckToStatus(checks.config),
    Dashboard:   _mapCheckToStatus(checks.spreadsheet),
    CRM:         _mapCheckToStatus(checks.spreadsheet),
    Jobs:        _mapCheckToStatus(checks.spreadsheet),
    Billing:     _mapCheckToStatus(checks.spreadsheet),
    Inventory:   _mapCheckToStatus(checks.spreadsheet),
    Reports:     _mapCheckToStatus(checks.spreadsheet),
    Warranty:    _mapCheckToStatus(checks.spreadsheet),
    MultiBranch: _mapCheckToStatus(checks.spreadsheet),
    DB_JOBS:        _mapCheckToStatus(checks.spreadsheet),
    DB_CUSTOMERS:   _mapCheckToStatus(checks.spreadsheet),
    DB_INVENTORY:   _mapCheckToStatus(checks.spreadsheet),
  };

  // load map (ใช้ trigger count เป็น proxy)
  const triggerCount = (checks.triggers && checks.triggers.count) ? checks.triggers.count : 0;
  const triggerFns = (checks.triggers && checks.triggers.fns) ? checks.triggers.fns : [];
  const nodeLoadMap = {
    Router:      triggerCount * 2,
    Auth:        (checks.users && checks.users.count) ? checks.users.count * 5 : 5,
    Security:    8,
    Dashboard:   15,
    CRM:         triggerFns.includes('getCRMSchedule') ? 12 : 6,
    Jobs:        triggerFns.includes('sendAfterSalesAlerts') ? 18 : 8,
    Billing:     10,
    Inventory:   triggerFns.includes('checkLowStockAlert') ? 14 : 7,
    Reports:     6,
    Warranty:    triggerFns.includes('sendAfterSalesAlerts') ? 10 : 5,
    MultiBranch: 8,
    DB_JOBS:        20,
    DB_CUSTOMERS:   15,
    DB_INVENTORY:   12,
  };

  // latency map
  const latencyMap = {
    'Router->Auth':        healthElapsed * 0.1,
    'Router->Security':    healthElapsed * 0.05,
    'Router->Dashboard':   healthElapsed * 0.3,
    'Router->CRM':         healthElapsed * 0.2,
    'Router->Jobs':        healthElapsed * 0.2,
    'Router->Billing':     healthElapsed * 0.15,
    'Router->Inventory':   healthElapsed * 0.15,
    'Router->Reports':     healthElapsed * 0.25,
    'Router->Warranty':    healthElapsed * 0.1,
    'Router->MultiBranch': healthElapsed * 0.1,
    'Auth->CRM':           healthElapsed * 0.05,
    'Auth->Jobs':          healthElapsed * 0.05,
  };

  // ===== BUILD NODES =====
  const nodes = SYSTEM_NODES_DEF.map(def => ({
    ...def,
    status: nodeStatusMap[def.id] || 'ok',
    load:   nodeLoadMap[def.id] || 5,
    meta: {
      version:      metrics ? metrics.version : '?',
      api_count:    nodeLoadMap[def.id] || 0,
      latency:      latencyMap[def.id] || 0,
      error_rate:   nodeStatusMap[def.id] === 'error' ? 100 : (nodeStatusMap[def.id] === 'warning' ? 20 : 0),
      trigger_fns:  triggerFns.filter(fn => _fnBelongsTo(fn, def.id)),
    }
  }));

  // ===== BUILD EDGES =====
  const edges = SYSTEM_EDGES_DEF.map((def, i) => {
    const key = def.from + '->' + def.to;
    const lat = Math.round(latencyMap[key] || (healthElapsed * 0.1));
    const fromStatus = nodeStatusMap[def.from] || 'ok';
    const toStatus   = nodeStatusMap[def.to]   || 'ok';
    const edgeStatus = (fromStatus === 'error' || toStatus === 'error') ? 'error'
                     : (fromStatus === 'warning' || toStatus === 'warning') ? 'warning'
                     : 'ok';
    return {
      id:      i + 1,
      from:    def.from,
      to:      def.to,
      type:    def.type,
      label:   def.label,
      latency: lat,
      status:  edgeStatus,
    };
  });

  return {
    nodes,
    edges,
    meta: {
      version:    metrics ? metrics.version : '?',
      health:     health ? health.status : 'unknown',
      elapsed_ms: elapsed,
      timestamp:  new Date().toLocaleString('th-TH'),
      checks,
    }
  };
}

// ===== HELPER: map trigger fn ไปยัง module =====
function _fnBelongsTo(fn, nodeId) {
  const map = {
    CRM:       ['getCRMSchedule'],
    Jobs:      ['sendAfterSalesAlerts'],
    Inventory: ['checkLowStockAlert', 'geminiReorderSuggestion'],
    Router:    ['cronHealthCheck'],
    Dashboard: ['cronMorningAlert'],
    Auth:      ['cleanupAllSessionProperties'],
    Security:  [],
    Billing:   [],
    Reports:   ['cronTaxReminder'],
    Warranty:  [],
    MultiBranch: [],
    DB_JOBS:   [],
    DB_CUSTOMERS: [],
    DB_INVENTORY: [],
  };
  return (map[nodeId] || []).includes(fn);
}

// ===== FALLBACK GRAPH (ถ้า API fail) =====
function _buildFallbackGraph(errorMsg) {
  const nodes = SYSTEM_NODES_DEF.map(def => ({
    ...def,
    status: 'warning',
    load:   5,
    meta: { error: errorMsg, api_count: 0, latency: 0, error_rate: 0, trigger_fns: [] }
  }));
  const edges = SYSTEM_EDGES_DEF.map((def, i) => ({
    id: i + 1, ...def, latency: 0, status: 'warning'
  }));
  return { nodes, edges, meta: { health: 'unknown', error: errorMsg, timestamp: new Date().toLocaleString('th-TH') } };
}

// ===== EXPORT =====
if (typeof window !== 'undefined') {
  window.buildSystemGraph = buildSystemGraph;
  window.SYSTEM_NODES_DEF = SYSTEM_NODES_DEF;
  window.SYSTEM_EDGES_DEF = SYSTEM_EDGES_DEF;
}
