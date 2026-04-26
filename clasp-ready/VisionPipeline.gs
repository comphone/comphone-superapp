// VisionPipeline.gs — Production AI Vision Pipeline v1.0.0
// COMPHONE SUPER APP v5.9.0-phase2d
// ============================================================
// Phase 11-19: Tiered AI, Decision Engine, Normalize, Incident,
//              Performance, Human-in-the-Loop, Storage, Dashboard,
//              LINE Bot Commands
// ============================================================

var VP_VERSION = '1.0.0';

// ─── CONSTANTS ─────────────────────────────────────────────
var VP_TYPES = { SLIP: 'SLIP', QC: 'QC', PRODUCT: 'PRODUCT' };
var VP_DECISIONS = {
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  QC_FAIL: 'QC_FAIL',
  NEED_REVIEW: 'NEED_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};
var VP_CONFIDENCE_THRESHOLD = 0.70;
var VP_QC_THRESHOLD = 80;
var VP_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
var VP_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
var VP_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ─── PHASE 11: MAIN PIPELINE ENTRY POINT ───────────────────

/**
 * runVisionPipeline — Main entry point สำหรับ Vision Pipeline ทุกประเภท
 * @param {Object} params - { type, input, context }
 *   type: 'SLIP' | 'QC' | 'PRODUCT'
 *   input: { base64, mimeType, imageUrl, jobId, expectedAmount, ... }
 *   context: { userId, lineUserId, source }
 * @returns {Object} Normalized VisionResult
 */
function runVisionPipeline(params) {
  var startTs = Date.now();
  try {
    var type = (params.type || 'QC').toUpperCase();
    var input = params.input || {};
    var context = params.context || {};

    // Phase 8: Security — Validate input
    var validation = _vpValidateInput_(input);
    if (!validation.valid) {
      return _vpErrorResult_(type, validation.error, startTs);
    }

    // Phase 15: Cache — Check hash dedupe
    var imageHash = _vpHashImage_(input.base64 || input.imageUrl || '');
    var cached = _vpGetCache_(imageHash, type);
    if (cached) {
      cached._fromCache = true;
      cached._cacheHit = imageHash;
      return cached;
    }

    // [Self-Learning] Phase 6: Auto Rule Engine — apply rules BEFORE AI call
    if (typeof applyRulesBeforeAI === 'function') {
      var ruleResult = applyRulesBeforeAI(type, input);
      if (ruleResult) {
        var ruleNorm = _vpNormalize_(type, { rule_shortcut: true, decision: ruleResult.decision, confidence: ruleResult.confidence || 0.95 }, input, startTs);
        ruleNorm.decision = { code: ruleResult.decision, reason: ruleResult.reason, appliedRule: ruleResult.appliedRule };
        ruleNorm._ruleShortcut = true;
        _vpSaveLog_(ruleNorm, context);
        return ruleNorm;
      }
    }

    // Phase 12: Tiered AI — Layer 1 (cheap) → Layer 2 (Gemini)
    var aiResult = _vpTieredAI_(type, input);

    // Phase 7: Normalize Result
    var normalized = _vpNormalize_(type, aiResult, input, startTs);

    // [Self-Learning] Phase 3: Dynamic Threshold — use calibrated threshold
    if (typeof getDynamicThreshold === 'function') {
      normalized._dynamicThreshold = getDynamicThreshold(type);
    }

    // Phase 13: Decision Engine
    normalized.decision = _vpDecisionEngine_(type, normalized);

    // Phase 17: Storage — Save to VisionLog sheet
    _vpSaveLog_(normalized, context);

    // Phase 14: Incident Integration — Alert if needed
    _vpIncidentIntegration_(normalized, context);

    // Phase 15: Cache — Store result
    _vpSetCache_(imageHash, type, normalized);

    return normalized;

  } catch (e) {
    Logger.log('VisionPipeline error: ' + e.toString());
    return _vpErrorResult_(params.type || 'QC', e.toString(), startTs);
  }
}

// ─── PHASE 12: TIERED AI STRATEGY ──────────────────────────

/**
 * _vpTieredAI_ — Layer 1 (rule-based/cheap) → Layer 2 (Gemini) ถ้าจำเป็น
 */
function _vpTieredAI_(type, input) {
  // Layer 1: Rule-based / Quick check
  var layer1 = _vpLayer1_(type, input);
  if (layer1 && layer1.confidence >= VP_CONFIDENCE_THRESHOLD) {
    layer1._tier = 1;
    return layer1;
  }

  // Layer 2: Gemini Vision (ใช้เมื่อ confidence ต่ำ หรือ error case)
  var geminiKey = getConfigSafe_('GEMINI_API_KEY') || getConfigSafe_('GOOGLE_AI_API_KEY') || '';
  if (!geminiKey) {
    if (layer1) { layer1._tier = 1; layer1._note = 'No Gemini key, using Layer1 result'; return layer1; }
    return { error: 'ไม่มี GEMINI_API_KEY', confidence: 0 };
  }

  var layer2 = _vpLayer2Gemini_(type, input, geminiKey);
  layer2._tier = 2;
  return layer2;
}

/**
 * _vpLayer1_ — Rule-based / Lightweight check (ไม่เสีย API)
 */
function _vpLayer1_(type, input) {
  if (type === VP_TYPES.SLIP) {
    // Layer 1 Slip: เช็ค base64 size เป็น heuristic
    var b64 = input.base64 || '';
    if (!b64 || b64.length < 1000) {
      return { is_slip: false, confidence: 0.9, issues: ['รูปเล็กเกินไป — ไม่ใช่สลิป'] };
    }
    // ถ้า base64 ยาวพอ → ส่งต่อ Layer 2
    return { confidence: 0.3, _needLayer2: true };
  }

  if (type === VP_TYPES.QC) {
    // Layer 1 QC: quickPhaseDetect
    var quick = quickPhaseDetect(input.base64 || '');
    return {
      photo_category: 'Survey',
      recommended_phase: quick.recommended_phase || '00_สำรวจ',
      confidence: quick.confidence || 0.3,
      _needLayer2: true
    };
  }

  if (type === VP_TYPES.PRODUCT) {
    return { confidence: 0.2, _needLayer2: true };
  }

  return null;
}

/**
 * _vpLayer2Gemini_ — Gemini Vision API call
 */
function _vpLayer2Gemini_(type, input, geminiKey) {
  var prompt = _vpBuildPrompt_(type, input);
  var base64 = input.base64 || '';

  // ถ้าไม่มี base64 แต่มี imageUrl → fetch
  if (!base64 && input.imageUrl) {
    try {
      var fileId = extractDriveFileId_(input.imageUrl);
      if (fileId) {
        var file = DriveApp.getFileById(fileId);
        base64 = Utilities.base64Encode(file.getBlob().getBytes());
      } else {
        var resp = UrlFetchApp.fetch(input.imageUrl, { muteHttpExceptions: true });
        base64 = Utilities.base64Encode(resp.getContent());
      }
    } catch (e) {
      return { error: 'Cannot fetch image: ' + e.toString(), confidence: 0 };
    }
  }

  if (!base64) return { error: 'No image data', confidence: 0 };

  // Retry logic: max 2 attempts
  for (var attempt = 1; attempt <= 2; attempt++) {
    try {
      var result = _callGeminiVision_(geminiKey, prompt, base64);
      if (!result.error) return result;
      if (attempt < 2) Utilities.sleep(1500);
    } catch (e) {
      if (attempt < 2) Utilities.sleep(1500);
    }
  }
  return { error: 'Gemini API failed after 2 retries', confidence: 0 };
}

/**
 * _vpBuildPrompt_ — สร้าง prompt ตาม type
 */
function _vpBuildPrompt_(type, input) {
  if (type === VP_TYPES.SLIP) {
    var expected = input.expectedAmount || input.expected_amount || 0;
    return 'คุณคือระบบตรวจสอบสลิปโอนเงิน PromptPay/ธนาคาร\n' +
      'วิเคราะห์รูปสลิปและตอบ JSON เท่านั้น:\n' +
      '{"is_slip":true,"amount":1500.00,"receiver_name":"ชื่อผู้รับ","transaction_ref":"รหัส","confidence":0.95,"is_valid":true,"issues":[]}\n' +
      (expected > 0 ? 'ยอดที่คาดหวัง: ฿' + expected + '\n' : '') +
      'ตอบ JSON อย่างเดียว ไม่มี markdown:';
  }

  if (type === VP_TYPES.QC) {
    return 'คุณคือระบบ QC ตรวจสอบคุณภาพงานติดตั้ง\n' +
      'วิเคราะห์รูปและตอบ JSON:\n' +
      '{"photo_category":"After","installation_quality":"Good","quality_issues":[],"suggestions":[],"is_ready_to_close":true,"confidence":0.9,"auto_label":"งานเสร็จสมบูรณ์","detected_equipment":[],"qc_score":90}\n' +
      'ตอบ JSON อย่างเดียว ไม่มี markdown:';
  }

  if (type === VP_TYPES.PRODUCT) {
    return 'คุณคือระบบตรวจสอบสินค้า\n' +
      'วิเคราะห์รูปสินค้าและตอบ JSON:\n' +
      '{"product_name":"ชื่อสินค้า","condition":"Good","defects":[],"confidence":0.9,"is_acceptable":true,"notes":""}\n' +
      'ตอบ JSON อย่างเดียว ไม่มี markdown:';
  }

  return 'วิเคราะห์รูปภาพและตอบ JSON ที่เกี่ยวข้อง';
}

// ─── PHASE 7: NORMALIZE RESULT ─────────────────────────────

/**
 * _vpNormalize_ — แปลง AI output เป็น standard VisionResult format
 * @returns {{ type, confidence, data, issues, ts, decision, _tier, _latencyMs }}
 */
function _vpNormalize_(type, aiResult, input, startTs) {
  var latencyMs = Date.now() - startTs;
  var issues = [];

  if (type === VP_TYPES.SLIP) {
    issues = aiResult.issues || [];
    return {
      type: VP_TYPES.SLIP,
      confidence: Number(aiResult.confidence || 0),
      data: {
        is_slip: aiResult.is_slip !== false,
        is_valid: aiResult.is_valid !== false,
        amount: Number(aiResult.amount || 0),
        expected_amount: Number(input.expectedAmount || input.expected_amount || 0),
        amount_match: _vpAmountMatch_(aiResult.amount, input.expectedAmount || input.expected_amount),
        receiver_name: aiResult.receiver_name || '',
        transaction_ref: aiResult.transaction_ref || '',
        provider: aiResult.provider || ('gemini-tier' + (aiResult._tier || 2))
      },
      issues: issues,
      ts: Date.now(),
      _tier: aiResult._tier || 2,
      _latencyMs: latencyMs,
      _fromCache: false
    };
  }

  if (type === VP_TYPES.QC) {
    issues = aiResult.quality_issues || [];
    var qcScore = Number(aiResult.qc_score || (aiResult.confidence || 0) * 100);
    return {
      type: VP_TYPES.QC,
      confidence: Number(aiResult.confidence || 0),
      data: {
        photo_category: aiResult.photo_category || 'Survey',
        installation_quality: aiResult.installation_quality || 'Unknown',
        is_ready_to_close: aiResult.is_ready_to_close || false,
        auto_label: aiResult.auto_label || '',
        detected_equipment: aiResult.detected_equipment || [],
        suggestions: aiResult.suggestions || [],
        qc_score: qcScore,
        job_id: input.jobId || input.job_id || ''
      },
      issues: issues,
      ts: Date.now(),
      _tier: aiResult._tier || 2,
      _latencyMs: latencyMs,
      _fromCache: false
    };
  }

  if (type === VP_TYPES.PRODUCT) {
    issues = aiResult.defects || [];
    return {
      type: VP_TYPES.PRODUCT,
      confidence: Number(aiResult.confidence || 0),
      data: {
        product_name: aiResult.product_name || '',
        condition: aiResult.condition || 'Unknown',
        is_acceptable: aiResult.is_acceptable !== false,
        notes: aiResult.notes || ''
      },
      issues: issues,
      ts: Date.now(),
      _tier: aiResult._tier || 2,
      _latencyMs: latencyMs,
      _fromCache: false
    };
  }

  // Generic fallback
  return {
    type: type,
    confidence: Number(aiResult.confidence || 0),
    data: aiResult,
    issues: aiResult.issues || [],
    ts: Date.now(),
    _tier: aiResult._tier || 2,
    _latencyMs: latencyMs,
    _fromCache: false
  };
}

// ─── PHASE 13: DECISION ENGINE ──────────────────────────────

/**
 * _vpDecisionEngine_ — สร้าง decision จาก normalized result
 */
function _vpDecisionEngine_(type, normalized) {
  var conf = normalized.confidence || 0;
  var data = normalized.data || {};

  // ถ้า confidence ต่ำ → NEED_REVIEW (Human-in-the-Loop)
  if (conf < VP_CONFIDENCE_THRESHOLD) {
    return { code: VP_DECISIONS.NEED_REVIEW, reason: 'Confidence ต่ำ (' + (conf * 100).toFixed(0) + '%) — ต้องการ Human Review', requiresHuman: true };
  }

  if (type === VP_TYPES.SLIP) {
    if (!data.is_slip) return { code: VP_DECISIONS.REJECTED, reason: 'ไม่ใช่รูปสลิป', requiresHuman: false };
    if (!data.amount_match) return { code: VP_DECISIONS.PAYMENT_ERROR, reason: 'ยอดเงินไม่ตรง (ตรวจพบ ฿' + data.amount + ' คาดหวัง ฿' + data.expected_amount + ')', requiresHuman: true };
    if (!data.is_valid) return { code: VP_DECISIONS.REJECTED, reason: 'สลิปไม่ถูกต้อง: ' + (normalized.issues.join(', ') || 'ไม่ระบุ'), requiresHuman: true };
    return { code: VP_DECISIONS.APPROVED, reason: 'สลิปผ่านการตรวจสอบ', requiresHuman: false };
  }

  if (type === VP_TYPES.QC) {
    var qcScore = data.qc_score || 0;
    if (qcScore < VP_QC_THRESHOLD) return { code: VP_DECISIONS.QC_FAIL, reason: 'QC Score ต่ำ (' + qcScore + '/' + VP_QC_THRESHOLD + ')', requiresHuman: true };
    if (normalized.issues && normalized.issues.length > 0) return { code: VP_DECISIONS.NEED_REVIEW, reason: 'พบปัญหา: ' + normalized.issues.join(', '), requiresHuman: true };
    return { code: VP_DECISIONS.APPROVED, reason: 'QC ผ่าน (Score ' + qcScore + ')', requiresHuman: false };
  }

  if (type === VP_TYPES.PRODUCT) {
    if (!data.is_acceptable) return { code: VP_DECISIONS.REJECTED, reason: 'สินค้าไม่ผ่านมาตรฐาน', requiresHuman: true };
    return { code: VP_DECISIONS.APPROVED, reason: 'สินค้าผ่านการตรวจสอบ', requiresHuman: false };
  }

  return { code: VP_DECISIONS.NEED_REVIEW, reason: 'ไม่สามารถตัดสินใจได้', requiresHuman: true };
}

// ─── PHASE 14: INCIDENT INTEGRATION ────────────────────────

/**
 * _vpIncidentIntegration_ — ส่ง alert ไปยัง Intelligent Notification System
 */
function _vpIncidentIntegration_(normalized, context) {
  try {
    var decision = normalized.decision || {};
    if (!decision.code) return;

    var alertType = null;
    var severity = 'medium';
    var priority = 3;

    if (decision.code === VP_DECISIONS.PAYMENT_ERROR) {
      alertType = 'PAYMENT_ERROR';
      severity = 'high';
      priority = 2;
    } else if (decision.code === VP_DECISIONS.QC_FAIL) {
      alertType = 'QC_FAIL';
      severity = 'high';
      priority = 2;
    } else if (decision.code === VP_DECISIONS.NEED_REVIEW) {
      alertType = 'VISION_REVIEW';
      severity = 'medium';
      priority = 3;
    } else if (decision.code === VP_DECISIONS.REJECTED) {
      alertType = 'VISION_REJECTED';
      severity = 'high';
      priority = 2;
    }

    if (!alertType) return;

    // ใช้ queueAlertIntelligent จาก LineBotIntelligent.gs
    if (typeof queueAlertIntelligent === 'function') {
      queueAlertIntelligent({
        alertType: alertType,
        data: {
          type: normalized.type,
          confidence: normalized.confidence,
          decision: decision.code,
          reason: decision.reason,
          jobId: (normalized.data || {}).job_id || '',
          requiresHuman: decision.requiresHuman,
          ts: normalized.ts
        },
        options: {
          ttlMs: 4 * 60 * 60 * 1000, // 4 hours
          targetRoles: ['admin', 'manager'],
          lineUserId: context.lineUserId || ''
        }
      });
    }
  } catch (e) {
    Logger.log('VisionPipeline incident integration error: ' + e.toString());
  }
}

// ─── PHASE 17: STORAGE STANDARD ─────────────────────────────

/**
 * _vpSaveLog_ — บันทึก VisionResult ลง VisionLog sheet
 */
function _vpSaveLog_(normalized, context) {
  try {
    var ss = getComphoneSheet();
    var sheetName = 'VISION_LOG';
    var sh = ss.getSheetByName(sheetName);
    if (!sh) {
      sh = ss.insertSheet(sheetName);
      sh.appendRow(['ts', 'type', 'confidence', 'decision', 'requires_human', 'tier', 'latency_ms',
        'job_id', 'user_id', 'issues', 'data_json', 'from_cache']);
    }
    var data = normalized.data || {};
    sh.appendRow([
      new Date(normalized.ts || Date.now()),
      normalized.type || '',
      normalized.confidence || 0,
      (normalized.decision || {}).code || '',
      (normalized.decision || {}).requiresHuman ? 'YES' : 'NO',
      normalized._tier || 2,
      normalized._latencyMs || 0,
      data.job_id || '',
      context.userId || '',
      JSON.stringify(normalized.issues || []),
      JSON.stringify(data),
      normalized._fromCache ? 'YES' : 'NO'
    ]);
  } catch (e) {
    Logger.log('VisionPipeline saveLog error: ' + e.toString());
  }
}

// ─── PHASE 15: CACHE ─────────────────────────────────────────

function _vpHashImage_(imageData) {
  if (!imageData) return 'no-image';
  var sample = String(imageData).substring(0, 200) + String(imageData).length;
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, sample));
}

