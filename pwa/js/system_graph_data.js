/**
 * system_graph_data.js — COMPHONE System Graph Data Adapter V2
 * Version: 5.5.8
 *
 * Features:
 *   Phase 1: SSOT (isSSOT per node)
 *   Phase 2: Version Tracking (version, last_updated)
 *   Phase 3: Dependency Mapping (upstream, downstream)
 *   Phase 4: Failure Propagation (fail chain highlight)
 *   Phase 5: Latency Heatmap (<100=green, 100-300=yellow, >300=red)
 *   Phase 6: Health Score % calculation
 *   Phase 7: Auto Diagnostic (problem, cause, fix)
 *   Phase 8: Integrate with getHealthMonitor GAS endpoint
 */
'use strict';

// ===== STATIC GRAPH STRUCTURE =====
const SYSTEM_NODES_DEF = [
  // CORE
  { id: 'Router',       type: 'core',   label: 'Router',       icon: '⚡', group: 'core',   isSSOT: true  },
  { id: 'Auth',         type: 'core',   label: 'Auth',         icon: '🔐', group: 'core',   isSSOT: true  },
  { id: 'Security',     type: 'core',   label: 'Security',     icon: '🛡️', group: 'core',   isSSOT: true  },
  { id: 'Dashboard',    type: 'core',   label: 'Dashboard',    icon: '📊', group: 'core',   isSSOT: false },
  // MODULES
  { id: 'CRM',          type: 'module', label: 'CRM',          icon: '👥', group: 'module', isSSOT: false },
  { id: 'Jobs',         type: 'module', label: 'Jobs',         icon: '🔧', group: 'module', isSSOT: false },
  { id: 'Billing',      type: 'module', label: 'Billing',      icon: '💰', group: 'module', isSSOT: false },
  { id: 'Inventory',    type: 'module', label: 'Inventory',    icon: '📦', group: 'module', isSSOT: false },
  { id: 'Reports',      type: 'module', label: 'Reports',      icon: '📈', group: 'module', isSSOT: false },
  { id: 'Warranty',     type: 'module', label: 'Warranty',     icon: '🛡', group: 'module', isSSOT: false },
  { id: 'MultiBranch',  type: 'module', label: 'MultiBranch',  icon: '🏢', group: 'module', isSSOT: false },
  // DATA
  { id: 'DB_JOBS',      type: 'data',   label: 'DB_JOBS',      icon: '🗄️', group: 'data',   isSSOT: true  },
  { id: 'DB_CUSTOMERS', type: 'data',   label: 'DB_CUSTOMERS', icon: '🗄️', group: 'data',   isSSOT: true  },
  { id: 'DB_INVENTORY', type: 'data',   label: 'DB_INVENTORY', icon: '🗄️', group: 'data',   isSSOT: true  },
];

const SYSTEM_EDGES_DEF = [
  // Router → CORE
  { from: 'Router', to: 'Auth',         type: 'AUTH_FLOW',  label: 'auth' },
  { from: 'Router', to: 'Security',     type: 'AUTH_FLOW',  label: 'security' },
  { from: 'Router', to: 'Dashboard',    type: 'API_CALL',   label: 'dashboard' },
  // Router → MODULES
  { from: 'Router', to: 'CRM',          type: 'API_CALL',   label: 'crm' },
  { from: 'Router', to: 'Jobs',         type: 'API_CALL',   label: 'jobs' },
  { from: 'Router', to: 'Billing',      type: 'API_CALL',   label: 'billing' },
  { from: 'Router', to: 'Inventory',    type: 'API_CALL',   label: 'inventory' },
  { from: 'Router', to: 'Reports',      type: 'API_CALL',   label: 'reports' },
  { from: 'Router', to: 'Warranty',     type: 'API_CALL',   label: 'warranty' },
  { from: 'Router', to: 'MultiBranch',  type: 'API_CALL',   label: 'branch' },
  // Auth → modules
  { from: 'Auth',   to: 'CRM',          type: 'AUTH_FLOW',  label: 'token' },
  { from: 'Auth',   to: 'Jobs',         type: 'AUTH_FLOW',  label: 'token' },
  // MODULES → DATA
  { from: 'CRM',        to: 'DB_CUSTOMERS', type: 'DATA_FLOW', label: 'read/write' },
  { from: 'Jobs',       to: 'DB_JOBS',      type: 'DATA_FLOW', label: 'read/write' },
  { from: 'Inventory',  to: 'DB_INVENTORY', type: 'DATA_FLOW', label: 'read/write' },
  { from: 'Billing',    to: 'DB_CUSTOMERS', type: 'DATA_FLOW', label: 'read' },
  { from: 'Billing',    to: 'DB_JOBS',      type: 'DATA_FLOW', label: 'read' },
  { from: 'Reports',    to: 'DB_JOBS',      type: 'DATA_FLOW', label: 'read' },
  { from: 'Reports',    to: 'DB_CUSTOMERS', type: 'DATA_FLOW', label: 'read' },
  { from: 'Reports',    to: 'DB_INVENTORY', type: 'DATA_FLOW', label: 'read' },
  { from: 'Warranty',   to: 'DB_CUSTOMERS', type: 'DATA_FLOW', label: 'read/write' },
  { from: 'MultiBranch',to: 'DB_JOBS',      type: 'DATA_FLOW', label: 'read' },
];

