// ============================================================
// WorkflowSafety.gs — COMPHONE SUPER APP v5.9.0-phase2d
// AI-OS Stabilization — Phase 3: Workflow Safety
// ============================================================
// Max Depth: ป้องกัน infinite recursion ใน workflow chains
// Execution Timeout: หยุด workflow ที่ใช้เวลานานเกินไป
// Circuit Breaker: ปิด workflow ชั่วคราวเมื่อ fail ติดต่อกัน
// Dry Run: ทดสอบ workflow โดยไม่ execute จริง
// ============================================================

var WS_VERSION = '1.0.0';

// ─── SAFETY CONFIG ─────────────────────────────────────────
var WS_LIMITS = {
  MAX_WORKFLOW_DEPTH:    5,      // ระดับ nesting สูงสุด
  MAX_STEPS_PER_RUN:     20,     // steps สูงสุดต่อ run
  STEP_TIMEOUT_MS:       25000,  // 25 วินาที ต่อ step (GAS limit = 6 min)
  TOTAL_TIMEOUT_MS:      270000, // 4.5 นาที ต่อ workflow run
  CIRCUIT_FAIL_THRESHOLD: 3,     // fail ติดต่อกันกี่ครั้งถึง open circuit
  CIRCUIT_RESET_SEC:     300     // รีเซ็ต circuit หลังจากกี่วินาที
};

// ─── CIRCUIT BREAKER STATE ─────────────────────────────────
var WS_CIRCUIT_KEY = 'WS_CIRCUIT_STATE';
var WS_SAFETY_LOG  = 'WS_SAFETY_LOG';

// ─── MAIN: safeTriggerWorkflow ─────────────────────────────

/**
 * safeTriggerWorkflow — รัน workflow พร้อม safety checks ทั้งหมด
 * ใช้แทน triggerWorkflow ใน production
 */
function safeTriggerWorkflow(params) {
  params = params || {};
  var workflowId = params.workflowId || '';
  var depth      = parseInt(params._depth || 0, 10);
  var startTs    = Date.now();

  try {
    // 1. ตรวจ Max Depth
    if (depth >= WS_LIMITS.MAX_WORKFLOW_DEPTH) {
      _wsLog_('DEPTH_EXCEEDED', workflowId, { depth: depth, max: WS_LIMITS.MAX_WORKFLOW_DEPTH });
      return {
        success: false,
        error:   'WORKFLOW_DEPTH_EXCEEDED',
        message: 'Max workflow depth ' + WS_LIMITS.MAX_WORKFLOW_DEPTH + ' reached at depth ' + depth,
        safetyBlock: 'MAX_DEPTH'
      };
    }

    // 2. ตรวจ Circuit Breaker
    var circuitCheck = _wsCheckCircuit_(workflowId);
    if (!circuitCheck.allowed) {
      _wsLog_('CIRCUIT_OPEN', workflowId, circuitCheck);
      return Object.assign({ success: false, safetyBlock: 'CIRCUIT_BREAKER' }, circuitCheck);
    }

    // 3. ตรวจ Guard (Cooldown + Dedup)
    var guardCheck = checkGuard({
      actionType: workflowId,
      agentId:    params.agentId || 'workflow_engine',
      payload:    params.trigger || {}
    });
    if (!guardCheck.allowed) {
      return Object.assign({ success: false, safetyBlock: 'DECISION_GUARD' }, guardCheck);
    }

    // 4. รัน workflow พร้อม timeout tracking
    var result = _wsRunWithTimeout_(workflowId, params, startTs);

    // 5. อัปเดต Circuit Breaker state
    _wsUpdateCircuit_(workflowId, result.success !== false);

    // 6. บันทึก safety log
    _wsLog_(result.success !== false ? 'SUCCESS' : 'FAIL', workflowId, {
      steps:     result.steps,
      latencyMs: Date.now() - startTs,
      depth:     depth
    });

    return result;
  } catch (e) {
    _wsUpdateCircuit_(workflowId, false);
    _wsLog_('EXCEPTION', workflowId, { error: e.toString() });
    return { success: false, error: e.toString(), safetyBlock: 'EXCEPTION' };
  }
}

// ─── TIMEOUT WRAPPER ───────────────────────────────────────

