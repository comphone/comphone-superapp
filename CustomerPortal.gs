// COMPHONE SUPER APP v5.9.0-phase31a
// ============================================================
// CustomerPortal.gs — Public Job Status Tracking (No Auth)
// ลูกค้าตรวจสอบสถานะงานเองได้ผ่าน URL สาธารณะ
// ============================================================

/**
 * ดึงข้อมูลงานสำหรับลูกค้า (ไม่ต้อง Auth)
 * เปิดเผยเฉพาะข้อมูลที่จำเป็น ไม่แสดงข้อมูลภายใน
 * @param {string} jobId - Job ID เช่น J0001
 * @param {string} phone - เบอร์โทรลูกค้า (ใช้ verify ตัวตน)
 */
function getJobStatusPublic(jobId, phone) {
  try {
    if (!jobId) return { success: false, error: 'กรุณาระบุหมายเลขงาน' };

    var ss = (typeof getComphoneSheet === 'function') ? getComphoneSheet() :
              SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('DB_SS_ID'));
    var jobSheetName = (typeof CONFIG !== 'undefined' && CONFIG.SHEETS && CONFIG.SHEETS.JOBS) ? CONFIG.SHEETS.JOBS : 'DBJOBS';
    var sheet = ss.getSheetByName(jobSheetName);
    if (!sheet) return { success: false, error: 'ไม่พบข้อมูล' };

    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    // หา column index
    var idx = {};
    ['JobID', 'ชื่อลูกค้า', 'เบอร์โทร', 'อาการ', 'สถานะ', 'ช่างผู้รับผิดชอบ',
     'วันที่รับงาน', 'วันที่อัปเดต', 'หมายเหตุ', 'ราคาประเมิน'].forEach(function(col) {
      idx[col] = headers.indexOf(col);
    });

    // ค้นหางาน
    var jobRow = null;
    for (var i = 1; i < data.length; i++) {
      var rowJobId = String(data[i][idx['JobID']] || '').trim().toUpperCase();
      if (rowJobId === jobId.trim().toUpperCase()) {
        jobRow = data[i];
        break;
      }
    }

    if (!jobRow) return { success: false, error: 'ไม่พบหมายเลขงาน "' + jobId + '"' };

    // Verify เบอร์โทร (ถ้าส่งมา)
    if (phone) {
      var storedPhone = String(jobRow[idx['เบอร์โทร']] || '').replace(/\D/g, '');
      var inputPhone = String(phone).replace(/\D/g, '');
      // เปรียบเทียบ 9 หลักท้าย (รองรับ 0xx vs +66xx)
      if (storedPhone.slice(-9) !== inputPhone.slice(-9)) {
        return { success: false, error: 'เบอร์โทรไม่ตรงกับข้อมูลในระบบ' };
      }
    }

    // ดึง Timeline
    var timeline = getJobTimelinePublic_(ss, jobId);

    // ดึงรูปภาพ (เฉพาะ public)
    var photos = getJobPhotosPublic_(ss, jobId);

    // Map status code → label + progress
    var statusCode = parseInt(jobRow[idx['สถานะ']] || 0);
    var statusInfo = getPublicStatusInfo_(statusCode);

    // สร้าง response (ไม่รวมข้อมูลภายใน เช่น ราคาทุน, หมายเหตุภายใน)
    return {
      success: true,
      job: {
        job_id: String(jobRow[idx['JobID']] || ''),
        customer_name: maskName_(String(jobRow[idx['ชื่อลูกค้า']] || '')),
        symptom: String(jobRow[idx['อาการ']] || ''),
        status_code: statusCode,
        status_label: statusInfo.label,
        status_color: statusInfo.color,
        status_icon: statusInfo.icon,
        progress_percent: statusInfo.progress,
        technician: maskTechName_(String(jobRow[idx['ช่างผู้รับผิดชอบ']] || '')),
        received_date: formatDateThai_(jobRow[idx['วันที่รับงาน']]),
        updated_date: formatDateThai_(jobRow[idx['วันที่อัปเดต']]),
        estimated_price: statusCode >= 5 ? (jobRow[idx['ราคาประเมิน']] || 0) : null,
        public_note: String(jobRow[idx['หมายเหตุ']] || '').split('|')[0].trim() // เฉพาะ note แรก
      },
      timeline: timeline,
      photos: photos
    };
  } catch (err) {
    return { success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' };
  }
}

