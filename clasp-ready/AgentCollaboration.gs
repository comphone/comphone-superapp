// ============================================================
// AgentCollaboration.gs — COMPHONE SUPER APP V5.5
// AI Operating System — Phase 3: Agent Collaboration
// ============================================================
// ให้ Agent เรียกใช้ Agent อื่นได้ + แชร์ผลลัพธ์
// Patterns: Request-Response, Broadcast, Consensus, Delegation
// ============================================================

var ACO_VERSION = '1.0.0';

// ─── COLLABORATION REGISTRY ────────────────────────────────
// กำหนดว่า Agent ไหนสามารถ collaborate กับ Agent ไหนได้
var ACO_COLLAB_MAP = {
  'manus': {
    canCallAgents: ['openclaw', 'hermes', 'internal'],
    canReceiveFrom: ['openclaw', 'hermes', 'internal'],
    maxChainDepth: 3
  },
  'openclaw': {
    canCallAgents: ['manus', 'internal'],
    canReceiveFrom: ['manus', 'internal'],
    maxChainDepth: 2
  },
  'hermes': {
    canCallAgents: ['manus', 'internal'],
    canReceiveFrom: ['manus', 'internal'],
    maxChainDepth: 2
  },
  'internal': {
    canCallAgents: ['manus', 'openclaw', 'hermes'],
    canReceiveFrom: ['manus', 'openclaw', 'hermes'],
    maxChainDepth: 5
  }
};

// ─── SHARED RESULT STORE ───────────────────────────────────
var ACO_RESULT_KEY  = 'ACO_SHARED_RESULTS';
var ACO_SESSION_KEY = 'ACO_SESSIONS';
var ACO_MAX_RESULTS = 100;

// ─── MAIN: agentCall ───────────────────────────────────────

/**
 * agentCall — Agent A เรียก Agent B เพื่อทำงาน
 * @param {Object} params - { callerId, calleeId, action, payload, sessionId? }
 * @returns {Object} result จาก callee agent
 */
function agentCall(params) {
  params = params || {};
  var callerId  = params.callerId  || params.fromAgent || '';
  var calleeId  = params.calleeId  || params.toAgent   || '';
  var action    = params.action    || '';
  var payload   = params.payload   || {};
  var sessionId = params.sessionId || _acoNewSession_();
  var depth     = parseInt(params._depth || 0, 10);

  try {
    // ตรวจสอบ collaboration permission
    var permCheck = _acoCheckPermission_(callerId, calleeId, depth);
    if (!permCheck.allowed) {
      return { success: false, error: 'COLLAB_DENIED', message: permCheck.reason };
    }

    // เพิ่ม caller context ลง payload
    var enrichedPayload = Object.assign({}, payload, {
      _caller:    callerId,
      _sessionId: sessionId,
      _depth:     depth + 1
    });

    // เรียก agentGatewayDispatch ของ callee
    var result = agentGatewayDispatch({
      agentId:     calleeId,
      apiKey:      _acoGetAgentKey_(calleeId),
      agentAction: action,
      payload:     enrichedPayload
    });

    // บันทึกผลลัพธ์ลง shared store
    _acoStoreResult_(sessionId, callerId, calleeId, action, result);

    // Log collaboration
    _acoLogCollab_(callerId, calleeId, action, sessionId, result && result.success !== false);

    return Object.assign({}, result, {
      _collaboration: {
        sessionId: sessionId,
        callerId:  callerId,
        calleeId:  calleeId,
        action:    action,
        depth:     depth
      }
    });
  } catch (e) {
    return { success: false, error: e.toString(), _collaboration: { sessionId: sessionId } };
  }
}

// ─── BROADCAST ─────────────────────────────────────────────

/**
 * agentBroadcast — ส่ง message ไปยัง agents หลายตัวพร้อมกัน
 * @param {Object} params - { senderId, targetAgents, action, payload }
 */
function agentBroadcast(params) {
  params = params || {};
  var senderId     = params.senderId     || 'system';
  var targetAgents = params.targetAgents || [];
  var action       = params.action       || '';
  var payload      = params.payload      || {};
  var sessionId    = _acoNewSession_();

  if (!Array.isArray(targetAgents) || targetAgents.length === 0) {
    return { success: false, error: 'targetAgents array required' };
  }

  var results = {};
  var successCount = 0;
  var failCount    = 0;

  targetAgents.forEach(function(agentId) {
    try {
      var r = agentCall({
        callerId:  senderId,
        calleeId:  agentId,
        action:    action,
        payload:   payload,
        sessionId: sessionId
      });
      results[agentId] = r;
      if (r && r.success !== false) successCount++;
      else failCount++;
    } catch(e) {
      results[agentId] = { success: false, error: e.toString() };
      failCount++;
    }
  });

  return {
    success:      failCount === 0,
    sessionId:    sessionId,
    senderId:     senderId,
    action:       action,
    targetCount:  targetAgents.length,
    successCount: successCount,
    failCount:    failCount,
    results:      results
  };
}

