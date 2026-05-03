// ============================================================
// DecisionLayer.gs — COMPHONE SUPER APP v5.9.0-phase31a
// AI Operating System — Phase 5: Decision Layer
// ============================================================
// ศูนย์กลางการตัดสินใจ: รับ context → วิเคราะห์ → เลือก action
// Strategies: Rule-based → Pattern-based → Heuristic → Escalate
// ============================================================

var DL_VERSION = '1.0.0';

// ─── DECISION THRESHOLDS ───────────────────────────────────
var DL_THRESHOLDS = {
  HEALTH_CRITICAL:    40,   // health score ต่ำกว่านี้ → CRITICAL
  HEALTH_WARNING:     70,   // health score ต่ำกว่านี้ → WARNING
  WORKLOAD_HIGH:      60,   // workload score สูงกว่านี้ → HIGH
  WORKLOAD_OVERLOAD:  85,   // workload score สูงกว่านี้ → OVERLOADED
  PATTERN_CONFIDENCE: 0.65, // pattern confidence ต้องสูงกว่านี้ถึงจะใช้
  ALERT_P1_THRESHOLD: 1,    // P1 alerts มากกว่านี้ → immediate action
  ESCALATE_SCORE:     80    // decision score สูงกว่านี้ → escalate
};

// ─── DECISION ACTIONS ──────────────────────────────────────
var DL_ACTIONS = {
  // Immediate actions
  TRIGGER_QC_WORKFLOW:      { id: 'TRIGGER_QC_WORKFLOW',      priority: 1, fn: 'triggerWorkflow',    params: { workflowId: 'QC_FAIL' } },
  TRIGGER_PAYMENT_WORKFLOW: { id: 'TRIGGER_PAYMENT_WORKFLOW', priority: 1, fn: 'triggerWorkflow',    params: { workflowId: 'PAYMENT_ERROR' } },
  TRIGGER_SLA_WORKFLOW:     { id: 'TRIGGER_SLA_WORKFLOW',     priority: 2, fn: 'triggerWorkflow',    params: { workflowId: 'SLA_LOW' } },
  SEND_CRITICAL_ALERT:      { id: 'SEND_CRITICAL_ALERT',      priority: 1, fn: 'queueAlertIntelligent', params: { priority: 'P1-CRITICAL' } },
  SEND_WARNING_ALERT:       { id: 'SEND_WARNING_ALERT',       priority: 2, fn: 'queueAlertIntelligent', params: { priority: 'P2-HIGH' } },
  // Analysis actions
  ANALYZE_PATTERNS:         { id: 'ANALYZE_PATTERNS',         priority: 3, fn: 'analyzeErrorPatterns', params: {} },
  REQUEST_HUMAN_REVIEW:     { id: 'REQUEST_HUMAN_REVIEW',     priority: 2, fn: 'submitHumanReview',    params: {} },
  // Maintenance actions
  RUN_LEARNING_CYCLE:       { id: 'RUN_LEARNING_CYCLE',       priority: 4, fn: 'processFeedbackLoop',  params: {} },
  STORE_INCIDENT:           { id: 'STORE_INCIDENT',           priority: 3, fn: 'amStoreIncident',      params: {} },
  // No-op
  MONITOR_ONLY:             { id: 'MONITOR_ONLY',             priority: 5, fn: null,                   params: {} }
};

// ─── MAIN: decide ──────────────────────────────────────────

/**
 * decide — ฟังก์ชันตัดสินใจกลาง
 * รับ context → วิเคราะห์ → return { actions, reasoning, confidence }
 * @param {Object} params - { context?, trigger?, agentId? }
 */
