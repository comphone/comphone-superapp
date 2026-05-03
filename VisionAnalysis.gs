// COMPHONE SUPER APP v5.9.0-phase31a
// VisionAnalysis.gs - AI วิเคราะห์รูปงานด้วย Gemini 2.0 Flash (V5.5)
// Auto-Labeling, Photo Category, Quality Check, Job Completion QC
// ============================================================

var VISION_ALLOWED_PHOTO_CATEGORIES = ['Before', 'After', 'Survey', 'Equipment'];

function analyzeWorkImage(imageUrl, context) {
  var base64 = _fetchImageBase64(imageUrl);
  if (!base64) {
    return { error: 'ไม่สามารถดาวน์โหลดรูปภาพได้', note: 'กรุณาใช้รูปที่เข้าถึงได้จริง หรือให้สิทธิ์ไฟล์ใน Drive' };
  }
  return analyzeWorkImageFromBase64(base64, context);
}

function analyzeWorkImageFromBase64(base64, context) {
  var apiKey = getConfig('GEMINI_API_KEY') || getConfig('GOOGLE_AI_API_KEY') || '';
  if (!apiKey) {
    return { error: 'GEMINI_API_KEY not configured', note: 'กรุณาตั้งค่า GEMINI_API_KEY ผ่าน Script Properties ก่อนใช้งาน' };
  }

  var prompt = 'คุณคือผู้ช่วย AI ของร้าน Comphone & Electronics เชี่ยวชาญด้าน CCTV, ระบบเครือข่าย, WiFi, ซ่อมอุปกรณ์ และงานติดตั้งภาคสนาม\n\n' +
    'บริบทงาน: ' + (context || 'ไม่ระบุ') + '\n\n' +
    'วิเคราะห์รูปภาพงานและตอบกลับเป็น JSON เท่านั้น โดยจัด photo_category ให้เป็นหนึ่งใน Before, After, Survey, Equipment:\n' +
    '{\n' +
    '  "photo_category": "Before|After|Survey|Equipment",\n' +
    '  "auto_label": "สรุปสั้นๆ ว่ารูปนี้แสดงอะไร เช่น ภาพก่อนติดตั้งกล้องวงจรปิดบริเวณหน้าอาคาร",\n' +
    '  "detected_equipment": ["กล้องวงจรปิด 2 ตัว", "สาย LAN 1 ม้วน"],\n' +
    '  "location_type": "ประเภทสถานที่ เช่น โรงเรียน บ้าน โรงงาน ออฟฟิศ วัด ร้านค้า",\n' +
    '  "installation_quality": "ดี|พอใช้|ต้องปรับปรุง",\n' +
    '  "quality_issues": ["ปัญหาที่พบ เช่น สายไม่เก็บงาน มุมกล้องต่ำไป"],\n' +
    '  "is_ready_to_close": true,\n' +
    '  "suggestions": ["คำแนะนำปรับปรุงงาน"],\n' +
    '  "estimated_effort": "ง่าย|ปานกลาง|ยาก",\n' +
    '  "confidence": 0.85\n' +
    '}\n\n' +
    'เกณฑ์จัดหมวดหมู่:\n' +
    '- Before = ภาพสภาพเดิมก่อนเริ่มงาน หรือหน้างานก่อนติดตั้ง/ซ่อม\n' +
    '- After = ภาพหลังติดตั้งเสร็จ ผลงานที่เก็บเรียบร้อย พร้อมส่งมอบ\n' +
    '- Survey = ภาพสำรวจหน้างาน พื้นที่ติดตั้ง จุดวางอุปกรณ์ มุมกล้อง สภาพแวดล้อม\n' +
    '- Equipment = ภาพโฟกัสที่อุปกรณ์ อะไหล่ กล่องสินค้า เครื่องมือ หรือวัสดุ\n\n' +
    'ตอบ JSON อย่างเดียว ไม่มี markdown ไม่มีคำอธิบายอื่น:';

  try {
    var parsed = _callGeminiVision_(apiKey, prompt, base64);
    if (parsed.error) return parsed;
    return _normalizeVisionResponse_(parsed);
  } catch (e) {
    return { error: 'Vision analysis failed: ' + e.toString() };
  }
}

