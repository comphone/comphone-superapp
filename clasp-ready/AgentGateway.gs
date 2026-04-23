// AgentGateway.gs — Multi-Agent Platform Gateway v1.0.0
// COMPHONE SUPER APP V5.5
// ============================================================
// Phase 1: Entry Point — รองรับ agent ทั้งหมด (Manus, OpenClaw, Hermes, ...)
// Phase 2: Standard API — action-based routing (vision.analyze, incident.create, ...)
// Phase 3: Auth — API key per agent + role-based access
// Phase 4: Routing Engine — map action → module
// Phase 5: Logging — log agent activity ทุก request
// Phase 6: Orchestration — chain actions (pipeline execution)
// ============================================================

var AG_VERSION = '1.0.0';

// ─── AGENT REGISTRY ────────────────────────────────────────
// Agents ที่ได้รับอนุญาต — เพิ่มได้ผ่าน registerAgent()
var AG_AGENTS = {
  'manus':    { name: 'Manus AI',    roles: ['vision', 'learning', 'alert', 'incident', 'dashboard'], rateLimit: 100 },
  'openclaw': { name: 'OpenClaw',    roles: ['vision', 'alert'],                                       rateLimit: 50  },
  'hermes':   { name: 'Hermes',      roles: ['incident', 'alert', 'dashboard'],                        rateLimit: 50  },
  'internal': { name: 'Internal GAS', roles: ['vision', 'learning', 'alert', 'incident', 'dashboard', 'admin'], rateLimit: 1000 }
};

// ─── ACTION → MODULE MAP ────────────────────────────────────
var AG_ACTION_MAP = {
  // Vision
  'vision.analyze':          { module: 'VisionPipeline',   fn: 'runVisionPipeline',        role: 'vision'    },
  'vision.slip':             { module: 'VisionPipeline',   fn: 'runSlipVerifyPipeline',     role: 'vision'    },
  'vision.qc':               { module: 'VisionPipeline',   fn: 'runQCPipeline',             role: 'vision'    },
  'vision.review':           { module: 'VisionPipeline',   fn: 'submitHumanReview',         role: 'vision'    },
  'vision.dashboard':        { module: 'VisionPipeline',   fn: 'getVisionDashboardStats',   role: 'vision'    },
  // Learning
  'learning.stats':          { module: 'VisionLearning',   fn: 'getLearningDashboard',      role: 'learning'  },
  'learning.calibration':    { module: 'VisionLearning',   fn: 'getConfidenceCalibration',  role: 'learning'  },
  'learning.patterns':       { module: 'VisionLearning',   fn: 'analyzeErrorPatterns',      role: 'learning'  },
  'learning.rules':          { module: 'VisionLearning',   fn: 'getActiveRules',            role: 'learning'  },
  'learning.feedback':       { module: 'VisionLearning',   fn: 'processFeedbackLoop',       role: 'learning'  },
  // Alert / Notification
  'alert.get':               { module: 'LineBotIntelligent', fn: 'getIntelAlertQueue',      role: 'alert'     },
  'alert.queue':             { module: 'LineBotIntelligent', fn: 'queueAlertIntelligent',   role: 'alert'     },
  'alert.acknowledge':       { module: 'LineBotIntelligent', fn: 'acknowledgeAlert',        role: 'alert'     },
  'alert.analytics':         { module: 'LineBotIntelligent', fn: 'getAlertAnalytics',       role: 'alert'     },
  // Incident
  'incident.create':         { module: 'JobManager',        fn: 'openJob',                  role: 'incident'  },
  'incident.update':         { module: 'JobManager',        fn: 'updateJobById',            role: 'incident'  },
  'incident.list':           { module: 'JobManager',        fn: 'checkJobs',                role: 'incident'  },
  'incident.transition':     { module: 'JobManager',        fn: 'transitionJob',            role: 'incident'  },
  // Dashboard
  'dashboard.summary':       { module: 'Dashboard',         fn: 'getDashboardData',         role: 'dashboard' },
  'dashboard.executive':     { module: 'ExecutiveDashboard', fn: 'getExecutiveDashboard',   role: 'dashboard' },
  // Admin
  'agent.register':          { module: 'AgentGateway',      fn: 'registerAgent',            role: 'admin'     },
  'agent.list':              { module: 'AgentGateway',      fn: 'listAgents',               role: 'admin'     },
  'agent.logs':              { module: 'AgentGateway',      fn: 'getAgentLogs',             role: 'admin'     },
  'agent.stats':             { module: 'AgentGateway',      fn: 'getAgentStats',            role: 'admin'     }
};

