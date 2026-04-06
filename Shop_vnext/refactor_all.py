#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""V309 — สร้างไฟล์ Refactored ทั้งหมดพร้อม Thai encoding ที่ถูกต้อง"""
import os

base = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src'

files = {}

# ============================================================
# 1. JobsHandler.gs
# ============================================================
files['JobsHandler.gs'] = '''// ============================================================
// JobsHandler.gs - Job CRUD, Photos, Folders (V309)
// ============================================================

function openJob(data) {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { error: 'DBJOBS not found' };
    var name = data.name || 'ลูกค้าใหม่';
    var phone = data.phone || '';
    var symptom = data.symptom || 'อาการไม่ระบุ';
    var status = data.status || 'รอดำเนินการ';
    var tech = data.tech || '';
    var gps = data.gps || '';
    var num = sh.getLastRow();
    var id = 'J' + String(Math.max(num, 1)).padStart(4, '0');
    
    // Find header row to get correct column count
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var cols = headers.length;
    if (cols < 13) cols = 13;
    var row = [id, name, symptom, status, tech, gps, '', '', '', new Date(), '', '', ''];
    while (row.length < cols) row.push('');
    
    sh.appendRow(row);
    return { success: true, job_id: id, customer: name, status: status };
  } catch (e) { return { error: e.toString() }; }
}

function checkJobs(data) {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { error: 'DBJOBS not found' };
    var all = sh.getDataRange().getValues();
    var sc = 3, cc = 9, fc = 12;
    var headers = all[0];
    for (var hi = 0; hi < headers.length; hi++) {
      var h = String(headers[hi]);
      if (h.indexOf('สถานะ') > -1 || h.indexOf('สถาน') > -1) sc = hi;
      if (h.indexOf('เวลาสร้าง') > -1) cc = hi;
      if (h.indexOf('folder') > -1 || h.indexOf('ลิงก์โฟลเดอร์') > -1) fc = hi;
    }
    var search = (data.search || '').toLowerCase();
    var results = [];
    for (var i = 1; i < all.length; i++) {
      var j = all[i];
      if (!search || String(j[0]).toLowerCase().indexOf(search) > -1 || String(j[1]).toLowerCase().indexOf(search) > -1 || String(j[4] || '').toLowerCase().indexOf(search) > -1) {
        var created = '-';
        try { if (j[cc] && j[cc] instanceof Date) created = Utilities.formatDate(j[cc], 'Asia/Bangkok', 'dd/MM HH:mm'); } catch(e) {}
        results.push({ job_id: String(j[0]), customer: String(j[1]), symptom: String(j[2]), status: String(j[sc]), technician: String(j[4] || ''), folder_url: String(j[fc] || ''), created: created });
      }
    }
    return { count: results.length, jobs: results };
  } catch (e) { return { error: e.toString() }; }
}

function completeJob(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { error: 'Lock timeout' }; }
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { error: 'DBJOBS not found' };
    var all = sh.getDataRange().getValues();
    var jobId = data.job_id || '';
    for (var i = 1; i < all.length; i++) {
      if (String(all[i][0]) === String(jobId)) {
        all[i][3] = 'Completed';
        all[i][10] = new Date();
        sh.getDataRange().setValues(all);
        var invSh = findSheetByName(ss, 'DB_INVENTORY');
        var parts = data.parts || '';
        if (parts && invSh) {
          var invAll = invSh.getDataRange().getValues();
          var partsArr = parts.split(',');
          for (var pi = 0; pi < partsArr.length; pi++) {
            var psplit = partsArr[pi].split(':');
            var itemName = psplit[0];
            var qty = parseInt(psplit[1]) || 1;
            for (var qi = 1; qi < invAll.length; qi++) {
              if (String(invAll[qi][0]) === itemName || String(invAll[qi][1]) === itemName) {
                invAll[qi][2] = Math.max(0, invAll[qi][2] - qty);
              }
            }
          }
          invSh.getDataRange().setValues(invAll);
        }
        // Create billing
        var billSh = findSheetByName(ss, 'DB_BILLING');
        if (billSh) {
          var labor = data.labor_cost || 0;
          var total = labor + (parts ? parts.split(',').length * 100 : 0);
          billSh.appendRow([jobId, parts || '-', labor, total, 'Unpaid']);
        }
        return { success: true, job_id: jobId, status: 'Completed', message: 'ปิดงานสำเร็จ! ตัดสต็อก + สร้างบิลแล้ว' };
      }
    }
    return { error: 'ไม่พบ JobID: ' + jobId };
  } catch (e) { return { error: e.toString() }; }
  finally { try { lock.releaseLock(); } catch(ex) {} }
}

function updateJobStatus(data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { error: 'Lock timeout' }; }
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { error: 'DBJOBS not found' };
    var all = sh.getDataRange().getValues();
    var jobId = data.job_id || '';
    for (var i = 1; i < all.length; i++) {
      if (String(all[i][0]) === String(jobId)) {
        if (data.status) all[i][3] = data.status;
        if (data.technician) all[i][4] = data.technician;
        if (data.lat && data.lng) all[i][5] = data.lat + ',' + data.lng;
        if (data.note) {
          all[i][11] = (all[i][11] ? all[i][11] + '\\n' : '') + new Date().toLocaleString('th-TH') + ': ' + data.note;
        }
        all[i][10] = new Date();
        sh.getDataRange().setValues(all);
        return { success: true, job_id: jobId, status: all[i][3], technician: all[i][4] || '' };
      }
    }
    return { error: 'ไม่พบ ' + jobId };
  } catch (e) { return { error: e.toString() }; }
  finally { try { lock.releaseLock(); } catch(ex) {} }
}

function updateJobById(jobId, data) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch(e) { return { error: 'Lock timeout' }; }
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { error: 'DBJOBS not found' };
    var all = sh.getDataRange().getValues();
    for (var i=1; i < all.length; i++) {
      if (String(all[i][0]) === String(jobId)) {
        if (data.name) all[i][1] = data.name;
        if (data.symptom) all[i][2] = data.symptom;
        if (data.status) all[i][3] = data.status;
        if (data.tech) all[i][4] = data.tech;
        if (data.gps) all[i][5] = data.gps;
        all[i][10] = new Date();
        sh.getDataRange().setValues(all);
        return { success: true };
      }
    }
    return { error: 'ไม่พบ ' + jobId };
  } catch (e) { return { error: e.toString() }; }
  finally { try { lock.releaseLock(); } catch(ex) {} }
}

function getOrCreateJobFolder(data) {
  try {
    var jobId = data.job_id || '';
    var name = data.customer_name || 'Unknown';
    var phase = data.phase || '00_สำรวจ';
    var rootId = getConfig('ROOT_FOLDER_ID') || '1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0';
    var root = DriveApp.getFolderById(rootId);
    var pf = root.getFoldersByName('02_SERVICE_PHOTOS');
    var photos = pf.hasNext() ? pf.next() : root.createFolder('02_SERVICE_PHOTOS');
    var phf = photos.getFoldersByName(phase);
    var phaseFolder = phf.hasNext() ? phf.next() : photos.createFolder(phase);
    var jname = jobId + '_' + name;
    var ex = phaseFolder.getFoldersByName(jname);
    var folder = ex.hasNext() ? ex.next() : phaseFolder.createFolder(jname);
    // Update DB
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (sh) {
      var all = sh.getDataRange().getValues();
      for (var i = 1; i < all.length; i++) {
        if (String(all[i][0]) === String(jobId)) {
          while (all[i].length < 13) all[i].push('');
          all[i][12] = folder.getUrl();
          sh.getDataRange().setValues(all);
          break;
        }
      }
    }
    return { success: true, folder_url: folder.getUrl(), folder_id: folder.getId(), name: jname };
  } catch (e) { return { error: e.toString() }; }
}

function saveJobPhoto(data) {
  try {
    var fr = getOrCreateJobFolder(data);
    if (fr.error) return fr;
    var folder = DriveApp.getFolderById(fr.folder_id);
    var b64 = data.image_base64 || '';
    var fname = data.file_name || 'photo_' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd_HHmmss') + '.jpg';
    var mime = data.mime_type || 'image/jpeg';
    var bytes = Utilities.base64Decode(b64);
    var blob = Utilities.newBlob(bytes, mime, fname);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { success: true, file_url: file.getUrl(), download_url: 'https://drive.google.com/uc?id=' + file.getId() };
  } catch (e) { return { error: e.toString() }; }
}

function updatePhotoLink(data) {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { error: 'DBJOBS not found' };
    var all = sh.getDataRange().getValues();
    var photoUrl = data.photo_url || '';
    var folderUrl = data.folder_url || '';
    for (var i = 1; i < all.length; i++) {
      if (String(all[i][0]) === String(data.job_id)) {
        while (all[i].length < 13) all[i].push('');
        all[i][7] = (all[i][7] ? all[i][7] + '\\n' : '') + photoUrl;
        if (folderUrl) all[i][12] = folderUrl;
        all[i][10] = new Date();
        sh.getDataRange().setValues(all);
        return { success: true };
      }
    }
    return { error: 'ไม่พบ' };
  } catch (e) { return { error: e.toString() }; }
}
'''

