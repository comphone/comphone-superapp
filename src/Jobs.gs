// ==========================================
// Jobs.gs
// COMPHONE SUPER APP - JOBS MANAGEMENT MODULE
// ==========================================

/**
 * สร้างใบสั่งงานใหม่ พร้อมรัน JobID และส่งแจ้งเตือน LINE
 */
function createNewJobExt(j) {
  let lock = LockService.getScriptLock();
  try {
    // รอคิวเขียนไฟล์ 10 วินาทีเพื่อป้องกันข้อมูลชนกัน
    lock.waitLock(10000);

    const sheet = getSheet(CONFIG.SHEET_JOBS);
    const headers = getHeaders(sheet);

    // 1. สร้าง JobID แบบสุ่ม (JOB-MMDD-XXXX)
    const rd = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const newId = 'JOB-' + formatDateBkk(new Date(), 'MMdd') + '-' + rd;

    // 2. จัดการข้อมูลพิกัด/ที่อยู่
    let combinedLocation = j.location || '';
    if (j.lat && j.lng) {
      combinedLocation += (combinedLocation ? '\n' : '') +
        '🌍 GPS: ' + j.lat + ',' + j.lng +
        ' | http://googleusercontent.com/maps.google.com/maps?q=' + j.lat + ',' + j.lng;
    }

    // 3. เตรียมข้อมูลลงแถวใหม่ตามชื่อ Header ใน Sheet
    const newRow = new Array(headers.length).fill('');
    const mapData = {
      'JobID': newId,
      'วันที่รับ': j.date || formatDateBkk(new Date(), 'yyyy-MM-dd'),
      'นัดหมาย': j.time || '',
      'ชื่อลูกค้า': j.customer || 'ไม่ได้ระบุ',
      'เบอร์โทร': j.phone || '',
      'รุ่น/อุปกรณ์': j.device || '',
      'อาการเสีย': j.symptom || '-',
      'สถานะ': j.status || 'Pending',
      'ช่างที่ดูแล': j.tech || '',
      'พิกัด/ที่อยู่': combinedLocation
    };

    Object.keys(mapData).forEach(function(key) {
      const idx = headers.indexOf(key);
      if (idx !== -1) newRow[idx] = mapData[key];
    });

    sheet.appendRow(newRow);

    // 4. ส่งแจ้งเตือนเข้า LINE Group (อยู่ใน Notifications.gs)
    try {
      if (typeof notifyNewJobToLineGroup === 'function') {
        notifyNewJobToLineGroup(mapData);
      }
    } catch (lineErr) {
      console.error("LINE Notification failed: " + lineErr.message);
    }

    // 5. เตรียม Link สำหรับส่งกลับให้ผู้ใช้
    const jobUrl = WEB_APP_URL + '?job=' + encodeURIComponent(newId);

    return {
      success: true,
      jobId: newId,
      status: j.status || 'Pending',
      customer: j.customer || 'ไม่ได้ระบุ',
      jobUrl: jobUrl,
      message: 'สร้างงานสำเร็จและแจ้งเตือน LINE แล้ว'
    };

  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ดึงรายการงานที่ยังทำไม่เสร็จ (Pending/Urgent) เพื่อแสดงในแอป
 */
function getPendingJobs() {
  try {
    const sheet = getSheet(CONFIG.SHEET_JOBS);
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return { success: true, jobs: [] };

    const headers = values[0];
    const idxJobId = headers.indexOf('JobID');
    const idxCustomer = headers.indexOf('ชื่อลูกค้า');
    const idxSymptom = headers.indexOf('อาการเสีย');
    const idxStatus = headers.indexOf('สถานะ');
    const idxDate = headers.indexOf('วันที่รับ');

    // กรองเอาเฉพาะงานที่ไม่ใช่ Completed หรือ Cancelled และจำกัด 40 งานล่าสุด
    const jobs = values.slice(1)
      .filter(row => {
        const status = safeTrim(row[idxStatus]);
        return status && status !== 'Completed' && status !== 'Cancelled';
      })
      .reverse() // งานใหม่ขึ้นก่อน
      .slice(0, 40)
      .map(row => ({
        id: idxJobId >= 0 ? row[idxJobId] : '',
        customer: idxCustomer >= 0 ? row[idxCustomer] : '',
        symptom: idxSymptom >= 0 ? row[idxSymptom] : '',
        status: idxStatus >= 0 ? row[idxStatus] : '',
        date: idxDate >= 0 ? (row[idxDate] instanceof Date ? formatDateBkk(row[idxDate], 'dd/MM/yyyy') : row[idxDate]) : ''
      }));

    return { success: true, jobs: jobs };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * ระบบตรวจเช็คงานซ้ำ (Scoring Algorithm)
 */
function detectDuplicateJobExt(input) {
  try {
    const payload = input || {};
    const qPhone = safeTrim(payload.phone).replace(/\D/g, '');
    const qCustomer = safeTrim(payload.customer).toLowerCase();

    const sheet = getSheet(CONFIG.SHEET_JOBS);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: true, isDuplicate: false, duplicates: [] };

    const headers = data[0];
    const cId = headers.indexOf('JobID');
    const cCust = headers.indexOf('ชื่อลูกค้า');
    const cPhone = headers.indexOf('เบอร์โทร');
    const cStat = headers.indexOf('สถานะ');

    let matches = [];
    // ค้นหาย้อนกลับจากงานล่าสุด
    for (let i = data.length - 1; i > 0; i--) {
      const rowPhone = safeTrim(data[i][cPhone]).replace(/\D/g, '');
      const rowCust = safeTrim(data[i][cCust]).toLowerCase();
      const status = safeTrim(data[i][cStat]);

      if (status === 'Cancelled') continue;

      let score = 0;
      if (qPhone && rowPhone.includes(qPhone)) score += 3;
      if (qCustomer && rowCust.includes(qCustomer)) score += 2;

      if (score >= 3) {
        matches.push({
          id: data[i][cId],
          customer: data[i][cCust],
          status: status,
          score: score
        });
      }
      if (matches.length >= 5) break;
    }

    return {
      success: true,
      isDuplicate: matches.length > 0,
      duplicates: matches // คืนค่าเป็น key 'duplicates' ตาม schema เดิม
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * อัปเดตข้อมูลเฉพาะบางฟิลด์ในใบงาน
 */
function updateJobFields(jobId, fieldObj) {
  let lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = getSheet(CONFIG.SHEET_JOBS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const cId = headers.indexOf('JobID');

    for (let i = 1; i < data.length; i++) {
      if (data[i][cId] === jobId) {
        Object.keys(fieldObj).forEach(key => {
          const cIdx = headers.indexOf(key);
          if (cIdx !== -1) sheet.getRange(i + 1, cIdx + 1).setValue(fieldObj[key]);
        });
        return { success: true };
      }
    }
    return { success: false, error: "ไม่พบรหัสงาน " + jobId };
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ดึงข้อมูลสรุปสถิติงานสำหรับ Dashboard AI Panel
 */
function getAIPanelData() {
  try {
    const sheet = getSheet(CONFIG.SHEET_JOBS);
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return { success: true, pending: 0, todayTotal: 0, urgent: 0, alertMsg: "ไม่มีงานในระบบ" };

    const headers = values[0];
    const idxDate = headers.indexOf('วันที่รับ');
    const idxStatus = headers.indexOf('สถานะ');
    const todayStr = formatDateBkk(new Date(), 'yyyy-MM-dd');

    let pendingCount = 0;
    let urgentCount = 0;
    let todayCount = 0;

    for (let i = 1; i < values.length; i++) {
      const status = safeTrim(values[i][idxStatus]);
      const dateVal = values[i][idxDate];
      const rowDateStr = dateVal instanceof Date ? formatDateBkk(dateVal, 'yyyy-MM-dd') : safeTrim(dateVal);

      if (!status || status === 'Completed' || status === 'Cancelled') continue;

      pendingCount++;
      if (status === 'Urgent' || status === 'ด่วน') urgentCount++;
      if (rowDateStr === todayStr) todayCount++;
    }

    return {
      success: true,
      action: "getDashboardData",
      pending: pendingCount,
      todayTotal: todayCount,
      urgent: urgentCount, // เพิ่ม field urgent กลับมาตามที่บอทต้องการ
      alertMsg: urgentCount > 0 ? `🚨 ระวัง! มีงานด่วน ${urgentCount} งาน!` : "✅ เยี่ยมมาก! ไม่มีงานด่วนค้างครับ"
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * ดึงรายละเอียดใบงานแบบตัวเดียว (สำหรับ E-Ticket)
 */
function getJobDetailById(jobId) {
  try {
    const sheet = getSheet(CONFIG.SHEET_JOBS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const cId = headers.indexOf('JobID');

    for (let i = 1; i < data.length; i++) {
      if (data[i][cId] === jobId) {
        let obj = {};
        headers.forEach((h, idx) => {
          let val = data[i][idx];
          if (val instanceof Date) val = formatDateBkk(val, 'dd/MM/yyyy');
          obj[h] = val;
        });
        // Map ให้ตรงกับตัวแปรที่ Frontend (Dashboard.html) เรียกใช้
        return {
          success: true,
          data: {
            id: jobId,
            customer: obj['ชื่อลูกค้า'],
            phone: obj['เบอร์โทร'],
            date: obj['วันที่รับ'],
            symptom: obj['อาการเสีย'],
            status: obj['สถานะ'],
            location: obj['พิกัด/ที่อยู่']
          }
        };
      }
    }
    return { success: false, error: "ไม่พบรหัสงาน" };
  } catch (e) {
    return { success: false, error: e.message };
  }
}