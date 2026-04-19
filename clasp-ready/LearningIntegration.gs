// ============================================================
// LearningIntegration.gs — COMPHONE SUPER APP V5.5
// AI Operating System — Phase 6: Learning Integration
// ============================================================
// เชื่อม VisionLearning → AgentMemory
// ทุก learning event → pattern + rule ใน AgentMemory
// ทุก incident → feedback loop ใน VisionLearning
// ============================================================

var LI_VERSION = '1.0.0';

// ─── MAIN: syncLearningToMemory ────────────────────────────

/**
 * syncLearningToMemory — ดึงข้อมูลจาก VisionLearning แล้วบันทึกลง AgentMemory
 * รันได้ทั้ง manual และ scheduled trigger
 */
function syncLearningToMemory(params) {
  params = params || {};
  var days    = parseInt(params.days || 7, 10);
  var startTs = Date.now();
  var synced  = { patterns: 0, rules: 0, incidents: 0, errors: [] };

  try {
    // 1. ดึง learning dashboard
    var dashboard = getLearningDashboard({ days: days });
    if (!dashboard || !dashboard.success) {
      return { success: false, error: 'Cannot get learning dashboard', details: dashboard };
    }

    // 2. sync patterns จาก error patterns
    try {
      var errorPatterns = analyzeErrorPatterns({ days: days });
      if (errorPatterns && errorPatterns.patterns) {
        errorPatterns.patterns.forEach(function(p) {
          var r = amStorePattern({
            type:       'VISION_' + (p.type || 'UNKNOWN').toUpperCase(),
            confidence: parseFloat(p.rate || 0.5),
            action:     _liGetActionForPattern_(p.type, p.rate),
            metadata:   { source: 'VisionLearning', count: p.count, rate: p.rate, days: days }
          });
          if (r && r.success) synced.patterns++;
          else synced.errors.push('Pattern sync: ' + (r && r.error));
        });
      }
    } catch(e) { synced.errors.push('Pattern sync error: ' + e.toString()); }

    // 3. sync rules จาก active rules
    try {
      var activeRules = getActiveRules({});
      if (activeRules && activeRules.rules) {
        activeRules.rules.forEach(function(rule) {
          var r = amStoreRule({
            name:      'VISION_' + (rule.id || rule.name || 'rule'),
            condition: {
              field: 'visionType',
              op:    'eq',
              value: rule.type || rule.id
            },
            action:    _liGetActionForRule_(rule),
            priority:  rule.priority || 3,
            source:    'learning',
            enabled:   rule.enabled !== false
          });
          if (r && r.success) synced.rules++;
          else synced.errors.push('Rule sync: ' + (r && r.error));
        });
      }
    } catch(e) { synced.errors.push('Rule sync error: ' + e.toString()); }

    // 4. ตรวจ calibration — ถ้า false positive สูง → บันทึก incident
    try {
      var calibration = getConfidenceCalibration();
      if (calibration && calibration.calibration) {
        var fpRate = calibration.calibration.falsePositiveRate || 0;
        if (fpRate > 0.2) {
          var r = amStoreIncident({
            type:     'HIGH_FALSE_POSITIVE_RATE',
            data:     { fpRate: fpRate, calibration: calibration.calibration },
            agentId:  'learning_integration',
            severity: fpRate > 0.4 ? 'CRITICAL' : 'HIGH'
          });
          if (r && r.success) synced.incidents++;
        }
      }
    } catch(e) { synced.errors.push('Calibration sync error: ' + e.toString()); }

    // 5. บันทึก learning stats เป็น snapshot
    try {
      var summary = dashboard.summary || {};
      amSaveSnapshot({
        source:          'LearningIntegration',
        learningStats:   summary,
        syncedPatterns:  synced.patterns,
        syncedRules:     synced.rules,
        triggeredBy:     'syncLearningToMemory'
      });
    } catch(e) {}

    return {
      success:   true,
      synced:    synced,
      latencyMs: Date.now() - startTs,
      ts:        new Date().toISOString()
    };
  } catch (e) {
    return { success: false, error: e.toString(), synced: synced };
  }
}

// ─── MAIN: syncIncidentsToLearning ─────────────────────────

/**
 * syncIncidentsToLearning — ดึง incidents จาก AgentMemory แล้วส่งเป็น feedback ให้ VisionLearning
 */
