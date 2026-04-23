// COMPHONE SUPER APP V5.5
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
    // Properties Cleanup — GET ?action=cleanupProperties
    if (action === 'cleanupproperties') {
      return jsonOutputV55_(cleanupAllProperties());
    }
    // Deep Cleanup — GET ?action=deepCleanup
    if (action === 'deepcleanup') {
      return jsonOutputV55_(deepCleanupProperties());
    }
    // Deep Cleanup Pass 2 — GET ?action=deepCleanup2
    if (action === 'deepcleanup2') {
      return jsonOutputV55_(deepCleanupPass2());
    }
    // Properties Guard Status — GET ?action=guardStatus
    if (action === 'guardstatus') {
      return jsonOutputV55_(propertiesGuardStatus());
    }
    // Init Agent Properties — GET ?action=initAgentProps
    if (action === 'initagentprops') {
      var props = PropertiesService.getScriptProperties();
      var init = {
        "AG_REGISTERED_AGENTS": "[]",
        "AG_ACTIVITY_LOG": "[]",
        "AM_RULES": "[]",
        "AM_PATTERNS": "{}",
        "AM_STATS": '{"totalInteractions":0,"totalPatterns":0,"totalRules":0}',
        "AM_SNAPSHOTS": "[]",
        "AM_INCIDENTS": "[]",
        "AS_AGENT_SCORES": "{}",
        "AS_OUTCOME_HISTORY": "[]",
        "ACO_SHARED_RESULTS": "[]",
        "WF_CUSTOM_WORKFLOWS": "{}",
        "WF_RUN_LOG": "[]",
        "WS_CIRCUIT_STATE": '{"failures":0,"state":"closed","lastFailure":0}',
        "WS_SAFETY_LOG": "[]",
        "DG_COOLDOWN_STATE": "{}",
        "DG_DEDUP_FINGERPRINTS": "{}",
        "DG_RATE_COUNTERS": "{}",
        "DG_GUARD_LOG": "[]",
        "MC_ARCHIVE_INCIDENTS": "[]",
        "MC_PRUNE_LOG": "[]",
        "vl_calibration": '{"version":0,"rules":[]}',
        "vl_rules": "[]",
        "INTEL_ALERT_QUEUE": "[]",
        "INTEL_ANALYTICS": "[]"
      };
      var set = 0;
      for (var k in init) {
        if (!props.getProperty(k)) {
          props.setProperty(k, init[k]);
          set++;
        }
      }
      return jsonOutputV55_({ success: true, initialized: set, total: Object.keys(props.getProperties()).length });
    }
    // Setup Properties Guard Trigger — GET ?action=setupGuardTrigger
    if (action === 'setupguardtrigger') {
      return jsonOutputV55_(setupPropertiesGuardTrigger());
    }
    // Default: API Ready response + redirect hint
    return jsonOutputV55_({
      status:       'ok',
      version:      CONFIG.VERSION,
      message:      'COMPHONE API READY',
      architecture: 'API-Only (V' + CONFIG.VERSION + ')',
      ui_url:       'https://comphone.github.io/comphone-superapp/pwa/',
      note:         'UI อยู่ที่ PWA เท่านั้น — GAS เป็น API Backend เท่านั้น'
    });
  } catch (error) {
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
    return jsonOutputV55_(routeActionV55(action, payload));
  } catch (error) {
    return jsonOutputV55_({ success: false, error: error.toString() });
  }
}

function routeActionV55(action, payload) {
  var normalizedAction = normalizeActionV55_(action || '');
  var args = Array.isArray(payload) ? payload : [payload || {}];
  return dispatchActionV55_(normalizedAction, payload || {}, args);
}

