// VisionLearning.gs — Self-Learning Vision System v1.0.0
// COMPHONE SUPER APP V5.5
// ============================================================
// Phase 1: Feedback Loop        — อ่าน VISION_REVIEW, compare AI vs human
// Phase 2: Confidence Calibration — คำนวณ real accuracy per feature
// Phase 3: Dynamic Threshold    — auto-adjust threshold จาก accuracy
// Phase 4: Pattern Analysis     — detect frequent errors by tech/product/job
// Phase 5: Prompt Optimization  — build adaptive prompt with learned rules
// Phase 6: Auto Rule Engine     — create/apply rules ก่อน AI call
// Phase 7: Learning Dashboard   — accuracy trend, FP rate, review rate
// ============================================================

var VL_VERSION = '1.0.0';
var VL_MIN_SAMPLES = 5;          // ต้องมีตัวอย่างอย่างน้อย 5 ก่อน calibrate
var VL_THRESHOLD_MIN = 0.55;     // threshold ต่ำสุด
var VL_THRESHOLD_MAX = 0.90;     // threshold สูงสุด
var VL_RULE_CONFIDENCE_MIN = 0.80; // rule ต้องมี accuracy >= 80% ถึงจะ apply
var VL_LEARNING_RATE = 0.1;      // ปรับ threshold ทีละ 10%

// ─── PHASE 1: FEEDBACK LOOP ─────────────────────────────────

/**
 * processFeedbackLoop — อ่าน VISION_REVIEW, compare AI vs human, store mismatch
 * เรียกได้จาก: Time-driven trigger (เช่น ทุก 6 ชั่วโมง) หรือ manual
 * @returns {{ processed, mismatches, accuracy }}
 */