# ============================================================
# 2. Inventory.gs
# ============================================================
files['Inventory.gs'] = '''// ============================================================
// Inventory.gs - Stock & Barcode (V309)
// ============================================================

function checkStock(data) {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return { error: 'DB_INVENTORY not found' };
    var all = sh.getDataRange().getValues();
    var search = (data.search || '').toLowerCase();
    var results = [];
    for (var i = 1; i < all.length; i++) {
      var v = (String(all[i][0]) + ' ' + String(all[i][1])).toLowerCase();
      if (!search || v.indexOf(search) > -1) {
        results.push({
          code: String(all[i][0]),
          name: String(all[i][1]),
          qty: Number(all[i][2] || 0),
          cost: Number(all[i][3] || 0),
          price: Number(all[i][4] || 0),
          alert: Number(all[i][2] || 0) < 5
        });
      }
    }
    return { total_items: results.length, items: results };
  } catch (e) { return { error: e.toString() }; }
}

function barcodeLookup(data) {
  try {
    var bc = data.barcode || '';
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return { error: 'DB_INVENTORY not found' };
    var all = sh.getDataRange().getValues();
    for (var i = 1; i < all.length; i++) {
      if (String(all[i][0]) === bc || String(all[i][1]) === bc) {
        return {
          success: true, code: String(all[i][0]), name: String(all[i][1]),
          qty: Number(all[i][2]), price: Number(all[i][4]),
          status: Number(all[i][2]) < 5 ? '🔴 เหลือน้อย!' : '✅ มีสต็อก'
        };
      }
    }
    return { success: false, message: 'ไม่พบอะไหล่: ' + bc };
  } catch (e) { return { error: e.toString() }; }
}
'''