function dispatchActionV55_(action, payload, args) {
  payload = payload || {};
  args = Array.isArray(args) ? args : [payload];
  // Phase 5: RouterSplit fast path — O(1) lookup vs O(n) switch
  try {
    if (typeof routeByModule === 'function' && action !== 'help') {
      var _fast = routeByModule(action, payload);
      if (_fast !== null) return _fast;
    }
  } catch(_re) { /* fall through to switch */ }
  try {
    switch (action) {
      case 'help':
        return {
          success: true,
          app: 'COMPHONE SUPER APP V5.5+',
          version: CONFIG.VERSION,
          actions: [
            'getDashboardData', 'getJobStateConfig', 'getJobTimeline', 'transitionJob', 'updateJobById',
            'addQuickNote', 'checkJobs', 'listJobs', 'openJob', 'updateJobStatus', 'getPhotoGalleryData', 'generateJobQR',
            'getJobQRData', 'handleProcessPhotos', 'sendDashboardSummary', 'inventoryOverview',
            'transferStock', 'createCustomer', 'updateCustomer', 'getCustomer', 'listCustomers',
            'loginUser', 'logoutUser', 'verifySession', 'listUsers', 'createUser', 'updateUserRole', 'setUserActive', 'setupUserSheet',
            'clockIn', 'clockOut', 'getAttendanceReport', 'getTechHistory', 'getAllTechsSummary',
            'getAfterSalesDue', 'logAfterSalesFollowUp', 'sendAfterSalesAlerts', 'getAfterSalesSummary',
            'addInventoryItem', 'updateInventoryItem', 'deleteInventoryItem', 'getInventoryItemDetail',
            'getStockMovementHistory', 'createPurchaseOrder', 'listPurchaseOrders', 'receivePurchaseOrder',
            'checkStock', 'barcodeLookup', 'scanWithdrawStock', 'geminiReorderSuggestion',
            'createBilling', 'getBilling', 'generatePromptPayQR', 'updatePayment', 'listBillings',
            'initSystem', 'systemStatus', 'setupAllTriggers', 'cleanupSessions', 'verifyToken', 'getSchemaInfo', 'validateConfig', 'getComphoneConfig', 'setScriptProperties',
            'logSystemError', 'getSystemLogs'
          ]
        };

      case 'getDashboardBundle':
        return getDashboardBundle(payload);
      case 'invalidateBundleCache':
        return invalidateBundleCache();
      case 'getDashboardData':
        return getDashboardData();
      case 'getJobStateConfig':
        return getJobStateConfig();
      case 'getJobTimeline':
        return getJobTimelineV55_(payload.job_id || payload.jobId || (args[0] && args[0].job_id) || '');
      case 'transitionJob':
        if (args.length >= 2) return invokeFunctionByNameV55_('transitionJob', args);
        return transitionJob(payload.job_id || payload.jobId || '', payload.new_status || payload.to_status || payload.status_code || payload.status, payload);
      case 'updateJobById':
        if (args.length >= 2) return invokeFunctionByNameV55_('updateJobById', args);
        return updateJobById(payload.job_id || payload.jobId || '', payload);
      case 'addQuickNote':
        if (args.length >= 3) return invokeFunctionByNameV55_('addQuickNote', args);
        return addQuickNote(payload.job_id || payload.jobId || '', payload.note || '', payload.user || payload.changed_by || 'SYSTEM');
      case 'checkJobs':
      case 'listJobs':
        return checkJobs(payload);
      case 'openJob':
      case 'createJob':
        return openJob(payload);
      case 'updateJobStatus':
        return updateJobStatus(payload);
      case 'getJobQRData':
        return getJobWebAppPayload(payload.job_id || payload.jobId || '');
      case 'generateJobQR':
        return generateJobQR(payload.job_id || payload.jobId || '');
      case 'getPhotoGalleryData':
      case 'photoGalleryData':
        return getPhotoGalleryData(payload.job_id || payload.jobId || '');
      case 'handleProcessPhotos':
        return handleProcessPhotos();
      case 'sendDashboardSummary':
        return sendDashboardSummary();
      case 'inventoryOverview':
        return getInventoryOverview(payload);
      case 'transferStock':
        return transferStock(payload.from_location || payload.from, payload.to_location || payload.to, payload.item_id || payload.item_code || payload.code || payload.itemId, payload.qty, payload);
      case 'addInventoryItem':
        return addInventoryItem(payload);
      case 'updateInventoryItem':
        return updateInventoryItem(payload);
      case 'deleteInventoryItem':
        return deleteInventoryItem(payload);
      case 'getInventoryItemDetail':
        return getInventoryItemDetail(payload);
      case 'getStockMovementHistory':
        return getStockMovementHistory(payload);
      case 'createPurchaseOrder':
        return createPurchaseOrder(payload);
      case 'listPurchaseOrders':
        return listPurchaseOrders(payload);
      case 'receivePurchaseOrder':
        return receivePurchaseOrder(payload);
      case 'cancelPurchaseOrder':
        return cancelPurchaseOrder_(payload);
      case 'checkStock':
        return checkStock(payload);
      case 'barcodeLookup':
        return barcodeLookup(payload);
      case 'scanWithdrawStock':
        return scanWithdrawStock(payload);
      case 'geminiReorderSuggestion':
        return geminiReorderSuggestion();
      case 'createCustomer':
        return createCustomer(payload);
      case 'updateCustomer':
        return updateCustomer(payload);
      case 'getCustomer':
        return getCustomer(payload);
      case 'listCustomers':
        return listCustomers(payload);

      // ============================================================
      // Auth & RBAC
      // ============================================================
      case 'loginUser':
        return loginUser(payload.username || '', payload.password || '');
      case 'logoutUser':
        return logoutUser(payload.token || '');
      case 'verifySession':
        return verifySession(payload.token || '');
      case 'listUsers':
        return listUsers(payload.token || '');
      case 'createUser':
        return createUser(payload.token || '', payload);
      case 'updateUserRole':
        return updateUserRole(payload.token || '', payload.username || '', payload.role || '');
      case 'setUserActive':
        return setUserActive(payload.token || '', payload.username || '', payload.active !== false);
      case 'setupUserSheet':
        return setupUserSheet();
      case 'forceResetAdmin':
        return forceResetAdmin(payload.password || payload.newPassword || '');
      case 'cleanupSessions':
        return cleanupSessions();
      case 'verifyToken':
        return verifyToken(payload.token || '');

      // ============================================================
      // System Setup & Health Check
      // ============================================================
      case 'setScriptProperties':
        return setScriptPropertiesFromPayload(payload);
      case 'initSystem':
        return initSystem();
      case 'systemStatus':
        return systemStatus();
      case 'getSystemMetrics':
        return (typeof getSystemMetrics === 'function') ? getSystemMetrics() : { success: false, error: 'getSystemMetrics not implemented' };
      case 'getHealthMonitor':
        return (typeof getHealthMonitor === 'function') ? getHealthMonitor(payload) : { success: false, error: 'getHealthMonitor not implemented' };
      case 'controlAction':
        return (typeof controlAction === 'function') ? controlAction(payload) : { success: false, error: 'controlAction not available' };
      case 'storeSnapshot':
        return (typeof storeSnapshot === 'function') ? storeSnapshot(payload) : { success: false, error: 'storeSnapshot not available' };
      case 'getSnapshots':
        return (typeof getSnapshots === 'function') ? getSnapshots(payload) : { success: false, error: 'getSnapshots not available' };
      case 'getHealthTrend':
        return (typeof getHealthTrend === 'function') ? getHealthTrend(payload) : { success: false, error: 'getHealthTrend not available' };
      case 'getSecurityLog':
        var _sl = (typeof getSecurityLog === 'function') ? getSecurityLog() : [];
        return { success: true, data: _sl, count: _sl.length };
      case 'logSystemError':
        // No auth required — frontend may not have token when error occurs
        return logSystemError(payload);
      case 'getSystemLogs':
        // Admin only — require valid session
        var _slToken = payload.token || payload.auth_token || '';
        var _slAuth = verifySession(_slToken);
        if (!_slAuth.success) return { success: false, error: 'Authentication required', code: 401 };
        if (_slAuth.role !== 'admin' && _slAuth.role !== 'owner') return { success: false, error: 'Admin access required', code: 403 };
        return getSystemLogs(payload);
      case 'setupTriggers':
      case 'setupAllTriggers':
        return setupAllTriggers();
      case 'getSchemaInfo':
        return getSchemaInfo();
      case 'validateConfig':
        return validateRequiredConfigs();
      case 'getComphoneConfig':
        return getComphoneConfig();

      // ============================================================
      // Attendance & Tech History
      // ============================================================
      case 'clockIn':
        return clockIn(payload.tech || payload.tech_name || '', payload.note || '');
      case 'clockOut':
        return clockOut(payload.tech || payload.tech_name || '', payload.note || '');
      case 'getAttendanceReport':
        return getAttendanceReport(payload);
      case 'getTechHistory':
        return getTechHistory(payload.tech || payload.tech_name || '', payload);
      case 'getAllTechsSummary':
        return getAllTechsSummary();

      // ============================================================
      // Billing & Payment
      // ============================================================
      case 'createBilling':
        return autoGenerateBillingForJob(payload.job_id || payload.jobId || '', payload);
      case 'getBilling':
        return getBilling(payload);
      case 'generatePromptPayQR':
        return generatePromptPayQR(payload);
      case 'updatePayment':
      case 'markBillingPaid':
        return markBillingPaid(payload);
      case 'listBillings':
        return listAllBillings_(payload);

      // ============================================================
      // CRM Sprint 3 — Customer History + Follow-up
      // ============================================================
      case 'getCustomerHistoryFull':
        return getCustomerHistoryFull(payload);
      case 'getCustomerListWithStats':
        return getCustomerListWithStats(payload);
      case 'scheduleFollowUp':
        return scheduleFollowUp_(payload);
      case 'logFollowUpResult':
        return logFollowUpResult_(payload);
      case 'getCRMFollowUpSchedule':
        return getCRMFollowUpSchedule_(payload);
      case 'getCRMMetrics':
        return getCRMMetrics_();
      case 'nudgeSalesTeam':
        return nudgeSalesTeam_(payload);

      // ============================================================
      // After-Sales Service
      // ============================================================
      case 'createAfterSalesRecord':
        return createAfterSalesRecord(payload.job_id || payload.jobId || '');
      case 'getAfterSalesDue':
        return getAfterSalesDue(payload.days || 30);
      case 'logAfterSalesFollowUp':
        return logAfterSalesFollowUp(payload.record_id || '', payload.note || '', payload.followup_by || '', payload.next_action || '');
      case 'sendAfterSalesAlerts':
        return sendAfterSalesAlerts();
      case 'getAfterSalesSummary':
        return getAfterSalesSummary();

      // ============================================================
      // Push Notifications
      // ============================================================
      case 'savePushSubscription':
        return savePushSubscription(payload);
      case 'removePushSubscription':
        return removePushSubscription(payload);
      case 'sendPushToAll':
        return sendPushToAll(payload.title || '', payload.body || '', payload);
      case 'setupNotificationTriggers':
        return setupNotificationTriggers();

      // ============================================================
      // Audit Log
      // ============================================================
      // ============================================================
      // Security
      // ============================================================
      case 'changePassword':
        return changePassword(payload);
      case 'forcePasswordChange':
        return forcePasswordChange(payload);
      case 'lockAccount':
        return lockAccount(payload);
      case 'unlockAccount':
        return unlockAccount(payload);
      case 'getSecurityStatus':
        return getSecurityStatus();

      case 'getAuditLog':
        return getAuditLog(payload);
      case 'getAuditSummary':
        return getAuditSummary(payload.period || 'today');
      case 'pruneAuditLog':
        return pruneAuditLog(payload.keep_days || 90);

      // ============================================================
      // Quick Actions (LINE, Appointment, Status)
      // ============================================================
      case 'sendLineMessage':
        return sendLinePush(
          payload.message || '',
          payload.to || payload.toId || _getRoomGroupId(payload.room || 'TECHNICIAN')
        );
      // ── LINE Bot V2 Routes (LineBotV2.gs) ──
      case 'sendLineAlert':
        return sendLineAlert(
          payload.alertType || 'CUSTOM',
          payload.data || {},
          { toId: payload.toId || payload.to }
        );
      case 'checkAndAlertSLA':
        return checkAndAlertSLA(payload.slaPercent || payload.value || 0, {});
      case 'checkAndAlertHealth':
        return checkAndAlertHealth(payload.healthScore || payload.value || 0, {});
      case 'checkAndAlertError':
        return checkAndAlertError(payload.errorRate || 0, payload.latencyMs || 0, {});
      case 'mapLineUser':
        return mapLineUserToSystem(payload.lineUserId || '', payload.systemUsername || '');
      case 'getSystemUserFromLine':
        return { success: true, user: getSystemUserFromLine(payload.lineUserId || '') };
      case 'setupLineBotV2':
        return setupLineBotV2();
      case 'testLineBotV2':
        return testLineBotV2();
      // ── LINE Quota Optimization (LineBotQuota.gs) ──────────────────
      case 'queueAlert':
        return queueAlert(payload.alertType || '', payload.data || {});
      case 'getAlertQueue':
        return { success: true, queue: getAlertQueue() };
      case 'getUnnotifiedAlerts':
        return { success: true, alerts: getUnnotifiedAlerts() };
      case 'clearAlertQueue':
        return clearAlertQueue();
      case 'markAlertsNotified':
        return markAlertsNotified(payload.ids || []);
      case 'smartPushAlert':
        return smartPushAlert(payload.alertType || '', payload.data || {}, {});
      case 'checkAndAlertSLAOptimized':
        return checkAndAlertSLAOptimized(payload.slaPercent || payload.value || 0, {});
      case 'checkAndAlertHealthOptimized':
        return checkAndAlertHealthOptimized(payload.healthScore || payload.value || 0, {});
      case 'checkAndAlertErrorOptimized':
        return checkAndAlertErrorOptimized(payload.errorRate || 0, payload.latencyMs || 0, {});
      case 'sendDailyDigest':
        return sendDailyDigest();
      case 'setupDailyDigestTrigger':
        return setupDailyDigestTrigger();
      case 'getQuotaStatus':
        return getQuotaStatus();
      case 'getCachedResponse':
        return { success: true, data: getCachedResponse(payload.key || '') };
      case 'setCachedResponse':
        return setCachedResponse(payload.key || '', payload.data || {}, payload.ttl || 300);
      case 'invalidateCache':
        return invalidateCache(payload.key || '');
      // ── LINE Intelligent Notification (LineBotIntelligent.gs) ─────────
      case 'queueAlertIntelligent':
        return queueAlertIntelligent(payload.alertType || '', payload.data || {}, payload.options || {});
      case 'getIntelAlertQueue':
        return getIntelAlertQueue(payload.options || {});
      case 'getPrioritizedAlerts':
        return getPrioritizedAlerts(payload.role || '', payload.userId || '');
      case 'getAlertsForRole':
        return getAlertsForRole(payload.role || '');
      case 'getAlertsForUser':
        return getAlertsForUser(payload.userId || '');
      case 'expireOldAlerts':
        return expireOldAlerts();
      case 'setAlertTTL':
        return setAlertTTL(payload.alertId || '', payload.ttlMin || 120);
      case 'acknowledgeAlert':
        return acknowledgeAlert(payload.alertId || '', payload.lineUserId || '');
      case 'bulkAcknowledge':
        return bulkAcknowledge(payload.alertIds || [], payload.lineUserId || '');
      case 'getGroupedAlerts':
        return getGroupedAlerts(payload.options || {});
      case 'buildGroupedFlexMessage':
        return buildGroupedFlexMessage(payload.groupKey || '', payload.options || {});
      case 'getAlertAnalytics':
        return getAlertAnalytics(payload.days || 7);
      case 'buildAnalyticsFlexMessage':
        return buildAnalyticsFlexMessage(payload.days || 7);
      case 'nudgeTech':
        return nudgeTechAction_(payload);
      case 'addAppointment':
      case 'updateJobSchedule':
        return updateJobScheduleV55(payload);
      case 'markJobStatus':
        return transitionJob(
          payload.job_id || payload.jobId || '',
          payload.new_status || payload.status || '',
          payload.changed_by || payload.user || 'PWA',
          payload.note || ''
        );

      // ============================================================
      // Reports
      // ============================================================
      case 'getReportData':
        // Phase 4: Use optimized SheetOptimizer version
        return (typeof getReportData === 'function') ? getReportData(payload) : getReportData_(payload.period || 'month');

      // ============================================================
      // Drive Sync
      // ============================================================
      case 'syncCodeToDrive':
        return DriveSync_receiveSync(payload);

      case 'getDriveSyncStatus':
        return getDriveSyncStatus();

      case 'storeSessionContent':
        return storeSessionContent(payload.content || '');

      // Customer Portal (Public — ไม่ต้อง Auth)
      // ============================================================
      case 'getJobStatusPublic':
        return getJobStatusPublic(
          payload.job_id || payload.jobId || '',
          payload.phone || ''
        );

      // ============================================================
      // Notification Center — Sprint 3 T4
      // ============================================================
      case 'cronMorningAlert':
        return cronMorningAlert();

      case 'runBackup':
        return runBackup();
      case 'seedAllData':
        return seedAllData();

      // ============================================================
      // AI Systems — Final Sprint T5
      // ============================================================
      case 'smartAssignTech':
        return smartAssignTech_(payload);
      case 'optimizeRoute':
        return optimizeRoute(
          payload.start_lat || payload.lat || 0,
          payload.start_lng || payload.lng || 0,
          payload.destinations || []
        );
      case 'analyzeWorkImage':
        return analyzeWorkImage(
          payload.image_url || payload.imageUrl || '',
          payload.context || payload.symptom || ''
        );
      case 'runJobCompletionQC':
        return runJobCompletionQC(
          payload.job_id || payload.jobId || '',
          payload
        );
      case 'qualityCheck':
        return qualityCheck(
          payload.image_url || payload.imageUrl || '',
          payload.job_id || payload.jobId || ''
        );
      case 'geminiSlipVerify':
        return geminiSlipVerify_(payload);
      case 'verifyPaymentSlip':
        // ตรวจสลิปด้วย API หรือ Gemini Vision เป็น fallback
        return verifyPaymentSlip_(payload);

      // ============================================================
      // Vision Pipeline v1.0.0 (Production)
      // ============================================================
      case 'runVisionPipeline':
        return runVisionPipeline(payload);
      case 'runSlipVerifyPipeline':
        return runSlipVerifyPipeline(payload);
      case 'runQCPipeline':
        return runQCPipeline(payload);
      case 'submitHumanReview':
        return submitHumanReview(payload);
      case 'getVisionDashboardStats':
        return getVisionDashboardStats(payload);
      case 'getVisionPipelineVersion':
        return getVisionPipelineVersion();

      // ============================================================
      // VisionLearning — Self-Learning System v1.0.0
      // ============================================================
      case 'processFeedbackLoop':
        return processFeedbackLoop();
      case 'getConfidenceCalibration':
        return getConfidenceCalibration();
      case 'getDynamicThreshold':
        return { success: true, type: payload.type, threshold: getDynamicThreshold(payload.type || 'QC') };
      case 'setManualThreshold':
        return setManualThreshold(payload);
      case 'analyzeErrorPatterns':
        return analyzeErrorPatterns(payload);
      case 'buildAdaptivePrompt':
        return { success: true, prompt: buildAdaptivePrompt(payload.type || 'QC', payload.input || {}) };
      case 'createRule':
        return createRule(payload);
      case 'getActiveRules':
        return getActiveRules(payload);
      case 'autoGenerateRulesFromPatterns':
        return autoGenerateRulesFromPatterns(payload);
      case 'getLearningDashboard':
        return getLearningDashboard(payload);
      case 'setupLearningTriggers':
        return setupLearningTriggers();
      case 'getVisionLearningVersion':
        return getVisionLearningVersion();

      // ============================================================
      // Agent Gateway — Multi-Agent Platform v1.0.0
      // ============================================================
      case 'agentDispatch':
        return agentGatewayDispatch(payload);
      case 'registerAgent':
        return registerAgent(payload);
      case 'listAgents':
        return listAgents(payload);
      case 'getAgentLogs':
        return getAgentLogs(payload);
      case 'getAgentStats':
        return getAgentStats(payload);
      case 'getAgentGatewayVersion':
        return getAgentGatewayVersion();

      // ============================================================
      // AI Operating System — Phase 1-6 (V5.5.8)
      // ============================================================

      // Phase 1: AgentMemory
      case 'amStoreIncident':         return amStoreIncident(payload);
      case 'amResolveIncident':        return amResolveIncident(payload);
      case 'amGetIncidents':           return amGetIncidents(payload);
      case 'amStorePattern':           return amStorePattern(payload);
      case 'amGetPatterns':            return amGetPatterns(payload);
      case 'amStoreRule':              return amStoreRule(payload);
      case 'amGetRules':               return amGetRules(payload);
      case 'amEvaluateRules':          return amEvaluateRules(payload);
      case 'amSaveSnapshot':           return amSaveSnapshot(payload);
      case 'amGetSnapshots':           return amGetSnapshots(payload);
      case 'getAgentMemoryDashboard':  return getAgentMemoryDashboard(payload);
      case 'getAgentMemoryVersion':    return getAgentMemoryVersion();

      // Phase 2: SharedContext
      case 'getSystemContext':         return getSystemContext(payload);
      case 'getContextDiff':           return getContextDiff(payload);
      case 'getSharedContextVersion':  return getSharedContextVersion();

      // Phase 3: AgentCollaboration
      case 'agentCall':                return agentCall(payload);
      case 'agentBroadcast':           return agentBroadcast(payload);
      case 'agentConsensus':           return agentConsensus(payload);
      case 'agentDelegate':            return agentDelegate(payload);
      case 'getSharedResults':         return getSharedResults(payload);
      case 'getCollaborationStats':    return getCollaborationStats(payload);
      case 'getAgentCollaborationVersion': return getAgentCollaborationVersion();

      // Phase 4: WorkflowEngine
      case 'triggerWorkflow':          return triggerWorkflow(payload);
      case 'autoTriggerWorkflows':     return autoTriggerWorkflows(payload);
      case 'defineWorkflow':           return defineWorkflow(payload);
      case 'listWorkflows':            return listWorkflows(payload);
      case 'getWorkflowRunLog':        return getWorkflowRunLog(payload);
      case 'getWorkflowEngineVersion': return getWorkflowEngineVersion();

      // Phase 5: DecisionLayer
      case 'decide':                   return decide(payload);
      case 'decideAndAct':             return decideAndAct(payload);
      case 'getDecisionLayerVersion':  return getDecisionLayerVersion();

      // Phase 6: LearningIntegration
      case 'syncLearningToMemory':     return syncLearningToMemory(payload);
      case 'syncIncidentsToLearning':  return syncIncidentsToLearning(payload);
      case 'runLearningCycle':         return runLearningCycle(payload);
      case 'getLearningMemoryBridge':  return getLearningMemoryBridge(payload);
      case 'setupLearningIntegrationTrigger': return setupLearningIntegrationTrigger();
      case 'getLearningIntegrationVersion':   return getLearningIntegrationVersion();

      // ============================================================
      // AI-OS Stabilization — Phase 1: MemoryControl
      // ============================================================
      case 'getMemoryControlVersion':   return getMemoryControlVersion();
      case 'runRetentionPolicy':        return runRetentionPolicy(payload);
      case 'prunePatterns':             return prunePatterns(payload);
      case 'getMemoryHealth':           return getMemoryHealth(payload);
      case 'getArchivedIncidents':      return getArchivedIncidents(payload);
      case 'setupMemoryControlTrigger': return setupMemoryControlTrigger();

      // ============================================================
      // AI-OS Stabilization — Phase 2: DecisionGuard
      // ============================================================
      case 'getDecisionGuardVersion':   return getDecisionGuardVersion();
      case 'checkGuard':                return checkGuard(payload);
      case 'checkGuardAndDecide':       return checkGuardAndDecide(payload);
      case 'checkGuardAndTrigger':      return checkGuardAndTrigger(payload);
      case 'resetCooldown':             return resetCooldown(payload);
      case 'getGuardStatus':            return getGuardStatus(payload);
      case 'getGuardLog':               return getGuardLog(payload);

      // ============================================================
      // AI-OS Stabilization — Phase 3: WorkflowSafety
      // ============================================================
      case 'getWorkflowSafetyVersion':  return getWorkflowSafetyVersion();
      case 'safeTriggerWorkflow':       return safeTriggerWorkflow(payload);
      case 'dryRunWorkflow':            return dryRunWorkflow(payload);
      case 'getWorkflowSafetyStatus':   return getWorkflowSafetyStatus(payload);
      case 'getSafetyLog':              return getSafetyLog(payload);

      // ============================================================
      // AI-OS Stabilization — Phase 4: AgentScoring
      // ============================================================
      case 'getAgentScoringVersion':    return getAgentScoringVersion();
      case 'recordOutcome':             return recordOutcome(payload);
      case 'weightedConsensus':         return weightedConsensus(payload);
      case 'getAgentScore':             return getAgentScore(payload);
      case 'getAgentLeaderboard':       return getAgentLeaderboard(payload);
      case 'resetAgentScore':           return resetAgentScore(payload);

      // ============================================================
      // AI-OS Stabilization — Phase 5: AIAuditLog
      // ============================================================
      case 'getAIAuditLogVersion':      return getAIAuditLogVersion();
      case 'logAIDecision':             return logAIDecision(payload);
      case 'getAIDecisionLog':          return getAIDecisionLog(payload);
      case 'logWorkflowExecution':      return logWorkflowExecution(payload);
      case 'getWorkflowExecutionLog':   return getWorkflowExecutionLog(payload);
      case 'logAgentAction':            return logAgentAction(payload);
      case 'getAgentActionLog':         return getAgentActionLog(payload);
      case 'logAIAuditEvent':           return logAIAuditEvent(payload);
      case 'getAIAuditTrail':           return getAIAuditTrail(payload);
      case 'getAIAuditDashboard':       return getAIAuditDashboard(payload);

      // ============================================================
      // Tax Engine (TASK 1-2: VAT Flexible + WHT ภงด.)
      // ============================================================
      case 'calculateTax':
        return taxAction(Object.assign({ sub: 'calculate' }, payload));
      case 'getTaxReport':
        return taxAction(Object.assign({ sub: 'report' }, payload));
      case 'saveTaxReport':
        return taxAction(Object.assign({ sub: 'save' }, payload));
      case 'taxAction':
        return taxAction(payload);
      case 'generateTaxInvoice':
        return generateTaxInvoice(payload);
      case 'generateWhtDocument':
        return generateWhtDocument(payload);
      case 'getTaxReminder':
        return getTaxReminder(payload);

      // ============================================================
      // Warranty Management (TASK 6)
      // ============================================================
      case 'createWarranty':
        return createWarranty(payload);
      case 'getWarrantyByJobId':
        return getWarrantyByJobId(payload);
      case 'listWarranties':
        return listWarranties(payload);
      case 'updateWarrantyStatus':
        return updateWarrantyStatus(payload);
      case 'getWarrantyDue':
        return getWarrantyDue(payload);

      // ============================================================
      // Executive Dashboard (KPI)
      // ============================================================
      case 'getExecutiveDashboard':
        return getExecutiveDashboard(payload);
      // ============================================================
      // Health Monitoring (TASK 9)
      // ============================================================
      case 'healthCheck':
        return healthCheck(payload);
      case 'getHealthHistory':
        return getHealthHistory(payload);

      // ============================================================
      // Multi-branch (TASK 7)
      // ============================================================
      case 'getBranchList':
        return getBranchList();
      case 'getBranchSummary':
        return getBranchSummary(payload.branch_id || '');
      case 'branchAction':
        return branchAction(payload);
      case 'ensureAllBranchIdColumns':
        return ensureAllBranchIdColumns();

      // ============================================================
      // Database Integrity (PART 2)
      // ============================================================
      case 'databaseMaintenance':
        return jsonOutputV55_(runDatabaseMaintenance());
      case 'validateSchema':
        return jsonOutputV55_(validateSchema_(payload.sheetName || 'DBJOBS'));
      case 'runIntegrityCheck':
        return jsonOutputV55_(runIntegrityCheck());
      case 'cleanAllData':
        return jsonOutputV55_(cleanAllData());

      // ── Kudos / Customer Rating ────────────────────────────────────────────
      case 'submitCustomerRating':
        return jsonOutputV55_(submitCustomerRating_(payload));
      case 'getCustomerRatings':
        return jsonOutputV55_(getCustomerRatings_(payload));

      // ── POS / Retail Sale (ขายหน้าร้าน) ────────────────────────────────
      case 'createSale':
      case 'createRetailSale':
        if (typeof createRetailSale_ === 'function') return createRetailSale_(payload);
        // fallback: ใช้ createBilling แทนจนกว่าจะมี POS module
        return autoGenerateBillingForJob(payload.job_id || '', Object.assign({ sale_type: 'retail' }, payload));
      case 'listSales':
      case 'listRetailSales':
        if (typeof listRetailSales_ === 'function') return listRetailSales_(payload);
        return listAllBillings_(Object.assign({ type: 'retail' }, payload));
      case 'getSaleSummary':
        if (typeof getRetailSaleSummary_ === 'function') return getRetailSaleSummary_(payload);
        return getReportData(Object.assign({ type: 'sale' }, payload));

      default:
        return invokeFunctionByNameV55_(action, args);
    }
  } catch (error) {
    return { success: false, action: action, error: error.toString() };
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