function _wsRunWithTimeout_(workflowId, params, startTs) {
  var wf = _wfGetWorkflow_(workflowId);
  if (!wf) return { success: false, error: 'Workflow not found: ' + workflowId };

  // ตรวจ max steps
  if (wf.steps && wf.steps.length > WS_LIMITS.MAX_STEPS_PER_RUN) {
    return {
      success: false,
      error:   'TOO_MANY_STEPS: ' + wf.steps.length + ' > ' + WS_LIMITS.MAX_STEPS_PER_RUN,
      safetyBlock: 'MAX_STEPS'
    };
  }

  // รัน workflow ปกติ — GAS ไม่รองรับ real async timeout
  // แต่เราตรวจ elapsed time ระหว่าง steps
  var runId    = 'safe_' + Utilities.getUuid().replace(/-/g, '').substring(0, 10);
  var trigger  = params.trigger  || {};
  var context  = params.context  || {};
  var execCtx  = Object.assign({}, context, { trigger: trigger, workflowId: workflowId, runId: runId });

  var stepResults = [];
  var aborted     = false;
  var timeoutHit  = false;

  for (var i = 0; i < wf.steps.length; i++) {
    // ตรวจ total timeout
    var elapsed = Date.now() - startTs;
    if (elapsed > WS_LIMITS.TOTAL_TIMEOUT_MS) {
      timeoutHit = true;
      stepResults.push({
        stepId:  'TIMEOUT',
        reason:  'Total timeout exceeded: ' + elapsed + 'ms > ' + WS_LIMITS.TOTAL_TIMEOUT_MS + 'ms',
        aborted: true
      });
      break;
    }

    var step = wf.steps[i];

    // ตรวจ condition
    if (step.condition && !_wfCheckCondition_(execCtx, step.condition)) {
      stepResults.push({ stepId: step.id, name: step.name, skipped: true, reason: 'Condition not met' });
      continue;
    }

    // สร้าง payload
    var stepPayload = {};
    try {
      stepPayload = typeof step.payloadFn === 'function' ? step.payloadFn(execCtx) : (step.payload || {});
    } catch(e) {
      stepPayload = step.payload || {};
    }

    // รัน step พร้อมจับ step timeout
    var stepStart  = Date.now();
    var stepResult = _wsRunStepSafe_(step, stepPayload, execCtx);
    var stepMs     = Date.now() - stepStart;

    stepResults.push({
      stepId:    step.id,
      name:      step.name,
      result:    stepResult,
      latencyMs: stepMs,
      ts:        new Date().toISOString()
    });

    // อัปเดต context
    execCtx = Object.assign({}, execCtx, { ['step_' + step.id]: stepResult });

    // ตรวจ step timeout warning
    if (stepMs > WS_LIMITS.STEP_TIMEOUT_MS) {
      _wsLog_('STEP_SLOW', workflowId, { stepId: step.id, latencyMs: stepMs });
    }

    // ตรวจ onFail
    if (stepResult && stepResult.success === false && step.onFail === 'ABORT') {
      aborted = true;
      break;
    }
  }

  return {
    success:     !aborted && !timeoutHit,
    runId:       runId,
    workflowId:  workflowId,
    name:        wf.name,
    steps:       stepResults.length,
    stepResults: stepResults,
    aborted:     aborted,
    timeoutHit:  timeoutHit,
    latencyMs:   Date.now() - startTs
  };
}

function _wsRunStepSafe_(step, payload, ctx) {
  try {
    return _wfRunStep_(step, payload, ctx);
  } catch (e) {
    return { success: false, error: e.toString(), step: step.id, safetyBlock: 'STEP_EXCEPTION' };
  }
}

// ─── CIRCUIT BREAKER ───────────────────────────────────────

function _wsCheckCircuit_(workflowId) {
  try {
    var state  = _wsLoadCircuit_();
    var entry  = state[workflowId];
    if (!entry) return { allowed: true };

    if (entry.state === 'OPEN') {
      var elapsed = (Date.now() - entry.openedAt) / 1000;
      if (elapsed > WS_LIMITS.CIRCUIT_RESET_SEC) {
        // HALF-OPEN: ลองใหม่
        entry.state = 'HALF_OPEN';
        state[workflowId] = entry;
        _wsSaveCircuit_(state);
        return { allowed: true, halfOpen: true };
      }
      return {
        allowed:    false,
        error:      'CIRCUIT_OPEN: ' + workflowId,
        message:    'Circuit breaker open after ' + entry.failCount + ' failures. Retry in ' + Math.ceil(WS_LIMITS.CIRCUIT_RESET_SEC - elapsed) + 's',
        failCount:  entry.failCount,
        retryAfter: Math.ceil(WS_LIMITS.CIRCUIT_RESET_SEC - elapsed)
      };
    }
    return { allowed: true };
  } catch (e) {
    return { allowed: true };
  }
}

function _wsUpdateCircuit_(workflowId, success) {
  try {
    var state = _wsLoadCircuit_();
    var entry = state[workflowId] || { state: 'CLOSED', failCount: 0 };

    if (success) {
      entry.state     = 'CLOSED';
      entry.failCount = 0;
      entry.lastSuccess = Date.now();
    } else {
      entry.failCount = (entry.failCount || 0) + 1;
      entry.lastFail  = Date.now();
      if (entry.failCount >= WS_LIMITS.CIRCUIT_FAIL_THRESHOLD) {
        entry.state    = 'OPEN';
        entry.openedAt = Date.now();
        _wsLog_('CIRCUIT_OPENED', workflowId, { failCount: entry.failCount });
      }
    }

    state[workflowId] = entry;
    _wsSaveCircuit_(state);
  } catch (e) {}
}