# ============================================================
# 3. Dashboard.gs
# ============================================================
files['Dashboard.gs'] = '''// ============================================================
// Dashboard.gs - Dashboard UI & Data APIs (V309)
// ============================================================

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'json') {
    var result = {
      success: true,
      jobs: getDashboardJobs(),
      inventory: getDashboardInventory(),
      summary: getDashboardSummary()
    };
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Comphone Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function getDashboardData() {
  return {
    success: true,
    jobs: getDashboardJobs(),
    inventory: getDashboardInventory(),
    summary: getDashboardSummary()
  };
}

function getDashboardJobs() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return [];
    var all = sh.getDataRange().getValues();
    var sc = 3, cc = 9, fc = 12;
    var headers = all[0];
    for (var hi = 0; hi < headers.length; hi++) {
      var h = String(headers[hi]);
      if (h.indexOf('สถานะ') > -1 || h.indexOf('สถาน') > -1) sc = hi;
      if (h.indexOf('เวลาสร้าง') > -1) cc = hi;
      if (h.indexOf('folder_url') > -1 || h.indexOf('ลิงก์โฟลเดอร์') > -1) fc = hi;
    }
    var jobs = [];
    for (var i = all.length - 1; i >= 1 && i >= all.length - 50; i--) {
      var dateStr = '-';
      try { if (all[i][cc] && all[i][cc] instanceof Date) dateStr = Utilities.formatDate(all[i][cc], 'Asia/Bangkok', 'dd/MM HH:mm'); } catch(e) {}
      jobs.push({
        id: String(all[i][0] || ''), customer: String(all[i][1] || ''),
        symptom: String(all[i][2] || ''), status: String(all[i][sc] || ''),
        tech: String(all[i][4] || '-'), created: dateStr,
        folder: String(all[i][fc] || '')
      });
    }
    return jobs;
  } catch(e) { return []; }
}

function getDashboardInventory() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return [];
    var all = sh.getDataRange().getValues();
    var items = [];
    for (var i = 1; i < all.length; i++) {
      items.push({
        code: String(all[i][0] || ''), name: String(all[i][1] || ''),
        qty: Number(all[i][2] || 0), price: Number(all[i][4] || 0),
        alert: Number(all[i][2] || 0) < 5
      });
    }
    return items;
  } catch(e) { return []; }
}

function getDashboardSummary() {
  try {
    var ss = getComphoneSheet();
    var jsh = findSheetByName(ss, 'DBJOBS');
    var ish = findSheetByName(ss, 'DB_INVENTORY');
    var p = 0, c = 0, ip = 0, ls = 0, ti = 0;
    if (jsh) {
      var j = jsh.getDataRange().getValues();
      var sc = 3;
      var headers = j[0];
      for (var hi = 0; hi < headers.length; hi++) {
        var h = String(headers[hi]);
        if (h.indexOf('สถานะ') > -1 || h.indexOf('สถาน') > -1) { sc = hi; break; }
      }
      for (var i = 1; i < j.length; i++) {
        var s = String(j[i][sc]);
        if (s.indexOf('รอดำ') === 0) p++;
        else if (s === 'InProgress' || s.indexOf('กำลัง') === 0) ip++;
        else if (s === 'Completed') c++;
      }
    }
    if (ish) {
      var it = ish.getDataRange().getValues();
      ti = it.length - 1;
      for (var k = 1; k < it.length; k++) {
        if (Number(it[k][2] || 0) < 5) ls++;
      }
    }
    return {
      totalJobs: p + ip + c, pending: p, inProgress: ip, completed: c,
      totalItems: ti, lowStock: ls,
      date: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm')
    };
  } catch(e) {
    return { totalJobs:0, pending:0, inProgress:0, completed:0, totalItems:0, lowStock:0, date:'error' };
  }
}
'''