function _vpGetCache_(hash, type) {
  try {
    var key = 'vp_cache_' + type + '_' + hash.substring(0, 20);
    var cached = PropertiesService.getScriptProperties().getProperty(key);
    if (!cached) return null;
    var entry = JSON.parse(cached);
    if (Date.now() - entry.savedAt > VP_CACHE_TTL_MS) {
      PropertiesService.getScriptProperties().deleteProperty(key);
      return null;
    }
    return entry.result;
  } catch (e) { return null; }
}

function _vpSetCache_(hash, type, result) {
  try {
    var key = 'vp_cache_' + type + '_' + hash.substring(0, 20);
    var entry = { savedAt: Date.now(), result: result };
    safeSetProperty(key, JSON.stringify(entry));  // Guard: dynamic cache key
  } catch (e) { Logger.log('VisionPipeline setCache error: ' + e.toString()); }
}

// ─── PHASE 8: SECURITY / VALIDATION ─────────────────────────

/**
 * _vpValidateInput_ — ตรวจสอบ input ก่อนส่งให้ AI
 */
function _vpValidateInput_(input) {
  var base64 = input.base64 || '';
  var mimeType = input.mimeType || input.mime_type || 'image/jpeg';

  // ตรวจสอบ mime type
  if (VP_ALLOWED_MIME.indexOf(mimeType) < 0) {
    return { valid: false, error: 'ประเภทไฟล์ไม่รองรับ: ' + mimeType + ' (รองรับ: jpeg, png, webp, gif)' };
  }

  // ตรวจสอบขนาด base64 (ประมาณ file size)
  if (base64) {
    var estimatedBytes = Math.floor(base64.length * 0.75);
    if (estimatedBytes > VP_MAX_FILE_SIZE_BYTES) {
      return { valid: false, error: 'ไฟล์ใหญ่เกินไป (' + (estimatedBytes / 1024 / 1024).toFixed(1) + 'MB) — สูงสุด 5MB' };
    }
  }

  // ต้องมี base64 หรือ imageUrl อย่างใดอย่างหนึ่ง
  if (!base64 && !input.imageUrl) {
    return { valid: false, error: 'ต้องระบุ base64 หรือ imageUrl' };
  }

  return { valid: true };
}

