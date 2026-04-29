// COMPHONE SUPER APP v5.9.0-phase2d
// ============================================================
// Router.gs - Main Router and API Dispatcher
// ============================================================
// ARCHITECTURE:
//   GAS = API ONLY (JSON responses via ContentService)
//   UI  = PWA ONLY → https://comphone.github.io/comphone-superapp/pwa/
//   HtmlService ถูกลบออกทั้งหมด (V5.5.8 API-Only)
// ============================================================

/**
 * doGet — API-Only JSON endpoint
 * ไม่มี HtmlService อีกต่อไป
 * ทุก GET request → JSON response
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    var action = normalizeActionV55_(params.action || '');
    var jobId  = params.jobId || params.job_id || '';

    // Health Check — GET ?action=health
    if (action === 'health' || action === 'ping' || action === 'healthcheck') {
      return jsonOutputV55_(healthCheckV55_());
    }

    // Version — GET ?action=getVersion
    if (action === 'getversion' || action === 'version') {
      return jsonOutputV55_(getVersionV55_());
    }

    // Dashboard Data — GET ?action=getDashboardData
    if (action === 'json' || action === 'getDashboardData' || action === 'getdashboarddata') {
      return jsonOutputV55_(getDashboardData());
    }

    // Job State Config — GET ?action=getJobStateConfig
    if (action === 'getjobstateconfig') {
      return jsonOutputV55_(getJobStateConfig());
    }

    // Job QR Data — GET ?action=getJobQRData&jobId=...
    if (action === 'getjobqrdata' || action === 'jobqrdata') {
      return jsonOutputV55_(getJobWebAppPayload(jobId));
    }

    // Photo Gallery Data — GET ?action=getPhotoGalleryData&jobId=...
    if (action === 'getphotogallerydata' || action === 'photogallerydata') {
      return jsonOutputV55_(getPhotoGalleryData(jobId));
    }

    // Security Log — GET ?action=getSecurityLog (admin monitoring)
    if (action === 'getsecuritylog' || action === 'securitylog') {
      var _log = (typeof getSecurityLog === 'function') ? getSecurityLog() : [];
      return jsonOutputV55_({ success: true, data: _log, count: _log.length });
    }
    // System Metrics — GET ?action=getSystemMetrics (admin monitoring)
    if (action === 'getsystemmetrics' || action === 'systemmetrics') {
      return jsonOutputV55_((typeof getSystemMetrics === 'function') ? getSystemMetrics() : { success: false, error: 'not available' });
    }
    // Properties Audit — GET ?action=auditProperties
    if (action === 'auditproperties') {
      return jsonOutputV55_(auditProperties());
    }
    // REMOVED: cleanupProperties, deepCleanup, deepCleanup2
    // These destructive operations now require auth via POST path
    // Falls through to routeActionV55 → _checkAuthGateV55_ (PHMP v1 Phase 2B-0)
    // Executive Dashboard — GET ?action=getExecutiveDashboard
    if (action === 'getexecutivedashboard') {
      return jsonOutputV55_((typeof getExecutiveDashboard === 'function') ? getExecutiveDashboard(payload || {}) : { success: false, error: 'getExecutiveDashboard not available' });
    }
    // System Logs — GET ?action=getSystemLogs&limit=50
    if (action === 'getsystemlogs') {
      return jsonOutputV55_((typeof getSystemLogs === 'function') ? getSystemLogs(params) : { success: false, error: 'getSystemLogs not available' });
    }
    // REMOVED: logSystemError — write operation, requires auth via POST path (PHMP v1 Phase 2B-0)
    // Properties Guard Status — GET ?action=guardStatus
    if (action === 'guardstatus') {
      return jsonOutputV55_(propertiesGuardStatus());
    }
    // Properties Capacity — GET ?action=getPropertiesCapacity
    if (action === 'getpropertiescapacity') {
      return jsonOutputV55_((typeof getPropertiesCapacity === 'function') ? getPropertiesCapacity() : { success: false, error: 'not available' });
    }
    // Properties Capacity Alert — GET ?action=checkPropertiesCapacityAlert
    if (action === 'checkpropertiescapacityalert') {
      var _capAlert = (typeof checkPropertiesCapacityAlert === 'function') ? checkPropertiesCapacityAlert() : null;
      return jsonOutputV55_(_capAlert || { alert: false, status: 'OK' });
    }
    // REMOVED: initAgentProps, setupGuardTrigger
    // These write operations now require auth via POST path (PHMP v1 Phase 2B-0)
    // ---- POS Web App Deployment (Phase 30) ----
    // Serve POS UI from GAS domain to fix Session issue
    if (params.page === 'pos' || action === 'pos') {
      return servePosUI();
    }
    
    // Default: Route ALL unknown actions through routeActionV55 (PHASE 26.6)
    // This enables login, verifySession, and all other actions via GET
    // Previously this returned a static "API READY" response, blocking login on static hosting
    if (action) {
      return jsonOutputV55_(routeActionV55(action, params, e));
    }
    return jsonOutputV55_({
      status:       'ok',
      version:      CONFIG.VERSION,
      message:      'COMPHONE API READY',
      architecture: 'API-Only (V' + CONFIG.VERSION + ')',
      ui_url:       'https://comphone.github.io/comphone-superapp/pwa/',
      note:         'UI อยู่ที่ PWA เท่านั้น — GAS เป็น API Backend เท่านั้น'
    });
  } catch (error) {
    // Phase 2D: Auto-capture ALL GET errors to DB_ERRORS
    try {
      if (typeof _logError_ === 'function') {
        var _getAction = (e && e.parameter && e.parameter.action) || 'unknown';
        _logError_('HIGH', 'doGet:' + _getAction, error, { source: 'doGet' });
      }
    } catch (_logErr3) { /* never break doGet */ }
    return jsonOutputV55_({
      status:  'error',
      error:   error.toString(),
      version: CONFIG.VERSION
    });
  }
}

