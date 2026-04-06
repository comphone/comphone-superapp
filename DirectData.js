// DirectData.gs — Direct Sheet Data Access (self-contained, no external deps)
// COMPHONE SUPER APP — V212
// ==========================================

function getAllJobsDirect() {
  try {
    var ssId = (typeof DB_SS_ID !== 'undefined') ? DB_SS_ID : '19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA';
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName('DBJOBS');
    if (!sheet) {
      var sheets = ss.getSheets();
      for (var s = 0; s < sheets.length; s++) {
        var n = sheets[s].getName().toLowerCase();
        if (n.indexOf('job') !== -1 || n.indexOf('งาน') !== -1) {
          sheet = sheets[s];
          break;
        }
      }
    }
    if (!sheet) return { success: false, error: 'ไม่พบชีต DBJOBS', available: ss.getSheets().map(function(s){return s.getName()}) };
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: true, count: 0, jobs: [] };
    
    var jobs = [];
    // DBJOBS 15 columns: JobID, ชื่อลูกค้า, อาการ, สถานะ, ช่างที่รับงาน, พิกัด GPS, รูปถ่าย, ลิงก์รูปภาพ, ลิงก์โฟลเดอร์งาน, เวลาสร้าง, เวลาอัปเดต, หมายเหตุ, folder_url, Ref_ID, AI_Vision_Analysis
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0] && !row[1]) continue; // skip empty rows
      
      var job = {
        index: i + 1,
        jobId: trim2(String(row[0] || '')),
        customer: trim2(String(row[1] || '')),
        problem: trim2(String(row[2] || '')),
        status: trim2(String(row[3] || '')),
        technician: trim2(String(row[4] || '')),
        gps: trim2(String(row[5] || '')),
        createdAt: (row[9] instanceof Date) ? Utilities.formatDate(row[9], 'Asia/Bangkok', 'yyyy-MM-dd HH:mm') : trim2(String(row[9] || '')),
        updatedAt: (row[10] instanceof Date) ? Utilities.formatDate(row[10], 'Asia/Bangkok', 'yyyy-MM-dd HH:mm') : trim2(String(row[10] || '')),
        notes: trim2(String(row[11] || '')),
        folderUrl: trim2(String(row[12] || ''))
      };
      jobs.push(job);
    }
    
    return { success: true, count: jobs.length, jobs: jobs };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getAllCustomersDirect() {
  try {
    var ssId = (typeof DB_SS_ID !== 'undefined') ? DB_SS_ID : '19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA';
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName('CUSTOMERS');
    if (!sheet) {
      var sheets = ss.getSheets();
      for (var s = 0; s < sheets.length; s++) {
        var n = sheets[s].getName().toLowerCase();
        if (n.indexOf('customer') !== -1 || n.indexOf('ลูกค้า') !== -1) {
          sheet = sheets[s];
          break;
        }
      }
    }
    if (!sheet) return { success: false, error: 'ไม่พบชีต CUSTOMERS', available: ss.getSheets().map(function(s){return s.getName()}) };
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return { success: true, count: 0, customers: [] };
    
    var customers = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0] && !row[1]) continue;
      
      var c = {
        index: i + 1,
        code: trim2(String(row[0] || '')),
        name: trim2(String(row[1] || '')),
        phone: trim2(String(row[2] || '')),
        history: trim2(String(row[3] || ''))
      };
      customers.push(c);
    }
    
    return { success: true, count: customers.length, customers: customers };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function trim2(s) {
  return s.replace(/^\s+|\s+$/g, '');
}


function bulkImportJobs(jobsArray) {
  try {
    var ssId = (typeof DB_SS_ID !== 'undefined') ? DB_SS_ID : '19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA';
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName('DBJOBS');
    if (!sheet) return { success: false, error: 'ไม่พบชีต DBJOBS' };

    var lastRow = sheet.getLastRow();
    var today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
    var created = 0;
    var errors = 0;
    var results = [];

    for (var j = 0; j < jobsArray.length; j++) {
      var job = jobsArray[j];
      try {
        // Check for duplicates before inserting
        var dupCount = 0;
        var data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          var rowCust = trim2(String(data[i][1] || '')).toLowerCase();
          if (rowCust && job.customer && rowCust.indexOf(job.customer.toLowerCase()) !== -1) {
            dupCount++;
          }
        }

        var row = [
          'J' + ('0000' + (lastRow)).slice(-4),
          job.customer || '',
          job.problem || '',
          job.status || 'รอดำเนินการ',
          job.technician || '',
          job.gps || '',
          '',
          '',
          '',
          today,
          today,
          job.notes || '',
          '',
          '',
          ''
        ];

        sheet.appendRow(row);
        created++;
        lastRow++;

        results.push({
          jobId: row[0],
          customer: job.customer,
          status: job.status || 'รอดำเนินการ',
          isDuplicate: dupCount > 0,
          existingWork: dupCount
        });
      } catch (err) {
        errors++;
        results.push({ customer: job.customer, error: err.message });
      }
    }

    return {
      success: true,
      total: jobsArray.length,
      created: created,
      errors: errors,
      results: results
    };
  } catch (e) {
    return { success: false, error: e.message + ' @ ' + (e.lineNumber || '') };
  }
}

function testThaiRead() {
  var ss = SpreadsheetApp.openById('19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA');
  var sheet = ss.getSheetByName('DBJOBS');
  var data = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 0; i < Math.min(5, data.length); i++) {
    var row = [];
    for (var j = 0; j < data[i].length; j++) {
      row.push(String(data[i][j] || ''));
    }
    result.push(row);
  }
  return JSON.stringify(result);
}