function _vpAmountMatch_(detected, expected) {
  var d = parseFloat(detected || 0);
  var e = parseFloat(expected || 0);
  if (e <= 0) return true; // ไม่ได้ระบุ expected → ถือว่าผ่าน
  return Math.abs(d - e) < 1.0;
}

function _vpErrorResult_(type, errorMsg, startTs) {
  return {
    type: type || 'UNKNOWN',
    confidence: 0,
    data: {},
    issues: [errorMsg],
    ts: Date.now(),
    decision: { code: VP_DECISIONS.NEED_REVIEW, reason: 'Error: ' + errorMsg, requiresHuman: true },
    _error: errorMsg,
    _latencyMs: Date.now() - (startTs || Date.now()),
    _fromCache: false
  };
}

// ─── PHASE 16: HUMAN-IN-THE-LOOP ────────────────────────────

/**
 * submitHumanReview — User ยืนยัน/แก้ไขผล AI
 * @param {Object} params - { visionLogId, decision, reviewedBy, correctedData }
 */
function submitHumanReview(params) {
  try {
    var ss = getComphoneSheet();
    var sh = ss.getSheetByName('VISION_LOG');
    if (!sh) return { success: false, error: 'VISION_LOG sheet not found' };

    // บันทึกลง VISION_REVIEW sheet
    var reviewSheet = ss.getSheetByName('VISION_REVIEW');
    if (!reviewSheet) {
      reviewSheet = ss.insertSheet('VISION_REVIEW');
      reviewSheet.appendRow(['ts', 'vision_log_id', 'decision', 'reviewed_by', 'reviewed_at', 'corrected_data', 'note']);
    }
    reviewSheet.appendRow([
      new Date(),
      params.visionLogId || '',
      params.decision || '',
      params.reviewedBy || '',
      Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'),
      JSON.stringify(params.correctedData || {}),
      params.note || ''
    ]);

    return { success: true, message: 'Human review บันทึกแล้ว' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ─── PHASE 18: DASHBOARD INTEGRATION ────────────────────────

/**
 * getVisionDashboardStats — ดึงสถิติสำหรับ Dashboard Vision Panel
 */
function getVisionDashboardStats(params) {
  try {
    var days = parseInt((params || {}).days || 7);
    var ss = getComphoneSheet();
    var sh = ss.getSheetByName('VISION_LOG');
    if (!sh) return { success: true, stats: { total: 0, approved: 0, failed: 0, needReview: 0, avgConfidence: 0, avgLatencyMs: 0 } };

    var data = sh.getDataRange().getValues();
    var headers = data[0];
    var tsIdx = 0, typeIdx = 1, confIdx = 2, decisionIdx = 3, humanIdx = 4, latencyIdx = 6;

    var cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    var stats = { total: 0, approved: 0, failed: 0, needReview: 0, rejected: 0, paymentError: 0, qcFail: 0, totalConf: 0, totalLatency: 0, byType: {} };

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var ts = new Date(row[tsIdx]).getTime();
      if (ts < cutoff) continue;
      stats.total++;
      var decision = String(row[decisionIdx] || '');
      var conf = parseFloat(row[confIdx] || 0);
      var latency = parseInt(row[latencyIdx] || 0);
      stats.totalConf += conf;
      stats.totalLatency += latency;
      if (decision === 'APPROVED') stats.approved++;
      else if (decision === 'QC_FAIL') { stats.failed++; stats.qcFail++; }
      else if (decision === 'PAYMENT_ERROR') { stats.failed++; stats.paymentError++; }
      else if (decision === 'REJECTED') stats.rejected++;
      else stats.needReview++;
      var type = String(row[typeIdx] || 'UNKNOWN');
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    }

    return {
      success: true,
      period: days + ' days',
      stats: {
        total: stats.total,
        approved: stats.approved,
        failed: stats.failed,
        needReview: stats.needReview,
        rejected: stats.rejected,
        paymentError: stats.paymentError,
        qcFail: stats.qcFail,
        approvalRate: stats.total > 0 ? ((stats.approved / stats.total) * 100).toFixed(1) : '0',
        avgConfidence: stats.total > 0 ? (stats.totalConf / stats.total).toFixed(2) : '0',
        avgLatencyMs: stats.total > 0 ? Math.round(stats.totalLatency / stats.total) : 0,
        byType: stats.byType
      }
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ─── PHASE 19: LINE BOT COMMANDS ────────────────────────────

/**
 * handleVisionLineBotCommand — จัดการ command #ตรวจสลิป, #qcงาน, #ตรวจสินค้า
 */
function handleVisionLineBotCommand(command, replyToken, lineUserId) {
  try {
    var stats = getVisionDashboardStats({ days: 7 });
    var s = stats.stats || {};

    if (command === '#ตรวจสลิป' || command === '#slip') {
      return _buildVisionCommandFlex_('💳 สถานะตรวจสลิป (7 วัน)', s, 'SLIP');
    }
    if (command === '#qcงาน' || command === '#qc') {
      return _buildVisionCommandFlex_('🔍 สถานะ QC งาน (7 วัน)', s, 'QC');
    }
    if (command === '#ตรวจสินค้า' || command === '#product') {
      return _buildVisionCommandFlex_('📦 สถานะตรวจสินค้า (7 วัน)', s, 'PRODUCT');
    }
    return null;
  } catch (e) {
    Logger.log('handleVisionLineBotCommand error: ' + e.toString());
    return null;
  }
}

/**
 * _buildVisionCommandFlex_ — สร้าง Flex Message สำหรับ LINE Bot Vision commands
 */
function _buildVisionCommandFlex_(title, stats, filterType) {
  var typeCount = (stats.byType || {})[filterType] || 0;
  var approvalRate = stats.approvalRate || '0';
  var avgConf = parseFloat(stats.avgConfidence || 0) * 100;
  var avgLatency = stats.avgLatencyMs || 0;

  return {
    type: 'flex',
    altText: title,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: '#1e3a5f', paddingAll: '16px',
        contents: [{ type: 'text', text: title, color: '#ffffff', size: 'md', weight: 'bold' }]
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'box', layout: 'horizontal', contents: [
            { type: 'text', text: 'รวมทั้งหมด', size: 'sm', color: '#555555', flex: 2 },
            { type: 'text', text: String(typeCount) + ' รายการ', size: 'sm', weight: 'bold', flex: 1, align: 'end' }
          ]},
          { type: 'box', layout: 'horizontal', contents: [
            { type: 'text', text: 'ผ่าน', size: 'sm', color: '#22c55e', flex: 2 },
            { type: 'text', text: approvalRate + '%', size: 'sm', weight: 'bold', color: '#22c55e', flex: 1, align: 'end' }
          ]},
          { type: 'box', layout: 'horizontal', contents: [
            { type: 'text', text: 'Confidence เฉลี่ย', size: 'sm', color: '#555555', flex: 2 },
            { type: 'text', text: avgConf.toFixed(0) + '%', size: 'sm', weight: 'bold', flex: 1, align: 'end' }
          ]},
          { type: 'box', layout: 'horizontal', contents: [
            { type: 'text', text: 'Latency เฉลี่ย', size: 'sm', color: '#555555', flex: 2 },
            { type: 'text', text: avgLatency + 'ms', size: 'sm', weight: 'bold', flex: 1, align: 'end' }
          ]},
          { type: 'separator' },
          { type: 'box', layout: 'horizontal', contents: [
            { type: 'text', text: 'ต้อง Review', size: 'sm', color: '#f59e0b', flex: 2 },
            { type: 'text', text: String(stats.needReview || 0), size: 'sm', weight: 'bold', color: '#f59e0b', flex: 1, align: 'end' }
          ]},
          { type: 'box', layout: 'horizontal', contents: [
            { type: 'text', text: 'ไม่ผ่าน', size: 'sm', color: '#ef4444', flex: 2 },
            { type: 'text', text: String(stats.failed || 0), size: 'sm', weight: 'bold', color: '#ef4444', flex: 1, align: 'end' }
          ]}
        ]
      },
      footer: {
        type: 'box', layout: 'vertical',
        contents: [{
          type: 'button', style: 'primary', color: '#1e3a5f', height: 'sm',
          action: { type: 'uri', label: 'ดู Dashboard', uri: 'https://comphone.github.io/comphone-superapp/pwa/executive_dashboard.html' }
        }]
      }
    }
  };
}

// ─── CONVENIENCE WRAPPERS ────────────────────────────────────

/**
 * runSlipVerifyPipeline — wrapper สำหรับ verifyPaymentSlip
 */
function runSlipVerifyPipeline(payload) {
  return runVisionPipeline({
    type: VP_TYPES.SLIP,
    input: {
      base64: payload.slip_base64 || payload.base64 || '',
      mimeType: payload.slip_mime_type || payload.mimeType || 'image/jpeg',
      expectedAmount: payload.expected_amount || payload.amount || 0,
      jobId: payload.job_id || payload.jobId || ''
    },
    context: { userId: payload.userId || '', lineUserId: payload.lineUserId || '' }
  });
}

/**
 * runQCPipeline — wrapper สำหรับ runJobCompletionQC
 */
function runQCPipeline(payload) {
  return runVisionPipeline({
    type: VP_TYPES.QC,
    input: {
      imageUrl: payload.imageUrl || payload.image_url || '',
      base64: payload.base64 || '',
      mimeType: payload.mimeType || 'image/jpeg',
      jobId: payload.jobId || payload.job_id || ''
    },
    context: { userId: payload.userId || '', lineUserId: payload.lineUserId || '' }
  });
}

/**
 * getVisionPipelineVersion — ดู version
 */
function getVisionPipelineVersion() {
  return { version: VP_VERSION, features: ['tiered-ai', 'decision-engine', 'normalize', 'incident', 'cache', 'human-loop', 'storage', 'dashboard', 'line-bot'] };
}