function doPost(e) {
  try {
    // ── Rate Limiting + Security Log (Production Hardening V5.5.8) ──
    try {
      var _p0     = parsePostPayloadV55_(e);
      var _token0 = (_p0 && (_p0.token || _p0.auth_token)) || 'anon';
      var _act0   = (_p0 && (_p0.action || _p0.route)) || 'unknown';
      if (typeof rateLimit_ === 'function') {
        var _rl = rateLimit_(_token0, _act0);
        if (!_rl.allowed) {
          return jsonOutputV55_({
            success:  false,
            error:    'Rate limit exceeded. Retry in ' + _rl.reset_in + 's.',
            code:     429,
            reason:   _rl.reason,
            reset_in: _rl.reset_in
          });
        }
      } else {
        // Fallback: simple counter
        var _cache0 = CacheService.getScriptCache();
        var _ck0    = 'rl_' + _token0.substring(0, 20);
        var _cnt0   = parseInt(_cache0.get(_ck0) || '0', 10);
        if (_cnt0 >= 60) {
          return jsonOutputV55_({ success: false, error: 'Rate limit exceeded.', code: 429 });
        }
        _cache0.put(_ck0, String(_cnt0 + 1), 60);
      }
    } catch (rlErr) { /* rate limit ไม่ critical — fail open */ }

    var payload = parsePostPayloadV55_(e);
    // ── ตรวจจับ LINE Webhook (มี destination + events array) ──
    if (payload.destination && Array.isArray(payload.events)) {
      // ตรวจสอบ HMAC-SHA256 signature ก่อนประมวลผล
      if (typeof verifyLineSignature_ === 'function' && !verifyLineSignature_(e)) {
        return jsonOutputV55_({ success: false, error: 'Invalid LINE signature' });
      }
      return jsonOutputV55_(handleLineWebhook(e));
    }
    var action = payload.action || payload.route || payload.fn || payload.method || 'help';
    return jsonOutputV55_(routeActionV55(action, payload, e));
  } catch (error) {
    // Phase 2D: Auto-capture ALL POST errors to DB_ERRORS
    try {
      if (typeof _logError_ === 'function') {
        var _sev2 = (typeof _classifyError_ === 'function') ? _classifyError_(action, error) : 'HIGH';
        _logError_(_sev2, 'doPost:' + action, error, { source: 'doPost' });
      }
    } catch (_logErr2) { /* never break doPost */ }
    return jsonOutputV55_({ success: false, error: error.toString() });
  }
}

