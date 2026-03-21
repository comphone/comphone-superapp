// --- แสดงหน้าเว็บ Web App และรองรับ Deep Link ---
function doGet(e) {
  let template = HtmlService.createTemplateFromFile('Dashboard'); 
  
  if (e.parameter && e.parameter.job) {
    template.defaultJobId = e.parameter.job; 
  } else {
    template.defaultJobId = '';
  }
  
  return template.evaluate()
    .setTitle('Comphone Super App V5.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// --- รับ Webhook และ API Router (Dual Engine + Bot API) ---
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // 🌟 ส่วนที่ 1: API สำหรับบอท (MiMo)
    if (data.action) {
      if (data.action === 'createJob') {
        let res = createNewJobExt(data.payload || data);
        if (!res || res.success === false) {
          const msg = (res && (res.message || res.error)) || 'สร้างงานไม่สำเร็จ';
          return ContentService.createTextOutput(JSON.stringify(apiError('createJob', 'JOB_CREATE_FAILED', msg, res || {}))).setMimeType(ContentService.MimeType.JSON);
        }
        return ContentService.createTextOutput(JSON.stringify(apiSuccess('createJob', res))).setMimeType(ContentService.MimeType.JSON);
      }
      if (data.action === 'getJobs') {
        let res = getPendingJobs(); 
        if (!res || res.success === false) {
          const msg = (res && (res.message || res.error)) || 'ดึงรายการงานไม่สำเร็จ';
          return ContentService.createTextOutput(JSON.stringify(apiError('getJobs', 'GET_JOBS_FAILED', msg, res || {}))).setMimeType(ContentService.MimeType.JSON);
        }
        return ContentService.createTextOutput(JSON.stringify(apiSuccess('getJobs', { jobs: res.jobs || [] }))).setMimeType(ContentService.MimeType.JSON);
      }
      if (data.action === 'checkDuplicate' || data.action === 'detectDuplicate') {
        let res = detectDuplicateJobExt(data.payload || data);
        if (!res || res.success === false) {
          const msg = (res && (res.message || res.error)) || 'ตรวจงานซ้ำไม่สำเร็จ';
          return ContentService.createTextOutput(JSON.stringify(apiError('detectDuplicate', 'DUPLICATE_CHECK_FAILED', msg, res || {}))).setMimeType(ContentService.MimeType.JSON);
        }
        return ContentService.createTextOutput(JSON.stringify(apiSuccess('detectDuplicate', { isDuplicate: !!res.isDuplicate, duplicates: res.duplicates || [] }))).setMimeType(ContentService.MimeType.JSON);
      }
      if (data.action === 'getDashboardData') {
        let res = getAIPanelData();
        if (!res || res.success === false) {
          const msg = (res && (res.message || res.error)) || 'ดึงข้อมูลแดชบอร์ดไม่สำเร็จ';
          return ContentService.createTextOutput(JSON.stringify(apiError('getDashboardData', 'GET_DASHBOARD_FAILED', msg, res || {}))).setMimeType(ContentService.MimeType.JSON);
        }
        return ContentService.createTextOutput(JSON.stringify(apiSuccess('getDashboardData', res))).setMimeType(ContentService.MimeType.JSON);
      }
      if (data.action === 'getLowStockDashboard') {
        let res = getLowStockDashboardData();
        return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
      }
      if (data.action === 'getReorderRecommendations') {
        let res = getReorderRecommendations(data.payload || data);
        return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
      }
      if (data.action === 'returnInventory') {
        let res = returnInventoryFromJob(data.payload || data);
        return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
      }
      if (data.action === 'partialReturnInventory') {
        let res = partialReturnInventoryFromJob(data.payload || data);
        return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
      }
      if (data.action === 'processInventoryTransaction') {
        let res = processInventoryTransaction(data.payload || data);
        return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify(apiError(data.action, 'UNKNOWN_ACTION', 'ไม่รู้จัก action นี้', { receivedAction: data.action }))).setMimeType(ContentService.MimeType.JSON);
    }

    // 🔵 ส่วนที่ 2: TELEGRAM Webhook
    if (data.update_id && data.message) {
      processTelegramUpdate(data.message);
      return ContentService.createTextOutput('OK Telegram');
    }

    // 🟢 ส่วนที่ 3: LINE Webhook
    if (!validateRequest(e)) {
      return ContentService.createTextOutput('Unauthorized: Signature failed');
    }
    if (data.events && data.events.length > 0) {
      // data.events.forEach(event => processLineEvent(event));
    }

    return ContentService.createTextOutput('OK Line');

  } catch (err) {
    console.error('Router error:', err.message);
    return ContentService.createTextOutput(JSON.stringify(apiError('router', 'ROUTER_ERROR', err.message, { stack: err.stack || '' }))).setMimeType(ContentService.MimeType.JSON);
  }
}

// ฟิลเตอร์ตรวจสอบความปลอดภัย
function validateRequest(e) {
  if (!e) return false;
  const props = PropertiesService.getScriptProperties();
  if (e.headers && e.headers['x-line-signature']) {
    const channelSecret = props.getProperty('LINE_CHANNEL_SECRET');
    if (!channelSecret) return true;
    const hash = Utilities.computeHmacSha256Signature(e.postData.contents, channelSecret);
    return e.headers['x-line-signature'] === Utilities.base64Encode(hash);
  }
  const validApiKey = props.getProperty('API_KEY');
  let requestKey = e.parameter.api_key;
  if (!requestKey && e.postData && e.postData.contents) {
    try { requestKey = JSON.parse(e.postData.contents).api_key; } catch (err) { }
  }
  return requestKey === validApiKey;
}
