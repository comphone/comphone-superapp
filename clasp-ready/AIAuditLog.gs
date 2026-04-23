// ============================================================
// AIAuditLog.gs — COMPHONE SUPER APP V5.5
// AI-OS Stabilization — Phase 5: AI Logging Enhancement
// ============================================================
// Decision Log: บันทึก reason ของทุก AI decision พร้อม context
// Workflow Path: บันทึก execution path ของแต่ละ workflow run
// Agent Contribution: บันทึกว่า agent ไหน contribute อะไร
// AI Audit Trail: ประวัติการเปลี่ยนแปลง AI config ที่ตรวจสอบได้
// ============================================================
// NOTE: ไฟล์นี้ต่างจาก AuditLog.gs (Sheet-based audit)
//       AIAuditLog.gs ใช้ PropertiesService สำหรับ AI-OS events
// ============================================================

var AAL_VERSION = '1.0.0';

// ─── LOG KEYS ──────────────────────────────────────────────
var AAL_KEYS = {
  DECISIONS:     'AAL_DECISION_LOG',
  WORKFLOWS:     'AAL_WORKFLOW_PATH_LOG',
  CONTRIBUTIONS: 'AAL_AGENT_CONTRIBUTION_LOG',
  AI_AUDIT:      'AAL_AI_AUDIT_TRAIL',
  ERRORS:        'AAL_ERROR_LOG'
};

// ─── LOG LIMITS ────────────────────────────────────────────
var AAL_MAX = {
  DECISIONS:     300,
  WORKFLOWS:     200,
  CONTRIBUTIONS: 500,
  AI_AUDIT:      500,
  ERRORS:        200
};

// ─── DECISION LOGGING ──────────────────────────────────────

/**
 * logAIDecision — บันทึก AI decision พร้อม reason และ context
 * @param {Object} params - { agentId, topAction, confidence, reasons[], context, strategies }
 */
