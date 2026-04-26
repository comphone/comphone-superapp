// ============================================================
// SharedContext.gs — COMPHONE SUPER APP v5.9.0-phase2d
// AI Operating System — Phase 2: Shared Context
// ============================================================
// ให้ข้อมูล context กลางแก่ Agent ทุกตัว
// getSystemContext() → { health, alerts, workload, memory }
// ============================================================

var SC_VERSION = '1.0.0';

// ─── MAIN: getSystemContext ─────────────────────────────────

/**
 * getSystemContext — ดึง system context ครบถ้วนสำหรับ Agent ทุกตัว
 * @param {Object} params - { includeMemory?, includeAlerts?, includeWorkload? }
 * @returns {Object} SystemContext
 */
function getSystemContext(params) {
  params = params || {};
  var startTs = Date.now();

  try {
    var ctx = {
      success:   true,
      version:   SC_VERSION,
      ts:        new Date().toISOString(),
      health:    _scGetHealth_(),
      alerts:    _scGetAlerts_(params),
      workload:  _scGetWorkload_(params),
      memory:    _scGetMemorySummary_(),
      _latencyMs: 0
    };

    ctx._latencyMs = Date.now() - startTs;

    // บันทึก snapshot ลง AgentMemory
    try {
      amSaveSnapshot({
        health:      ctx.health,
        alertCount:  ctx.alerts.total,
        workload:    ctx.workload,
        triggeredBy: (params && params.agentId) || 'system'
      });
    } catch(e) {}

    return ctx;
  } catch (e) {
    return { success: false, error: e.toString(), ts: new Date().toISOString() };
  }
}

// ─── HEALTH MODULE ─────────────────────────────────────────

/**
 * _scGetHealth_ — ประเมินสุขภาพระบบโดยรวม
 * Score 0-100 จาก: jobs, alerts, vision, learning
 */
function _scGetHealth_() {
  var score = 100;
  var issues = [];
  var details = {};

  try {
    // 1. ตรวจ Open Incidents (จาก AgentMemory)
    var incResult = amGetIncidents({ resolved: false, days: 1 });
    var openInc   = (incResult && incResult.total) || 0;
    var critInc   = 0;
    if (incResult && incResult.incidents) {
      critInc = incResult.incidents.filter(function(i) { return i.severity === 'CRITICAL'; }).length;
    }
    details.openIncidents    = openInc;
    details.criticalIncidents = critInc;
    if (critInc > 0)  { score -= critInc * 15; issues.push('CRITICAL_INCIDENTS: ' + critInc); }
    if (openInc > 5)  { score -= 10; issues.push('HIGH_OPEN_INCIDENTS: ' + openInc); }
  } catch(e) { details.incidentError = e.toString(); }

  try {
    // 2. ตรวจ Alert Queue (จาก LineBotIntelligent)
    var alertResult = getIntelAlertQueue({ limit: 50 });
    var alertCount  = (alertResult && alertResult.alerts) ? alertResult.alerts.length : 0;
    var p1Alerts    = 0;
    if (alertResult && alertResult.alerts) {
      p1Alerts = alertResult.alerts.filter(function(a) { return a.priority === 'P1-CRITICAL'; }).length;
    }
    details.alertCount = alertCount;
    details.p1Alerts   = p1Alerts;
    if (p1Alerts > 0)   { score -= p1Alerts * 10; issues.push('P1_ALERTS: ' + p1Alerts); }
    if (alertCount > 10) { score -= 5; issues.push('ALERT_QUEUE_HIGH: ' + alertCount); }
  } catch(e) { details.alertError = e.toString(); }

  try {
    // 3. ตรวจ Vision Pipeline
    var visionResult = getVisionDashboardStats({});
    if (visionResult && visionResult.stats) {
      var failRate = visionResult.stats.total > 0
        ? (visionResult.stats.failed / visionResult.stats.total)
        : 0;
      details.visionFailRate = parseFloat((failRate * 100).toFixed(1));
      if (failRate > 0.3) { score -= 15; issues.push('VISION_FAIL_RATE_HIGH: ' + details.visionFailRate + '%'); }
      else if (failRate > 0.1) { score -= 5; }
    }
  } catch(e) { details.visionError = e.toString(); }

  try {
    // 4. ตรวจ Learning System
    var learnResult = getLearningDashboard({ days: 1 });
    if (learnResult && learnResult.summary) {
      var fpRate = learnResult.summary.falsePositiveRate || 0;
      details.learningFPRate = fpRate;
      if (fpRate > 0.2) { score -= 10; issues.push('LEARNING_FP_HIGH: ' + (fpRate * 100).toFixed(1) + '%'); }
    }
  } catch(e) { details.learningError = e.toString(); }

  score = Math.max(0, Math.min(100, score));

  var status = 'HEALTHY';
  if (score < 40) status = 'CRITICAL';
  else if (score < 60) status = 'DEGRADED';
  else if (score < 80) status = 'WARNING';

  return {
    score:   score,
    status:  status,
    issues:  issues,
    details: details,
    ts:      new Date().toISOString()
  };
}

// ─── ALERTS MODULE ─────────────────────────────────────────

/**
 * _scGetAlerts_ — รวม alerts จากทุกแหล่ง
 */