// ─── PHASE 1: ENTRY POINT ──────────────────────────────────

/**
 * agentGatewayDispatch — Main entry point สำหรับ agent ทั้งหมด
 * @param {Object} params - { agentId, apiKey, action, payload, chain? }
 * @returns {Object} Standard AgentResponse
 */
function agentGatewayDispatch(params) {
  var startTs = Date.now();
  var agentId = params.agentId || params.agent_id || '';
  var apiKey  = params.apiKey  || params.api_key  || '';
  // รองรับทั้ง agentAction (recommended) และ action (ใน payload ที่ส่งมาจาก Router)
  var action  = params.agentAction || params.innerAction || params.action  || '';
  var payload = params.payload || params.data || {};
  var chain   = params.chain   || null; // Phase 6: Orchestration

  try {
    // Phase 3: Auth — validate API key
    var authResult = _agAuth_(agentId, apiKey, action);
    if (!authResult.allowed) {
      _agLog_(agentId, action, 'AUTH_DENIED', Date.now() - startTs, authResult.reason);
      return _agError_(403, 'AUTH_DENIED', authResult.reason, agentId);
    }

    // Phase 2: Validate action
    var actionDef = AG_ACTION_MAP[action];
    if (!actionDef) {
      _agLog_(agentId, action, 'UNKNOWN_ACTION', Date.now() - startTs, 'Action not found');
      return _agError_(404, 'UNKNOWN_ACTION', 'Action "' + action + '" not found. See agent.list for available actions.', agentId);
    }

    // Phase 6: Orchestration — chain execution
    if (chain && Array.isArray(chain) && chain.length > 0) {
      return _agOrchestrate_(agentId, apiKey, action, payload, chain, startTs);
    }

    // Phase 4: Route to module
    var result = _agRoute_(action, payload, actionDef);

    // Phase 5: Log activity
    var status = result && result.success !== false ? 'SUCCESS' : 'ERROR';
    _agLog_(agentId, action, status, Date.now() - startTs, result && result.error ? result.error : '');

    return _agWrap_(result, agentId, action, Date.now() - startTs);

  } catch (e) {
    _agLog_(agentId, action, 'EXCEPTION', Date.now() - startTs, e.toString());
    return _agError_(500, 'INTERNAL_ERROR', e.toString(), agentId);
  }
}

// ─── PHASE 3: AUTH ─────────────────────────────────────────

/**
 * _agAuth_ — ตรวจสอบ API key และ role-based access
 */
function _agAuth_(agentId, apiKey, action) {
  if (!agentId) return { allowed: false, reason: 'Missing agentId' };
  if (!apiKey)  return { allowed: false, reason: 'Missing apiKey' };

  // ดึง registered agents จาก PropertiesService
  var registered = _agGetRegisteredAgents_();
  var agentDef = registered[agentId] || AG_AGENTS[agentId];

  if (!agentDef) return { allowed: false, reason: 'Unknown agent: ' + agentId };

  // ตรวจสอบ API key
  var storedKey = _agGetApiKey_(agentId);
  if (storedKey && storedKey !== apiKey) {
    return { allowed: false, reason: 'Invalid API key for agent: ' + agentId };
  }
  // ถ้ายังไม่มี stored key → ยอมรับ (first-time registration)
  if (!storedKey) {
    _agSetApiKey_(agentId, apiKey);
  }

  // ตรวจสอบ role
  var actionDef = AG_ACTION_MAP[action];
  if (!actionDef) return { allowed: true }; // unknown action → ผ่าน auth แต่จะ fail ที่ routing

  var requiredRole = actionDef.role;
  var agentRoles = agentDef.roles || [];
  if (!agentRoles.includes(requiredRole) && !agentRoles.includes('admin')) {
    return { allowed: false, reason: 'Agent "' + agentId + '" lacks role "' + requiredRole + '" for action "' + action + '"' };
  }

  // Rate limit check
  var rateLimit = agentDef.rateLimit || 60;
  var rlKey = 'ag_rl_' + agentId;
  var cache = CacheService.getScriptCache();
  var count = parseInt(cache.get(rlKey) || '0', 10);
  if (count >= rateLimit) {
    return { allowed: false, reason: 'Rate limit exceeded (' + rateLimit + '/min) for agent: ' + agentId };
  }
  cache.put(rlKey, String(count + 1), 60);

  return { allowed: true, agent: agentDef };
}