function _callGeminiVision_(apiKey, prompt, imageBase64) {
  var bodyObj = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
      ]
    }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json'
    }
  };

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(bodyObj),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var result = JSON.parse(response.getContentText());

  if (result.error) {
    return { error: 'Gemini API Error: ' + JSON.stringify(result.error) };
  }

  var content = '';
  if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts) {
    content = result.candidates[0].content.parts[0].text || '';
  }

  if (!content) {
    return { error: 'Gemini returned empty content' };
  }

  var jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { error: 'Invalid response format', raw: content };
  }

  var parsed = JSON.parse(jsonMatch[0]);
  parsed.provider = 'gemini-2.0-flash';
  parsed.raw = content;
  return parsed;
}

function _normalizeVisionResponse_(parsed) {
  parsed = parsed || {};
  parsed.photo_category = normalizePhotoCategory_(parsed.photo_category || parsed.auto_label || 'Survey');
  if (!parsed.auto_label) parsed.auto_label = parsed.photo_category;
  if (!parsed.detected_equipment || !parsed.detected_equipment.length) parsed.detected_equipment = [];
  if (!parsed.quality_issues || !parsed.quality_issues.length) parsed.quality_issues = [];
  if (!parsed.suggestions || !parsed.suggestions.length) parsed.suggestions = [];
  if (typeof parsed.is_ready_to_close !== 'boolean') parsed.is_ready_to_close = false;
  if (parsed.confidence === null || parsed.confidence === undefined || parsed.confidence === '') parsed.confidence = 0;
  parsed.confidence = Number(parsed.confidence || 0);
  return parsed;
}

function normalizePhotoCategory_(input) {
  var text = String(input || '').toLowerCase();
  if (!text) return 'Survey';

  if (text.indexOf('before') > -1 || text.indexOf('ก่อน') > -1 || text.indexOf('pre-install') > -1 || text.indexOf('pre install') > -1) {
    return 'Before';
  }
  if (text.indexOf('after') > -1 || text.indexOf('หลัง') > -1 || text.indexOf('เสร็จ') > -1 || text.indexOf('completed work') > -1 || text.indexOf('finished') > -1) {
    return 'After';
  }
  if (text.indexOf('equipment') > -1 || text.indexOf('อุปกรณ์') > -1 || text.indexOf('tool') > -1 || text.indexOf('เครื่องมือ') > -1 || text.indexOf('วัสดุ') > -1 || text.indexOf('อะไหล่') > -1 || text.indexOf('สินค้า') > -1) {
    return 'Equipment';
  }
  if (text.indexOf('survey') > -1 || text.indexOf('สำรวจ') > -1 || text.indexOf('site') > -1 || text.indexOf('location') > -1 || text.indexOf('area') > -1 || text.indexOf('หน้างาน') > -1) {
    return 'Survey';
  }
  return 'Survey';
}

/**
 * ดาวน์โหลดรูปจาก URL และแปลงเป็น base64
 */
function _fetchImageBase64(imageUrl) {
  try {
    if (imageUrl.indexOf('drive.google.com') > -1) {
      var fileId = extractDriveFileId_(imageUrl);
      if (fileId) {
        var file = DriveApp.getFileById(fileId);
        var blob = file.getBlob();
        return Utilities.base64Encode(blob.getBytes());
      }
    }

    var resp = UrlFetchApp.fetch(imageUrl, { muteHttpExceptions: true });
    var blob2 = resp.getBlob();
    if (blob2 && blob2.getBytes().length > 0) {
      return Utilities.base64Encode(blob2.getBytes());
    }
    Logger.log('Image fetch returned empty: ' + imageUrl);
    return '';
  } catch (e) {
    Logger.log('Failed to fetch image: ' + imageUrl + ' - ' + e.toString());
    return '';
  }
}

/**
 * Quality Check — ตรวจคุณภาพงานก่อนปิด
 */