function routeActionV55(action, payload, e) {
  var normalizedAction = normalizeActionV55_(action || '');
  var args = Array.isArray(payload) ? payload : [payload || {}];
  return dispatchActionV55_(normalizedAction, payload || {}, args, e);
}

function _apiErrorKindV55_(error, code) {
  var raw = String(error || code || '').toUpperCase();
  if (code === 401 || /AUTH|TOKEN|SESSION|LOGIN|401/.test(raw)) return 'auth';
  if (code === 403 || /PERMISSION|FORBIDDEN|DENIED|ROLE|ADMIN ACCESS|403/.test(raw)) return 'permission';
  if (/NOT_FOUND|UNKNOWN ACTION|NO_HANDLER|FUNCTION NOT FOUND|ACTION/.test(raw)) return 'contract';
  if (/TIMEOUT|ABORT/.test(raw)) return 'timeout';
  return 'backend';
}

function _normalizeApiResponseV55_(result, action, requestId) {
  if (result === null || result === undefined) {
    return {
      success: false,
      error: 'No response from action handler',
      code: 'NO_RESPONSE',
      kind: 'contract',
      action: action,
      request_id: requestId || ''
    };
  }
  if (typeof result !== 'object') {
    return {
      success: true,
      data: result,
      meta: { action: action, request_id: requestId || '' }
    };
  }
  if (result.success === undefined && result.valid === true) result.success = true;
  if (result.success === undefined && !result.error) result.success = true;
  if (result.success === false) {
    result.code = result.code || 'BACKEND_ERROR';
    result.kind = result.kind || _apiErrorKindV55_(result.error || result.message, result.code);
    result.action = result.action || action;
    result.request_id = result.request_id || requestId || '';
  } else {
    result.meta = result.meta || {};
    result.meta.action = result.meta.action || action;
    result.meta.request_id = result.meta.request_id || requestId || '';
  }
  return result;
}

/**
 * _checkAuthGateV55_ — Centralized Auth Gate (PHMP v1 — 2026-04-24)
 *
 * Called BEFORE every action dispatch. Returns:
 *   null → action is allowed, proceed to handler
 *   {success:false, error:...} → blocked, return this response
 *
 * Rules:
 *   1. PUBLIC_ACTIONS — no auth required (read-only, login, system info)
 *   2. ADMIN_ACTIONS — require valid session + role=admin|owner
 *   3. All other actions — require valid session (any role)
 */