// ===== DEPENDENCY MAP (upstream/downstream) =====
function buildDependencyMap() {
  const upstream   = {};
  const downstream = {};
  SYSTEM_NODES_DEF.forEach(n => { upstream[n.id] = []; downstream[n.id] = []; });
  SYSTEM_EDGES_DEF.forEach(e => {
    if (!downstream[e.from]) downstream[e.from] = [];
    if (!upstream[e.to])     upstream[e.to]     = [];
    downstream[e.from].push(e.to);
    upstream[e.to].push(e.from);
  });
  return { upstream, downstream };
}

// ===== FAILURE PROPAGATION =====
// คืน set ของ node IDs ที่ได้รับผลกระทบเมื่อ failedNodeId พัง
function getFailureChain(failedNodeId, downstream) {
  const affected = new Set();
  const queue = [failedNodeId];
  while (queue.length > 0) {
    const node = queue.shift();
    if (affected.has(node)) continue;
    affected.add(node);
    (downstream[node] || []).forEach(child => queue.push(child));
  }
  return affected;
}

// ===== LATENCY COLOR =====
function latencyColor(ms) {
  if (!ms || ms <= 0) return 'unknown';
  if (ms < 100)  return 'ok';
  if (ms < 300)  return 'warning';
  return 'error';
}

// ===== STATUS MAPPING =====
function _mapCheckToStatus(checkObj) {
  if (!checkObj) return 'unknown';
  if (checkObj.ok === true)  return 'ok';
  if (checkObj.ok === false) return 'error';
  return 'warning';
}

// ===== HEALTH SCORE =====
function calcHealthScore(nodes) {
  if (!nodes || nodes.length === 0) return 0;
  const weights = { ok: 100, warning: 50, error: 0, unknown: 30 };
  const total = nodes.reduce((sum, n) => sum + (weights[n.status] || 30), 0);
  return Math.round(total / nodes.length);
}