// ─── CONSENSUS ─────────────────────────────────────────────

/**
 * agentConsensus — ถาม agents หลายตัว แล้วหา consensus
 * ใช้สำหรับการตัดสินใจที่ต้องการความเห็นหลายฝ่าย
 * @param {Object} params - { requesterId, agents, question, payload }
 */
function agentConsensus(params) {
  params = params || {};
  var requesterId = params.requesterId || 'system';
  var agents      = params.agents      || [];
  var question    = params.question    || params.action || '';
  var payload     = params.payload     || {};
  var sessionId   = _acoNewSession_();

  var responses = [];
  agents.forEach(function(agentId) {
    try {
      var r = agentCall({
        callerId:  requesterId,
        calleeId:  agentId,
        action:    question,
        payload:   payload,
        sessionId: sessionId
      });
      responses.push({ agentId: agentId, result: r, success: r && r.success !== false });
    } catch(e) {
      responses.push({ agentId: agentId, result: { error: e.toString() }, success: false });
    }
  });

  // หา consensus: majority vote บน success/fail
  var successVotes = responses.filter(function(r) { return r.success; }).length;
  var totalVotes   = responses.length;
  var consensus    = successVotes > totalVotes / 2 ? 'PROCEED' : 'ABORT';
  var confidence   = totalVotes > 0 ? successVotes / totalVotes : 0;

  return {
    success:     true,
    sessionId:   sessionId,
    question:    question,
    consensus:   consensus,
    confidence:  parseFloat(confidence.toFixed(2)),
    votes:       { success: successVotes, fail: totalVotes - successVotes, total: totalVotes },
    responses:   responses
  };
}

// ─── DELEGATION ────────────────────────────────────────────

/**
 * agentDelegate — มอบหมายงานให้ agent ที่เหมาะสมที่สุด
 * เลือก agent ตาม role ที่ต้องการ
 * @param {Object} params - { delegatorId, requiredRole, action, payload }
 */
function agentDelegate(params) {
  params = params || {};
  var delegatorId  = params.delegatorId  || 'system';
  var requiredRole = params.requiredRole  || '';
  var action       = params.action       || '';
  var payload      = params.payload      || {};

  // ค้นหา agent ที่มี role ที่ต้องการ
  var candidates = _acoFindAgentsByRole_(requiredRole);
  if (candidates.length === 0) {
    return { success: false, error: 'No agent found with role: ' + requiredRole };
  }

  // เลือก agent ที่มี load น้อยที่สุด (ดูจาก activity log)
  var selectedAgent = _acoSelectLeastBusy_(candidates);

  var result = agentCall({
    callerId: delegatorId,
    calleeId: selectedAgent,
    action:   action,
    payload:  payload
  });

  return Object.assign({}, result, {
    _delegation: {
      delegatorId:  delegatorId,
      selectedAgent: selectedAgent,
      candidates:   candidates,
      requiredRole: requiredRole
    }
  });
}

// ─── SHARED RESULTS ────────────────────────────────────────

/**
 * getSharedResults — ดึงผลลัพธ์ที่แชร์ระหว่าง agents
 */
