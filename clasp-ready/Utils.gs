// ============================================================
// COMPHONE SUPER APP V5.5
// ============================================================
// Utils.gs - Database Access Helpers
// ============================================================

// DB_SS_ID และ ROOT_FOLDER_ID ถูกนิยามใน Config.gs (พร้อม fallback hardcoded)
// ไม่นิยามซ้ำที่นี่เพื่อป้องกัน global redeclaration error

function getComphoneSheet() {
  try {
    var ssId = (typeof DB_SS_ID !== 'undefined' && DB_SS_ID)
              || '19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA';
    return SpreadsheetApp.openById(ssId);
  }
  catch (e) { Logger.log('DB error: ' + e); return null; }
}

function findSheetByName(ss, sheetName) {
  try { return ss.getSheetByName(sheetName); }
  catch (e) { return null; }
}

function generateJobId() {
  var sh = findSheetByName(getComphoneSheet(), 'DBJOBS');
  if (!sh) return 'J0001';
  return 'J' + String(Math.max(sh.getLastRow(), 1)).padStart(4, '0');
}

function getThaiTimestamp() {
  return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
}

// getConfig และ setConfig ถูกนิยามใน Config.gs แล้ว ไม่นิยามซ้ำที่นี่

function getHeaders(sheet) {
  var h = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var m = {}; for (var i = 0; i < h.length; i++) m[h[i]] = i + 1; return m;
}

function createInvoicePDF(data) {
  try {
    var id = data.job_id || '';
    var cn = data.customer_name || 'ลูกค้า';
    var parts = data.parts || '-';
    var labor = data.labor_cost || 0;
    var total = labor + (parts ? parts.split(',').length * 100 : 0);
    var tax = Math.round(total * 0.07);
    var gt = total + tax;
    var html = '<html><body style="font-family:Arial;padding:40px"><h1 style="color:#1DB446">บริษัท คอมโฟน แอนด์ อิเล็กทรอนิกส์</h1><hr/>' +
      '<h2>ใบแจ้งหนี้</h2><p><strong>เลขที่:</strong> INV-' + id + '<br/><strong>วันที่:</strong> ' +
      Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy') + '<br/><strong>ลูกค้า:</strong> ' + cn + '</p>' +
      '<table border="1" cellspacing="0" cellpadding="10" style="border-collapse:collapse;width:100%">' +
      '<tr style="background:#f5f5f5"><th><strong>รายการ</strong></th><th style="text-align:right"><strong>เงิน</strong></th></tr>' +
      '<tr><td>อะไหล่: ' + parts + '</td><td style="text-align:right">' + (parts ? parts.split(',').length * 100 : 0) + '</td></tr>' +
      '<tr><td>ค่าแรง</td><td style="text-align:right">' + labor + '</td></tr>' +
      '<tr style="background:#e8f5e9"><td><strong>รวม (รวม VAT 7%)</strong></td><td style="text-align:right"><strong style="color:#1DB446;font-size:18px">' + gt + ' บาท</strong></td></tr>' +
      '</table></body></html>';
    var blob = Utilities.newBlob(html, 'text/html', 'INV_' + id + '.html');
    var pdfBlob = blob.getAs('application/pdf');
    var folder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    var file = folder.createFile(pdfBlob.setName('INV-' + id + '.pdf'));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { success: true, invoice_id: 'INV-' + id, total: gt, tax: tax, pdf_url: file.getUrl() };
  } catch (e) { return { error: e.toString() }; }
}