function getJobTimelinePublic_(ss, jobId) {
  try {
    var logSheet = ss.getSheetByName('DB_JOB_LOGS');
    if (!logSheet) return [];
    var data = logSheet.getDataRange().getValues();
    var headers = data[0];
    var jobIdx = headers.indexOf('JobID');
    var timeIdx = headers.indexOf('Timestamp');
    var eventIdx = headers.indexOf('Event');
    var noteIdx = headers.indexOf('Note');
    if (jobIdx < 0) return [];
    var timeline = [];
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][jobIdx] || '').trim().toUpperCase() !== jobId.toUpperCase()) continue;
      var event = String(data[i][eventIdx] || '');
      // กรองเฉพาะ event ที่แสดงลูกค้าได้
      if (event.indexOf('STATUS_CHANGE') >= 0 || event.indexOf('NOTE') >= 0 || event.indexOf('ASSIGNED') >= 0) {
        timeline.push({
          time: formatDateTimeThai_(data[i][timeIdx]),
          event: translateEventPublic_(event),
          note: String(data[i][noteIdx] || '')
        });
      }
    }
    return timeline.slice(-10); // แสดงแค่ 10 รายการล่าสุด
  } catch (e) {
    return [];
  }
}

function getJobPhotosPublic_(ss, jobId) {
  try {
    var photoSheet = ss.getSheetByName('DB_PHOTO_QUEUE');
    if (!photoSheet) return [];
    var data = photoSheet.getDataRange().getValues();
    var headers = data[0];
    var jobIdx = headers.indexOf('JobID');
    var urlIdx = headers.indexOf('Drive_URL');
    var typeIdx = headers.indexOf('Photo_Type');
    if (jobIdx < 0 || urlIdx < 0) return [];
    var photos = [];
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][jobIdx] || '').trim().toUpperCase() !== jobId.toUpperCase()) continue;
      var url = String(data[i][urlIdx] || '');
      var type = String(data[i][typeIdx] || 'งาน');
      if (url && type !== 'internal') { // ไม่แสดงรูปภายใน
        photos.push({ url: url, type: type });
      }
    }
    return photos.slice(0, 6); // แสดงสูงสุด 6 รูป
  } catch (e) {
    return [];
  }
}

// ── Helpers ──────────────────────────────────────────────────

function getPublicStatusInfo_(code) {
  var map = {
    0:  { label: 'รับงานแล้ว',         color: '#64748b', icon: '📋', progress: 5  },
    1:  { label: 'กำลังประเมิน',        color: '#f59e0b', icon: '🔍', progress: 15 },
    2:  { label: 'มอบหมายช่างแล้ว',     color: '#3b82f6', icon: '👨‍🔧', progress: 25 },
    3:  { label: 'กำลังดำเนินการ',      color: '#8b5cf6', icon: '🔧', progress: 40 },
    4:  { label: 'รอชิ้นส่วน',          color: '#f97316', icon: '📦', progress: 50 },
    5:  { label: 'รอการอนุมัติ',        color: '#eab308', icon: '⏳', progress: 55 },
    6:  { label: 'นัดหมายแล้ว',         color: '#06b6d4', icon: '📅', progress: 60 },
    7:  { label: 'ช่างกำลังเดินทาง',    color: '#6366f1', icon: '🚗', progress: 70 },
    8:  { label: 'ช่างอยู่หน้างาน',     color: '#8b5cf6', icon: '📍', progress: 80 },
    9:  { label: 'งานเสร็จ รอตรวจสอบ', color: '#10b981', icon: '✅', progress: 90 },
    10: { label: 'รอชำระเงิน',          color: '#f59e0b', icon: '💳', progress: 95 },
    11: { label: 'ปิดงานเรียบร้อย',     color: '#16a34a', icon: '🎉', progress: 100 },
    99: { label: 'ยกเลิกงาน',           color: '#ef4444', icon: '❌', progress: 0  }
  };
  return map[code] || { label: 'ไม่ทราบสถานะ', color: '#94a3b8', icon: '❓', progress: 0 };
}

function maskName_(name) {
  if (!name || name.length <= 2) return name;
  return name[0] + '*'.repeat(Math.min(name.length - 2, 3)) + name[name.length - 1];
}