# ============================================================
# 4. Notify.gs
# ============================================================
files['Notify.gs'] = '''// ============================================================
// Notify.gs - LINE Notify + CRM + Cron (V309)
// ============================================================

function sendLineNotify(data) {
  try {
    var msg = data.message || 'แจ้งเตือน';
    var room = data.room || 'TECHNICIAN';
    var tk = 'LINE_NOTIFY_TOKEN_' + room;
    var token = getConfig(tk);
    if (!token) {
      var ss = getComphoneSheet();
      var lsh = findSheetByName(ss, 'SYSTEM_LOGS');
      if (!lsh) { lsh = ss.insertSheet('SYSTEM_LOGS'); lsh.appendRow(['Timestamp','Type','Room','Message']); }
      lsh.appendRow([new Date(), 'LINE_NOTIFY', room, msg]);
      var note = 'กรุณาตั้งค่า token: setConfig("' + tk + '", "your_token")';
      return { success: true, message: 'บันทึกแจ้งเตือนแล้ว — ' + note };
    }
    var payload = 'message=' + encodeURIComponent(msg);
    var opts = { method: 'post', payload: payload, headers: { 'Authorization': 'Bearer ' + token }, muteHttpExceptions: true };
    var resp = UrlFetchApp.fetch('https://notify-api.line.me/api/notify', opts);
    return resp.getResponseCode() === 200 ? { success: true } : { success: false, error: 'HTTP ' + resp.getResponseCode() };
  } catch (e) { return { error: e.toString() }; }
}

function cronMorningAlert() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_INVENTORY');
    if (!sh) return { error: 'Sheet not found' };
    var all = sh.getDataRange().getValues();
    var nameIdx = 1, qtyIdx = 2;
    var headers = all[0];
    for (var hi = 0; hi < headers.length; hi++) {
      var h = String(headers[hi]);
      if (h === 'ชื่อ') nameIdx = hi;
      if (h === 'จำนวน') qtyIdx = hi;
    }
    var lowStock = [];
    for (var i = 1; i < all.length; i++) {
      if (Number(all[i][qtyIdx] || 0) < 5) {
        lowStock.push(String(all[i][nameIdx]) + ': ' + Number(all[i][qtyIdx]) + ' ชิ้น');
      }
    }
    if (lowStock.length > 0) {
      sendLineNotify({ message: '⚠️ สต็อกใกล้หมด (' + lowStock.length + ' รายการ)\\n\\n' + lowStock.join('\\n'), room: 'PROCUREMENT' });
    }
    var jsh = findSheetByName(ss, 'DBJOBS');
    if (jsh) {
      var jobs = jsh.getDataRange().getValues();
      var p = 0, c = 0, sc = 3;
      for (var hi = 0; hi < jobs[0].length; hi++) {
        if (String(jobs[0][hi]).indexOf('สถานะ') > -1 || String(jobs[0][hi]).indexOf('สถาน') > -1) { sc = hi; break; }
      }
      for (var j = 1; j < jobs.length; j++) {
        var s = String(jobs[j][sc]);
        if (s.indexOf('รอดำ') === 0) p++;
        if (s === 'Completed') c++;
      }
      sendLineNotify({ message: '📊 สรุปเช้า\\n⏳ รอดำเนินการ: ' + p + ' งาน\\n✅ เสร็จแล้ว: ' + c + ' งาน', room: 'TECHNICIAN' });
    }
    return { success: true, lowStock: lowStock.length };
  } catch (e) { return { error: e.toString() }; }
}

function sendCRMNotification(data) {
  try {
    var ss = getComphoneSheet();
    var lsh = findSheetByName(ss, 'SYSTEM_LOGS');
    if (!lsh) { lsh = ss.insertSheet('SYSTEM_LOGS'); lsh.appendRow(['Timestamp','Type','JobID','Customer','Message']); }
    var status = data.status || '';
    lsh.appendRow([new Date(), status === 'Completed' ? 'JOB_COMPLETED' : 'PM_REMINDER', data.job_id || '', data.customer_name || '', status === 'Completed' ? 'งานเสร็จแล้ว' : 'รอบ PM ถัดไป: ' + (data.next_pm || '')]);
    return { success: true, message: 'CRM notification logged' };
  } catch (e) { return { error: e.toString() }; }
}
'''