function syncIncidentsToLearning(params) {
  params = params || {};
  var days    = parseInt(params.days || 1, 10);
  var startTs = Date.now();
  var synced  = { feedbacks: 0, errors: [] };

  try {
    // ดึง vision-related incidents
    var visionIncidents = amGetIncidents({
      type:  'QC_FAIL',
      days:  days,
      limit: 50
    });

    if (visionIncidents && visionIncidents.incidents) {
      visionIncidents.incidents.forEach(function(inc) {
        try {
          // ส่งเป็น feedback loop ให้ VisionLearning
          var feedback = {
            jobId:      inc.data && inc.data.jobId,
            imageType:  inc.data && inc.data.imageType,
            aiResult:   inc.data && inc.data.aiResult,
            humanResult: inc.data && inc.data.humanResult,
            isCorrect:  false, // QC_FAIL = AI ตัดสินผิด
            confidence: inc.data && inc.data.confidence,
            source:     'incident_sync'
          };
          var r = processFeedbackLoop(feedback);
          if (r && r.success) synced.feedbacks++;
          else synced.errors.push('Feedback: ' + (r && r.error));
        } catch(e) {
          synced.errors.push('Incident feedback error: ' + e.toString());
        }
      });
    }

    // ดึง HIGH_FALSE_POSITIVE_RATE incidents
    var fpIncidents = amGetIncidents({
      type:  'HIGH_FALSE_POSITIVE_RATE',
      days:  days,
      limit: 10
    });

    if (fpIncidents && fpIncidents.incidents) {
      fpIncidents.incidents.forEach(function(inc) {
        try {
          // trigger calibration recalculation
          var r = getConfidenceCalibration();
          if (r && r.success) synced.feedbacks++;
        } catch(e) {}
      });
    }

    return {
      success:   true,
      synced:    synced,
      latencyMs: Date.now() - startTs
    };
  } catch (e) {
    return { success: false, error: e.toString(), synced: synced };
  }
}

// ─── MAIN: runLearningCycle ────────────────────────────────

/**
 * runLearningCycle — รัน full learning cycle
 * 1. sync learning → memory
 * 2. sync incidents → learning
 * 3. evaluate rules
 * 4. update decision thresholds
 */
function runLearningCycle(params) {
  params = params || {};
  var startTs = Date.now();
  var results = {};

  try {
    // Step 1: sync learning → memory
    results.learningToMemory = syncLearningToMemory({ days: params.days || 7 });

    // Step 2: sync incidents → learning
    results.incidentsToLearning = syncIncidentsToLearning({ days: params.days || 1 });

    // Step 3: evaluate rules กับ context ปัจจุบัน
    try {
      var ctx = getSystemContext({});
      results.ruleEvaluation = amEvaluateRules({
        healthScore:   ctx.health && ctx.health.score,
        workloadScore: ctx.workload && ctx.workload.score,
        alertCount:    ctx.alerts && ctx.alerts.total
      });
    } catch(e) {
      results.ruleEvaluation = { error: e.toString() };
    }

    // Step 4: อัปเดต dynamic thresholds จาก calibration
    results.thresholdUpdate = _liUpdateThresholds_();

    // Step 5: บันทึก learning cycle event
    amStoreIncident({
      type:     'LEARNING_CYCLE_COMPLETE',
      data:     {
        patternsSync: results.learningToMemory && results.learningToMemory.synced && results.learningToMemory.synced.patterns,
        feedbacksSync: results.incidentsToLearning && results.incidentsToLearning.synced && results.incidentsToLearning.synced.feedbacks,
        rulesMatched: results.ruleEvaluation && results.ruleEvaluation.count
      },
      agentId:  'learning_integration',
      severity: 'LOW'
    });

    return {
      success:   true,
      cycle:     'complete',
      results:   results,
      latencyMs: Date.now() - startTs,
      ts:        new Date().toISOString()
    };
  } catch (e) {
    return { success: false, error: e.toString(), results: results };
  }
}

// ─── LEARNING BRIDGE API ───────────────────────────────────

/**
 * getLearningMemoryBridge — ดูสถานะการเชื่อมต่อระหว่าง Learning และ Memory
 */
