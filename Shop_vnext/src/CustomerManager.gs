// ============================================================
// CustomerManager.gs - Customer Management & CRM V5.5
// CRUD ลูกค้า / Auto-fill ตอนเปิดงาน / Customer History / Predictive Maintenance
// ============================================================

var CUSTOMER_SHEET_NAME = 'DB_CUSTOMERS';
var CUSTOMER_LOG_SHEET_NAME = 'DB_CUSTOMER_LOGS';
var CUSTOMER_DEFAULT_HEADERS = [
  'Customer_ID',
  'Customer_Name',
  'Phone',
  'Address',
  'Latitude',
  'Longitude',
  'LINE_User_ID',
  'Customer_Type',
  'Tags',
  'Last_Job_ID',
  'Last_Service_Date',
  'Next_PM_Date',
  'Total_Jobs',
  'Total_Revenue',
  'Notes',
  'Created_At',
  'Updated_At'
];

function createCustomer(data) {
  data = data || {};
  return upsertCustomer(data, { mode: 'create' });
}

function updateCustomer(data) {
  data = data || {};
  return upsertCustomer(data, { mode: 'update' });
}

function upsertCustomer(data, options) {
  try {
    options = options || {};
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };

    var sh = ensureCustomerSheet_(ss);
    var ctx = getCustomerSheetContext_(sh);
    var all = sh.getDataRange().getValues();
    var existing = findCustomerRowInfo_(all, ctx, data);
    var rowIndex = existing.rowIndex;
    var row = existing.rowIndex > -1 ? all[existing.rowIndex - 1] : createEmptyRow_(ctx.headers.length);

    if (options.mode === 'create' && rowIndex > -1) {
      return { success: false, error: 'ลูกค้ามีอยู่แล้ว', customer: buildCustomerObjectFromRow_(row, ctx.indices), row_index: rowIndex };
    }
    if (options.mode === 'update' && rowIndex === -1) {
      return { success: false, error: 'ไม่พบข้อมูลลูกค้า' };
    }

    var customerId = safeString_(data.customer_id || data.id || (rowIndex > -1 ? safeCellRaw_(row, ctx.indices.customerId) : ''));
    if (!customerId) customerId = generateCustomerId_(all, ctx.indices.customerId);

    var customerName = safeString_(data.customer_name || data.customer || data.name || safeCellRaw_(row, ctx.indices.customerName));
    if (!customerName) return { success: false, error: 'customer_name is required' };

    var totalJobs = normalizeNumber_(data.total_jobs, safeCellRaw_(row, ctx.indices.totalJobs));
    var totalRevenue = normalizeNumber_(data.total_revenue, safeCellRaw_(row, ctx.indices.totalRevenue));
    var createdAt = safeCellRaw_(row, ctx.indices.createdAt) || new Date();
    var updatedAt = new Date();

    setIfIndex_(row, ctx.indices.customerId, customerId);
    setIfIndex_(row, ctx.indices.customerName, customerName);
    setIfIndex_(row, ctx.indices.phone, firstNonEmpty_(data.phone, data.tel, data.mobile, safeCellRaw_(row, ctx.indices.phone)));
    setIfIndex_(row, ctx.indices.address, firstNonEmpty_(data.address, data.customer_address, data.location_text, safeCellRaw_(row, ctx.indices.address)));
    setIfIndex_(row, ctx.indices.latitude, firstNonEmpty_(data.lat, data.latitude, safeCellRaw_(row, ctx.indices.latitude)));
    setIfIndex_(row, ctx.indices.longitude, firstNonEmpty_(data.lng, data.longitude, safeCellRaw_(row, ctx.indices.longitude)));
    setIfIndex_(row, ctx.indices.lineUserId, firstNonEmpty_(data.line_user_id, data.user_id, safeCellRaw_(row, ctx.indices.lineUserId)));
    setIfIndex_(row, ctx.indices.customerType, firstNonEmpty_(data.customer_type, data.type, safeCellRaw_(row, ctx.indices.customerType), 'Standard'));
    setIfIndex_(row, ctx.indices.tags, normalizeTagList_(data.tags || safeCellRaw_(row, ctx.indices.tags)));
    setIfIndex_(row, ctx.indices.lastJobId, firstNonEmpty_(data.last_job_id, data.job_id, safeCellRaw_(row, ctx.indices.lastJobId)));
    setIfIndex_(row, ctx.indices.lastServiceDate, normalizeDateCell_(data.last_service_date || data.installation_date || safeCellRaw_(row, ctx.indices.lastServiceDate)));
    setIfIndex_(row, ctx.indices.nextPmDate, normalizeDateCell_(data.next_pm_date || safeCellRaw_(row, ctx.indices.nextPmDate)));
    setIfIndex_(row, ctx.indices.totalJobs, totalJobs);
    setIfIndex_(row, ctx.indices.totalRevenue, totalRevenue);
    setIfIndex_(row, ctx.indices.notes, firstNonEmpty_(data.notes, data.note, safeCellRaw_(row, ctx.indices.notes)));
    setIfIndex_(row, ctx.indices.createdAt, createdAt);
    setIfIndex_(row, ctx.indices.updatedAt, updatedAt);

    var existedBefore = rowIndex > -1;
    if (existedBefore) {
      sh.getRange(rowIndex, 1, 1, ctx.headers.length).setValues([row]);
    } else {
      sh.appendRow(row);
      rowIndex = sh.getLastRow();
    }

    logCustomerEvent_(customerId, existedBefore ? 'UPSERT' : 'CREATE', firstNonEmpty_(data.job_id, ''), customerName, 'Customer saved/updated');
    return { success: true, customer_id: customerId, row_index: rowIndex, customer: buildCustomerObjectFromRow_(row, ctx.indices) };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function getCustomer(data) {
  try {
    data = data || {};
    var lookup = findCustomerRecord_(data);
    if (!lookup.success) return lookup;
    return { success: true, customer: lookup.customer };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function listCustomers(data) {
  try {
    data = data || {};
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = ensureCustomerSheet_(ss);
    var ctx = getCustomerSheetContext_(sh);
    var all = sh.getDataRange().getValues();
    var search = safeString_(data.search).toLowerCase();
    var typeFilter = safeString_(data.customer_type || data.type).toLowerCase();
    var out = [];
    for (var i = 1; i < all.length; i++) {
      var customer = buildCustomerObjectFromRow_(all[i], ctx.indices);
      var text = [customer.customer_id, customer.customer_name, customer.phone, customer.address, customer.tags].join(' ').toLowerCase();
      if (search && text.indexOf(search) === -1) continue;
      if (typeFilter && String(customer.customer_type || '').toLowerCase() !== typeFilter) continue;
      out.push(customer);
    }
    out.sort(function(a, b) {
      return String(b.updated_at || '').localeCompare(String(a.updated_at || ''));
    });
    return { success: true, total: out.length, customers: out };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function getCustomerHistory(data) {
  try {
    data = data || {};
    var customerLookup = findCustomerRecord_(data);
    if (!customerLookup.success) return customerLookup;

    var customer = customerLookup.customer;
    var ss = getComphoneSheet();
    var jsh = findSheetByName(ss, 'DBJOBS');
    if (!jsh || jsh.getLastRow() < 2) return { success: true, customer: customer, total_jobs: 0, jobs: [] };

    var headers = jsh.getRange(1, 1, 1, jsh.getLastColumn()).getValues()[0];
    var idxJob = findHeaderIndex_(headers, ['JobID', 'Job_ID', 'job_id']);
    var idxCustomer = findHeaderIndex_(headers, ['ชื่อลูกค้า', 'Customer_Name', 'Customer']);
    var idxSymptom = findHeaderIndex_(headers, ['อาการ', 'Symptom', 'Issue']);
    var idxStatus = findHeaderIndex_(headers, ['สถานะ', 'Status']);
    var idxTech = findHeaderIndex_(headers, ['ช่างที่รับงาน', 'Technician', 'tech']);
    var idxCreated = findHeaderIndex_(headers, ['เวลาสร้าง', 'Created_At', 'CreatedAt']);
    var idxUpdated = findHeaderIndex_(headers, ['เวลาอัปเดต', 'Updated_At', 'UpdatedAt']);
    var idxNote = findHeaderIndex_(headers, ['หมายเหตุ', 'Note']);
    var idxGps = findHeaderIndex_(headers, ['พิกัด GPS', 'GPS', 'Location']);
    var rows = jsh.getDataRange().getValues();
    var jobs = [];

    for (var i = 1; i < rows.length; i++) {
      var rowCustomer = String(safeCellRaw_(rows[i], idxCustomer) || '');
      if (!isSameCustomerName_(rowCustomer, customer.customer_name)) continue;
      jobs.push({
        job_id: safeCellValue_(rows[i], idxJob),
        customer_name: rowCustomer,
        symptom: safeCellValue_(rows[i], idxSymptom),
        status: safeCellValue_(rows[i], idxStatus),
        technician: safeCellValue_(rows[i], idxTech),
        gps: safeCellValue_(rows[i], idxGps),
        created_at: safeCellValue_(rows[i], idxCreated),
        updated_at: safeCellValue_(rows[i], idxUpdated),
        note: safeCellValue_(rows[i], idxNote)
      });
    }

    jobs.sort(function(a, b) {
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });

    return {
      success: true,
      customer: customer,
      total_jobs: jobs.length,
      last_job_id: jobs.length ? jobs[0].job_id : '',
      jobs: jobs
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function enrichJobDataWithCustomer_(data) {
  try {
    data = data || {};
    var lookup = findCustomerRecord_(data);
    if (!lookup.success) return data;

    var customer = lookup.customer;
    if (!data.customer_name && customer.customer_name) data.customer_name = customer.customer_name;
    if (!data.customer && customer.customer_name) data.customer = customer.customer_name;
    if (!data.name && customer.customer_name) data.name = customer.customer_name;
    if (!data.phone && customer.phone) data.phone = customer.phone;
    if (!data.address && customer.address) data.address = customer.address;
    if (!data.lat && !data.latitude && customer.latitude) data.lat = customer.latitude;
    if (!data.lng && !data.longitude && customer.longitude) data.lng = customer.longitude;
    if (!data.line_user_id && customer.line_user_id) data.line_user_id = customer.line_user_id;

    var noteParts = [];
    if (customer.phone) noteParts.push('โทร: ' + customer.phone);
    if (customer.address) noteParts.push('ที่อยู่: ' + customer.address);
    if (customer.tags) noteParts.push('Tags: ' + customer.tags);
    if (noteParts.length > 0) {
      var prefix = '[AUTO-FILL CUSTOMER] ' + noteParts.join(' | ');
      data.note = data.note ? prefix + '\n' + data.note : prefix;
    }
    data._customer_snapshot = customer;
    return data;
  } catch (e) {
    return data;
  }
}

function syncCustomerFromJob(jobId) {
  try {
    jobId = safeString_(jobId);
    if (!jobId) return { success: false, error: 'jobId is required' };

    var detail = getJobDetailById_(jobId);
    if (!detail.success) return detail;

    var history = getCustomerHistory({ customer_name: detail.job.customer_name });
    var totalJobs = history.success ? history.total_jobs : 0;
    var lastServiceDate = detail.job.updated_at || detail.job.created_at || '';
    var nextPmDate = calculateNextPmDate_(lastServiceDate, 330);

    var save = upsertCustomer({
      customer_name: detail.job.customer_name,
      phone: extractPhoneFromText_(detail.job.note || ''),
      address: extractAddressFromText_(detail.job.note || ''),
      lat: extractLatLng_(detail.job.gps).lat,
      lng: extractLatLng_(detail.job.gps).lng,
      last_job_id: jobId,
      last_service_date: lastServiceDate,
      next_pm_date: nextPmDate,
      total_jobs: totalJobs,
      notes: detail.job.note || ''
    }, { mode: 'upsert' });

    if (save.success) {
      logCustomerEvent_(save.customer_id, 'SYNC_FROM_JOB', jobId, detail.job.customer_name, 'Sync customer summary from DBJOBS');
    }
    return save;
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function getPredictiveMaintenanceQueue(data) {
  try {
    data = data || {};
    var days = Math.max(1, parseInt(data.days || 30, 10));
    var includeRainySeason = String(data.include_rainy_season || 'true') !== 'false';
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = ensureCustomerSheet_(ss);
    var ctx = getCustomerSheetContext_(sh);
    var rows = sh.getDataRange().getValues();
    var today = stripTime_(new Date());
    var deadline = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    var month = today.getMonth() + 1;
    var queue = [];

    for (var i = 1; i < rows.length; i++) {
      var customer = buildCustomerObjectFromRow_(rows[i], ctx.indices);
      if (!customer.customer_name) continue;
      var nextPm = parseFlexibleDate_(customer.next_pm_date || customer.last_service_date);
      var reason = '';
      if (nextPm && nextPm.getTime() <= deadline.getTime()) {
        reason = 'NEXT_PM_DUE';
      } else if (includeRainySeason && month === 5 && customer.last_service_date) {
        reason = 'RAINY_SEASON_CAMPAIGN';
      }
      if (!reason) continue;
      queue.push({
        customer_id: customer.customer_id,
        customer_name: customer.customer_name,
        phone: customer.phone,
        line_user_id: customer.line_user_id,
        address: customer.address,
        last_service_date: customer.last_service_date,
        next_pm_date: customer.next_pm_date,
        days_left: nextPm ? Math.ceil((stripTime_(nextPm).getTime() - today.getTime()) / (24 * 60 * 60 * 1000)) : '',
        reason: reason,
        message: buildPredictiveMaintenanceMessage_(customer, reason)
      });
    }

    queue.sort(function(a, b) {
      var av = a.days_left === '' ? 999999 : Number(a.days_left || 0);
      var bv = b.days_left === '' ? 999999 : Number(b.days_left || 0);
      return av - bv;
    });

    return { success: true, total: queue.length, days: days, customers: queue };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function runPredictiveMaintenance(data) {
  try {
    var queue = getPredictiveMaintenanceQueue(data || {});
    if (!queue.success) return queue;
    var sent = [];
    for (var i = 0; i < queue.customers.length; i++) {
      var item = queue.customers[i];
      sent.push({
        customer_id: item.customer_id,
        customer_name: item.customer_name,
        reason: item.reason,
        message: item.message
      });
      logCustomerEvent_(item.customer_id, 'PREDICTIVE_PM', '', item.customer_name, item.message);
      try {
        if (typeof sendCRMNotification === 'function') {
          sendCRMNotification({
            status: 'PM_REMINDER',
            customer_name: item.customer_name,
            next_pm: item.next_pm_date || '',
            message: item.message
          });
        }
      } catch (notifyErr) {}
    }
    return { success: true, total: sent.length, customers: sent };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function ensureCustomerSheet_(ss) {
  var sh = findSheetByName(ss, CUSTOMER_SHEET_NAME);
  if (!sh) sh = ss.insertSheet(CUSTOMER_SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, CUSTOMER_DEFAULT_HEADERS.length).setValues([CUSTOMER_DEFAULT_HEADERS]);
  } else {
    ensureHeadersExist_(sh, CUSTOMER_DEFAULT_HEADERS);
  }
  return sh;
}

function ensureCustomerLogSheet_(ss) {
  var sh = findSheetByName(ss, CUSTOMER_LOG_SHEET_NAME);
  var headers = ['Timestamp', 'Customer_ID', 'Event_Type', 'Job_ID', 'Customer_Name', 'Message'];
  if (!sh) sh = ss.insertSheet(CUSTOMER_LOG_SHEET_NAME);
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sh;
}

function logCustomerEvent_(customerId, eventType, jobId, customerName, message) {
  try {
    var ss = getComphoneSheet();
    if (!ss) return;
    var sh = ensureCustomerLogSheet_(ss);
    sh.appendRow([new Date(), customerId || '', eventType || '', jobId || '', customerName || '', message || '']);
  } catch (e) {
    Logger.log('logCustomerEvent_ error: ' + e);
  }
}

function getCustomerSheetContext_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return {
    headers: headers,
    indices: {
      customerId: findHeaderIndex_(headers, ['Customer_ID', 'customer_id', 'ID ลูกค้า', 'รหัสลูกค้า']),
      customerName: findHeaderIndex_(headers, ['Customer_Name', 'customer_name', 'ชื่อลูกค้า', 'Customer', 'Name']),
      phone: findHeaderIndex_(headers, ['Phone', 'phone', 'เบอร์โทร', 'โทรศัพท์', 'Mobile']),
      address: findHeaderIndex_(headers, ['Address', 'address', 'ที่อยู่', 'Customer_Address']),
      latitude: findHeaderIndex_(headers, ['Latitude', 'latitude', 'Lat', 'ละติจูด']),
      longitude: findHeaderIndex_(headers, ['Longitude', 'longitude', 'Lng', 'Long', 'ลองจิจูด']),
      lineUserId: findHeaderIndex_(headers, ['LINE_User_ID', 'line_user_id', 'Line_User_Id', 'LINE UID']),
      customerType: findHeaderIndex_(headers, ['Customer_Type', 'customer_type', 'ประเภทลูกค้า']),
      tags: findHeaderIndex_(headers, ['Tags', 'tags', 'Tag']),
      lastJobId: findHeaderIndex_(headers, ['Last_Job_ID', 'last_job_id', 'Job_ID ล่าสุด']),
      lastServiceDate: findHeaderIndex_(headers, ['Last_Service_Date', 'last_service_date', 'Installation_Date', 'วันติดตั้งล่าสุด']),
      nextPmDate: findHeaderIndex_(headers, ['Next_PM_Date', 'next_pm_date', 'PM_Due_Date']),
      totalJobs: findHeaderIndex_(headers, ['Total_Jobs', 'total_jobs', 'จำนวนงานทั้งหมด']),
      totalRevenue: findHeaderIndex_(headers, ['Total_Revenue', 'total_revenue', 'รายได้รวม']),
      notes: findHeaderIndex_(headers, ['Notes', 'notes', 'หมายเหตุ', 'Note']),
      createdAt: findHeaderIndex_(headers, ['Created_At', 'created_at', 'เวลาสร้าง']),
      updatedAt: findHeaderIndex_(headers, ['Updated_At', 'updated_at', 'เวลาอัปเดต'])
    }
  };
}

function findCustomerRecord_(data) {
  try {
    data = data || {};
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = ensureCustomerSheet_(ss);
    var ctx = getCustomerSheetContext_(sh);
    var all = sh.getDataRange().getValues();
    var found = findCustomerRowInfo_(all, ctx, data);
    if (found.rowIndex < 0) return { success: false, error: 'ไม่พบข้อมูลลูกค้า' };
    return { success: true, row_index: found.rowIndex, customer: buildCustomerObjectFromRow_(all[found.rowIndex - 1], ctx.indices) };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function findCustomerRowInfo_(all, ctx, data) {
  data = data || {};
  var targetId = safeString_(data.customer_id || data.id).toLowerCase();
  var targetName = safeString_(data.customer_name || data.customer || data.name).toLowerCase();
  var targetPhone = normalizePhone_(data.phone || data.tel || data.mobile);
  var targetLine = safeString_(data.line_user_id || data.user_id).toLowerCase();

  for (var i = 1; i < all.length; i++) {
    var row = all[i];
    var rowId = safeString_(safeCellRaw_(row, ctx.indices.customerId)).toLowerCase();
    var rowName = safeString_(safeCellRaw_(row, ctx.indices.customerName)).toLowerCase();
    var rowPhone = normalizePhone_(safeCellRaw_(row, ctx.indices.phone));
    var rowLine = safeString_(safeCellRaw_(row, ctx.indices.lineUserId)).toLowerCase();
    if (targetId && rowId === targetId) return { rowIndex: i + 1, row: row };
    if (targetPhone && rowPhone && rowPhone === targetPhone) return { rowIndex: i + 1, row: row };
    if (targetLine && rowLine && rowLine === targetLine) return { rowIndex: i + 1, row: row };
    if (targetName && rowName && isSameCustomerName_(rowName, targetName)) return { rowIndex: i + 1, row: row };
  }
  return { rowIndex: -1, row: null };
}

function buildCustomerObjectFromRow_(row, indices) {
  return {
    customer_id: safeCellValue_(row, indices.customerId),
    customer_name: safeCellValue_(row, indices.customerName),
    phone: safeCellValue_(row, indices.phone),
    address: safeCellValue_(row, indices.address),
    latitude: safeCellRaw_(row, indices.latitude),
    longitude: safeCellRaw_(row, indices.longitude),
    line_user_id: safeCellValue_(row, indices.lineUserId),
    customer_type: safeCellValue_(row, indices.customerType),
    tags: safeCellValue_(row, indices.tags),
    last_job_id: safeCellValue_(row, indices.lastJobId),
    last_service_date: safeCellValue_(row, indices.lastServiceDate),
    next_pm_date: safeCellValue_(row, indices.nextPmDate),
    total_jobs: normalizeNumber_(safeCellRaw_(row, indices.totalJobs), 0),
    total_revenue: normalizeNumber_(safeCellRaw_(row, indices.totalRevenue), 0),
    notes: safeCellValue_(row, indices.notes),
    created_at: safeCellValue_(row, indices.createdAt),
    updated_at: safeCellValue_(row, indices.updatedAt)
  };
}

function ensureHeadersExist_(sheet, requiredHeaders) {
  var current = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var changed = false;
  for (var i = 0; i < requiredHeaders.length; i++) {
    if (current.indexOf(requiredHeaders[i]) === -1) {
      current.push(requiredHeaders[i]);
      changed = true;
    }
  }
  if (changed) {
    sheet.getRange(1, 1, 1, current.length).setValues([current]);
  }
}

function generateCustomerId_(all, index) {
  var maxId = 0;
  for (var i = 1; i < all.length; i++) {
    var match = String(index > -1 ? all[i][index] : '').match(/C(\d+)/i);
    if (match) maxId = Math.max(maxId, parseInt(match[1], 10));
  }
  return 'C' + String(maxId + 1).padStart(4, '0');
}

function calculateNextPmDate_(baseDate, days) {
  var date = parseFlexibleDate_(baseDate);
  if (!date) return '';
  return new Date(date.getTime() + (days || 330) * 24 * 60 * 60 * 1000);
}

function buildPredictiveMaintenanceMessage_(customer, reason) {
  if (reason === 'RAINY_SEASON_CAMPAIGN') {
    return 'สวัสดีครับคุณ ' + customer.customer_name + ' ช่วงก่อนเข้าฤดูฝน ทางร้านมีบริการตรวจเช็ค/ล้างระบบ CCTV และอุปกรณ์เครือข่าย สนใจให้ทีมงานเข้าตรวจเช็คได้ครับ';
  }
  return 'สวัสดีครับคุณ ' + customer.customer_name + ' ระบบที่ติดตั้งใกล้ถึงรอบบำรุงรักษาแล้ว หากต้องการนัดหมายตรวจเช็ค แจ้งวันเวลาที่สะดวกได้เลยครับ';
}

function normalizeTagList_(value) {
  if (value === null || value === undefined || value === '') return '';
  if (Object.prototype.toString.call(value) === '[object Array]') return value.join(',');
  return String(value).split(',').map(function(item) { return String(item).trim(); }).filter(function(item) { return !!item; }).join(',');
}

function normalizeDateCell_(value) {
  if (!value) return '';
  var date = parseFlexibleDate_(value);
  return date || value;
}

function parseFlexibleDate_(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  var date = new Date(value);
  if (!isNaN(date.getTime())) return date;
  return null;
}

function stripTime_(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function safeString_(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function firstNonEmpty_() {
  for (var i = 0; i < arguments.length; i++) {
    var value = arguments[i];
    if (value !== null && value !== undefined && String(value) !== '') return value;
  }
  return '';
}

function normalizePhone_(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

function isSameCustomerName_(a, b) {
  var x = String(a || '').trim().toLowerCase();
  var y = String(b || '').trim().toLowerCase();
  return !!x && !!y && (x === y || x.indexOf(y) > -1 || y.indexOf(x) > -1);
}

function normalizeNumber_(value, fallback) {
  var num = Number(value);
  if (isNaN(num)) num = Number(fallback || 0);
  if (isNaN(num)) num = 0;
  return num;
}

function extractPhoneFromText_(text) {
  var match = String(text || '').match(/0\d{8,9}/);
  return match ? match[0] : '';
}

function extractAddressFromText_(text) {
  var lines = String(text || '').split(/\n/);
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].indexOf('ที่อยู่:') > -1) return lines[i].split('ที่อยู่:')[1].trim();
  }
  return '';
}

function extractLatLng_(gpsText) {
  var match = String(gpsText || '').match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  return {
    lat: match ? Number(match[1]) : '',
    lng: match ? Number(match[2]) : ''
  };
}