function _checkAuthGateV55_(action, payload, e) {
  // ── Public actions: no auth required ──
  var PUBLIC_ACTIONS = {
    // Auth entry points
    'help': 1, 'loginuser': 1, 'loginUser': 1, 'verifysession': 1, 'verifySession': 1,
    // Public diagnostics
    'health': 1, 'getversion': 1, 'getVersion': 1, 'version': 1,
    // Error logging: frontend may not have a token while reporting boot failures.
    'logsystemerror': 1, 'logSystemError': 1,
    // Client telemetry is best-effort and must not block login recovery.
    'logtelemetry': 1, 'logTelemetry': 1,
    // Customer Portal public endpoint by design.
    'getjobstatuspublic': 1, 'getJobStatusPublic': 1
  };

  // ── Admin-only actions: require role=admin|owner ──
  var ADMIN_ACTIONS = {
    'listUsers': 1, 'createUser': 1, 'updateUserRole': 1, 'setUserActive': 1,
     
    'setScriptProperties': 1, 'setupAllTriggers': 1, 'setupTriggers': 1,
    'setupUserSheet': 1, 'setupNotificationTriggers': 1,
    'forcePasswordChange': 1, 'lockAccount': 1, 'unlockAccount': 1,
    'getAuditLog': 1, 'pruneAuditLog': 1, 'getSecurityLog': 1, 'getSystemLogs': 1,
    'seedAllData': 1, 'storeSessionContent': 1,
    'controlAction': 1, 'storeSnapshot': 1,
    'setupLearningTriggers': 1, 'setupLineBotV2': 1, 'testLineBotV2': 1,
    'sendPushToAll': 1, 'sendDailyDigest': 1, 'setupDailyDigestTrigger': 1,
    'cronMorningAlert': 1, 
    'sendDashboardSummary': 1, 'sendLineMessage': 1, 'sendLineAlert': 1,
    'nudgeSalesTeam': 1, 'nudgeTech': 1,
    'mapLineUser': 1
  };

  // Skip if public
  if (PUBLIC_ACTIONS[action]) return null;

  // Extract token — รองรับทั้ง query parameter (GET) และ POST body
  // Note: GAS redirect POST → GET ทำให้ body หาย ต้องใช้ query parameter เท่านั้น
  var token = '';
  
  // Method 1: จาก payload (ซึ่งคือ e.parameter สำหรับ GET)
  if (payload) {
    token = payload.token || payload.auth_token || payload.access_token || '';
  }
  
  // Method 2: จาก e.parameter โดยตรง (fallback)
  if (!token && e && e.parameter) {
    token = e.parameter.token || e.parameter.auth_token || e.parameter.access_token || '';
  }
  
  // Method 3: จาก e.queryString (สำหรับกรณีพิเศษ)
  if (!token && e && e.queryString) {
    var match = (e.queryString || '').match(/(?:^|&)token=([^&]+)/);
    if (match) token = decodeURIComponent(match[1]);
    if (!token) {
      match = (e.queryString || '').match(/(?:^|&)auth_token=([^&]+)/);
      if (match) token = decodeURIComponent(match[1]);
    }
  }
  
  if (!token) {
    return { success: false, error: 'Authentication required', code: 401, kind: 'auth', action: action };
  }

  // Verify session
  var auth = null;
  try {
    auth = verifySession(token);
  } catch (e) {
    return { success: false, error: 'Session verification failed', code: 401, kind: 'auth', action: action };
  }
  if (!auth || !(auth.success || auth.valid)) {
    return { success: false, error: 'Invalid or expired session', code: 401, kind: 'auth', action: action };
  }
  var session = auth.session || auth;
  var role = String(session.role || auth.role || '').toLowerCase();

  // Admin check
  if (ADMIN_ACTIONS[action]) {
    if (role !== 'admin' && role !== 'owner') {
      return { success: false, error: 'Admin access required', code: 403, kind: 'permission', action: action };
    }
  }

  // Auth passed — attach session info to payload for downstream use
  if (payload) {
    payload._session = session;
    payload._auth_user = session.username || auth.username || '';
    payload._auth_role = session.role || auth.role || '';
  }

  return null; // null = allowed, proceed
}