function decide(params) {
  params = params || {};
  var startTs  = Date.now();
  var agentId  = params.agentId || 'decision_layer';
  var trigger  = params.trigger || null;
  var context  = params.context || null;

  try {
    // 1. ดึง context ถ้าไม่ได้ส่งมา
    if (!context) {
      context = getSystemContext({ agentId: agentId });
    }

    // 2. วิเคราะห์ด้วย 4 strategies
    var ruleDecision    = _dlRuleBasedDecision_(context, trigger);
    var patternDecision = _dlPatternBasedDecision_(context);
    var heuristic       = _dlHeuristicDecision_(context);

    // 3. รวม decisions และเรียงตาม priority
    var allActions = [];
    var reasoning  = [];

    ruleDecision.actions.forEach(function(a) {
      allActions.push(a);
      reasoning.push('[RULE] ' + a.reason);
    });
    patternDecision.actions.forEach(function(a) {
      if (!_dlHasAction_(allActions, a.id)) {
        allActions.push(a);
        reasoning.push('[PATTERN] ' + a.reason);
      }
    });
    heuristic.actions.forEach(function(a) {
      if (!_dlHasAction_(allActions, a.id)) {
        allActions.push(a);
        reasoning.push('[HEURISTIC] ' + a.reason);
      }
    });

    // 4. เรียงตาม priority
    allActions.sort(function(a, b) { return (a.priority || 5) - (b.priority || 5); });

    // 5. คำนวณ confidence
    var confidence = _dlCalcConfidence_(context, allActions);

    // 6. ตัดสินใจว่าต้อง escalate หรือไม่
    var shouldEscalate = _dlShouldEscalate_(context, allActions);

    var decision = {
      success:       true,
      decisionId:    'dec_' + Utilities.getUuid().replace(/-/g, '').substring(0, 10),
      ts:            new Date().toISOString(),
      agentId:       agentId,
      actions:       allActions,
      topAction:     allActions.length > 0 ? allActions[0] : DL_ACTIONS.MONITOR_ONLY,
      reasoning:     reasoning,
      confidence:    confidence,
      shouldEscalate: shouldEscalate,
      contextSummary: {
        healthScore:  context.health && context.health.score,
        healthStatus: context.health && context.health.status,
        alertCount:   context.alerts && context.alerts.total,
        hasP1:        context.alerts && context.alerts.hasP1,
        workloadLevel: context.workload && context.workload.level
      },
      _latencyMs: Date.now() - startTs
    };

    // 7. บันทึกการตัดสินใจลง AgentMemory
    _dlLogDecision_(decision);

    return decision;
  } catch (e) {
    return { success: false, error: e.toString(), _latencyMs: Date.now() - startTs };
  }
}

/**
 * decideAndAct — ตัดสินใจ + รัน top action ทันที
 */
