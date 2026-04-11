// COMPHONE SUPER APP V5.5
// ============================================================
// Config.gs - Script Properties Based Configuration
// ============================================================

var CONFIG = {
  APP_NAME: 'COMPHONE SUPER APP V5.5',
  TIMEZONE: 'Asia/Bangkok',
  SHEETS: {
    JOBS: 'DBJOBS',
    INVENTORY: 'DB_INVENTORY',
    CUSTOMERS: 'DB_CUSTOMERS',
    STOCK_MOVEMENTS: 'DB_STOCK_MOVEMENTS',
    JOB_ITEMS: 'DB_JOB_ITEMS',
    BILLING: 'DB_BILLING',
    JOB_LOGS: 'DB_JOB_LOGS',
    PHOTO_QUEUE: 'DB_PHOTO_QUEUE'
  },
  DEFAULTS: {
    ROOT_FOLDER_ID: '',
    SPREADSHEET_ID: '',
    WEB_APP_URL: '',
    LINE_GROUP_TECHNICIAN: '',
    LINE_GROUP_SALES: '',
    LINE_GROUP_ADMIN: ''
  },
  REQUIRED_PROPERTIES: [
    'DB_SS_ID',
    'ROOT_FOLDER_ID'
  ],
  OPTIONAL_PROPERTIES: [
    'WEB_APP_URL',
    'LINE_CHANNEL_ACCESS_TOKEN',
    'LINE_GROUP_ID',
    'LINE_GROUP_TECHNICIAN',
    'LINE_GROUP_SALES',
    'LINE_GROUP_ADMIN',
    'LINE_NOTIFY_ENABLED',
    'TELEGRAM_BOT_TOKEN',
    'GOOGLE_AI_API_KEY',
    'GEMINI_API_KEY'
  ]
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

var DB_SS_ID = getSpreadsheetId_();
var ROOT_FOLDER_ID = getRootFolderId_();
var WEB_APP_URL = getWebAppBaseUrl_();