function qualityCheck(imageUrl, jobId) {
  var result = analyzeWorkImage(imageUrl, jobId ? 'JobID: ' + jobId : '');
  if (result.error) return { error: result.error };

  var issues = result.quality_issues || [];
  var quality = result.installation_quality || 'ไม่ระบุ';
  var ready = result.is_ready_to_close || false;

  return {
    jobId: jobId || '-',
    photo_category: result.photo_category || 'Survey',
    quality: quality,
    issues: issues,
    readyToClose: ready,
    equipment: result.detected_equipment || [],
    suggestions: result.suggestions || [],
    confidence: result.confidence || 0,
    auto_label: result.auto_label || ''
  };
}

function runJobCompletionQC(jobId, options) {
  try {
    options = options || {};
    jobId = String(jobId || options.job_id || '').trim();
    if (!jobId) return { success: false, error: 'jobId is required' };

    var photos = [];
    if (typeof getJobProcessedPhotos === 'function') {
      photos = getJobProcessedPhotos(jobId, { category: 'After', newestFirst: true });
      if (!photos.length) photos = getJobProcessedPhotos(jobId, { newestFirst: true });
    }

    if (!photos || !photos.length) {
      return { success: false, error: 'ไม่พบรูปงานที่พร้อมใช้สำหรับ QC', job_id: jobId };
    }

    var targetPhoto = photos[0];
    var analysis = analyzeWorkImage(targetPhoto.fileUrl || targetPhoto.jobPhotoUrl || '', 'JobID: ' + jobId + ' | Auto QC after status 8');
    if (analysis.error) {
      saveJobVisionAnalysis(jobId, {
        job_id: jobId,
        qc_status: 'ERROR',
        error: analysis.error,
        source_photo_url: targetPhoto.fileUrl || targetPhoto.jobPhotoUrl || ''
      });
      return { success: false, error: analysis.error, job_id: jobId };
    }

    var qc = qualityCheck(targetPhoto.fileUrl || targetPhoto.jobPhotoUrl || '', jobId);
    var collage = null;
    if (typeof createBeforeAfterCollage === 'function') {
      collage = createBeforeAfterCollage(jobId, { skipIfMissing: true });
    }

    var payload = {
      job_id: jobId,
      qc_status: qc.readyToClose ? 'PASS' : 'NEEDS_REVIEW',
      checked_at: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'),
      source_photo_url: targetPhoto.fileUrl || targetPhoto.jobPhotoUrl || '',
      photo_category: analysis.photo_category || 'After',
      auto_label: analysis.auto_label || '',
      installation_quality: analysis.installation_quality || '',
      quality_issues: analysis.quality_issues || [],
      suggestions: analysis.suggestions || [],
      is_ready_to_close: analysis.is_ready_to_close || false,
      confidence: Number(analysis.confidence || 0),
      collage_url: collage && collage.success ? collage.collageUrl : '',
      geofence: targetPhoto.geofence || null,
      detected_equipment: analysis.detected_equipment || []
    };

    saveJobVisionAnalysis(jobId, payload);

    if (!qc.readyToClose || (qc.issues && qc.issues.length > 0)) {
      try {
        sendLineNotify({
          message: buildAutoQCAlertMessage_(jobId, payload),
          room: 'TECHNICIAN'
        });
      } catch (notifyErr) {
        Logger.log('runJobCompletionQC notify error: ' + notifyErr);
      }
    }

    return {
      success: true,
      job_id: jobId,
      qc: qc,
      collage: collage,
      source_photo: targetPhoto,
      saved: true
    };
  } catch (e) {
    return { success: false, error: e.toString(), job_id: jobId || '' };
  }
}

