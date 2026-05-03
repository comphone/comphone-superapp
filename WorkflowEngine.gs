// ============================================================
// WorkflowEngine.gs — COMPHONE SUPER APP v5.9.0-phase31a
// AI Operating System — Phase 4: Workflow Engine
// ============================================================
// กำหนดและรัน Workflows อัตโนมัติสำหรับสถานการณ์ต่างๆ
// Built-in: QC_FAIL, PAYMENT_ERROR, SLA_LOW
// Custom: สร้างได้ผ่าน defineWorkflow()
// ============================================================

var WF_VERSION = '1.0.0';

// ─── WORKFLOW DEFINITIONS ──────────────────────────────────
// แต่ละ workflow ประกอบด้วย steps ที่รันตามลำดับ
// step: { id, action, agent, payload?, condition?, onFail? }

var WF_BUILT_IN = {

  // ── QC_FAIL: เมื่อ Vision QC ตรวจพบปัญหา ─────────────────
  'QC_FAIL': {
    id:          'QC_FAIL',
    name:        'QC Failure Response',
    description: 'รันเมื่อ Vision QC ตรวจพบปัญหาคุณภาพงาน',
    trigger:     { type: 'INCIDENT', incidentType: 'QC_FAIL' },
    priority:    1,
    steps: [
      {
        id:     'qc_log_memory',
        name:   'บันทึก incident ลง AgentMemory',
        action: 'memory.storeIncident',
        agent:  'internal',
        payloadFn: function(ctx) {
          return {
            type:     'QC_FAIL',
            data:     ctx.trigger || {},
            severity: (ctx.trigger && ctx.trigger.confidence < 0.3) ? 'CRITICAL' : 'HIGH',
            agentId:  'workflow_engine'
          };
        }
      },
      {
        id:     'qc_alert_p1',
        name:   'ส่ง P1 Alert ไปยัง LINE',
        action: 'alert.queue',
        agent:  'internal',
        payloadFn: function(ctx) {
          return {
            alertType: 'QC_FAIL',
            data: {
              jobId:      ctx.trigger && ctx.trigger.jobId,
              confidence: ctx.trigger && ctx.trigger.confidence,
              issues:     ctx.trigger && ctx.trigger.issues
            },
            options: { priority: 'P1-CRITICAL', ttl: 3600 }
          };
        }
      },
      {
        id:     'qc_request_review',
        name:   'ส่งงานไปยัง Human Review',
        action: 'vision.review',
        agent:  'manus',
        payloadFn: function(ctx) {
          return {
            jobId:    ctx.trigger && ctx.trigger.jobId,
            reason:   'QC_FAIL',
            priority: 'HIGH'
          };
        },
        condition: { field: 'trigger.confidence', op: 'lt', value: 0.6 }
      },
      {
        id:     'qc_notify_tech',
        name:   'แจ้งช่างซ่อมผ่าน LINE',
        action: 'alert.queue',
        agent:  'hermes',
        payloadFn: function(ctx) {
          return {
            alertType: 'TECH_NOTIFICATION',
            data: {
              message: 'งาน #' + (ctx.trigger && ctx.trigger.jobId || 'N/A') + ' ไม่ผ่าน QC กรุณาตรวจสอบ',
              role:    'technician'
            },
            options: { priority: 'P2-HIGH' }
          };
        }
      }
    ]
  },

  // ── PAYMENT_ERROR: เมื่อมีปัญหาการชำระเงิน ───────────────
  'PAYMENT_ERROR': {
    id:          'PAYMENT_ERROR',
    name:        'Payment Error Response',
    description: 'รันเมื่อตรวจพบความผิดปกติในการชำระเงิน',
    trigger:     { type: 'INCIDENT', incidentType: 'PAYMENT_ERROR' },
    priority:    1,
    steps: [
      {
        id:     'pay_log_memory',
        name:   'บันทึก payment incident',
        action: 'memory.storeIncident',
        agent:  'internal',
        payloadFn: function(ctx) {
          return {
            type:     'PAYMENT_ERROR',
            data:     ctx.trigger || {},
            severity: 'CRITICAL',
            agentId:  'workflow_engine'
          };
        }
      },
      {
        id:     'pay_freeze_check',
        name:   'ตรวจสอบ pattern การชำระเงินผิดปกติ',
        action: 'memory.getPatterns',
        agent:  'manus',
        payloadFn: function(ctx) {
          return { type: 'PAYMENT_ERROR', minFrequency: 2 };
        }
      },
      {
        id:     'pay_alert_critical',
        name:   'ส่ง P1 Critical Alert',
        action: 'alert.queue',
        agent:  'internal',
        payloadFn: function(ctx) {
          return {
            alertType: 'PAYMENT_ERROR',
            data: {
              amount:    ctx.trigger && ctx.trigger.amount,
              jobId:     ctx.trigger && ctx.trigger.jobId,
              errorCode: ctx.trigger && ctx.trigger.errorCode
            },
            options: { priority: 'P1-CRITICAL', ttl: 7200 }
          };
        }
      },
      {
        id:     'pay_notify_manager',
        name:   'แจ้งผู้จัดการทันที',
        action: 'alert.queue',
        agent:  'hermes',
        payloadFn: function(ctx) {
          return {
            alertType: 'MANAGER_ALERT',
            data: {
              message: '⚠️ พบปัญหาการชำระเงิน จำนวน ' + (ctx.trigger && ctx.trigger.amount || 'N/A') + ' บาท',
              role:    'manager',
              urgent:  true
            },
            options: { priority: 'P1-CRITICAL' }
          };
        }
      },
      {
        id:     'pay_consensus',
        name:   'ขอ consensus จาก agents ว่าควร escalate หรือไม่',
        action: 'collab.consensus',
        agent:  'internal',
        payloadFn: function(ctx) {
          return {
            question:    'alert.get',
            agents:      ['manus', 'hermes'],
            requesterId: 'workflow_engine'
          };
        }
      }
    ]
  },

  // ── SLA_LOW: เมื่อ SLA ต่ำกว่าเกณฑ์ ──────────────────────
  'SLA_LOW': {
    id:          'SLA_LOW',
    name:        'SLA Degradation Response',
    description: 'รันเมื่อ SLA score ต่ำกว่า threshold',
    trigger:     { type: 'METRIC', metric: 'sla_score', op: 'lt', value: 80 },
    priority:    2,
    steps: [
      {
        id:     'sla_get_context',
        name:   'ดึง system context ปัจจุบัน',
        action: 'context.get',
        agent:  'internal',
        payloadFn: function(ctx) { return {}; }
      },
      {
        id:     'sla_analyze_workload',
        name:   'วิเคราะห์ workload ที่ทำให้ SLA ต่ำ',
        action: 'learning.patterns',
        agent:  'manus',
        payloadFn: function(ctx) {
          return { type: 'SLA_DEGRADATION', days: 3 };
        }
      },
      {
        id:     'sla_log_incident',
        name:   'บันทึก SLA incident',
        action: 'memory.storeIncident',
        agent:  'internal',
        payloadFn: function(ctx) {
          return {
            type:     'SLA_LOW',
            data:     { slaScore: ctx.trigger && ctx.trigger.value, workload: ctx.workload },
            severity: (ctx.trigger && ctx.trigger.value < 60) ? 'CRITICAL' : 'HIGH',
            agentId:  'workflow_engine'
          };
        }
      },
      {
        id:     'sla_alert_team',
        name:   'แจ้งทีมงาน',
        action: 'alert.queue',
        agent:  'hermes',
        payloadFn: function(ctx) {
          return {
            alertType: 'SLA_WARNING',
            data: {
              slaScore: ctx.trigger && ctx.trigger.value,
              message:  'SLA ต่ำกว่าเกณฑ์ กรุณาเร่งดำเนินการ'
            },
            options: { priority: 'P2-HIGH', ttl: 3600 }
          };
        }
      },
      {
        id:     'sla_delegate_review',
        name:   'มอบหมายให้ agent ตรวจสอบงานค้าง',
        action: 'collab.delegate',
        agent:  'internal',
        payloadFn: function(ctx) {
          return {
            delegatorId:  'workflow_engine',
            requiredRole: 'incident',
            action:       'incident.list',
            payload:      { status: 'overdue', limit: 20 }
          };
        }
      }
    ]
  }
};