// ─── PHASE 4: ROUTING ENGINE ───────────────────────────────

// Explicit function registry (GAS V8 ไม่รองรับ dynamic eval)
var AG_FN_REGISTRY = null;

function _agGetRegistry_() {
  if (AG_FN_REGISTRY) return AG_FN_REGISTRY;
  // GAS V8: ต้อง reference function โดยตรง ไม่ใช้ typeof check สำหรับ cross-file functions
  AG_FN_REGISTRY = {
    // Vision (VisionPipeline.gs)
    'runVisionPipeline':         runVisionPipeline,
    'runSlipVerifyPipeline':     runSlipVerifyPipeline,
    'runQCPipeline':             runQCPipeline,
    'submitHumanReview':         submitHumanReview,
    'getVisionDashboardStats':   getVisionDashboardStats,
    // Learning (VisionLearning.gs)
    'getLearningDashboard':      getLearningDashboard,
    'getConfidenceCalibration':  getConfidenceCalibration,
    'analyzeErrorPatterns':      analyzeErrorPatterns,
    'getActiveRules':            getActiveRules,
    'processFeedbackLoop':       processFeedbackLoop,
    // Alert (LineBotIntelligent.gs)
    'getIntelAlertQueue':        getIntelAlertQueue,
    'queueAlertIntelligent':     queueAlertIntelligent,
    'acknowledgeAlert':          acknowledgeAlert,
    'getAlertAnalytics':         getAlertAnalytics,
    // Incident (JobManager.gs — optional, graceful null if not present)
    'openJob':                   (typeof openJob                   !== 'undefined') ? openJob                   : null,
    'updateJobById':             (typeof updateJobById             !== 'undefined') ? updateJobById             : null,
    'checkJobs':                 (typeof checkJobs                 !== 'undefined') ? checkJobs                 : null,
    'transitionJob':             (typeof transitionJob             !== 'undefined') ? transitionJob             : null,
    // Dashboard (Dashboard.gs / ExecutiveDashboard.gs — optional)
    'getDashboardData':          (typeof getDashboardData          !== 'undefined') ? getDashboardData          : null,
    'getExecutiveDashboard':     (typeof getExecutiveDashboard     !== 'undefined') ? getExecutiveDashboard     : null,
    // Admin (self)
    'registerAgent':             registerAgent,
    'listAgents':                listAgents,
    'getAgentLogs':              getAgentLogs,
    'getAgentStats':             getAgentStats
  };
  return AG_FN_REGISTRY;
}

/**
 * _agRoute_ — map action → function call via explicit registry
 */
function _agRoute_(action, payload, actionDef) {
  var fn = actionDef.fn;
  var registry = _agGetRegistry_();
  var fnRef = registry[fn];

  if (typeof fnRef === 'function') {
    return fnRef(payload);
  }

  return { success: false, error: 'Function not found: ' + fn, module: actionDef.module };
}

// ─── PHASE 5: LOGGING ──────────────────────────────────────

/**
 * _agLog_ — บันทึก agent activity
 */
function _agLog_(agentId, action, status, latencyMs, detail) {
  try {
    var props = PropertiesService.getScriptProperties();
    var logsRaw = props.getProperty('AG_ACTIVITY_LOG') || '[]';
    var logs;
    try { logs = JSON.parse(logsRaw); } catch(e) { logs = []; }

    var entry = {
      ts: new Date().toISOString(),
      agentId: agentId,
      action: action,
      status: status,
      latencyMs: latencyMs,
      detail: detail || ''
    };
    logs.unshift(entry);
    if (logs.length > 500) logs = logs.slice(0, 500); // keep last 500
    props.setProperty('AG_ACTIVITY_LOG', JSON.stringify(logs));
  } catch (e) {
    Logger.log('AgentGateway log error: ' + e.toString());
  }
}

/**
 * getAgentLogs — ดู activity logs
 */
