// COMPHONE SUPER APP V5.5
// ============================================================
// Config.gs - Script Properties Based Configuration
// ============================================================

var CONFIG = {
  APP_NAME: 'COMPHONE SUPER APP V5.5+',
  VERSION: '5.5.8',
  BUILD: '2026-04-19',
  TIMEZONE: 'Asia/Bangkok',

  // ── ชื่อ Sheet ทั้งหมดในระบบ ──
  SHEETS: {
    JOBS:             'DBJOBS',
    INVENTORY:        'DB_INVENTORY',
    CUSTOMERS:        'DB_CUSTOMERS',
    BILLING:          'DB_BILLING',
    STOCK_MOVEMENTS:  'DB_STOCK_MOVEMENTS',
    JOB_ITEMS:        'DB_JOB_ITEMS',
    PHOTO_QUEUE:      'DB_PHOTO_QUEUE',
    PURCHASE_ORDERS:  'DB_PURCHASE_ORDERS',
    ATTENDANCE:       'DB_ATTENDANCE',
    AFTER_SALES:      'DB_AFTER_SALES',
    JOB_LOGS:         'DB_JOB_LOGS',
    USERS:            'DB_USERS',
    ACTIVITY_LOG:     'DB_ACTIVITY_LOG'
  },

  // ── ชื่อโฟลเดอร์ Google Drive ──
  FOLDERS: {
    ROOT:              'COMPHONE_SUPERAPP_ROOT',
    JOBS_PHOTOS:       'JOBS_PHOTOS',
    BILLING_RECEIPTS:  'BILLING_RECEIPTS',
    SLIPS:             'SLIPS_VERIFICATION',
    AI_QUEUE:          'TEMP_AI_QUEUE',
    PURCHASE_ORDERS:   'PURCHASE_ORDERS'
  },

  // ── Script Properties ที่จำเป็น (ต้องตั้งค่าก่อน Deploy) ──
  REQUIRED_PROPERTIES: [
    'DB_SS_ID',
    'ROOT_FOLDER_ID'
  ],

  // ── Script Properties ที่ควรตั้งค่า (ไม่บังคับแต่แนะนำ) ──
  OPTIONAL_PROPERTIES: [
    'WEB_APP_URL',
    'GEMINI_API_KEY',
    'LINE_CHANNEL_ACCESS_TOKEN',
    'LINE_GROUP_TECHNICIAN',
    'LINE_GROUP_ACCOUNTING',
    'LINE_GROUP_PROCUREMENT',
    'LINE_GROUP_SALES',
    'LINE_GROUP_EXECUTIVE',
    'LINE_OA_TOKEN',
    'FOLDER_JOBS_PHOTOS',
    'FOLDER_BILLING_RECEIPTS',
    'FOLDER_SLIPS',
    'FOLDER_AI_QUEUE',
    'FOLDER_PO',
    'ALLOW_RESET'
  ],

  // ── ค่า Default ──
  DEFAULTS: {
    ROOT_FOLDER_ID:   '',
    SPREADSHEET_ID:   '',
    WEB_APP_URL:      'https://script.google.com/macros/s/AKfycbxbIBi05t_3e2dpLbOyHkQs9Ddzky_mFUYAs7y9jBJBcPc_s_ZnMuJp5i-IlzDfqdVgyg/exec',
    PRIORITY_LEVELS:  ['ด่วนมาก', 'ด่วน', 'ปกติ'],
    SLA_HOURS:        { 'ด่วนมาก': 4, 'ด่วน': 24, 'ปกติ': 72 },
    VAT_RATE:         0.07,
    WHT_RATE:         0.03,
    TAX_MODE:         'VAT7',
    LOW_STOCK_ALERT:  5,
    BRANCH_ID:        'HQ',
    COMPANY_NAME:     'Comphone SuperApp AI',
    COMPANY_TAX_ID:   '',
    COMPANY_ADDRESS:  '',
    COMPANY_PHONE:    ''
  }
};

function getScriptProperties_() {
  return PropertiesService.getScriptProperties();
}

function getConfig(key, fallbackValue) {
  try {
    var value = getScriptProperties_().getProperty(String(key || '').trim());
    if (value === null || value === undefined || value === '') {
      return arguments.length > 1 ? fallbackValue : null;
    }
    return value;
  } catch (error) {
    return arguments.length > 1 ? fallbackValue : null;
  }
}

function getRequiredConfig(key) {
  var value = getConfig(key, '');
  if (!value) {
    throw new Error('Missing required Script Property: ' + key);
  }
  return value;
}

function setConfig(key, value) {
  try {
    getScriptProperties_().setProperty(String(key || '').trim(), value === null || value === undefined ? '' : String(value));
    return { success: true, key: key };
  } catch (error) {
    return { success: false, key: key, error: error.toString() };
  }
}

function setConfigs(configMap) {
  configMap = configMap || {};
  var payload = {};
  Object.keys(configMap).forEach(function (key) {
    payload[String(key)] = configMap[key] === null || configMap[key] === undefined ? '' : String(configMap[key]);
  });
  getScriptProperties_().setProperties(payload, false);
  return { success: true, count: Object.keys(payload).length };
}

function getComphoneConfig() {
  return {
    app_name: CONFIG.APP_NAME,
    timezone: CONFIG.TIMEZONE,
    spreadsheet_id: getConfig('DB_SS_ID', CONFIG.DEFAULTS.SPREADSHEET_ID),
    root_folder_id: getConfig('ROOT_FOLDER_ID', CONFIG.DEFAULTS.ROOT_FOLDER_ID),
    web_app_url: getConfig('WEB_APP_URL', CONFIG.DEFAULTS.WEB_APP_URL),
    sheets: CONFIG.SHEETS,
    missing_required: CONFIG.REQUIRED_PROPERTIES.filter(function (key) {
      return !getConfig(key, '');
    })
  };
}