# ============================================================
# 5. Utils.gs
# ============================================================
files['Utils.gs'] = '''// ============================================================
// Utils.gs - Database Access Helpers (V309)
// ============================================================

var DB_SS_ID = '19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA';
var ROOT_FOLDER_ID = '1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0';

function getComphoneSheet() {
  try { return SpreadsheetApp.openById(DB_SS_ID); }
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

function getConfig(key) {
  try { var p = PropertiesService.getScriptProperties(); return p.getProperty(key) || null; }
  catch (e) { return null; }
}

function setConfig(key, value) {
  try { PropertiesService.getScriptProperties().setProperty(key, value); return { success: true }; }
  catch (e) { return { success: false, error: e.toString() }; }
}

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
'''

# ============================================================
# Write all files
# ============================================================
for fname, content in files.items():
    fpath = os.path.join(base, fname)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✅ Created {fname}: {len(content)} bytes')

# Remove old files that are replaced
old_files = ['Router.js', 'DashboardCode.gs']
for of in old_files:
    op = os.path.join(base, of)
    if os.path.exists(op):
        os.remove(op)
        print(f'🗑️ Removed {of}')

# Remove extra .js files that are not needed in GAS
js_files = ['line-gas-bridge.js', 'smart-filter.js', 'responses.js', 'vision-analysis.js', 
            'gps-pipeline.js', 'openclaw-line-hook.js', 'SmartAssignment.js']
for jf in js_files:
    jp = os.path.join(base, jf)
    if os.path.exists(jp):
        os.remove(jp)
        print(f'🗑️ Removed {jf}')

print('\\n✅ V309 Refactoring Complete!')