function logAIDecision(params) {
  params = params || {};
  try {
    var entry = {
      id:         'dec_' + Utilities.getUuid().replace(/-/g, '').substring(0, 10),
      agentId:    params.agentId     || 'system',
      topAction:  params.topAction   || '',
      confidence: params.confidence  || 0,
      reasons:    params.reasons     || [],
      strategies: params.strategies  || [],
      context: {
        healthStatus:  params.context ? params.context.healthStatus  : null,
        alertCount:    params.context ? params.context.alertCount    : null,
        workloadScore: params.context ? params.context.workloadScore : null,
        triggerType:   params.context ? params.context.triggerType   : null
      },
      guardBlocked: params.guardBlocked || false,
      latencyMs:    params.latencyMs    || 0,
      ts:           new Date().toISOString()
    };

    _aalAppend_(AAL_KEYS.DECISIONS, entry, AAL_MAX.DECISIONS);
    return { success: true, logId: entry.id };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getAIDecisionLog — ดู AI decision log
 */
function getAIDecisionLog(params) {
  try {
    params = params || {};
    var limit   = parseInt(params.limit   || 20, 10);
    var agentId = params.agentId || null;
    var logs    = _aalLoad_(AAL_KEYS.DECISIONS);

    if (agentId) {
      logs = logs.filter(function(l) { return l.agentId === agentId; });
    }

    return {
      success: true,
      count:   logs.slice(0, limit).length,
      total:   logs.length,
      logs:    logs.slice(0, limit)
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ─── WORKFLOW PATH LOGGING ─────────────────────────────────

/**
 * logWorkflowExecution — บันทึก execution path ของ workflow
 * @param {Object} params - { runId, workflowId, steps[], trigger, latencyMs, success }
 */
function logWorkflowExecution(params) {
  params = params || {};
  try {
    var entry = {
      runId:      params.runId      || 'run_' + Date.now(),
      workflowId: params.workflowId || '',
      name:       params.name       || '',
      success:    params.success    !== false,
      aborted:    params.aborted    || false,
      timeoutHit: params.timeoutHit || false,
      steps:      (params.steps || []).map(function(s) {
        return {
          stepId:    s.stepId    || s.id,
          name:      s.name,
          skipped:   s.skipped   || false,
          success:   s.result ? s.result.success !== false : true,
          latencyMs: s.latencyMs || 0
        };
      }),
      trigger:    params.trigger    || {},
      latencyMs:  params.latencyMs  || 0,
      depth:      params.depth      || 0,
      ts:         new Date().toISOString()
    };

    _aalAppend_(AAL_KEYS.WORKFLOWS, entry, AAL_MAX.WORKFLOWS);
    return { success: true, runId: entry.runId };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getWorkflowExecutionLog — ดู workflow execution log
 */
function getWorkflowExecutionLog(params) {
  try {
    params = params || {};
    var limit      = parseInt(params.limit      || 20, 10);
    var workflowId = params.workflowId || null;
    var logs       = _aalLoad_(AAL_KEYS.WORKFLOWS);

    if (workflowId) {
      logs = logs.filter(function(l) { return l.workflowId === workflowId; });
    }

    var total     = logs.length;
    var succeeded = logs.filter(function(l) { return l.success; }).length;
    var avgMs     = total > 0 ? Math.round(logs.reduce(function(s, l) { return s + (l.latencyMs || 0); }, 0) / total) : 0;

    return {
      success: true,
      stats:   { total: total, succeeded: succeeded, failed: total - succeeded, avgLatencyMs: avgMs },
      count:   logs.slice(0, limit).length,
      logs:    logs.slice(0, limit)
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ─── AGENT CONTRIBUTION LOGGING ────────────────────────────

/**
 * logAgentAction — บันทึกว่า agent ไหน contribute อะไร
 * @param {Object} params - { agentId, contributionType, action, result, context }
 */
function logAgentAction(params) {
  params = params || {};
  try {
    var entry = {
      id:               'contrib_' + Utilities.getUuid().replace(/-/g, '').substring(0, 8),
      agentId:          params.agentId          || 'unknown',
      contributionType: params.contributionType || 'ACTION',
      // รองรับทั้ง agentAction (ใหม่) และ action (legacy)
      action:           params.agentAction || params.logAction || params.action || '',
      workflowId:       params.workflowId       || null,
      runId:            params.runId            || null,
      result: {
        success:   params.result ? params.result.success !== false : true,
        latencyMs: params.result ? params.result.latencyMs : 0,
        summary:   params.result ? (params.result.summary || params.result.message || '') : ''
      },
      context: params.context || {},
      ts:      new Date().toISOString()
    };

    _aalAppend_(AAL_KEYS.CONTRIBUTIONS, entry, AAL_MAX.CONTRIBUTIONS);
    return { success: true, contribId: entry.id };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getAgentActionLog — ดู contribution log ของ agent
 */
function getAgentActionLog(params) {
  try {
    params = params || {};
    var limit   = parseInt(params.limit   || 20, 10);
    var agentId = params.agentId || null;
    var logs    = _aalLoad_(AAL_KEYS.CONTRIBUTIONS);

    if (agentId) {
      logs = logs.filter(function(l) { return l.agentId === agentId; });
    }

    var summary = {};
    logs.forEach(function(l) {
      if (!summary[l.agentId]) summary[l.agentId] = { total: 0, success: 0, byType: {} };
      summary[l.agentId].total++;
      if (l.result && l.result.success) summary[l.agentId].success++;
      var t = l.contributionType;
      summary[l.agentId].byType[t] = (summary[l.agentId].byType[t] || 0) + 1;
    });

    return {
      success: true,
      summary: summary,
      count:   logs.slice(0, limit).length,
      total:   logs.length,
      logs:    logs.slice(0, limit)
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ─── AI AUDIT TRAIL ────────────────────────────────────────

/**
 * logAIAuditEvent — บันทึก AI config/rule change event
 */
function logAIAuditEvent(params) {
  params = params || {};
  try {
    var entry = {
      id:        'aiaudit_' + Utilities.getUuid().replace(/-/g, '').substring(0, 10),
      eventType: params.eventType || 'UNKNOWN',
      actor:     params.actor     || 'system',
      target:    params.target    || '',
      before:    params.before    || null,
      after:     params.after     || null,
      reason:    params.reason    || '',
      ts:        new Date().toISOString()
    };

    _aalAppend_(AAL_KEYS.AI_AUDIT, entry, AAL_MAX.AI_AUDIT);
    return { success: true, auditId: entry.id };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getAIAuditTrail — ดู AI audit trail
 */
function getAIAuditTrail(params) {
  try {
    params = params || {};
    var limit     = parseInt(params.limit     || 50, 10);
    var eventType = params.eventType || null;
    var logs      = _aalLoad_(AAL_KEYS.AI_AUDIT);

    if (eventType) logs = logs.filter(function(l) { return l.eventType === eventType; });

    return { success: true, count: logs.slice(0, limit).length, total: logs.length, logs: logs.slice(0, limit) };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ─── AI AUDIT DASHBOARD ────────────────────────────────────

/**
 * getAIAuditDashboard — ภาพรวม AI audit logs ทั้งหมด
 */
function getAIAuditDashboard(params) {
  try {
    var decisions     = _aalLoad_(AAL_KEYS.DECISIONS);
    var workflows     = _aalLoad_(AAL_KEYS.WORKFLOWS);
    var contributions = _aalLoad_(AAL_KEYS.CONTRIBUTIONS);
    var aiAudits      = _aalLoad_(AAL_KEYS.AI_AUDIT);
    var errors        = _aalLoad_(AAL_KEYS.ERRORS);

    var cutoff24h = Date.now() - 24 * 60 * 60 * 1000;
    var dec24h    = decisions.filter(function(l)     { return new Date(l.ts).getTime() >= cutoff24h; }).length;
    var wf24h     = workflows.filter(function(l)     { return new Date(l.ts).getTime() >= cutoff24h; }).length;
    var contrib24h= contributions.filter(function(l) { return new Date(l.ts).getTime() >= cutoff24h; }).length;
    var err24h    = errors.filter(function(l)        { return new Date(l.ts).getTime() >= cutoff24h; }).length;

    var wfSuccess     = workflows.filter(function(l) { return l.success; }).length;
    var wfSuccessRate = workflows.length > 0 ? parseFloat((wfSuccess / workflows.length * 100).toFixed(1)) : 100;

    var agentContribs = {};
    contributions.forEach(function(c) {
      agentContribs[c.agentId] = (agentContribs[c.agentId] || 0) + 1;
    });
    var topAgents = Object.keys(agentContribs)
      .map(function(id) { return { agentId: id, contributions: agentContribs[id] }; })
      .sort(function(a, b) { return b.contributions - a.contributions; })
      .slice(0, 5);

    return {
      success: true,
      summary: {
        decisions:     { total: decisions.length,     last24h: dec24h },
        workflows:     { total: workflows.length,     last24h: wf24h,     successRate: wfSuccessRate },
        contributions: { total: contributions.length, last24h: contrib24h },
        errors:        { total: errors.length,        last24h: err24h },
        aiAudits:      { total: aiAudits.length }
      },
      topAgents:    topAgents,
      recentErrors: errors.slice(0, 3)
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getAIAuditLogVersion
 */
function getAIAuditLogVersion() {
  return {
    success: true,
    version: AAL_VERSION,
    module: 'AIAuditLog',
    features: ['ai-decision-log', 'workflow-execution-log', 'agent-action-log', 'ai-audit-trail', 'ai-audit-dashboard']
  };
}

// ─── PRIVATE HELPERS ───────────────────────────────────────

function _aalLoad_(key) {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(key) || '[]';
    return JSON.parse(raw);
  } catch(e) { return []; }
}

function _aalAppend_(key, entry, maxCount) {
  var logs = _aalLoad_(key);
  logs.unshift(entry);
  if (logs.length > maxCount) logs = logs.slice(0, maxCount);
  PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(logs));
}