function dispatchActionV55_(action, payload, args, e) {
  payload = payload || {};
  args = Array.isArray(args) ? args : [payload];

  // Phase2D: Generate request_id for cross-request correlation
  var _reqId = 'R' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMddHHmmss') + '_' + Utilities.getUuid().substring(0, 8);
  payload._reqId = _reqId;

  // ═════════════════════════════════════════════════════════
  // SECURITY GATE: _checkAuthGateV55_ (PHMP v1 — 2026-04-24)
  // All actions require valid session EXCEPT public whitelist.
  // Admin-only actions require role=admin|owner.
  // ═════════════════════════════════════════════════════════
  var _authResult = _checkAuthGateV55_(action, payload, e);
  if (_authResult !== null) return _authResult;

  // Phase 5: RouterSplit fast path — O(1) lookup vs O(n) switch
  try {
    if (typeof routeByModule === 'function' && action !== 'help') {
      var _fast = routeByModule(action, payload);
      if (_fast !== null) return _normalizeApiResponseV55_(_fast, action, _reqId);
    }
  } catch(_re) { /* fall through to switch */ }
  try {
    switch (action) {
      case 'help':
        return _normalizeApiResponseV55_({
          success: true,
          app: 'COMPHONE SUPER APP V5.5+',
          version: CONFIG.VERSION,
          status: 'healthy',
          note: 'Full action list: call getModuleRouterStats() or visit /exec?action=help',
          total_routes: (typeof MODULE_ROUTER !== 'undefined') ? Object.keys(MODULE_ROUTER).length : 'unknown'
        }, action, _reqId);

      default:
        return _normalizeApiResponseV55_(invokeFunctionByNameV55_(action, args), action, _reqId);
    }
  } catch (error) {
    // Phase 2D: Auto-capture ALL action errors to DB_ERRORS
    try {
      if (typeof _logError_ === 'function') {
        var _sev = (typeof _classifyError_ === 'function') ? _classifyError_(action, error) : 'MEDIUM';
        _logError_(_sev, action, error, {
          source: 'dispatch',
          requestId: (payload && payload._reqId) || '',
          user: (payload && (payload.user || payload.token || '')).toString().substring(0, 50)
        });
      }
    } catch (_logErr) { /* never break dispatch */ }
    return { success: false, action: action, error: error.toString(), code: 'GAS_ERROR', kind: 'backend', request_id: _reqId };
  }
}

function normalizeActionV55_(action) {
  action = String(action || '').trim();
  var map = {
    'เปิดงาน': 'openJob',
    'create_job': 'createJob',
    'openjob': 'openJob',
    'open_job': 'openJob',
    'createjob': 'createJob',
    'เช็คงาน': 'checkJobs',
    'checkjobs': 'checkJobs',
    'check_jobs': 'checkJobs',
    'เช็คสต็อก': 'checkStock',
    'checkstock': 'checkStock',
    'check_stock': 'checkStock',
    'ปิดงาน': 'completeJob',
    'closejob': 'completeJob',
    'close_job': 'completeJob',
    'อัพเดทสถานะ': 'updateJobStatus',
    'updatestatus': 'updateJobStatus',
    'update_status': 'updateJobStatus',
    'transition_job': 'transitionJob',
    'เปลี่ยนสถานะงาน': 'transitionJob',
    'jobStateConfig': 'getJobStateConfig',
    'jobqrdata': 'getJobQRData',
    'getPhotoGallery': 'getPhotoGalleryData',
    'photoGallery': 'getPhotoGalleryData',
    'ดูรูปงาน': 'getPhotoGalleryData',
    'บาร์โค้ด': 'barcodeLookup',
    'summary': 'sendDashboardSummary'
  };
  return map[action] || action;
}

function invokeFunctionByNameV55_(functionName, args) {
  functionName = String(functionName || '').trim();
  if (!functionName) return { success: false, error: 'Function name is required' };
  // ── SECURITY: Block private/underscore functions ──
  if (functionName.charAt(0) === '_') {
    return { success: false, error: 'Access denied: private function', action: functionName, code: 403 };
  }
  var globalScope = typeof globalThis !== 'undefined' ? globalThis : this;
  var fn = globalScope[functionName];
  if (typeof fn !== 'function') {
    return { success: false, error: 'Function not found: ' + functionName, action: functionName };
  }
  return fn.apply(globalScope, Array.isArray(args) ? args : []);
}

function parsePostPayloadV55_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents || '{}');
  } catch (error) {
    throw new Error('Invalid JSON payload');
  }
}

/**
 * JSON output พร้อม security headers
 * GAS ContentService ไม่รองรับ setHeader — ใช้ metadata ใน response body แทน
 * @param {*} data
 * @return {TextOutput}
 */