function processFeedbackLoop() {
  try {
    var ss = getComphoneSheet();
    var reviewSh = ss.getSheetByName('VISION_REVIEW');
    var logSh = ss.getSheetByName('VISION_LOG');
    if (!reviewSh || !logSh) {
      return { success: false, error: 'VISION_REVIEW or VISION_LOG sheet not found' };
    }

    var reviewData = reviewSh.getDataRange().getValues();
    var logData = logSh.getDataRange().getValues();

    // Build log lookup: logId → row
    var logMap = {};
    for (var i = 1; i < logData.length; i++) {
      var rowTs = String(new Date(logData[i][0]).getTime());
      logMap[rowTs] = logData[i];
    }

    var processed = 0, mismatches = 0;
    var mismatchList = [];

    for (var r = 1; r < reviewData.length; r++) {
      var row = reviewData[r];
      var logId = String(row[1] || '');
      var humanDecision = String(row[2] || '');
      var reviewedBy = String(row[3] || '');

      // ค้นหา AI decision จาก VISION_LOG ด้วย logId (timestamp-based)
      var logRow = logMap[logId] || null;
      if (!logRow) continue;

      var aiDecision = String(logRow[3] || '');
      var aiConf = parseFloat(logRow[2] || 0);
      var vType = String(logRow[1] || '');
      var dataJson = {};
      try { dataJson = JSON.parse(logRow[10] || '{}'); } catch (e) {}

      processed++;
      var isMatch = (aiDecision === humanDecision);
      if (!isMatch) {
        mismatches++;
        mismatchList.push({
          ts: logId,
          type: vType,
          aiDecision: aiDecision,
          humanDecision: humanDecision,
          aiConf: aiConf,
          reviewedBy: reviewedBy,
          jobId: dataJson.job_id || '',
          techName: dataJson.tech_name || ''
        });
        // บันทึก mismatch ลง VISION_MISMATCH sheet
        _vlSaveMismatch_(ss, {
          ts: logId,
          type: vType,
          aiDecision: aiDecision,
          humanDecision: humanDecision,
          aiConf: aiConf,
          reviewedBy: reviewedBy,
          jobId: dataJson.job_id || '',
          techName: dataJson.tech_name || ''
        });
      }
    }

    var accuracy = processed > 0 ? ((processed - mismatches) / processed) : null;

    // อัปเดต calibration หลัง feedback loop
    if (processed >= VL_MIN_SAMPLES) {
      _vlUpdateCalibration_(ss);
    }

    return {
      success: true,
      processed: processed,
      mismatches: mismatches,
      accuracy: accuracy !== null ? parseFloat((accuracy * 100).toFixed(1)) : null,
      mismatchList: mismatchList.slice(0, 10) // return max 10
    };
  } catch (e) {
    Logger.log('VisionLearning processFeedbackLoop error: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * _vlSaveMismatch_ — บันทึก mismatch ลง VISION_MISMATCH sheet
 */
function _vlSaveMismatch_(ss, mismatch) {
  try {
    var sh = ss.getSheetByName('VISION_MISMATCH');
    if (!sh) {
      sh = ss.insertSheet('VISION_MISMATCH');
      sh.appendRow(['ts', 'type', 'ai_decision', 'human_decision', 'ai_conf', 'reviewed_by', 'job_id', 'tech_name', 'saved_at']);
    }
    sh.appendRow([
      mismatch.ts || '',
      mismatch.type || '',
      mismatch.aiDecision || '',
      mismatch.humanDecision || '',
      mismatch.aiConf || 0,
      mismatch.reviewedBy || '',
      mismatch.jobId || '',
      mismatch.techName || '',
      new Date()
    ]);
  } catch (e) {
    Logger.log('_vlSaveMismatch_ error: ' + e.toString());
  }
}

// ─── PHASE 2: CONFIDENCE CALIBRATION ────────────────────────

/**
 * getConfidenceCalibration — ดูค่า calibration ปัจจุบันต่อ feature/type
 * @returns {{ calibration: { SLIP: { accuracy, samples, adjustedThreshold }, QC: {...}, PRODUCT: {...} } }}
 */
function getConfidenceCalibration() {
  try {
    var props = PropertiesService.getScriptProperties();
    var raw = props.getProperty('vl_calibration');
    if (!raw) {
      return { success: true, calibration: _vlDefaultCalibration_(), note: 'Using default calibration (no data yet)' };
    }
    return { success: true, calibration: JSON.parse(raw) };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * _vlUpdateCalibration_ — คำนวณ accuracy จาก VISION_MISMATCH และอัปเดต calibration
 */
function _vlUpdateCalibration_(ss) {
  try {
    var sh = ss.getSheetByName('VISION_MISMATCH');
    var logSh = ss.getSheetByName('VISION_LOG');
    if (!sh || !logSh) return;

    var mismatchData = sh.getDataRange().getValues();
    var logData = logSh.getDataRange().getValues();

    // นับ total และ mismatch per type
    var stats = {};
    var types = ['SLIP', 'QC', 'PRODUCT'];
    types.forEach(function(t) { stats[t] = { total: 0, mismatches: 0 }; });

    // นับ total จาก VISION_LOG
    for (var i = 1; i < logData.length; i++) {
      var t = String(logData[i][1] || '').toUpperCase();
      if (stats[t]) stats[t].total++;
    }

    // นับ mismatches จาก VISION_MISMATCH
    for (var m = 1; m < mismatchData.length; m++) {
      var mt = String(mismatchData[m][1] || '').toUpperCase();
      if (stats[mt]) stats[mt].mismatches++;
    }

    // คำนวณ accuracy และ adjusted threshold
    var calibration = {};
    types.forEach(function(type) {
      var s = stats[type];
      var accuracy = s.total >= VL_MIN_SAMPLES ? (s.total - s.mismatches) / s.total : null;
      var currentThreshold = _vlGetThreshold_(type);
      var adjustedThreshold = currentThreshold;

      if (accuracy !== null) {
        // ถ้า accuracy สูง → ลด threshold (AI เก่ง → trust ได้มากขึ้น)
        // ถ้า accuracy ต่ำ → เพิ่ม threshold (AI ผิดบ่อย → ต้องการ confidence สูงขึ้น)
        if (accuracy >= 0.90) {
          adjustedThreshold = Math.max(VL_THRESHOLD_MIN, currentThreshold - VL_LEARNING_RATE);
        } else if (accuracy < 0.70) {
          adjustedThreshold = Math.min(VL_THRESHOLD_MAX, currentThreshold + VL_LEARNING_RATE);
        }
      }

      calibration[type] = {
        accuracy: accuracy !== null ? parseFloat((accuracy * 100).toFixed(1)) : null,
        samples: s.total,
        mismatches: s.mismatches,
        adjustedThreshold: parseFloat(adjustedThreshold.toFixed(2)),
        updatedAt: new Date().toISOString()
      };
    });

    PropertiesService.getScriptProperties().setProperty('vl_calibration', JSON.stringify(calibration));
    return calibration;
  } catch (e) {
    Logger.log('_vlUpdateCalibration_ error: ' + e.toString());
    return null;
  }
}

function _vlDefaultCalibration_() {
  return {
    SLIP: { accuracy: null, samples: 0, mismatches: 0, adjustedThreshold: 0.70, updatedAt: null },
    QC: { accuracy: null, samples: 0, mismatches: 0, adjustedThreshold: 0.70, updatedAt: null },
    PRODUCT: { accuracy: null, samples: 0, mismatches: 0, adjustedThreshold: 0.70, updatedAt: null }
  };
}

// ─── PHASE 3: DYNAMIC THRESHOLD ─────────────────────────────

/**
 * getDynamicThreshold — ดึง threshold ที่ปรับแล้วสำหรับ type นั้นๆ
 * @param {string} type — 'SLIP' | 'QC' | 'PRODUCT'
 * @returns {number} threshold
 */
function getDynamicThreshold(type) {
  return _vlGetThreshold_(type);
}

function _vlGetThreshold_(type) {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty('vl_calibration');
    if (!raw) return 0.70;
    var cal = JSON.parse(raw);
    return (cal[type] && cal[type].adjustedThreshold) ? cal[type].adjustedThreshold : 0.70;
  } catch (e) {
    return 0.70;
  }
}

/**
 * setManualThreshold — ตั้ง threshold แบบ manual (override)
 */
function setManualThreshold(params) {
  try {
    var type = (params.type || '').toUpperCase();
    var threshold = parseFloat(params.threshold || 0.70);
    if (!['SLIP', 'QC', 'PRODUCT'].includes(type)) {
      return { success: false, error: 'Invalid type: ' + type };
    }
    threshold = Math.max(VL_THRESHOLD_MIN, Math.min(VL_THRESHOLD_MAX, threshold));

    var raw = PropertiesService.getScriptProperties().getProperty('vl_calibration');
    var cal = raw ? JSON.parse(raw) : _vlDefaultCalibration_();
    if (!cal[type]) cal[type] = _vlDefaultCalibration_()[type];
    cal[type].adjustedThreshold = threshold;
    cal[type].manualOverride = true;
    cal[type].updatedAt = new Date().toISOString();
    PropertiesService.getScriptProperties().setProperty('vl_calibration', JSON.stringify(cal));

    return { success: true, type: type, threshold: threshold, note: 'Manual override applied' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ─── PHASE 4: PATTERN ANALYSIS ──────────────────────────────

/**
 * analyzeErrorPatterns — วิเคราะห์ pattern ของ errors จาก VISION_MISMATCH
 * @param {Object} params - { days, groupBy } groupBy: 'tech'|'type'|'decision'
 */
function analyzeErrorPatterns(params) {
  try {
    var days = parseInt((params || {}).days || 30);
    var groupBy = (params || {}).groupBy || 'type';
    var ss = getComphoneSheet();
    var sh = ss.getSheetByName('VISION_MISMATCH');
    if (!sh) return { success: true, patterns: [], note: 'No mismatch data yet' };

    var data = sh.getDataRange().getValues();
    var cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    var groups = {};

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var savedAt = new Date(row[8] || 0).getTime();
      if (savedAt < cutoff) continue;

      var key;
      if (groupBy === 'tech') {
        key = String(row[7] || 'unknown_tech');
      } else if (groupBy === 'decision') {
        key = String(row[2] || 'UNKNOWN') + '_vs_' + String(row[3] || 'UNKNOWN');
      } else {
        key = String(row[1] || 'UNKNOWN'); // group by type
      }

      if (!groups[key]) {
        groups[key] = { key: key, count: 0, aiDecisions: {}, humanDecisions: {}, avgConf: 0, totalConf: 0, jobIds: [] };
      }
      groups[key].count++;
      var aiDec = String(row[2] || '');
      var humanDec = String(row[3] || '');
      var conf = parseFloat(row[4] || 0);
      groups[key].aiDecisions[aiDec] = (groups[key].aiDecisions[aiDec] || 0) + 1;
      groups[key].humanDecisions[humanDec] = (groups[key].humanDecisions[humanDec] || 0) + 1;
      groups[key].totalConf += conf;
      var jobId = String(row[6] || '');
      if (jobId && groups[key].jobIds.indexOf(jobId) < 0) groups[key].jobIds.push(jobId);
    }

    // Sort by count desc
    var patterns = Object.values(groups).map(function(g) {
      return {
        key: g.key,
        errorCount: g.count,
        topAiDecision: _vlTopKey_(g.aiDecisions),
        topHumanDecision: _vlTopKey_(g.humanDecisions),
        avgConf: g.count > 0 ? parseFloat((g.totalConf / g.count).toFixed(2)) : 0,
        affectedJobs: g.jobIds.length,
        recommendation: _vlRecommendation_(g)
      };
    }).sort(function(a, b) { return b.errorCount - a.errorCount; });

    return {
      success: true,
      period: days + ' days',
      groupBy: groupBy,
      totalMismatches: patterns.reduce(function(s, p) { return s + p.errorCount; }, 0),
      patterns: patterns.slice(0, 20)
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function _vlTopKey_(obj) {
  var top = null, max = 0;
  Object.keys(obj).forEach(function(k) { if (obj[k] > max) { max = obj[k]; top = k; } });
  return top;
}

function _vlRecommendation_(group) {
  if (group.count >= 10) return 'ควรปรับ Prompt หรือ Threshold — error สูง (' + group.count + ' ครั้ง)';
  if (group.avgConf < 0.6) return 'Confidence ต่ำมาก — ควรเพิ่ม Human Review';
  if (group.count >= 5) return 'ควรตรวจสอบ Pattern นี้เพิ่มเติม';
  return 'ปกติ';
}

// ─── PHASE 5: PROMPT OPTIMIZATION ───────────────────────────

/**
 * buildAdaptivePrompt — สร้าง prompt ที่ inject learned rules เข้าไป
 * @param {string} type — 'SLIP' | 'QC' | 'PRODUCT'
 * @param {Object} input — input context
 * @returns {string} adaptive prompt
 */
function buildAdaptivePrompt(type, input) {
  try {
    // ดึง rules ที่ active สำหรับ type นี้
    var rules = getActiveRules({ type: type });
    var ruleList = (rules.rules || []).slice(0, 5); // inject max 5 rules

    var basePrompt = _vlBasePrompt_(type, input);

    if (ruleList.length === 0) return basePrompt;

    var ruleSection = '\n\n--- กฎที่เรียนรู้จากประวัติ (ให้ความสำคัญสูง) ---\n';
    ruleList.forEach(function(rule, idx) {
      ruleSection += (idx + 1) + '. ' + rule.description + '\n';
    });
    ruleSection += '---\n';

    return basePrompt + ruleSection;
  } catch (e) {
    Logger.log('buildAdaptivePrompt error: ' + e.toString());
    return _vlBasePrompt_(type, input);
  }
}

function _vlBasePrompt_(type, input) {
  if (type === 'SLIP') {
    var expected = input.expectedAmount || input.expected_amount || 0;
    return 'คุณคือระบบตรวจสอบสลิปโอนเงิน PromptPay/ธนาคาร\n' +
      'วิเคราะห์รูปสลิปและตอบ JSON เท่านั้น:\n' +
      '{"is_slip":true,"amount":1500.00,"receiver_name":"ชื่อผู้รับ","transaction_ref":"รหัส","confidence":0.95,"is_valid":true,"issues":[]}\n' +
      (expected > 0 ? 'ยอดที่คาดหวัง: ฿' + expected + '\n' : '') +
      'ตอบ JSON อย่างเดียว ไม่มี markdown:';
  }
  if (type === 'QC') {
    return 'คุณคือระบบ QC ตรวจสอบคุณภาพงานติดตั้ง\n' +
      'วิเคราะห์รูปและตอบ JSON:\n' +
      '{"photo_category":"After","installation_quality":"Good","quality_issues":[],"suggestions":[],"is_ready_to_close":true,"confidence":0.9,"auto_label":"งานเสร็จสมบูรณ์","detected_equipment":[],"qc_score":90}\n' +
      'ตอบ JSON อย่างเดียว ไม่มี markdown:';
  }
  if (type === 'PRODUCT') {
    return 'คุณคือระบบตรวจสอบสินค้า\n' +
      'วิเคราะห์รูปสินค้าและตอบ JSON:\n' +
      '{"product_name":"ชื่อสินค้า","condition":"Good","defects":[],"confidence":0.9,"is_acceptable":true,"notes":""}\n' +
      'ตอบ JSON อย่างเดียว ไม่มี markdown:';
  }
  return 'วิเคราะห์รูปภาพและตอบ JSON ที่เกี่ยวข้อง';
}

// ─── PHASE 6: AUTO RULE ENGINE ───────────────────────────────

/**
 * createRule — สร้าง rule ใหม่จาก pattern ที่ detect ได้
 * @param {Object} params - { type, condition, action, description, source }
 */
function createRule(params) {
  try {
    var type = (params.type || '').toUpperCase();
    if (!['SLIP', 'QC', 'PRODUCT', 'ALL'].includes(type)) {
      return { success: false, error: 'Invalid type: ' + type };
    }

    var rules = _vlGetRules_();
    var ruleId = 'rule_' + Date.now();
    var newRule = {
      id: ruleId,
      type: type,
      condition: params.condition || '',
      action: params.action || 'flag_for_review',
      description: params.description || '',
      source: params.source || 'manual',
      accuracy: parseFloat(params.accuracy || 0),
      usageCount: 0,
      active: true,
      createdAt: new Date().toISOString()
    };

    rules.push(newRule);
    _vlSaveRules_(rules);

    return { success: true, ruleId: ruleId, rule: newRule };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getActiveRules — ดึง rules ที่ active สำหรับ type นั้นๆ
 */
function getActiveRules(params) {
  try {
    var type = (params || {}).type || 'ALL';
    var rules = _vlGetRules_();
    var filtered = rules.filter(function(r) {
      return r.active && (r.type === type.toUpperCase() || r.type === 'ALL') && r.accuracy >= VL_RULE_CONFIDENCE_MIN;
    });
    return { success: true, type: type, count: filtered.length, rules: filtered };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * applyRulesBeforeAI — apply rules ก่อน AI call (fast path)
 * @returns {{ decision, reason, appliedRule }} หรือ null ถ้าไม่มี rule match
 */
function applyRulesBeforeAI(type, input) {
  try {
    var rules = _vlGetRules_();
    var applicable = rules.filter(function(r) {
      return r.active && (r.type === type || r.type === 'ALL') && r.accuracy >= VL_RULE_CONFIDENCE_MIN;
    });

    for (var i = 0; i < applicable.length; i++) {
      var rule = applicable[i];
      var match = _vlEvaluateCondition_(rule.condition, input);
      if (match) {
        // อัปเดต usageCount
        rule.usageCount = (rule.usageCount || 0) + 1;
        _vlSaveRules_(rules);
        return {
          decision: rule.action,
          reason: 'Auto Rule: ' + rule.description,
          appliedRule: rule.id,
          confidence: rule.accuracy / 100
        };
      }
    }
    return null;
  } catch (e) {
    Logger.log('applyRulesBeforeAI error: ' + e.toString());
    return null;
  }
}

/**
 * _vlEvaluateCondition_ — ประเมิน condition string แบบ simple DSL
 * Supported: "amount < 100", "confidence < 0.5", "type == SLIP"
 */
function _vlEvaluateCondition_(condition, input) {
  try {
    if (!condition) return false;
    var parts = condition.split(' ');
    if (parts.length < 3) return false;
    var field = parts[0];
    var op = parts[1];
    var value = parts[2];

    var actual = input[field];
    if (actual === undefined) return false;

    var numVal = parseFloat(value);
    var numActual = parseFloat(actual);

    if (op === '<') return numActual < numVal;
    if (op === '>') return numActual > numVal;
    if (op === '<=') return numActual <= numVal;
    if (op === '>=') return numActual >= numVal;
    if (op === '==') return String(actual) === String(value);
    if (op === '!=') return String(actual) !== String(value);
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * autoGenerateRulesFromPatterns — สร้าง rules อัตโนมัติจาก pattern analysis
 */
function autoGenerateRulesFromPatterns(params) {
  try {
    var days = parseInt((params || {}).days || 30);
    var patterns = analyzeErrorPatterns({ days: days, groupBy: 'type' });
    if (!patterns.success || !patterns.patterns) return { success: false, error: 'No patterns found' };

    var generated = [];
    patterns.patterns.forEach(function(p) {
      if (p.errorCount >= 5 && p.avgConf < 0.65) {
        var rule = createRule({
          type: p.key,
          condition: 'confidence < ' + (p.avgConf + 0.05).toFixed(2),
          action: 'NEED_REVIEW',
          description: 'Auto-generated: ' + p.key + ' มี error ' + p.errorCount + ' ครั้ง ใน ' + days + ' วัน (avg conf ' + p.avgConf + ')',
          source: 'auto_pattern',
          accuracy: 80
        });
        if (rule.success) generated.push(rule.ruleId);
      }
    });

    return { success: true, generated: generated.length, ruleIds: generated };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function _vlGetRules_() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty('vl_rules');
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function _vlSaveRules_(rules) {
  try {
    PropertiesService.getScriptProperties().setProperty('vl_rules', JSON.stringify(rules));
  } catch (e) { Logger.log('_vlSaveRules_ error: ' + e.toString()); }
}

// ─── PHASE 7: LEARNING DASHBOARD ────────────────────────────

/**
 * getLearningDashboard — ดึงข้อมูลสำหรับ Learning Dashboard
 * @param {Object} params - { days }
 * @returns {{ accuracyTrend, falsePositiveRate, reviewRate, calibration, topPatterns, activeRules }}
 */
function getLearningDashboard(params) {
  try {
    var days = parseInt((params || {}).days || 30);
    var ss = getComphoneSheet();
    var logSh = ss.getSheetByName('VISION_LOG');
    var mismatchSh = ss.getSheetByName('VISION_MISMATCH');

    var cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    // Accuracy Trend (daily)
    var dailyStats = {};
    if (logSh) {
      var logData = logSh.getDataRange().getValues();
      for (var i = 1; i < logData.length; i++) {
        var ts = new Date(logData[i][0]).getTime();
        if (ts < cutoff) continue;
        var day = Utilities.formatDate(new Date(ts), 'Asia/Bangkok', 'yyyy-MM-dd');
        if (!dailyStats[day]) dailyStats[day] = { total: 0, approved: 0, reviewed: 0 };
        dailyStats[day].total++;
        var dec = String(logData[i][3] || '');
        if (dec === 'APPROVED') dailyStats[day].approved++;
        if (String(logData[i][4] || '') === 'YES') dailyStats[day].reviewed++;
      }
    }

    var accuracyTrend = Object.keys(dailyStats).sort().map(function(day) {
      var s = dailyStats[day];
      return {
        day: day,
        total: s.total,
        approvalRate: s.total > 0 ? parseFloat(((s.approved / s.total) * 100).toFixed(1)) : 0,
        reviewRate: s.total > 0 ? parseFloat(((s.reviewed / s.total) * 100).toFixed(1)) : 0
      };
    });

    // False Positive Rate (AI said APPROVED แต่ human บอก reject)
    var fpCount = 0, totalReviewed = 0;
    if (mismatchSh) {
      var mData = mismatchSh.getDataRange().getValues();
      for (var m = 1; m < mData.length; m++) {
        var mTs = new Date(mData[m][8] || 0).getTime();
        if (mTs < cutoff) continue;
        totalReviewed++;
        if (String(mData[m][2] || '') === 'APPROVED' && String(mData[m][3] || '') !== 'APPROVED') {
          fpCount++;
        }
      }
    }

    var falsePositiveRate = totalReviewed > 0 ? parseFloat(((fpCount / totalReviewed) * 100).toFixed(1)) : 0;
    var reviewRate = accuracyTrend.length > 0 ?
      parseFloat((accuracyTrend.reduce(function(s, d) { return s + d.reviewRate; }, 0) / accuracyTrend.length).toFixed(1)) : 0;

    // Calibration
    var calibration = getConfidenceCalibration();

    // Top Patterns
    var patterns = analyzeErrorPatterns({ days: days, groupBy: 'type' });

    // Active Rules
    var rules = getActiveRules({ type: 'ALL' });

    return {
      success: true,
      period: days + ' days',
      summary: {
        falsePositiveRate: falsePositiveRate,
        avgReviewRate: reviewRate,
        totalMismatches: totalReviewed,
        activeRules: (rules.rules || []).length
      },
      accuracyTrend: accuracyTrend,
      calibration: calibration.calibration || {},
      topPatterns: (patterns.patterns || []).slice(0, 5),
      activeRules: rules.rules || []
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * setupLearningTriggers — ตั้ง time-driven triggers สำหรับ Self-Learning
 * เรียกครั้งเดียวจาก GAS Script Editor
 */
function setupLearningTriggers() {
  try {
    // ลบ triggers เดิมที่ชื่อ processFeedbackLoop
    var triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(function(t) {
      if (t.getHandlerFunction() === 'processFeedbackLoop' ||
          t.getHandlerFunction() === 'autoGenerateRulesFromPatterns') {
        ScriptApp.deleteTrigger(t);
      }
    });

    // ตั้ง processFeedbackLoop ทุก 6 ชั่วโมง
    ScriptApp.newTrigger('processFeedbackLoop')
      .timeBased()
      .everyHours(6)
      .create();

    // ตั้ง autoGenerateRulesFromPatterns ทุกวัน 02:00
    ScriptApp.newTrigger('autoGenerateRulesFromPatterns')
      .timeBased()
      .atHour(2)
      .everyDays(1)
      .create();

    return { success: true, message: 'Learning triggers ตั้งค่าแล้ว: processFeedbackLoop (6h), autoGenerateRulesFromPatterns (daily 02:00)' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getVisionLearningVersion — ดู version
 */
function getVisionLearningVersion() {
  return {
    version: VL_VERSION,
    features: ['feedback-loop', 'confidence-calibration', 'dynamic-threshold', 'pattern-analysis', 'prompt-optimization', 'auto-rule-engine', 'learning-dashboard']
  };
}