// ===== MAIN BUILDER =====
async function buildSystemGraph() {
  let monitor  = null;
  let health   = null;
  let elapsed  = 0;
  const t0 = Date.now();

  try {
    const [m, h] = await Promise.all([
      (typeof callApi === 'function')
        ? callApi('getHealthMonitor', {}, { noAuth: true })
        : fetch(COMPHONE_DEFAULT_GAS_URL + '?action=getHealthMonitor').then(r => r.json()),
      (typeof callApi === 'function')
        ? callApi('health', {}, { noAuth: true })
        : fetch(COMPHONE_DEFAULT_GAS_URL + '?action=health').then(r => r.json()),
    ]);
    monitor = m;
    health  = h;
    elapsed = Date.now() - t0;
  } catch (e) {
    console.error('[SystemGraph] API error:', e.message);
    return _buildFallbackGraph(e.message);
  }

  // ── ดึง node_status จาก getHealthMonitor ──
  const nodeStatusMap = (monitor && monitor.node_status) ? monitor.node_status : {};
  const checks        = (health && health.checks) ? health.checks : {};
  const healthElapsed = (health && health.elapsed_ms) ? health.elapsed_ms : elapsed;

  // ── Dependency Map ──
  const { upstream, downstream } = buildDependencyMap();

  // ── Failure Propagation ──
  // หา nodes ที่ fail แล้ว propagate downstream
  const failedNodes = SYSTEM_NODES_DEF
    .filter(n => {
      const ns = nodeStatusMap[n.id];
      return ns && ns.status === 'error';
    })
    .map(n => n.id);

  const allAffected = new Set();
  failedNodes.forEach(fn => {
    getFailureChain(fn, downstream).forEach(id => allAffected.add(id));
  });

  // ── Build Nodes ──
  const nodes = SYSTEM_NODES_DEF.map(def => {
    const ns       = nodeStatusMap[def.id] || {};
    const rawStatus = ns.status || _mapCheckToStatus(checks.spreadsheet) || 'unknown';
    const latencyMs = ns.latency_ms || 0;
    const latStat   = latencyColor(latencyMs);

    // ถ้าอยู่ใน failure chain → downgrade status
    const isAffected = allAffected.has(def.id) && !failedNodes.includes(def.id);
    const finalStatus = isAffected && rawStatus === 'ok' ? 'warning' : rawStatus;

    return {
      id:           def.id,
      type:         def.type,
      label:        def.label,
      icon:         def.icon,
      group:        def.group,
      isSSOT:       def.isSSOT,
      status:       finalStatus,
      latencyStatus: latStat,
      isFailureRoot: failedNodes.includes(def.id),
      isAffected:   isAffected,
      load:         10,
      meta: {
        version:      ns.version      || (monitor && monitor.version ? monitor.version.version : '5.5.8'),
        last_updated: ns.last_updated || (monitor ? monitor.timestamp : new Date().toISOString()),
        latency_ms:   latencyMs,
        error_rate:   ns.error_rate   || 0,
        users_count:  ns.users_count  || 0,
        upstream:     upstream[def.id]   || [],
        downstream:   downstream[def.id] || [],
      }
    };
  });

  // ── Build Edges ──
  const edges = SYSTEM_EDGES_DEF.map((e, i) => {
    const fromNode = nodes.find(n => n.id === e.from);
    const toNode   = nodes.find(n => n.id === e.to);
    const bothFail = fromNode && toNode &&
      (fromNode.status === 'error' || toNode.status === 'error');
    return {
      id:       'e' + i,
      from:     e.from,
      to:       e.to,
      label:    e.label,
      _type:    e.type,
      _latency: 0,
      isFailing: bothFail,
    };
  });

  // ── Health Score ──
  const healthScore = (monitor && monitor.health_score != null)
    ? monitor.health_score
    : calcHealthScore(nodes);

  // ── Diagnostics ──
  const diagnostics = (monitor && monitor.diagnostics) ? monitor.diagnostics : [];

  // ── Recent Logs ──
  const recentLogs = (monitor && monitor.recent_logs) ? monitor.recent_logs : [];

  // ── Meta ──
  const meta = {
    version:      monitor && monitor.version ? monitor.version.version : '5.5.8',
    last_updated: monitor ? monitor.timestamp : new Date().toISOString(),
    health_score: healthScore,
    health_status: health ? (health.status || 'unknown') : 'unknown',
    triggers:     monitor && monitor.triggers ? monitor.triggers : { count: 0, active: false },
    elapsed_ms:   elapsed,
    diagnostics:  diagnostics,
    recent_logs:  recentLogs,
    stats:        monitor && monitor.stats ? monitor.stats : {},
    failure_roots: failedNodes,
    affected_nodes: Array.from(allAffected),
  };

  return { nodes, edges, meta };
}

// ===== FALLBACK GRAPH =====
function _buildFallbackGraph(errorMsg) {
  const { upstream, downstream } = buildDependencyMap();
  const nodes = SYSTEM_NODES_DEF.map(def => ({
    id:           def.id,
    type:         def.type,
    label:        def.label,
    icon:         def.icon,
    group:        def.group,
    isSSOT:       def.isSSOT,
    status:       'warning',
    latencyStatus: 'unknown',
    isFailureRoot: false,
    isAffected:   false,
    load:         10,
    meta: {
      version:      '5.5.8',
      last_updated: new Date().toISOString(),
      latency_ms:   0,
      error_rate:   0,
      users_count:  0,
      upstream:     upstream[def.id]   || [],
      downstream:   downstream[def.id] || [],
    }
  }));
  const edges = SYSTEM_EDGES_DEF.map((e, i) => ({
    id: 'e' + i, from: e.from, to: e.to, label: e.label,
    _type: e.type, _latency: 0, isFailing: false,
  }));
  return {
    nodes, edges,
    meta: {
      version: '5.5.8', health_score: 0, health_status: 'unknown',
      triggers: { count: 0, active: false }, elapsed_ms: 0,
      diagnostics: [{ severity: 'critical', node: 'Router', problem: 'ไม่สามารถเชื่อมต่อ GAS', cause: errorMsg, fix: 'ตรวจสอบ GAS URL และ network' }],
      recent_logs: [], stats: {}, failure_roots: [], affected_nodes: [],
    }
  };
}

// Export globals
window.buildSystemGraph  = buildSystemGraph;
window.buildDependencyMap = buildDependencyMap;
window.getFailureChain   = getFailureChain;
window.calcHealthScore   = calcHealthScore;
window.latencyColor      = latencyColor;
window.SYSTEM_NODES_DEF  = SYSTEM_NODES_DEF;
window.SYSTEM_EDGES_DEF  = SYSTEM_EDGES_DEF;