// ─── CUSTOM WORKFLOW STORE ─────────────────────────────────
var WF_CUSTOM_KEY = 'WF_CUSTOM_WORKFLOWS';
var WF_RUN_LOG    = 'WF_RUN_LOG';

// ─── MAIN: triggerWorkflow ─────────────────────────────────

/**
 * triggerWorkflow — รัน workflow ตาม trigger
 * @param {Object} params - { workflowId, trigger, context? }
 */
function triggerWorkflow(params) {
  params = params || {};
  var workflowId = params.workflowId || params.id || '';
  var trigger    = params.trigger    || {};
  var context    = params.context    || {};
  var runId      = 'run_' + Utilities.getUuid().replace(/-/g, '').substring(0, 12);
  var startTs    = Date.now();

  try {
    // ค้นหา workflow
    var workflow = _wfGetWorkflow_(workflowId);
    if (!workflow) {
      return { success: false, error: 'Workflow not found: ' + workflowId };
    }

    // สร้าง execution context
    var execCtx = Object.assign({}, context, {
      trigger:    trigger,
      workflowId: workflowId,
      runId:      runId,
      startTs:    startTs
    });

    // รัน steps ตามลำดับ
    var stepResults = [];
    var aborted     = false;

    for (var i = 0; i < workflow.steps.length; i++) {
      var step = workflow.steps[i];

      // ตรวจ condition
      if (step.condition) {
        var condOk = _wfCheckCondition_(execCtx, step.condition);
        if (!condOk) {
          stepResults.push({ stepId: step.id, name: step.name, skipped: true, reason: 'Condition not met' });
          continue;
        }
      }

      // สร้าง payload
      var stepPayload = {};
      try {
        stepPayload = typeof step.payloadFn === 'function' ? step.payloadFn(execCtx) : (step.payload || {});
      } catch(e) {
        stepPayload = step.payload || {};
      }

      // รัน step
      var stepResult = _wfRunStep_(step, stepPayload, execCtx);
      stepResults.push({ stepId: step.id, name: step.name, result: stepResult, ts: new Date().toISOString() });

      // อัปเดต context ด้วยผลลัพธ์ของ step
      execCtx = Object.assign({}, execCtx, { ['step_' + step.id]: stepResult });

      // ตรวจ onFail
      if (stepResult && stepResult.success === false && step.onFail === 'ABORT') {
        aborted = true;
        stepResults.push({ stepId: 'ABORT', reason: 'Step ' + step.id + ' failed with onFail=ABORT' });
        break;
      }
    }

    var runResult = {
      success:    !aborted,
      runId:      runId,
      workflowId: workflowId,
      name:       workflow.name,
      steps:      stepResults.length,
      stepResults: stepResults,
      aborted:    aborted,
      latencyMs:  Date.now() - startTs
    };

    // บันทึก run log
    _wfLogRun_(workflowId, runId, runResult);

    return runResult;
  } catch (e) {
    return { success: false, error: e.toString(), runId: runId, workflowId: workflowId };
  }
}