function jsonOutputV55_(data) {
  // GAS ไม่รองรับ custom HTTP headers — เพิ่ม _headers metadata ใน response
  // เพื่อให้ Cloudflare Worker หรือ proxy สามารถอ่านและเพิ่ม headers ได้
  if (data && typeof data === 'object') {
    if (!data._headers) {
      data._headers = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      };
    }
    // เพิ่ม meta.version ในทุก response — Frontend ใช้ตรวจสอบ version mismatch
    if (!data.meta) {
      data.meta = {
        version: CONFIG.VERSION,
        ts: Date.now()
      };
    }
  }
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function sanitizeHtmlTextV55_(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// 🏥 Health Check — GET ?action=health
// ============================================================
/**
 * ตรวจสอบสุขภาพระบบแบบ lightweight
 * เรียกได้โดยไม่ต้อง auth (public endpoint)
 * @return {Object} { status, version, timestamp, checks }
 */
function healthCheckV55_() {
  var start = Date.now();
  var checks = {};
  var overallOk = true;

  // 1. Spreadsheet connectivity
  try {
    var ss = getComphoneSheet();
    checks.spreadsheet = { ok: true, id: ss.getId() };
  } catch (e) {
    checks.spreadsheet = { ok: false, error: e.message };
    overallOk = false;
  }

  // 2. Script Properties (required keys)
  try {
    var props = PropertiesService.getScriptProperties().getProperties();
    var requiredKeys = ['DB_SS_ID'];
    var missingKeys  = requiredKeys.filter(function(k) { return !props[k]; });
    checks.config = {
      ok:       missingKeys.length === 0,
      missing:  missingKeys,
      line_ok:  !!props['LINE_CHANNEL_ACCESS_TOKEN'],
      gemini_ok: !!props['GEMINI_API_KEY']
    };
    if (missingKeys.length > 0) overallOk = false;
  } catch (e) {
    checks.config = { ok: false, error: e.message };
    overallOk = false;
  }

  // 3. Triggers
  try {
    var triggers = ScriptApp.getProjectTriggers();
    checks.triggers = {
      ok:    triggers.length > 0,
      count: triggers.length,
      fns:   triggers.map(function(t) { return t.getHandlerFunction(); })
    };
  } catch (e) {
    checks.triggers = { ok: false, error: e.message };
  }

  // 4. DB_USERS (login ได้ไหม)
  try {
    var userSheet = findSheetByName(getComphoneSheet(), 'DB_USERS');
    var userCount = userSheet ? Math.max(0, userSheet.getLastRow() - 1) : 0;
    checks.users = { ok: userCount > 0, count: userCount };
    if (userCount === 0) overallOk = false;
  } catch (e) {
    checks.users = { ok: false, error: e.message };
    overallOk = false;
  }

  var elapsed = Date.now() - start;

  return {
    status:    overallOk ? 'healthy' : 'degraded',
    version:   CONFIG.VERSION,
    timestamp: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'),
    elapsed_ms: elapsed,
    checks:    checks
  };
}

// ============================================================
// 📌 getVersion — GET ?action=getVersion
// ============================================================
function getVersionV55_() {
  return {
    success: true,
    version: CONFIG.VERSION,
    build:   CONFIG.BUILD   || '2026-04-19',
    app:     CONFIG.APP_NAME || 'COMPHONE SUPER APP AI',
    timestamp: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss')
  };
}

/**
 * getSystemVersion — Public API for frontend version check
 * Returns version info for mismatch detection
 */
function getSystemVersion() {
  var now = new Date();
  // Single Source: all values from Config.gs (v6.2.1)
  return {
    success:   true,
    status:    'healthy',
    version:   CONFIG.VERSION,
    build:     CONFIG.BUILD    || '2026-04-20',
    app:       CONFIG.APP_NAME || 'COMPHONE SUPER APP AI',
    updated:   now.toISOString(),
    timestamp: Utilities.formatDate(now, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'),
    deploy_id: 'GAS-@475',
    commit:    '4762f10',
    env:       'production',
    manifest:  'docs/SYSTEM_MANIFEST.json'
  };
}

// ============================================================
// System Logs — Centralized Error Logging
// ============================================================

/**
 * logSystemError — Log errors to System_Logs sheet
 * No auth required (frontend may not have token when error occurs)
 * @param {Object} data - { level, source, message, stack, userAgent, url, userId }
 * @return {Object} { success }
 */
function logSystemError(data) {
  try {
    var ssId = PropertiesService.getScriptProperties().getProperty('DB_SS_ID');
    if (!ssId) return { success: false, error: 'DB_SS_ID not set' };
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName('System_Logs');
    if (!sheet) {
      sheet = ss.insertSheet('System_Logs');
      sheet.appendRow(['timestamp', 'level', 'source', 'message', 'stack', 'user_agent', 'url', 'user_id']);
    }
    sheet.appendRow([
      new Date().toISOString(),
      data.level || 'ERROR',
      data.source || 'unknown',
      data.message || '',
      data.stack || '',
      data.userAgent || '',
      data.url || '',
      data.userId || ''
    ]);
    // Keep only last 500 rows
    if (sheet.getLastRow() > 501) {
      sheet.deleteRows(2, sheet.getLastRow() - 501);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getSystemLogs — Read logs from System_Logs sheet (Admin only)
 * @param {Object} params - { limit, level, token }
 * @return {Object} { success, data, count }
 */
function getSystemLogs(params) {
  try {
    var ssId = PropertiesService.getScriptProperties().getProperty('DB_SS_ID');
    if (!ssId) return { success: false, error: 'DB_SS_ID not set' };
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName('System_Logs');
    if (!sheet) return { success: true, data: [], count: 0 };
    var limit = parseInt(params.limit) || 50;
    var level = params.level || null;
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true, data: [], count: 0 };
    var startRow = Math.max(2, lastRow - limit + 1);
    var rows = sheet.getRange(startRow, 1, lastRow - startRow + 1, 8).getValues();
    var data = rows.map(function(r) {
      return { timestamp: r[0], level: r[1], source: r[2], message: r[3], stack: r[4], userAgent: r[5], url: r[6], userId: r[7] };
    }).reverse(); // newest first
    if (level) data = data.filter(function(d) { return d.level === level; });
    return { success: true, data: data, count: data.length };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// logTelemetry — Client-side telemetry ingestion
// ============================================================
/**
 * logTelemetry — Receive batched client telemetry data
 * Writes to DB_TELEMETRY sheet (auto-created on first use)
 * Schema: timestamp | session_start | duration | ua | page_views | api_latency | quick_actions | offline_stats | raw
 *
 * @param {Object} payload - { payload: JSON-stringified telemetry batch }
 * @return {Object} { success }
 */
function logTelemetry(p) {
  try {
    var data = {};
    try {
      data = typeof p.payload === 'string' ? JSON.parse(p.payload) : (p.payload || {});
    } catch (e) { data = { raw: String(p.payload || '').substring(0, 2000) }; }

    var ssId = PropertiesService.getScriptProperties().getProperty('DB_SS_ID');
    if (!ssId) return { success: false, error: 'DB_SS_ID not set' };
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName('DB_TELEMETRY');
    if (!sheet) {
      sheet = ss.insertSheet('DB_TELEMETRY');
      sheet.appendRow(['timestamp', 'session_start', 'duration_ms', 'user_agent', 'page_views', 'api_latency', 'quick_actions', 'offline_stats', 'raw_events']);
      sheet.setFrozenRows(1);
    }

    var now = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([
      now,
      data.sessionStart || '',
      data.duration || '',
      (data.ua || '').substring(0, 200),
      JSON.stringify(data.pageViews || {}),
      JSON.stringify(data.latency || {}),
      JSON.stringify(data.quickActions || {}),
      JSON.stringify(data.offline || {}),
      JSON.stringify(data.events || []).substring(0, 5000)
    ]);

    // Auto-prune: keep last 2000 rows
    if (sheet.getLastRow() > 2001) {
      sheet.deleteRows(2, sheet.getLastRow() - 2001);
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