function saveJobVisionAnalysis(jobId, payload) {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { success: false, error: 'DBJOBS not found' };

    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var jobIdCol = findHeaderIndex_(headers, ['JobID', 'Job_ID', 'jobid', 'job_id']);
    var aiCol = findHeaderIndex_(headers, ['AI_Vision_Analysis', 'AI Vision Analysis', 'ai_vision_analysis']);
    if (aiCol < 0) {
      aiCol = sh.getLastColumn();
      sh.getRange(1, aiCol + 1).setValue('AI_Vision_Analysis');
    }

    if (jobIdCol < 0) jobIdCol = 0;
    var values = sh.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][jobIdCol] || '') === String(jobId)) {
        sh.getRange(i + 1, aiCol + 1).setValue(JSON.stringify(payload));
        return { success: true, row: i + 1 };
      }
    }
    return { success: false, error: 'ไม่พบ Job ID: ' + jobId };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function buildAutoQCAlertMessage_(jobId, payload) {
  var msg = 'QC Auto Check หลังสถานะงานเสร็จ\n\n';
  msg += 'งาน: ' + (jobId || '-') + '\n';
  msg += 'ผล QC: ' + (payload.qc_status || '-') + '\n';
  msg += 'คุณภาพงาน: ' + (payload.installation_quality || '-') + '\n';
  if (payload.quality_issues && payload.quality_issues.length) {
    msg += 'ประเด็นที่พบ: ' + payload.quality_issues.join(', ') + '\n';
  }
  if (payload.suggestions && payload.suggestions.length) {
    msg += 'คำแนะนำ: ' + payload.suggestions.join(', ') + '\n';
  }
  if (payload.collage_url) {
    msg += 'Collage: ' + payload.collage_url + '\n';
  }
  if (payload.source_photo_url) {
    msg += 'รูปอ้างอิง: ' + payload.source_photo_url;
  }
  return msg;
}

/**
 * สร้างข้อความ LINE Notify จากผลวิเคราะห์
 */
function formatAnalysisResult(analysis, jobId) {
  if (analysis.error) return '⚠️ วิเคราะห์ภาพไม่สําเร็จ: ' + analysis.error;

  var msg = 'AI วิเคราะห์ภาพ';
  if (jobId) msg += ' (' + jobId + ')';
  msg += '\n\n';
  msg += 'หมวดรูป: ' + (analysis.photo_category || '-') + '\n';
  msg += 'สถานที่: ' + (analysis.location_type || '-') + '\n';
  msg += 'คุณภาพ: ' + (analysis.installation_quality || '-') + '\n';
  msg += 'ความยาก: ' + (analysis.estimated_effort || '-') + '\n';
  msg += 'ความมั่นใจ: ' + ((analysis.confidence || 0) * 100).toFixed(0) + '%\n';

  if (analysis.auto_label) {
    msg += '\nสรุป: ' + analysis.auto_label + '\n';
  }

  if (analysis.detected_equipment && analysis.detected_equipment.length > 0) {
    msg += '\nอุปกรณ์ที่ตรวจพบ:\n';
    for (var i = 0; i < analysis.detected_equipment.length; i++) {
      msg += '• ' + analysis.detected_equipment[i] + '\n';
    }
  }

  if (analysis.quality_issues && analysis.quality_issues.length > 0) {
    msg += '\nปัญหาที่พบ:\n';
    for (var j = 0; j < analysis.quality_issues.length; j++) {
      msg += '• ' + analysis.quality_issues[j] + '\n';
    }
  }

  if (analysis.suggestions && analysis.suggestions.length > 0) {
    msg += '\nคำแนะนำ:\n';
    for (var k = 0; k < analysis.suggestions.length; k++) {
      msg += '• ' + analysis.suggestions[k] + '\n';
    }
  }

  if (analysis.is_ready_to_close) {
    msg += '\nพร้อมปิดงานได้\n';
  }

  return msg;
}

/**
 * Quick phase detection (lightweight, no API)
 */
function quickPhaseDetect(imageBase64) {
  return {
    recommended_phase: '00_สำรวจ',
    confidence: 0.3,
    note: 'ใช้ quickPhase — จะวิเคราะห์ละเอียดด้วย Gemini เมื่อ API พร้อม'
  };
}

function extractDriveFileId_(url) {
  var match = String(url || '').match(/[-\w]{25,}/);
  return match ? match[0] : '';
}