// ============================================================
// 📄 Auto Warranty PDF — สร้างใบรับประกันอัตโนมัติ
// ============================================================
function generateWarrantyPDF(jobId) {
  try {
    var ss = getComphoneSheet();
    var jsh = findSheetByName(ss, 'DBJOBS');
    if (!jsh) return { error: 'DBJOBS not found' };

    var jobs = jsh.getDataRange().getValues();

    // Dynamic header lookup — ไม่ใช้ hardcoded column indices
    var hdrs = jobs[0];
    var colId = 0, colCustomer = 1, colSymptom = 2, colStatus = 3;
    var colTech = 4, colCreated = 10, colFolder = 12, colWarranty = 13;
    for (var hi = 0; hi < hdrs.length; hi++) {
      var hv = String(hdrs[hi]).toLowerCase();
      if (hv === 'job_id' || hv === 'id') colId = hi;
      else if (hv.indexOf('ชื่') > -1 || hv.indexOf('customer') > -1 || hv.indexOf('name') > -1) colCustomer = hi;
      else if (hv.indexOf('อาการ') > -1 || hv.indexOf('symptom') > -1) colSymptom = hi;
      else if (hv.indexOf('สถาน') > -1 || hv.indexOf('status') > -1) colStatus = hi;
      else if (hv.indexOf('ช่าง') > -1 || hv.indexOf('tech') > -1) colTech = hi;
      else if (hv.indexOf('สร้าง') > -1 || hv.indexOf('created') > -1) colCreated = hi;
      else if (hv.indexOf('folder') > -1 || hv.indexOf('โฟล') > -1) colFolder = hi;
      else if (hv.indexOf('warranty') > -1) colWarranty = hi;
    }

    var job = null;
    for (var i = 1; i < jobs.length; i++) {
      if (String(jobs[i][colId]) === jobId) {
        var rawCreated = jobs[i][colCreated];
        job = {
          id: String(jobs[i][colId]),
          customer: String(jobs[i][colCustomer] || 'ลูกค้า'),
          symptom: String(jobs[i][colSymptom] || '-'),
          status: String(jobs[i][colStatus] || ''),
          tech: String(jobs[i][colTech] || '-'),
          created: rawCreated instanceof Date ? Utilities.formatDate(rawCreated, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm') : String(rawCreated || '-'),
          folder: String(jobs[i][colFolder] || '')
        };
        break;
      }
    }
    if (!job) return { error: 'ไม่พบ JobID: ' + jobId };
    
    // ดึงข้อมูล billing พร้อม dynamic header lookup
    var partsUsed = '-';
    var totalAmount = 0;
    var bsh = findSheetByName(ss, 'DB_BILLING');
    if (bsh) {
      var bills = bsh.getDataRange().getValues();
      var bHdrs = bills[0];
      var bColId = 0, bColParts = 1, bColTotal = 3;
      for (var bhi = 0; bhi < bHdrs.length; bhi++) {
        var bh = String(bHdrs[bhi]).toLowerCase();
        if (bh === 'job_id' || bh === 'id') bColId = bhi;
        else if (bh.indexOf('part') > -1 || bh.indexOf('อะไหล') > -1) bColParts = bhi;
        else if (bh.indexOf('total') > -1 || bh.indexOf('รวม') > -1) bColTotal = bhi;
      }
      for (var bi = 1; bi < bills.length; bi++) {
        if (String(bills[bi][bColId]) === jobId) {
          partsUsed = String(bills[bi][bColParts] || '-');
          totalAmount = Number(bills[bi][bColTotal] || 0);
          break;
        }
      }
    }
    
    // สร้าง HTML → PDF
    var today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy');
    var warrantyEnd = Utilities.formatDate(new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000), 'Asia/Bangkok', 'dd/MM/yyyy');
    
    var html = '<html><head><meta charset="UTF-8"></head><body style="font-family:Tahoma,Arial,sans-serif;padding:30px;max-width:600px;margin:auto">';
    html += '<div style="border:2px solid #1DB446;border-radius:12px;padding:24px">';
    
    // Header
    html += '<div style="text-align:center;margin-bottom:16px">';
    html += '<h2 style="color:#1DB446;margin:0;font-size:18px">📱 บริษัท คอมโฟน แอนด์ อิเล็กทรอนิกส์</h2>';
    html += '<p style="margin:2px;color:#666;font-size:11px">ติดตั้งระบบ CCTV, ระบบเครือข่าย, WiFi — จ.ร้อยเอ็ด</p>';
    html += '</div>';
    
    // Title
    html += '<h3 style="text-align:center;background:#1DB446;color:#fff;padding:8px;margin:16px -24px;border-radius:8px">🛡️ ใบรับประกันงานติดตั้ง</h3>';
    
    // Info Table
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
    html += '<tr><td style="padding:6px 0;width:35%;color:#666">เลขที่งาน:</td><td style="font-weight:700">' + job.id + '</td></tr>';
    html += '<tr><td style="padding:6px 0;color:#666">ลูกค้า:</td><td style="font-weight:700">' + job.customer + '</td></tr>';
    html += '<tr><td style="padding:6px 0;color:#666">รายละเอียดงาน:</td><td>' + job.symptom + '</td></tr>';
    html += '<tr><td style="padding:6px 0;color:#666">ช่างผู้ติดตั้ง:</td><td>' + job.tech + '</td></tr>';
    html += '<tr><td style="padding:6px 0;color:#666">วันที่ติดตั้ง:</td><td>' + job.created + '</td></tr>';
    html += '<tr><td style="padding:6px 0;color:#666">อะไหล่ที่ใช้:</td><td>' + partsUsed + '</td></tr>';
    html += '<tr><td style="padding:6px 0;color:#666">ยอดรวม:</td><td style="font-size:16px;font-weight:800;color:#1DB446">฿' + totalAmount.toLocaleString() + '</td></tr>';
    html += '</table>';
    
    // Warranty Terms
    html += '<div style="background:#f8f8f8;padding:12px;border-radius:8px;margin-top:14px;font-size:11px">';
    html += '<h4 style="margin:0 0 6px;color:#333">📋 เงื่อนไขการรับประกัน</h4>';
    html += '<p style="margin:2px 0">• ระยะเวลารับประกัน: 12 เดือน (' + today + ' — ' + warrantyEnd + ')</p>';
    html += '<p style="margin:2px 0">• คุ้มครอง: อุปกรณ์และค่าแรง (ไม่รวมความเสียหายจากภัยธรรมชาติ/ผู้ใช้)</p>';
    html += '<p style="margin:2px 0">• ติดต่อ: ไลน์กลุ่ม "ห้องช่าง" ของร้าน</p>';
    html += '<p style="margin:2px 0">• บำรุงรักษา: ตรวจสอบสภาพฟรี ทุก 6 เดือน</p>';
    html += '</div>';
    
    // Footer
    html += '<div style="text-align:center;margin-top:16px;font-size:10px;color:#999">';
    html += '<p>ใบรับประกันนี้ออกโดยระบบอัตโนมัติ COMPHONE SUPER APP V5.5</p>';
    html += '<p>วันที่ออกใบรับประกัน: ' + today + '</p>';
    html += '</div>';
    
    html += '</div></body></html>';
    
    var blob = Utilities.newBlob(html, 'text/html; charset=utf-8', 'WARRANTY_' + jobId + '.html');
    var pdfBlob = blob.getAs('application/pdf');
    
    // Save to Jobs folder or root
    var folderId = ROOT_FOLDER_ID;
    if (job.folder) {
      try {
        var fm = job.folder.match(/folders\/([A-Za-z0-9_-]+)/);
        if (fm) folderId = fm[1];
      } catch(e) {}
    }
    
    var folder = DriveApp.getFolderById(folderId);
    var pdfFile = folder.createFile(pdfBlob.setName('WARRANTY_' + jobId + '.pdf'));
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // บันทึก warranty_url ลง DB (dynamic colWarranty)
    try {
      for (var wi = 1; wi < jobs.length; wi++) {
        if (String(jobs[wi][colId]) === jobId) {
          jsh.getRange(wi + 1, colWarranty + 1).setValue(pdfFile.getUrl());
          break;
        }
      }
    } catch(e) { Logger.log('Save warranty URL failed: ' + e); }
    
    // Log activity
    try { logActivity('WARRANTY_PDF', 'SYSTEM', jobId + ': ' + pdfFile.getUrl()); } catch(e) {}
    
    return {
      success: true,
      jobId: jobId,
      warrantyUrl: pdfFile.getUrl(),
      pdfUrl: pdfFile.getDownloadUrl(),
      warrantyEnd: warrantyEnd
    };
  } catch (e) {
    Logger.log('generateWarrantyPDF error: ' + e);
    return { error: e.toString() };
  }
}