function getLearningMemoryBridge(params) {
  try {
    var memDashboard  = getAgentMemoryDashboard({});
    var learnDashboard = getLearningDashboard({ days: 7 });

    var bridgeHealth = 'CONNECTED';
    var issues = [];

    if (!memDashboard || !memDashboard.success)   { bridgeHealth = 'DEGRADED'; issues.push('AgentMemory unavailable'); }
    if (!learnDashboard || !learnDashboard.success) { bridgeHealth = 'DEGRADED'; issues.push('VisionLearning unavailable'); }

    return {
      success:       true,
      bridgeHealth:  bridgeHealth,
      issues:        issues,
      memoryStats: {
        totalPatterns: memDashboard && memDashboard.summary && memDashboard.summary.totalPatterns,
        activeRules:   memDashboard && memDashboard.summary && memDashboard.summary.activeRules,
        openIncidents: memDashboard && memDashboard.summary && memDashboard.summary.openIncidents
      },
      learningStats: {
        fpRate:       learnDashboard && learnDashboard.summary && learnDashboard.summary.falsePositiveRate,
        totalMismatches: learnDashboard && learnDashboard.summary && learnDashboard.summary.totalMismatches
      },
      lastSync: PropertiesService.getScriptProperties().getProperty('LI_LAST_SYNC') || 'never'
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * setupLearningIntegrationTrigger — ตั้ง trigger รัน runLearningCycle ทุก 6 ชั่วโมง
 */
function setupLearningIntegrationTrigger() {
  try {
    // ลบ trigger เก่า
    ScriptApp.getProjectTriggers().forEach(function(t) {
      if (t.getHandlerFunction() === 'runLearningCycle') {
        ScriptApp.deleteTrigger(t);
      }
    });
    // สร้าง trigger ใหม่ ทุก 6 ชั่วโมง
    ScriptApp.newTrigger('runLearningCycle')
      .timeBased()
      .everyHours(6)
      .create();
    return { success: true, message: 'Learning cycle trigger set: every 6 hours' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getLearningIntegrationVersion
 */
function getLearningIntegrationVersion() {
  return {
    success: true,
    version: LI_VERSION,
    module: 'LearningIntegration',
    features: [
      'sync-learning-to-memory',
      'sync-incidents-to-learning',
      'full-learning-cycle',
      'bridge-health-check',
      'scheduled-trigger',
      'dynamic-threshold-update'
    ]
  };
}

// ─── PRIVATE HELPERS ───────────────────────────────────────

function _liGetActionForPattern_(type, rate) {
  if (!type) return 'MONITOR_ONLY';
  var t = String(type).toUpperCase();
  if (t.includes('FALSE_POSITIVE') || rate > 0.3) return 'REQUEST_HUMAN_REVIEW';
  if (t.includes('QC') || t.includes('FAIL'))     return 'TRIGGER_QC_WORKFLOW';
  if (t.includes('PAYMENT'))                       return 'TRIGGER_PAYMENT_WORKFLOW';
  return 'ANALYZE_PATTERNS';
}

function _liGetActionForRule_(rule) {
  if (!rule) return 'MONITOR_ONLY';
  var type = String(rule.type || rule.id || '').toUpperCase();
  if (type.includes('REJECT') || type.includes('FAIL')) return 'REQUEST_HUMAN_REVIEW';
  if (type.includes('SLIP'))                             return 'TRIGGER_PAYMENT_WORKFLOW';
  return 'ANALYZE_PATTERNS';
}

function _liUpdateThresholds_() {
  try {
    var calibration = getConfidenceCalibration();
    if (!calibration || !calibration.calibration) return { updated: false };

    var cal = calibration.calibration;
    var updates = {};

    // ถ้า false positive สูง → เพิ่ม threshold
    if (cal.falsePositiveRate > 0.2) {
      updates.PATTERN_CONFIDENCE = Math.min(0.85, 0.65 + cal.falsePositiveRate * 0.5);
    }

    // บันทึก thresholds ที่อัปเดต
    if (Object.keys(updates).length > 0) {
      PropertiesService.getScriptProperties().setProperty(
        'LI_DYNAMIC_THRESHOLDS', JSON.stringify(updates)
      );
    }

    PropertiesService.getScriptProperties().setProperty('LI_LAST_SYNC', new Date().toISOString());

    return { updated: Object.keys(updates).length > 0, updates: updates };
  } catch(e) {
    return { updated: false, error: e.toString() };
  }
}