function validateRequiredConfigs() {
  var missing = CONFIG.REQUIRED_PROPERTIES.filter(function (key) {
    return !getConfig(key, '');
  });
  return {
    success: missing.length === 0,
    missing: missing,
    config: getComphoneConfig()
  };
}

function getSpreadsheetId_() {
  return getConfig('DB_SS_ID', CONFIG.DEFAULTS.SPREADSHEET_ID);
}

function getRootFolderId_() {
  return getConfig('ROOT_FOLDER_ID', CONFIG.DEFAULTS.ROOT_FOLDER_ID);
}

function getWebAppBaseUrl_() {
  return getConfig('WEB_APP_URL', CONFIG.DEFAULTS.WEB_APP_URL);
}

function buildWebAppUrl_(baseUrl, params) {
  baseUrl = String(baseUrl || '').trim();
  if (!baseUrl) return '';
  params = params || {};
  var query = [];
  Object.keys(params).forEach(function (key) {
    var value = params[key];
    if (value === null || value === undefined || value === '') return;
    query.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value)));
  });
  if (!query.length) return baseUrl;
  return baseUrl + (baseUrl.indexOf('?') > -1 ? '&' : '?') + query.join('&');
}

// ── Hardcoded Fallbacks — ใช้เมื่อ Script Properties ยังไม่ได้ตั้งค่า ──
var _FALLBACK_SS_ID      = '19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA';
var _FALLBACK_FOLDER_ID  = '1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0';

var DB_SS_ID       = getSpreadsheetId_()  || _FALLBACK_SS_ID;
var ROOT_FOLDER_ID = getRootFolderId_()   || _FALLBACK_FOLDER_ID;
var WEB_APP_URL    = getWebAppBaseUrl_()  || '';

// ── LINE Group IDs (Hardcoded Fallbacks) ──
var LINE_GROUP_TECHNICIAN  = getConfig('LINE_GROUP_TECHNICIAN',  'C8ad22a115f38c9ad3cb5ea5c2ff4863b');
var LINE_GROUP_ACCOUNTING  = getConfig('LINE_GROUP_ACCOUNTING',  'C7b939d1d367e6b854690e58b392e88cc');
var LINE_GROUP_PROCUREMENT = getConfig('LINE_GROUP_PROCUREMENT', 'Cfd103d59e7b6b7e6e4a8d7c9f1e2b3a4');
var LINE_GROUP_SALES       = getConfig('LINE_GROUP_SALES',       '');
var LINE_GROUP_EXECUTIVE   = getConfig('LINE_GROUP_EXECUTIVE',   '');

// ── ฟังก์ชัน Helper เพิ่มเติม ──
function getSheetName(key) {
  return (CONFIG.SHEETS[key] || key);
}

function getSlaHours(priority) {
  return (CONFIG.DEFAULTS.SLA_HOURS[priority] || CONFIG.DEFAULTS.SLA_HOURS['ปกติ'] || 72);
}

function getVatRate() {
  return parseFloat(getConfig('VAT_RATE', CONFIG.DEFAULTS.VAT_RATE));
}

function getWhtRate() {
  return parseFloat(getConfig('WHT_RATE', CONFIG.DEFAULTS.WHT_RATE));
}

function getLowStockThreshold() {
  return parseInt(getConfig('LOW_STOCK_ALERT', CONFIG.DEFAULTS.LOW_STOCK_ALERT), 10);
}

// ── setScriptPropertiesFromPayload() — ตั้งค่า Script Properties ผ่าน API ──
function setScriptPropertiesFromPayload(payload) {
  payload = payload || {};
  var props = PropertiesService.getScriptProperties();
  var allowed = [
    'DB_SS_ID', 'ROOT_FOLDER_ID', 'WEB_APP_URL', 'GEMINI_API_KEY',
    'LINE_CHANNEL_ACCESS_TOKEN', 'LINE_GROUP_TECHNICIAN', 'LINE_GROUP_ACCOUNTING',
    'LINE_GROUP_PROCUREMENT', 'LINE_GROUP_SALES', 'LINE_GROUP_EXECUTIVE',
    'LINE_OA_TOKEN', 'VAT_RATE', 'WHT_RATE', 'LOW_STOCK_ALERT',
    'FOLDER_JOBS_PHOTOS', 'FOLDER_BILLING_RECEIPTS', 'FOLDER_SLIPS', 'FOLDER_AI_QUEUE', 'FOLDER_PO',
    'TAX_MODE', 'BRANCH_ID', 'COMPANY_NAME', 'COMPANY_TAX_ID', 'COMPANY_ADDRESS', 'COMPANY_PHONE',
    'OWNER_NAME', 'PROMPTPAY_BILLER_ID', 'SLIP_VERIFY_API_URL', 'DEFAULT_ADMIN_PASSWORD',
    'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT', 'BILLING_RECEIPT_FOLDER_ID',
    'LINE_CHANNEL_SECRET', 'HEALTH_ALERT_THRESHOLD'
  ];
  var properties = payload.properties || payload;
  // ลบ action key ออก
  delete properties['action'];
  var set = [];
  var skipped = [];
  for (var key in properties) {
    if (allowed.indexOf(key) > -1) {
      var value = String(properties[key] || '');
      if (value) {
        props.setProperty(key, value);
        set.push(key);
      } else {
        skipped.push(key + ' (ค่าว่าง)');
      }
    } else {
      skipped.push(key + ' (ไม่อนุญาต)');
    }
  }
  return {
    success: true,
    set: set,
    skipped: skipped,
    message: 'ตั้งค่า ' + set.length + ' รายการ, ข้าม ' + skipped.length + ' รายการ'
  };
}