function _scGetAlerts_(params) {
  var alerts = [];
  var total  = 0;
  var byPriority = { P1: 0, P2: 0, P3: 0 };

  try {
    var result = getIntelAlertQueue({ limit: 100 });
    if (result && result.alerts) {
      result.alerts.forEach(function(a) {
        alerts.push({
          id:       a.id,
          type:     a.type,
          priority: a.priority,
          data:     a.data,
          ts:       a.ts,
          source:   'LineBotIntelligent'
        });
        if (a.priority === 'P1-CRITICAL') byPriority.P1++;
        else if (a.priority === 'P2-HIGH') byPriority.P2++;
        else byPriority.P3++;
      });
      total = alerts.length;
    }
  } catch(e) {}

  // เพิ่ม alerts จาก AgentMemory (incidents ที่ยังไม่ resolve)
  try {
    var incResult = amGetIncidents({ resolved: false, days: 1, limit: 20 });
    if (incResult && incResult.incidents) {
      incResult.incidents.forEach(function(inc) {
        if (inc.severity === 'CRITICAL' || inc.severity === 'HIGH') {
          alerts.push({
            id:       inc.id,
            type:     'INCIDENT_' + inc.type,
            priority: inc.severity === 'CRITICAL' ? 'P1-CRITICAL' : 'P2-HIGH',
            data:     inc.data,
            ts:       inc.ts,
            source:   'AgentMemory'
          });
          if (inc.severity === 'CRITICAL') byPriority.P1++;
          else byPriority.P2++;
          total++;
        }
      });
    }
  } catch(e) {}

  // เรียงตาม priority
  var priorityOrder = { 'P1-CRITICAL': 0, 'P2-HIGH': 1, 'P3-MEDIUM': 2 };
  alerts.sort(function(a, b) {
    return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
  });

  return {
    total:      total,
    byPriority: byPriority,
    alerts:     alerts.slice(0, 20),
    hasP1:      byPriority.P1 > 0
  };
}

// ─── WORKLOAD MODULE ───────────────────────────────────────

/**
 * _scGetWorkload_ — ประเมิน workload ปัจจุบัน
 */
function _scGetWorkload_(params) {
  var workload = {
    level:        'NORMAL',
    score:        0,
    activeJobs:   0,
    pendingJobs:  0,
    overdueJobs:  0,
    queueDepth:   0,
    details:      {}
  };

  try {
    // ดึงข้อมูลงานจาก JobManager (ถ้ามี)
    if (typeof checkJobs === 'function') {
      var jobResult = checkJobs({ status: 'inprogress', limit: 200 });
      if (jobResult && jobResult.jobs) {
        workload.activeJobs = jobResult.jobs.length;
        var now = Date.now();
        workload.overdueJobs = jobResult.jobs.filter(function(j) {
          return j.due_date && new Date(j.due_date).getTime() < now;
        }).length;
      }
    }

    // ดึง pending jobs
    if (typeof checkJobs === 'function') {
      var pendResult = checkJobs({ status: 'pending', limit: 100 });
      if (pendResult && pendResult.jobs) {
        workload.pendingJobs = pendResult.jobs.length;
      }
    }
  } catch(e) { workload.details.jobError = e.toString(); }

  try {
    // ดึง Vision queue depth
    var visionStats = getVisionDashboardStats({});
    if (visionStats && visionStats.stats) {
      workload.queueDepth = visionStats.stats.needReview || 0;
      workload.details.visionNeedReview = workload.queueDepth;
    }
  } catch(e) {}

  // คำนวณ workload score
  workload.score = Math.min(100,
    (workload.activeJobs  * 2)  +
    (workload.pendingJobs * 1)  +
    (workload.overdueJobs * 10) +
    (workload.queueDepth  * 3)
  );

  if (workload.score > 80) workload.level = 'OVERLOADED';
  else if (workload.score > 50) workload.level = 'HIGH';
  else if (workload.score > 20) workload.level = 'MODERATE';
  else workload.level = 'NORMAL';

  return workload;
}

// ─── MEMORY SUMMARY ────────────────────────────────────────

function _scGetMemorySummary_() {
  try {
    var dashboard = getAgentMemoryDashboard({});
    if (dashboard && dashboard.summary) {
      return {
        openIncidents:    dashboard.summary.openIncidents,
        criticalIncidents: dashboard.summary.criticalIncidents,
        activeRules:      dashboard.summary.activeRules,
        topPatterns:      dashboard.topPatterns || []
      };
    }
  } catch(e) {}
  return { openIncidents: 0, criticalIncidents: 0, activeRules: 0, topPatterns: [] };
}

// ─── CONTEXT DIFF ──────────────────────────────────────────

/**
 * getContextDiff — เปรียบเทียบ context ปัจจุบันกับ snapshot ล่าสุด
 */
function getContextDiff(params) {
  try {
    var current  = getSystemContext(params);
    var snapshots = amGetSnapshots({ limit: 2 });
    var previous  = (snapshots.snapshots && snapshots.snapshots[1]) || null;

    if (!previous) {
      return { success: true, diff: null, message: 'No previous snapshot to compare' };
    }

    var diff = {
      healthDelta:  (current.health.score || 0) - (previous.health && previous.health.score || 0),
      alertDelta:   (current.alerts.total || 0) - (previous.alertCount || 0),
      workloadDelta: (current.workload.score || 0) - (previous.workload && previous.workload.score || 0)
    };

    diff.trend = diff.healthDelta >= 0 ? 'IMPROVING' : 'DEGRADING';
    if (Math.abs(diff.healthDelta) < 5) diff.trend = 'STABLE';

    return { success: true, current: current, diff: diff };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getSharedContextVersion — ดู version
 */
function getSharedContextVersion() {
  return {
    success: true,
    version: SC_VERSION,
    module: 'SharedContext',
    features: ['health-score', 'alert-aggregation', 'workload-assessment', 'memory-summary', 'context-diff']
  };
}