/**
 * autoTriggerWorkflows — ตรวจ context แล้วรัน workflows ที่ match อัตโนมัติ
 */
function autoTriggerWorkflows(params) {
  params = params || {};
  var context = params.context || getSystemContext({});
  var triggered = [];

  // ตรวจ QC_FAIL
  if (context.health && context.health.details && context.health.details.visionFailRate > 20) {
    var r = triggerWorkflow({
      workflowId: 'QC_FAIL',
      trigger:    { confidence: 0.4, source: 'auto_health_check' },
      context:    context
    });
    triggered.push({ workflowId: 'QC_FAIL', result: r });
  }

  // ตรวจ SLA_LOW
  if (context.workload && context.workload.overdueJobs > 3) {
    var slaScore = Math.max(0, 100 - (context.workload.overdueJobs * 10));
    var r2 = triggerWorkflow({
      workflowId: 'SLA_LOW',
      trigger:    { metric: 'sla_score', value: slaScore },
      context:    context
    });
    triggered.push({ workflowId: 'SLA_LOW', result: r2 });
  }

  return {
    success:   true,
    triggered: triggered.length,
    workflows: triggered
  };
}

// ─── WORKFLOW MANAGEMENT ───────────────────────────────────

/**
 * defineWorkflow — สร้าง custom workflow
 */