// ─── DRY RUN ───────────────────────────────────────────────

/**
 * dryRunWorkflow — ทดสอบ workflow โดยไม่ execute จริง
 * ตรวจสอบ: depth, steps count, conditions, payload generation
 */
function dryRunWorkflow(params) {
  params = params || {};
  var workflowId = params.workflowId || '';
  var trigger    = params.trigger    || {};

  try {
    var wf = _wfGetWorkflow_(workflowId);
    if (!wf) return { success: false, error: 'Workflow not found: ' + workflowId };

    var analysis = {
      workflowId:  workflowId,
      name:        wf.name,
      stepCount:   wf.steps ? wf.steps.length : 0,
      withinDepth: true,
      withinSteps: (wf.steps ? wf.steps.length : 0) <= WS_LIMITS.MAX_STEPS_PER_RUN,
      steps:       []
    };

    var execCtx = { trigger: trigger, workflowId: workflowId };
    wf.steps.forEach(function(step) {
      var conditionMet = !step.condition || _wfCheckCondition_(execCtx, step.condition);
      var payloadPreview = {};
      try {
        payloadPreview = typeof step.payloadFn === 'function' ? step.payloadFn(execCtx) : (step.payload || {});
      } catch(e) {
        payloadPreview = { error: e.toString() };
      }

      analysis.steps.push({
        id:           step.id,
        name:         step.name,
        agent:        step.agent,
        action:       step.action,
        conditionMet: conditionMet,
        wouldSkip:    !conditionMet,
        payloadPreview: payloadPreview,
        onFail:       step.onFail || 'CONTINUE'
      });
    });

    // ตรวจ circuit breaker
    var circuitCheck = _wsCheckCircuit_(workflowId);
    analysis.circuitState = circuitCheck.allowed ? 'CLOSED' : 'OPEN';

    return Object.assign({ success: true }, analysis);
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ─── SAFETY DASHBOARD ──────────────────────────────────────

/**
 * getWorkflowSafetyStatus — ดูสถานะ safety ของทุก workflow
 */
function getWorkflowSafetyStatus(params) {
  try {
    var circuits = _wsLoadCircuit_();
    var wfList   = listWorkflows({});
    var status   = [];

    (wfList.workflows || []).forEach(function(wf) {
      var circuit = circuits[wf.id] || { state: 'CLOSED', failCount: 0 };
      status.push({
        workflowId: wf.id,
        name:       wf.name,
        circuit:    circuit.state,
        failCount:  circuit.failCount || 0,
        lastSuccess: circuit.lastSuccess ? new Date(circuit.lastSuccess).toISOString() : null,
        lastFail:    circuit.lastFail   ? new Date(circuit.lastFail).toISOString()    : null
      });
    });

    var openCircuits = status.filter(function(s) { return s.circuit === 'OPEN'; }).length;

    return {
      success:      true,
      openCircuits: openCircuits,
      workflows:    status,
      limits:       WS_LIMITS
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getSafetyLog — ดู safety event log
 */
function getSafetyLog(params) {
  try {
    params = params || {};
    var limit = parseInt(params.limit || 20, 10);
    var raw   = PropertiesService.getScriptProperties().getProperty(WS_SAFETY_LOG) || '[]';
    var logs  = JSON.parse(raw);
    return { success: true, count: logs.slice(0, limit).length, logs: logs.slice(0, limit) };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getWorkflowSafetyVersion
 */
function getWorkflowSafetyVersion() {
  return {
    success: true,
    version: WS_VERSION,
    module: 'WorkflowSafety',
    features: ['max-depth', 'execution-timeout', 'circuit-breaker', 'dry-run', 'safety-dashboard', 'safety-log']
  };
}

// ─── PRIVATE HELPERS ───────────────────────────────────────

function _wsLoadCircuit_() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(WS_CIRCUIT_KEY) || '{}';
    return JSON.parse(raw);
  } catch(e) { return {}; }
}

function _wsSaveCircuit_(state) {
  PropertiesService.getScriptProperties().setProperty(WS_CIRCUIT_KEY, JSON.stringify(state));
}

function _wsLog_(event, workflowId, data) {
  try {
    var raw  = PropertiesService.getScriptProperties().getProperty(WS_SAFETY_LOG) || '[]';
    var logs = JSON.parse(raw);
    logs.unshift({ event: event, workflowId: workflowId, data: data, ts: new Date().toISOString() });
    if (logs.length > 200) logs = logs.slice(0, 200);
    PropertiesService.getScriptProperties().setProperty(WS_SAFETY_LOG, JSON.stringify(logs));
  } catch(e) {}
}