function getAgentLogs(params) {
  try {
    var agentId = (params || {}).agentId || '';
    var limit   = parseInt((params || {}).limit || 50, 10);
    var props   = PropertiesService.getScriptProperties();
    var logsRaw = props.getProperty('AG_ACTIVITY_LOG') || '[]';
    var logs;
    try { logs = JSON.parse(logsRaw); } catch(e) { logs = []; }

    if (agentId) {
      logs = logs.filter(function(l) { return l.agentId === agentId; });
    }
    logs = logs.slice(0, limit);

    return {
      success: true,
      count: logs.length,
      logs: logs,
      filter: agentId || 'all'
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getAgentStats — สถิติการใช้งาน per agent
 */
function getAgentStats(params) {
  try {
    var days = parseInt((params || {}).days || 7, 10);
    var cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    var props   = PropertiesService.getScriptProperties();
    var logsRaw = props.getProperty('AG_ACTIVITY_LOG') || '[]';
    var logs;
    try { logs = JSON.parse(logsRaw); } catch(e) { logs = []; }

    // Filter by date
    var recent = logs.filter(function(l) {
      return new Date(l.ts).getTime() >= cutoff;
    });

    // Aggregate per agent
    var stats = {};
    recent.forEach(function(l) {
      if (!stats[l.agentId]) {
        stats[l.agentId] = { total: 0, success: 0, error: 0, authDenied: 0, avgLatencyMs: 0, totalLatency: 0, topActions: {} };
      }
      var s = stats[l.agentId];
      s.total++;
      s.totalLatency += (l.latencyMs || 0);
      if (l.status === 'SUCCESS') s.success++;
      else if (l.status === 'AUTH_DENIED') s.authDenied++;
      else s.error++;
      s.topActions[l.action] = (s.topActions[l.action] || 0) + 1;
    });

    // Calculate averages
    Object.keys(stats).forEach(function(id) {
      var s = stats[id];
      s.avgLatencyMs = s.total > 0 ? Math.round(s.totalLatency / s.total) : 0;
      delete s.totalLatency;
      // Sort top actions
      var topArr = Object.keys(s.topActions).map(function(a) { return { action: a, count: s.topActions[a] }; });
      topArr.sort(function(a, b) { return b.count - a.count; });
      s.topActions = topArr.slice(0, 5);
    });

    return {
      success: true,
      period: days + ' days',
      totalRequests: recent.length,
      agentStats: stats
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ─── PHASE 6: ORCHESTRATION ────────────────────────────────

/**
 * _agOrchestrate_ — chain actions (pipeline execution)
 * chain: [{ action, payload, condition? }]
 * condition: { key, op, value } — ถ้าไม่ผ่าน condition → หยุด chain
 */
function _agOrchestrate_(agentId, apiKey, firstAction, firstPayload, chain, startTs) {
  var results = [];
  var context = {}; // shared context ระหว่าง steps

  // Execute first action
  var firstDef = AG_ACTION_MAP[firstAction];
  if (firstDef) {
    var firstResult = _agRoute_(firstAction, firstPayload, firstDef);
    results.push({ step: 0, action: firstAction, result: firstResult });
    context = Object.assign(context, firstResult);
    _agLog_(agentId, firstAction, firstResult && firstResult.success !== false ? 'SUCCESS' : 'ERROR', 0, 'chain-step-0');
  }

  // Execute chain steps
  for (var i = 0; i < chain.length; i++) {
    var step = chain[i];
    var stepAction  = step.action;
    var stepPayload = Object.assign({}, step.payload || {}, { _chainContext: context });
    var stepDef     = AG_ACTION_MAP[stepAction];

    if (!stepDef) {
      results.push({ step: i + 1, action: stepAction, error: 'Unknown action' });
      continue;
    }

    // Check condition (optional)
    if (step.condition) {
      var condOk = _agCheckCondition_(context, step.condition);
      if (!condOk) {
        results.push({ step: i + 1, action: stepAction, skipped: true, reason: 'Condition not met' });
        continue;
      }
    }

    // Role check for each step
    var stepAuth = _agAuth_(agentId, apiKey, stepAction);
    if (!stepAuth.allowed) {
      results.push({ step: i + 1, action: stepAction, error: 'AUTH_DENIED: ' + stepAuth.reason });
      break; // stop chain on auth failure
    }

    var stepResult = _agRoute_(stepAction, stepPayload, stepDef);
    results.push({ step: i + 1, action: stepAction, result: stepResult });
    context = Object.assign(context, stepResult || {});
    _agLog_(agentId, stepAction, stepResult && stepResult.success !== false ? 'SUCCESS' : 'ERROR', 0, 'chain-step-' + (i + 1));
  }

  return {
    success: true,
    orchestration: true,
    agentId: agentId,
    steps: results.length,
    results: results,
    _latencyMs: Date.now() - startTs
  };
}

/**
 * _agCheckCondition_ — ตรวจสอบ condition ก่อน execute step
 */
function _agCheckCondition_(context, condition) {
  var val = context[condition.key];
  switch (condition.op) {
    case 'eq':  return val === condition.value;
    case 'neq': return val !== condition.value;
    case 'gt':  return Number(val) > Number(condition.value);
    case 'lt':  return Number(val) < Number(condition.value);
    case 'gte': return Number(val) >= Number(condition.value);
    case 'lte': return Number(val) <= Number(condition.value);
    case 'exists': return val !== undefined && val !== null;
    case 'contains': return String(val).includes(String(condition.value));
    default: return true;
  }
}

// ─── AGENT MANAGEMENT ──────────────────────────────────────

/**
 * registerAgent — ลงทะเบียน agent ใหม่
 */
function registerAgent(params) {
  try {
    var agentId = params.agentId || params.agent_id || '';
    var name    = params.name || agentId;
    var roles   = params.roles || ['vision', 'alert'];
    var apiKey  = params.apiKey || params.api_key || _agGenerateKey_();
    var rateLimit = parseInt(params.rateLimit || 60, 10);

    if (!agentId) return { success: false, error: 'agentId required' };

    var registered = _agGetRegisteredAgents_();
    registered[agentId] = { name: name, roles: roles, rateLimit: rateLimit, registeredAt: new Date().toISOString() };
    _agSaveRegisteredAgents_(registered);
    _agSetApiKey_(agentId, apiKey);

    return {
      success: true,
      agentId: agentId,
      name: name,
      roles: roles,
      apiKey: apiKey,
      rateLimit: rateLimit,
      note: 'Store apiKey securely — shown only once'
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * listAgents — ดู agents ทั้งหมด (ไม่แสดง API key)
 */
function listAgents(params) {
  try {
    var registered = _agGetRegisteredAgents_();
    var allAgents = Object.assign({}, AG_AGENTS, registered);
    var list = Object.keys(allAgents).map(function(id) {
      var a = allAgents[id];
      return {
        agentId: id,
        name: a.name,
        roles: a.roles,
        rateLimit: a.rateLimit,
        registeredAt: a.registeredAt || 'built-in',
        hasApiKey: !!_agGetApiKey_(id)
      };
    });
    return {
      success: true,
      count: list.length,
      agents: list,
      availableActions: Object.keys(AG_ACTION_MAP)
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ─── HELPERS ───────────────────────────────────────────────

function _agWrap_(result, agentId, action, latencyMs) {
  return Object.assign({}, result || {}, {
    _gateway: {
      version: AG_VERSION,
      agentId: agentId,
      action: action,
      latencyMs: latencyMs,
      ts: new Date().toISOString()
    }
  });
}

function _agError_(code, errorCode, message, agentId) {
  return {
    success: false,
    code: code,
    error: errorCode,
    message: message,
    _gateway: {
      version: AG_VERSION,
      agentId: agentId || 'unknown',
      ts: new Date().toISOString()
    }
  };
}

function _agGetRegisteredAgents_() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty('AG_REGISTERED_AGENTS') || '{}';
    return JSON.parse(raw);
  } catch(e) { return {}; }
}

function _agSaveRegisteredAgents_(agents) {
  PropertiesService.getScriptProperties().setProperty('AG_REGISTERED_AGENTS', JSON.stringify(agents));
}

function _agGetApiKey_(agentId) {
  return PropertiesService.getScriptProperties().getProperty('AG_KEY_' + agentId) || '';
}

function _agSetApiKey_(agentId, apiKey) {
  PropertiesService.getScriptProperties().setProperty('AG_KEY_' + agentId, apiKey);
}

function _agGenerateKey_() {
  return 'agk_' + Utilities.getUuid().replace(/-/g, '').substring(0, 24);
}

/**
 * getAgentGatewayVersion — ดู version
 */
function getAgentGatewayVersion() {
  return {
    success: true,
    version: AG_VERSION,
    agents: Object.keys(AG_AGENTS),
    actions: Object.keys(AG_ACTION_MAP),   // return array (not count) for discoverability
    actionCount: Object.keys(AG_ACTION_MAP).length,
    features: ['standard-api', 'auth-per-agent', 'routing-engine', 'activity-logging', 'chain-orchestration']
  };
}