function maskTechName_(name) {
  if (!name) return 'ช่างผู้รับผิดชอบ';
  return 'ช่าง' + (name[0] || '');
}

function formatDateThai_(val) {
  if (!val) return '';
  try {
    var d = val instanceof Date ? val : new Date(val);
    return Utilities.formatDate(d, 'Asia/Bangkok', 'dd/MM/yyyy');
  } catch (e) { return String(val); }
}

function formatDateTimeThai_(val) {
  if (!val) return '';
  try {
    var d = val instanceof Date ? val : new Date(val);
    return Utilities.formatDate(d, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm');
  } catch (e) { return String(val); }
}

function translateEventPublic_(event) {
  var map = {
    'STATUS_CHANGE': 'อัปเดตสถานะ',
    'NOTE_ADDED': 'เพิ่มหมายเหตุ',
    'ASSIGNED': 'มอบหมายช่าง',
    'PHOTO_UPLOADED': 'อัปโหลดรูปภาพ'
  };
  for (var key in map) {
    if (event.indexOf(key) >= 0) return map[key];
  }
  return event;
}

// ══════════════════════════════════════════════════════════════
// Kudos / Customer Rating
// ══════════════════════════════════════════════════════════════

/**
 * บันทึกคะแนนรีวิวจากลูกค้า
 * @param {Object} params — { job_id, rating (1-5), comment? }
 * @returns {Object}
 */
function submitCustomerRating_(params) {
  try {
    var jobId  = String(params.job_id  || '').trim();
    var rating = parseInt(params.rating || 0, 10);
    var comment = String(params.comment || '').trim().substring(0, 500);

    if (!jobId)               return { success: false, error: 'job_id is required' };
    if (rating < 1 || rating > 5) return { success: false, error: 'rating must be 1-5' };

    var ss = SpreadsheetApp.openById(Config.get('DB_SS_ID'));
    var sheetName = 'DB_RATINGS';

    // สร้าง sheet ถ้ายังไม่มี
    var sh = ss.getSheetByName(sheetName);
    if (!sh) {
      sh = ss.insertSheet(sheetName);
      sh.appendRow(['Rating_ID', 'Job_ID', 'Rating', 'Comment', 'Timestamp', 'Notified']);
      sh.setFrozenRows(1);
    }

    var ratingId = 'RAT-' + new Date().getTime();
    var ts = new Date().toISOString();

    sh.appendRow([ratingId, jobId, rating, comment, ts, false]);

    // แจ้ง LINE ถ้าคะแนนต่ำ (≤ 2)
    if (rating <= 2) {
      try {
        var msg = '⚠️ ลูกค้าให้คะแนนต่ำ ' + rating + '/5\nงาน: ' + jobId;
        if (comment) msg += '\nความคิดเห็น: ' + comment;
        Notify.sendToGroup('LINE_GROUP_ADMIN', msg);
      } catch (e) { /* ignore */ }
    }

    return { success: true, rating_id: ratingId, rating: rating };

  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * ดึงคะแนนรีวิวของ Job หรือทั้งหมด
 * @param {Object} params — { job_id? }
 * @returns {Object}
 */
function getCustomerRatings_(params) {
  try {
    var ss = SpreadsheetApp.openById(Config.get('DB_SS_ID'));
    var sh = ss.getSheetByName('DB_RATINGS');
    if (!sh) return { success: true, ratings: [], average: 0, total: 0 };

    var rows = sh.getDataRange().getValues();
    if (rows.length <= 1) return { success: true, ratings: [], average: 0, total: 0 };

    var headers = rows[0].map(function(h) { return String(h).toLowerCase().replace(/ /g, '_'); });
    var jobIdFilter = String(params.job_id || '').trim();

    var ratings = rows.slice(1).map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) { obj[h] = row[i]; });
      return obj;
    }).filter(function(r) {
      return !jobIdFilter || r.job_id === jobIdFilter;
    });

    var total = ratings.length;
    var sum = ratings.reduce(function(acc, r) { return acc + (parseFloat(r.rating) || 0); }, 0);
    var average = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;

    return { success: true, ratings: ratings, average: average, total: total };

  } catch (err) {
    return { success: false, error: err.toString() };
  }
}