function getSharedResults(params) {
  try {
    params = params || {};
    var sessionId = params.sessionId || '';
    var agentId   = params.agentId   || '';
    var limit     = parseInt(params.limit || 20, 10);

    var results = _acoLoadResults_();

    if (sessionId) results = results.filter(function(r) { return r.sessionId === sessionId; });
    if (agentId)   results = results.filter(function(r) { return r.callerId === agentId || r.calleeId === agentId; });

    return {
      success: true,
      count:   results.slice(0, limit).length,
      results: results.slice(0, limit)
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getCollaborationStats — สถิติการ collaborate
 */
function getCollaborationStats(params) {
  try {
    params = params || {};
    var days = parseInt(params.days || 7, 10);
    var cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    var results = _acoLoadResults_().filter(function(r) {
      return new Date(r.ts).getTime() >= cutoff;
    });

    var stats = {};
    results.forEach(function(r) {
      var key = r.callerId + ' → ' + r.calleeId;
      if (!stats[key]) stats[key] = { calls: 0, success: 0, fail: 0 };
      stats[key].calls++;
      if (r.success) stats[key].success++;
      else stats[key].fail++;
    });

    return {
      success: true,
      period:  days + ' days',
      totalCalls: results.length,
      pairStats:  stats
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getAgentCollaborationVersion
 */
function getAgentCollaborationVersion() {
  return {
    success: true,
    version: ACO_VERSION,
    module: 'AgentCollaboration',
    features: ['agent-call', 'broadcast', 'consensus', 'delegation', 'shared-results', 'collab-stats']
  };
}

// ─── PRIVATE HELPERS ───────────────────────────────────────

function _acoCheckPermission_(callerId, calleeId, depth) {
  if (!callerId) return { allowed: false, reason: 'Missing callerId' };
  if (!calleeId) return { allowed: false, reason: 'Missing calleeId' };
  if (callerId === calleeId) return { allowed: false, reason: 'Agent cannot call itself' };

  var callerMap = ACO_COLLAB_MAP[callerId];
  if (!callerMap) {
    // registered agents → ใช้ default permission
    callerMap = { canCallAgents: ['internal'], maxChainDepth: 2 };
  }

  if (depth >= (callerMap.maxChainDepth || 3)) {
    return { allowed: false, reason: 'Max chain depth exceeded: ' + depth };
  }

  if (callerMap.canCallAgents.indexOf(calleeId) < 0 &&
      callerMap.canCallAgents.indexOf('*') < 0) {
    return { allowed: false, reason: callerId + ' is not allowed to call ' + calleeId };
  }

  return { allowed: true };
}

function _acoGetAgentKey_(agentId) {
  // ดึง API key ของ agent จาก PropertiesService
  return PropertiesService.getScriptProperties().getProperty('AG_KEY_' + agentId) || agentId + '_default_key';
}

function _acoNewSession_() {
  return 'sess_' + Utilities.getUuid().replace(/-/g, '').substring(0, 16);
}

function _acoStoreResult_(sessionId, callerId, calleeId, action, result) {
  try {
    var results = _acoLoadResults_();
    results.unshift({
      sessionId: sessionId,
      callerId:  callerId,
      calleeId:  calleeId,
      action:    action,
      success:   result && result.success !== false,
      ts:        new Date().toISOString()
    });
    if (results.length > ACO_MAX_RESULTS) results = results.slice(0, ACO_MAX_RESULTS);
    PropertiesService.getScriptProperties().setProperty(ACO_RESULT_KEY, JSON.stringify(results));
  } catch(e) {}
}

function _acoLoadResults_() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(ACO_RESULT_KEY) || '[]';
    return JSON.parse(raw);
  } catch(e) { return []; }
}

function _acoLogCollab_(callerId, calleeId, action, sessionId, success) {
  try {
    // บันทึกเป็น incident ถ้า fail
    if (!success) {
      amStoreIncident({
        type:     'COLLAB_FAIL',
        data:     { callerId: callerId, calleeId: calleeId, action: action, sessionId: sessionId },
        agentId:  callerId,
        severity: 'MEDIUM'
      });
    }
  } catch(e) {}
}

function _acoFindAgentsByRole_(role) {
  var candidates = [];
  var AG_AGENTS_LOCAL = {
    'manus':    ['vision', 'learning', 'alert', 'incident', 'dashboard'],
    'openclaw': ['vision', 'alert'],
    'hermes':   ['incident', 'alert', 'dashboard'],
    'internal': ['vision', 'learning', 'alert', 'incident', 'dashboard', 'admin']
  };
  Object.keys(AG_AGENTS_LOCAL).forEach(function(id) {
    if (AG_AGENTS_LOCAL[id].indexOf(role) >= 0) candidates.push(id);
  });
  return candidates;
}

function _acoSelectLeastBusy_(agents) {
  // ดูจาก activity log ใน AgentGateway
  try {
    var props = PropertiesService.getScriptProperties();
    var logsRaw = props.getProperty('AG_ACTIVITY_LOG') || '[]';
    var logs = JSON.parse(logsRaw);
    var last5min = Date.now() - 5 * 60 * 1000;
    var recentLogs = logs.filter(function(l) { return new Date(l.ts).getTime() >= last5min; });

    var counts = {};
    agents.forEach(function(id) { counts[id] = 0; });
    recentLogs.forEach(function(l) {
      if (counts[l.agentId] !== undefined) counts[l.agentId]++;
    });

    // เลือก agent ที่มี count น้อยที่สุด
    var minCount = Infinity;
    var selected = agents[0];
    agents.forEach(function(id) {
      if (counts[id] < minCount) { minCount = counts[id]; selected = id; }
    });
    return selected;
  } catch(e) {
    return agents[0];
  }
}