function defineWorkflow(params) {
  try {
    params = params || {};
    var id    = params.id    || params.workflowId || '';
    var name  = params.name  || id;
    var steps = params.steps || [];

    if (!id) return { success: false, error: 'Workflow id required' };
    if (WF_BUILT_IN[id]) return { success: false, error: 'Cannot override built-in workflow: ' + id };

    var customs = _wfLoadCustom_();
    customs[id] = { id: id, name: name, steps: steps, createdAt: new Date().toISOString(), custom: true };
    PropertiesService.getScriptProperties().setProperty(WF_CUSTOM_KEY, JSON.stringify(customs));

    return { success: true, workflowId: id, name: name, steps: steps.length };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * listWorkflows — ดู workflows ทั้งหมด
 */
function listWorkflows(params) {
  try {
    var customs = _wfLoadCustom_();
    var all = [];

    Object.keys(WF_BUILT_IN).forEach(function(id) {
      var wf = WF_BUILT_IN[id];
      all.push({ id: id, name: wf.name, description: wf.description, steps: wf.steps.length, type: 'built-in' });
    });
    Object.keys(customs).forEach(function(id) {
      var wf = customs[id];
      all.push({ id: id, name: wf.name, steps: (wf.steps || []).length, type: 'custom', createdAt: wf.createdAt });
    });

    return { success: true, count: all.length, workflows: all };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getWorkflowRunLog — ดู run history
 */
function getWorkflowRunLog(params) {
  try {
    params = params || {};
    var workflowId = params.workflowId || '';
    var limit      = parseInt(params.limit || 20, 10);

    var logs = _wfLoadRunLog_();
    if (workflowId) logs = logs.filter(function(l) { return l.workflowId === workflowId; });

    return { success: true, count: logs.slice(0, limit).length, logs: logs.slice(0, limit) };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getWorkflowEngineVersion
 */
function getWorkflowEngineVersion() {
  return {
    success: true,
    version: WF_VERSION,
    module: 'WorkflowEngine',
    builtInWorkflows: Object.keys(WF_BUILT_IN),
    features: ['trigger', 'auto-trigger', 'define-custom', 'list', 'run-log', 'condition-steps']
  };
}

// ─── PRIVATE HELPERS ───────────────────────────────────────

function _wfGetWorkflow_(id) {
  if (WF_BUILT_IN[id]) return WF_BUILT_IN[id];
  var customs = _wfLoadCustom_();
  return customs[id] || null;
}

function _wfRunStep_(step, payload, ctx) {
  try {
    var action = step.action || '';
    var agent  = step.agent  || 'internal';

    // Special actions ที่ handle ภายใน WorkflowEngine
    if (action === 'memory.storeIncident') {
      return amStoreIncident(payload);
    }
    if (action === 'memory.getPatterns') {
      return amGetPatterns(payload);
    }
    if (action === 'context.get') {
      return getSystemContext(payload);
    }
    if (action === 'collab.consensus') {
      return agentConsensus(payload);
    }
    if (action === 'collab.delegate') {
      return agentDelegate(payload);
    }

    // ส่งไปยัง AgentGateway
    return agentGatewayDispatch({
      agentId:     agent,
      apiKey:      PropertiesService.getScriptProperties().getProperty('AG_KEY_' + agent) || agent + '_key',
      agentAction: action,
      payload:     payload
    });
  } catch (e) {
    return { success: false, error: e.toString(), step: step.id };
  }
}

function _wfCheckCondition_(ctx, condition) {
  if (!condition || !condition.field) return true;
  var parts = condition.field.split('.');
  var val = ctx;
  parts.forEach(function(p) { val = val && val[p]; });
  switch (condition.op) {
    case 'lt':  return Number(val) < Number(condition.value);
    case 'gt':  return Number(val) > Number(condition.value);
    case 'lte': return Number(val) <= Number(condition.value);
    case 'gte': return Number(val) >= Number(condition.value);
    case 'eq':  return val === condition.value;
    default:    return true;
  }
}

function _wfLoadCustom_() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(WF_CUSTOM_KEY) || '{}';
    return JSON.parse(raw);
  } catch(e) { return {}; }
}

function _wfLogRun_(workflowId, runId, result) {
  try {
    var logs = _wfLoadRunLog_();
    logs.unshift({
      workflowId: workflowId,
      runId:      runId,
      success:    result.success,
      steps:      result.steps,
      latencyMs:  result.latencyMs,
      ts:         new Date().toISOString()
    });
    if (logs.length > 100) logs = logs.slice(0, 100);
    PropertiesService.getScriptProperties().setProperty(WF_RUN_LOG, JSON.stringify(logs));
  } catch(e) {}
}

function _wfLoadRunLog_() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(WF_RUN_LOG) || '[]';
    return JSON.parse(raw);
  } catch(e) { return []; }
}