function decideAndAct(params) {
  try {
    var decision = decide(params);
    if (!decision.success) return decision;

    var topAction = decision.topAction;
    if (!topAction || topAction.id === 'MONITOR_ONLY' || !topAction.fn) {
      return Object.assign({}, decision, { executed: false, reason: 'No action needed (MONITOR_ONLY)' });
    }

    // รัน top action
    var actionResult = _dlExecuteAction_(topAction, decision.contextSummary, params.trigger);

    return Object.assign({}, decision, {
      executed:     true,
      executedAction: topAction.id,
      actionResult: actionResult
    });
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ─── STRATEGY 1: RULE-BASED ────────────────────────────────

function _dlRuleBasedDecision_(context, trigger) {
  var actions  = [];
  var health   = (context.health   || {});
  var alerts   = (context.alerts   || {});
  var workload = (context.workload  || {});

  // Rule 1: P1 Alert → ส่ง critical alert ทันที
  if (alerts.hasP1 || (alerts.byPriority && alerts.byPriority.P1 >= DL_THRESHOLDS.ALERT_P1_THRESHOLD)) {
    actions.push({ id: 'SEND_CRITICAL_ALERT', priority: 1, reason: 'P1 alerts detected: ' + (alerts.byPriority && alerts.byPriority.P1 || 1), confidence: 0.95 });
  }

  // Rule 2: Health CRITICAL → trigger workflows
  if (health.score <= DL_THRESHOLDS.HEALTH_CRITICAL) {
    actions.push({ id: 'TRIGGER_QC_WORKFLOW', priority: 1, reason: 'Health score critical: ' + health.score, confidence: 0.90 });
    actions.push({ id: 'SEND_CRITICAL_ALERT', priority: 1, reason: 'System health critical', confidence: 0.90 });
  }

  // Rule 3: Workload OVERLOADED → SLA workflow
  if (workload.level === 'OVERLOADED' || workload.score >= DL_THRESHOLDS.WORKLOAD_OVERLOAD) {
    actions.push({ id: 'TRIGGER_SLA_WORKFLOW', priority: 2, reason: 'Workload overloaded: ' + workload.score, confidence: 0.85 });
  }

  // Rule 4: Trigger-based
  if (trigger) {
    if (trigger.type === 'QC_FAIL') {
      actions.push({ id: 'TRIGGER_QC_WORKFLOW', priority: 1, reason: 'QC_FAIL trigger received', confidence: 0.99 });
    }
    if (trigger.type === 'PAYMENT_ERROR') {
      actions.push({ id: 'TRIGGER_PAYMENT_WORKFLOW', priority: 1, reason: 'PAYMENT_ERROR trigger received', confidence: 0.99 });
    }
    if (trigger.type === 'SLA_LOW') {
      actions.push({ id: 'TRIGGER_SLA_WORKFLOW', priority: 2, reason: 'SLA_LOW trigger received', confidence: 0.95 });
    }
  }

  // Rule 5: Evaluate AgentMemory rules
  try {
    var ruleResult = amEvaluateRules({
      healthScore:   health.score,
      workloadScore: workload.score,
      alertCount:    alerts.total,
      hasP1:         alerts.hasP1
    });
    if (ruleResult && ruleResult.matched) {
      ruleResult.matched.forEach(function(rule) {
        if (DL_ACTIONS[rule.action]) {
          actions.push({ id: rule.action, priority: rule.priority || 3, reason: 'Memory rule: ' + rule.name, confidence: 0.75 });
        }
      });
    }
  } catch(e) {}

  return { actions: actions };
}

// ─── STRATEGY 2: PATTERN-BASED ─────────────────────────────

function _dlPatternBasedDecision_(context) {
  var actions = [];

  try {
    var patterns = amGetPatterns({ minConfidence: DL_THRESHOLDS.PATTERN_CONFIDENCE, limit: 10 });
    if (patterns && patterns.patterns) {
      patterns.patterns.forEach(function(p) {
        if (p.action && DL_ACTIONS[p.action]) {
          actions.push({
            id:         p.action,
            priority:   3,
            reason:     'Pattern: ' + p.type + ' (freq=' + p.frequency + ', conf=' + p.confidence + ')',
            confidence: p.confidence
          });
        }
      });
    }
  } catch(e) {}

  return { actions: actions };
}

// ─── STRATEGY 3: HEURISTIC ─────────────────────────────────

function _dlHeuristicDecision_(context) {
  var actions = [];
  var health  = (context.health  || {});
  var memory  = (context.memory  || {});

  // Heuristic 1: ถ้ามี open incidents มาก → analyze patterns
  if (memory.openIncidents > 5) {
    actions.push({ id: 'ANALYZE_PATTERNS', priority: 3, reason: 'High open incidents: ' + memory.openIncidents, confidence: 0.70 });
  }

  // Heuristic 2: ถ้า health WARNING → run learning cycle
  if (health.score < DL_THRESHOLDS.HEALTH_WARNING && health.score > DL_THRESHOLDS.HEALTH_CRITICAL) {
    actions.push({ id: 'RUN_LEARNING_CYCLE', priority: 4, reason: 'Health warning, running learning cycle', confidence: 0.65 });
  }

  // Heuristic 3: ถ้าไม่มีอะไรผิดปกติ → monitor only
  if (actions.length === 0 && health.score >= DL_THRESHOLDS.HEALTH_WARNING) {
    actions.push({ id: 'MONITOR_ONLY', priority: 5, reason: 'System healthy, monitoring only', confidence: 0.99 });
  }

  return { actions: actions };
}

// ─── HELPERS ───────────────────────────────────────────────

function _dlCalcConfidence_(context, actions) {
  if (actions.length === 0) return 0;
  var topAction = actions[0];
  var baseConf  = topAction.confidence || 0.5;
  // ปรับตาม health score
  var healthFactor = ((context.health && context.health.score) || 50) / 100;
  return parseFloat(Math.min(0.99, baseConf * (0.7 + healthFactor * 0.3)).toFixed(2));
}

function _dlShouldEscalate_(context, actions) {
  var p1Actions = actions.filter(function(a) { return a.priority === 1; });
  return p1Actions.length > 0 && (context.health && context.health.score < DL_THRESHOLDS.HEALTH_CRITICAL);
}

function _dlHasAction_(actions, id) {
  return actions.some(function(a) { return a.id === id; });
}

function _dlExecuteAction_(action, contextSummary, trigger) {
  try {
    var fn = action.fn;
    if (!fn) return { success: true, note: 'No function to execute' };

    var payload = Object.assign({}, action.params || {}, { trigger: trigger, context: contextSummary });

    // Explicit execution registry
    var executors = {
      'triggerWorkflow':      triggerWorkflow,
      'queueAlertIntelligent': queueAlertIntelligent,
      'analyzeErrorPatterns': analyzeErrorPatterns,
      'submitHumanReview':    submitHumanReview,
      'processFeedbackLoop':  processFeedbackLoop,
      'amStoreIncident':      amStoreIncident
    };

    var executor = executors[fn];
    if (typeof executor === 'function') {
      return executor(payload);
    }
    return { success: false, error: 'Executor not found: ' + fn };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function _dlLogDecision_(decision) {
  try {
    amStoreIncident({
      type:     'DECISION_MADE',
      data:     {
        decisionId: decision.decisionId,
        topAction:  decision.topAction && decision.topAction.id,
        confidence: decision.confidence,
        actionCount: decision.actions.length
      },
      agentId:  decision.agentId,
      severity: 'LOW'
    });
  } catch(e) {}
}

/**
 * getDecisionLayerVersion
 */
function getDecisionLayerVersion() {
  return {
    success: true,
    version: DL_VERSION,
    module: 'DecisionLayer',
    strategies: ['rule-based', 'pattern-based', 'heuristic'],
    features: ['decide', 'decide-and-act', 'confidence-scoring', 'escalation-detection', 'memory-rule-integration']
  };
}
