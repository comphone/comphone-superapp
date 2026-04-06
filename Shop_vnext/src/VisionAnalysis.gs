// ============================================================
// VisionAnalysis.gs - AI วิเคราะห์รูปงานด้วย Gemini 2.0 Flash
// Auto-Labeling, Quality Check, Equipment Detection
// ============================================================

function analyzeWorkImage(imageUrl, context) {
  var apiKey = getConfig('GEMINI_API_KEY') || getConfig('GOOGLE_AI_API_KEY') || '';
  if (!apiKey) {
    return { error: 'GEMINI_API_KEY not configured', note: 'ใช้ setConfig("GEMINI_API_KEY", "AIza...") ใน Config sheet' };
  }

  var prompt = 'คุณคือผู้ช่วย AI ของร้าน Comphone & Electronics เชี่ยวชาญด้าน CCTV, ระบบเครือข่าย, WiFi\n\n' +
    'บริบทงาน: ' + (context || 'ไม่ระบุ') + '\n\n' +
    'วิเคราะห์รูปภาพงานและตอบกลับเป็น JSON เท่านั้น:\n' +
    '{\n' +
    '  "auto_label": "สรุปสั้นๆ ว่ารูปนี้แสดงอะไร เช่น ภาพกล้องวงจรปิด 2 ตัวติดตั้งบนเสาคอนกรีต",\n' +
    '  "detected_equipment": ["กล้องวงจรปิด 2 ตัว", "สาย LAN 1 ม้วน", "เครื่องบันทึก 1 เครื่อง"],\n' +
    '  "location_type": "ประเภทสถานที่ (โรงเรียน, บ้าน, โรงงาน, ออฟฟิศ, วัด, ร้านค้า)",\n' +
    '  "installation_quality": "ดี/พอใช้/ต้องปรับปรุง",\n' +
    '  "quality_issues": ["ปัญหาที่พบเช่น สายไม่เก็บงาน, ไม่มีปลั๊ก, ต้นไม้บังมุมมอง"],\n' +
    '  "is_ready_to_close": true,\n' +
    '  "suggestions": ["คำแนะนำ เช่น เก็บสายให้เรียบร้อย"],\n' +
    '  "estimated_effort": "ง่าย/ปานกลาง/ยาก",\n' +
    '  "confidence": 0.85\n' +
    '}\n\n' +
    'ตอบ JSON อย่างเดียว ไม่มีข้อความอื่น ไม่มี markdown:';

  try {
    var base64 = _fetchImageBase64(imageUrl);
    if (!base64) {
      return { error: 'ไม่สามารถดาวน์โหลดรูปภาพได้', note: 'กรุณาใช้รูปที่公開 หรือ Drive ที่เข้าถึงได้' };
    }

    var bodyObj = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/jpeg', data: base64 } }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024
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
    if (result.candidates && result.candidates[0] &&
        result.candidates[0].content && result.candidates[0].content.parts) {
      content = result.candidates[0].content.parts[0].text || '';
    }

    var jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      var parsed = JSON.parse(jsonMatch[0]);
      parsed.provider = 'gemini-2.0-flash';
      parsed.raw = content;
      return parsed;
    } else {
      return { error: 'Invalid response format', raw: content };
    }
  } catch(e) {
    return { error: 'Vision analysis failed: ' + e.toString() };
  }
}

/**
 * ดาวน์โหลดรูปจาก URL และแปลงเป็น base64
 */
function _fetchImageBase64(imageUrl) {
  try {
    // Handle Google Drive URLs
    if (imageUrl.indexOf('drive.google.com') > -1) {
      var fileId = '';
      var match = imageUrl.match(/id=([A-Za-z0-9_-]+)/);
      if (match) {
        fileId = match[1];
      }
      if (fileId) {
        var file = DriveApp.getFileById(fileId);
        var blob = file.getBlob();
        return Utilities.base64Encode(blob.getBytes());
      }
    }

    // Direct URL fetch
    var resp = UrlFetchApp.fetch(imageUrl, { muteHttpExceptions: true });
    var blob = resp.getBlob();
    if (blob && blob.getBytes().length > 0) {
      return Utilities.base64Encode(blob.getBytes());
    }
    Logger.log('Image fetch returned empty: ' + imageUrl);
    return '';
  } catch(e) {
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
    quality: quality,
    issues: issues,
    readyToClose: ready,
    equipment: result.detected_equipment || [],
    suggestions: result.suggestions || [],
    confidence: result.confidence || 0
  };
}

/**
 * สร้างข้อความ LINE Notify จากผลวิเคราะห์
 */
function formatAnalysisResult(analysis, jobId) {
  if (analysis.error) return '⚠️ วิเคราะห์ภาพไม่สําเร็จ: ' + analysis.error;

  var msg = '\uD83D\uDC41\uFE0F\uFE0F AI วิเคราะห์ภาพ';
  if (jobId) msg += ' (' + jobId + ')';
  msg += '\n\n';
  msg += '\uD83D\uDCCD สถานที่: ' + (analysis.location_type || '-') + '\n';
  msg += '\uD83C\uDFEF\uFE0F คุณภาพ: ' + (analysis.installation_quality || '-') + '\n';
  msg += '\uD83D\uDC77 ความยาก: ' + (analysis.estimated_effort || '-') + '\n';
  msg += '\uD83C\uDFB2 ความมั่นใจ: ' + ((analysis.confidence || 0) * 100).toFixed(0) + '%\n';

  if (analysis.auto_label) {
    msg += '\n\uD83C\uDFF7\uFE0F สรุป: ' + analysis.auto_label + '\n';
  }

  if (analysis.detected_equipment && analysis.detected_equipment.length > 0) {
    msg += '\n\uD83D\uDCFA อุปกรณ์ที่ตรวจพบ:\n';
    for (var i = 0; i < analysis.detected_equipment.length; i++) {
      msg += '\u2022 ' + analysis.detected_equipment[i] + '\n';
    }
  }

  if (analysis.quality_issues && analysis.quality_issues.length > 0) {
    msg += '\n\u26A0\uFE0F ปัญหาที่พบ:\n';
    for (var j = 0; j < analysis.quality_issues.length; j++) {
      msg += '\u2022 ' + analysis.quality_issues[j] + '\n';
    }
  }

  if (analysis.suggestions && analysis.suggestions.length > 0) {
    msg += '\n\uD83D\uDCA1 คำแนะนำ:\n';
    for (var k = 0; k < analysis.suggestions.length; k++) {
      msg += '\u2022 ' + analysis.suggestions[k] + '\n';
    }
  }

  if (analysis.is_ready_to_close) {
    msg += '\n\u2705 พร้อมปิดงานได้\n';
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
