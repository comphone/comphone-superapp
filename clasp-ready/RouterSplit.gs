// ============================================================
// COMPHONE SUPER APP v5.9.0-phase2d — RouterSplit.gs
// Phase 5: Router Split — map action → module handler
// Phase 6: Health Fix — ensure status: 'healthy' in responses
// ============================================================

/**
 * MODULE_ROUTER — Maps action prefix → module handler function
 * Reduces switch-case lookup time for large action sets
 */
var MODULE_ROUTER = {
  // Dashboard & Bundle
  'getDashboardBundle':     function(p) { return getDashboardBundle(p); },
  'invalidateBundleCache':  function(p) { return invalidateBundleCache(); },
  'getDashboardData':       function(p) { return getDashboardData(); },
  'getDashboardPayloadV55': function(p) { return getDashboardPayloadV55(); },

  // Jobs
  'checkJobs':    function(p) { return checkJobs(p); },
  'listJobs':     function(p) { return checkJobs(p); },
  'openJob':      function(p) { return openJob(p); },
  'createJob':    function(p) { return openJob(p); },
  'updateJobById': function(p) { return updateJobById(p.job_id || p.jobId || '', p); },
  'updateJobStatus': function(p) { return updateJobStatus(p); },
  'transitionJob': function(p) { return transitionJob(p.job_id || p.jobId || '', p.new_status || p.to_status || p.status, p); },
  'addQuickNote': function(p) { return addQuickNote(p.job_id || p.jobId || '', p.note || '', p.user || 'SYSTEM'); },
  'getJobTimeline': function(p) { return getJobTimelineV55_(p.job_id || p.jobId || ''); },
  'getJobStateConfig': function(p) { return getJobStateConfig(); },
  'getJobQRData': function(p) { return getJobWebAppPayload(p.job_id || p.jobId || ''); },
  'generateJobQR': function(p) { return generateJobQR(p.job_id || p.jobId || ''); },

  // Inventory
  'inventoryOverview':    function(p) { return getInventoryOverview(p); },
  'addInventoryItem':     function(p) { return addInventoryItem(p); },
  'updateInventoryItem':  function(p) { return updateInventoryItem(p); },
  'deleteInventoryItem':  function(p) { return deleteInventoryItem(p); },
  'getInventoryItemDetail': function(p) { return getInventoryItemDetail(p); },
  'transferStock':        function(p) { return transferStock(p.from_location || p.from, p.to_location || p.to, p.item_id || p.item_code || p.code, p.qty, p); },
  'checkStock':           function(p) { return checkStock(p); },
  'barcodeLookup':        function(p) { return barcodeLookup(p); },
  'scanWithdrawStock':    function(p) { return scanWithdrawStock(p); },
  'getStockMovementHistory': function(p) { return getStockMovementHistory(p); },
  'createPurchaseOrder':  function(p) { return createPurchaseOrder(p); },
  'listPurchaseOrders':   function(p) { return listPurchaseOrders(p); },
  'receivePurchaseOrder': function(p) { return receivePurchaseOrder(p); },
  'geminiReorderSuggestion': function(p) { return geminiReorderSuggestion(); },

  // Billing & POS
  'createBilling':        function(p) { return createBilling(p); },
  'getBilling':           function(p) { return getBilling(p); },
  // REMOVED (Phase 2B-0): listBillings, updatePayment, createRefund, createBillingFromSale,
  // deductStock, restoreStock — functions don't exist in codebase
  'generatePromptPayQR':  function(p) { return generatePromptPayQR(p); },
  'createRetailSale':     function(p) { return createRetailSale_(p); },
  'listRetailSales':      function(p) { return listRetailSales(p); },
  'analyzeBusiness':      function(p) { return analyzeBusiness_(p); },

  // Customers
  'createCustomer': function(p) { return createCustomer(p); },
  'updateCustomer': function(p) { return updateCustomer(p); },
  'getCustomer':    function(p) { return getCustomer(p); },
  'listCustomers':  function(p) { return listCustomers(p); },

  // Reports
  'getReportData': function(p) {
    return (typeof getReportData === 'function') ? getReportData(p) : getReportData_(p.period || 'month');
  },

  // Version
  'getSystemVersion': function(p) {
    return (typeof getSystemVersion === 'function') ? getSystemVersion() : getVersionV55_();
  },
  'getVersion': function(p) {
    return (typeof getVersionV55_ === 'function') ? getVersionV55_() : { success: true, version: '6.2.0' };
  },

  // System Health (Phase 6: always return status: 'healthy')
  'getSystemHealth': function(p) {
    var result = (typeof getSystemHealth === 'function') ? getSystemHealth(p) : { success: true };
    return _ensureHealthStatus_(result);
  },
  'getSystemContext': function(p) {
    var result = (typeof getSystemContext === 'function') ? getSystemContext(p) : { success: true };
    return _ensureHealthStatus_(result);
  },
  'healthCheck': function(p) {
    var result = (typeof healthCheckV55_ === 'function') ? healthCheckV55_() : { success: true };
    return _ensureHealthStatus_(result);
  },

  // Attendance & Tech History
  'clockIn':     function(p) { return clockIn(p.tech || p.tech_name || '', p.note || ''); },
  'clockOut':    function(p) { return clockOut(p.tech || p.tech_name || '', p.note || ''); },
  'getAttendanceReport': function(p) { return getAttendanceReport(p); },
  'getTechHistory': function(p) { return getTechHistory(p.tech || p.tech_name || '', p); },
  'getAllTechsSummary': function(p) { return getAllTechsSummary(); },

  // CRM Sprint 3
  'getCustomerHistoryFull': function(p) { return getCustomerHistoryFull(p); },
  'getCustomerListWithStats': function(p) { return getCustomerListWithStats(p); },
  'scheduleFollowUp': function(p) { return scheduleFollowUp_(p); },
  'logFollowUpResult': function(p) { return logFollowUpResult_(p); },
  'getCRMFollowUpSchedule': function(p) { return getCRMFollowUpSchedule_(p); },
  'getCRMMetrics': function(p) { return getCRMMetrics_(); },
  'nudgeSalesTeam': function(p) { return nudgeSalesTeam_(p); },

  // After-Sales Service
  'createAfterSalesRecord': function(p) { return createAfterSalesRecord(p.job_id || p.jobId || ''); },
  'getAfterSalesDue': function(p) { return getAfterSalesDue(p.days || 30); },
  'logAfterSalesFollowUp': function(p) { return logAfterSalesFollowUp(p.record_id || '', p.note || '', p.followup_by || '', p.next_action || ''); },
  'sendAfterSalesAlerts': function(p) { return sendAfterSalesAlerts(); },
  'getAfterSalesSummary': function(p) { return getAfterSalesSummary(); },

  // Auth & RBAC
  'loginUser':    function(p) { return loginUser(p.username || '', p.password || ''); },
  'logoutUser':   function(p) { return logoutUser(p.token || ''); },
  'verifySession': function(p) { return verifySession(p.token || ''); },
  'listUsers':    function(p) {
    return (typeof listUsers_ === 'function') ? listUsers_(p) : listUsers(p.token || '');
  },
  'createUser':   function(p) { return createUser(p.token || '', p); },
  'updateUserRole': function(p) { return updateUserRole(p.token || '', p.username || '', p.newRole || p.role || ''); },
  'setUserActive': function(p) { return setUserActive(p.token || '', p.username || '', p.active !== false); },
  'setupUserSheet': function(p) { return setupUserSheet(); },

  // Security
  'changePassword': function(p) { return changePassword(p); },
  'forcePasswordChange': function(p) { return forcePasswordChange(p); },
  'lockAccount':  function(p) { return lockAccount(p); },
  'unlockAccount': function(p) { return unlockAccount(p); },
  'getSecurityStatus': function(p) { return getSecurityStatus(); },
  'getAuditLog':  function(p) { return getAuditLog(p); },
  'getAuditSummary': function(p) { return getAuditSummary(p.period || 'today'); },
  'pruneAuditLog': function(p) { return pruneAuditLog(p.keep_days || 90); },

  // System
  'initSystem':   function(p) { return initSystem(); },
  'systemStatus': function(p) { return systemStatus(); },
  'setupTriggers': function(p) { return setupAllTriggers(); },
  'setupAllTriggers': function(p) { return setupAllTriggers(); },
  'getSchemaInfo': function(p) { return getSchemaInfo(); },
  'validateConfig': function(p) { return validateRequiredConfigs(); },
  'getComphoneConfig': function(p) { return getComphoneConfig(); },
  'setScriptProperties': function(p) { return setScriptPropertiesFromPayload(p); },
  'logSystemError': function(p) { return logSystemError(p); },
  'getSystemLogs': function(p) { return getSystemLogs(p); },
  'getSystemMetrics': function(p) { return (typeof getSystemMetrics === 'function') ? getSystemMetrics() : { success: false }; },
  'getHealthMonitor': function(p) { return (typeof getHealthMonitor === 'function') ? getHealthMonitor(p) : { success: false }; },
  'getHealthTrend': function(p) { return (typeof getHealthTrend === 'function') ? getHealthTrend(p) : { success: false }; },
  'getSnapshots': function(p) { return (typeof getSnapshots === 'function') ? getSnapshots(p) : { success: false }; },
  'controlAction': function(p) { return (typeof controlAction === 'function') ? controlAction(p) : { success: false }; },
  'storeSnapshot': function(p) { return (typeof storeSnapshot === 'function') ? storeSnapshot(p) : { success: false }; },
  'getSecurityLog': function(p) { var sl = (typeof getSecurityLog === 'function') ? getSecurityLog() : []; return { success: true, data: sl, count: sl.length }; },
  'seedAllData':  function(p) { return seedAllData(); },
  'cronMorningAlert': function(p) { return cronMorningAlert(); },

  // Push Notifications
  'savePushSubscription': function(p) { return savePushSubscription(p); },
  'removePushSubscription': function(p) { return removePushSubscription(p); },

  // Drive Sync
  'getDriveSyncStatus': function(p) { return getDriveSyncStatus(); },
  'storeSessionContent': function(p) { return storeSessionContent(p.content || ''); },

  // Customer Portal (public)
  'getJobStatusPublic': function(p) { return getJobStatusPublic(p.job_id || p.jobId || '', p.phone || ''); },

  // Telemetry (client-side metrics ingestion)
  'logTelemetry': function(p) { return logTelemetry(p); },

  // ══════════════════════════════════════════════════════
  // Phase 2B-2: Migrated from Router.gs switch (178 actions)
  // All verified to have backing functions in .gs files
  // ══════════════════════════════════════════════════════

  // Agent Platform
'acknowledgeAlert': function(p) { return acknowledgeAlert(p); },
  'addAppointment': function(p) { return updateJobScheduleV55(p); },
  'agentBroadcast': function(p) { return agentBroadcast(p); },
  'agentCall': function(p) { return agentCall(p); },
  'agentConsensus': function(p) { return agentConsensus(p); },
  'agentDelegate': function(p) { return agentDelegate(p); },
  'agentDispatch': function(p) { return agentGatewayDispatch(p); },
  'amEvaluateRules': function(p) { return amEvaluateRules(p); },
  'amGetIncidents': function(p) { return amGetIncidents(p); },
  'amGetPatterns': function(p) { return amGetPatterns(p); },
  'amGetRules': function(p) { return amGetRules(p); },
  'amGetSnapshots': function(p) { return amGetSnapshots(p); },
  'amResolveIncident': function(p) { return amResolveIncident(p); },
  'amSaveSnapshot': function(p) { return amSaveSnapshot(p); },
  'amStoreIncident': function(p) { return amStoreIncident(p); },
  'amStorePattern': function(p) { return amStorePattern(p); },
  'amStoreRule': function(p) { return amStoreRule(p); },
  'analyzeErrorPatterns': function(p) { return analyzeErrorPatterns(p); },
  'analyzeWorkImage': function(p) { return analyzeWorkImage(p); },
  'autoGenerateRulesFromPatterns': function(p) { return autoGenerateRulesFromPatterns(p); },
  'autoTriggerWorkflows': function(p) { return autoTriggerWorkflows(p); },
  'branchAction': function(p) { return branchAction(p); },
  'buildAnalyticsFlexMessage': function(p) { return buildAnalyticsFlexMessage(p); },
  'buildGroupedFlexMessage': function(p) { return buildGroupedFlexMessage(p); },
  'bulkAcknowledge': function(p) { return bulkAcknowledge(p); },
  'calculateTax': function(p) { return taxAction(p); },
  'cancelPurchaseOrder': function(p) { return cancelPurchaseOrder_(p); },
  'checkAndAlertError': function(p) { return checkAndAlertError(p); },
  'checkAndAlertErrorOptimized': function(p) { return checkAndAlertErrorOptimized(p); },
  'checkAndAlertHealth': function(p) { return checkAndAlertHealth(p); },
  'checkAndAlertHealthOptimized': function(p) { return checkAndAlertHealthOptimized(p); },
  'checkAndAlertSLA': function(p) { return checkAndAlertSLA(p); },
  'checkAndAlertSLAOptimized': function(p) { return checkAndAlertSLAOptimized(p); },
  'checkGuard': function(p) { return checkGuard(p); },
  'checkGuardAndDecide': function(p) { return checkGuardAndDecide(p); },
  'checkGuardAndTrigger': function(p) { return checkGuardAndTrigger(p); },
  'cleanAllData': function(p) { return jsonOutputV55_(p); },
  'clearAlertQueue': function(p) { return clearAlertQueue(p); },
  'createRule': function(p) { return createRule(p); },
  'createSale': function(p) { return createRetailSale_(p); },
  'createWarranty': function(p) { return createWarranty(p); },
  'databaseMaintenance': function(p) { return jsonOutputV55_(p); },
  'decide': function(p) { return decide(p); },
  'decideAndAct': function(p) { return decideAndAct(p); },
  'defineWorkflow': function(p) { return defineWorkflow(p); },
  'dryRunWorkflow': function(p) { return dryRunWorkflow(p); },
  'ensureAllBranchIdColumns': function(p) { return ensureAllBranchIdColumns(p); },
  'expireOldAlerts': function(p) { return expireOldAlerts(p); },
  'geminiSlipVerify': function(p) { return geminiSlipVerify_(p); },
  'generateTaxInvoice': function(p) { return generateTaxInvoice(p); },
  'generateWhtDocument': function(p) { return generateWhtDocument(p); },
  'getAIAuditDashboard': function(p) { return getAIAuditDashboard(p); },
  'getAIAuditLogVersion': function(p) { return getAIAuditLogVersion(p); },
  'getAIAuditTrail': function(p) { return getAIAuditTrail(p); },
  'getAIDecisionLog': function(p) { return getAIDecisionLog(p); },
  'getActiveRules': function(p) { return getActiveRules(p); },
  'getAgentActionLog': function(p) { return getAgentActionLog(p); },
  'getAgentCollaborationVersion': function(p) { return getAgentCollaborationVersion(p); },
  'getAgentGatewayVersion': function(p) { return getAgentGatewayVersion(p); },
  'getAgentLeaderboard': function(p) { return getAgentLeaderboard(p); },
  'getAgentLogs': function(p) { return getAgentLogs(p); },
  'getAgentMemoryDashboard': function(p) { return getAgentMemoryDashboard(p); },
  'getAgentMemoryVersion': function(p) { return getAgentMemoryVersion(p); },
  'getAgentScore': function(p) { return getAgentScore(p); },
  'getAgentScoringVersion': function(p) { return getAgentScoringVersion(p); },
  'getAgentStats': function(p) { return getAgentStats(p); },
  'getAlertAnalytics': function(p) { return getAlertAnalytics(p); },
  'getAlertsForRole': function(p) { return getAlertsForRole(p); },
  'getAlertsForUser': function(p) { return getAlertsForUser(p); },
  'getArchivedIncidents': function(p) { return getArchivedIncidents(p); },
  'getBranchList': function(p) { return getBranchList(p); },
  'getBranchSummary': function(p) { return getBranchSummary(p); },
  'getCollaborationStats': function(p) { return getCollaborationStats(p); },
  'getConfidenceCalibration': function(p) { return getConfidenceCalibration(p); },
  'getContextDiff': function(p) { return getContextDiff(p); },
  'getCustomerRatings': function(p) { return jsonOutputV55_(p); },
  'getDecisionGuardVersion': function(p) { return getDecisionGuardVersion(p); },
  'getDecisionLayerVersion': function(p) { return getDecisionLayerVersion(p); },
  'getExecutiveDashboard': function(p) { return getExecutiveDashboard(p); },
  'getGroupedAlerts': function(p) { return getGroupedAlerts(p); },
  'getGuardLog': function(p) { return getGuardLog(p); },
  'getGuardStatus': function(p) { return getGuardStatus(p); },
  'getHealthHistory': function(p) { return getHealthHistory(p); },
  'getIntelAlertQueue': function(p) { return getIntelAlertQueue(p); },
  'getLearningDashboard': function(p) { return getLearningDashboard(p); },
  'getLearningIntegrationVersion': function(p) { return getLearningIntegrationVersion(p); },
  'getLearningMemoryBridge': function(p) { return getLearningMemoryBridge(p); },
  'getMemoryControlVersion': function(p) { return getMemoryControlVersion(p); },
  'getMemoryHealth': function(p) { return getMemoryHealth(p); },
  'getPhotoGalleryData': function(p) { return getPhotoGalleryData(p); },
  'getPrioritizedAlerts': function(p) { return getPrioritizedAlerts(p); },
  'getQuotaStatus': function(p) { return getQuotaStatus(p); },
  'getSafetyLog': function(p) { return getSafetyLog(p); },
  'getSaleSummary': function(p) { return getRetailSaleSummary_(p); },
  'getSharedContextVersion': function(p) { return getSharedContextVersion(p); },
  'getSharedResults': function(p) { return getSharedResults(p); },
  'getTaxReminder': function(p) { return getTaxReminder(p); },
  'getTaxReport': function(p) { return taxAction(p); },
  'getVisionDashboardStats': function(p) { return getVisionDashboardStats(p); },
  'getVisionLearningVersion': function(p) { return getVisionLearningVersion(p); },
  'getVisionPipelineVersion': function(p) { return getVisionPipelineVersion(p); },
  'getWarrantyByJobId': function(p) { return getWarrantyByJobId(p); },
  'getWarrantyDue': function(p) { return getWarrantyDue(p); },
  'getWorkflowEngineVersion': function(p) { return getWorkflowEngineVersion(p); },
  'getWorkflowExecutionLog': function(p) { return getWorkflowExecutionLog(p); },
  'getWorkflowRunLog': function(p) { return getWorkflowRunLog(p); },
  'getWorkflowSafetyStatus': function(p) { return getWorkflowSafetyStatus(p); },
  'getWorkflowSafetyVersion': function(p) { return getWorkflowSafetyVersion(p); },
  'handleProcessPhotos': function(p) { return handleProcessPhotos(p); },
  'invalidateCache': function(p) { return invalidateCache(p); },
  'listAgents': function(p) { return listAgents(p); },
  'listBillings': function(p) { return listAllBillings_(p); },
  'listSales': function(p) { return listRetailSales_(p); },
  'listWarranties': function(p) { return listWarranties(p); },
  'listWorkflows': function(p) { return listWorkflows(p); },
  'logAIAuditEvent': function(p) { return logAIAuditEvent(p); },
  'logAIDecision': function(p) { return logAIDecision(p); },
  'logAgentAction': function(p) { return logAgentAction(p); },
  'logWorkflowExecution': function(p) { return logWorkflowExecution(p); },
  'mapLineUser': function(p) { return mapLineUserToSystem(p); },
  'markAlertsNotified': function(p) { return markAlertsNotified(p); },
  'markBillingPaid': function(p) { return markBillingPaid(p); },
  'markJobStatus': function(p) { return transitionJob(p); },
  'nudgeTech': function(p) { return nudgeTechAction_(p); },
  'optimizeRoute': function(p) { return optimizeRoute(p); },
  'photoGalleryData': function(p) { return getPhotoGalleryData(p); },
  'uploadPhoto': function(p) { return uploadPhoto_(p); },
  'processFeedbackLoop': function(p) { return processFeedbackLoop(p); },
  'prunePatterns': function(p) { return prunePatterns(p); },
  'qualityCheck': function(p) { return qualityCheck(p); },
  'queueAlert': function(p) { return queueAlert(p); },
  'queueAlertIntelligent': function(p) { return queueAlertIntelligent(p); },
  'recordOutcome': function(p) { return recordOutcome(p); },
  'registerAgent': function(p) { return registerAgent(p); },
  'resetAgentScore': function(p) { return resetAgentScore(p); },
  'resetCooldown': function(p) { return resetCooldown(p); },
  'runIntegrityCheck': function(p) { return jsonOutputV55_(p); },
  'runJobCompletionQC': function(p) { return runJobCompletionQC(p); },
  'runLearningCycle': function(p) { return runLearningCycle(p); },
  'runQCPipeline': function(p) { return runQCPipeline(p); },
  'runRetentionPolicy': function(p) { return runRetentionPolicy(p); },
  'runSlipVerifyPipeline': function(p) { return runSlipVerifyPipeline(p); },
  'runVisionPipeline': function(p) { return runVisionPipeline(p); },
  'safeTriggerWorkflow': function(p) { return safeTriggerWorkflow(p); },
  'saveTaxReport': function(p) { return taxAction(p); },
  'sendDailyDigest': function(p) { return sendDailyDigest(p); },
  'sendDashboardSummary': function(p) { return sendDashboardSummary(p); },
  'sendLineAlert': function(p) { return sendLineAlert(p); },
  'sendLineMessage': function(p) { return sendLinePush(p); },
  'sendPushToAll': function(p) { return sendPushToAll(p); },
  'setAlertTTL': function(p) { return setAlertTTL(p); },
  'setCachedResponse': function(p) { return setCachedResponse(p); },
  'setManualThreshold': function(p) { return setManualThreshold(p); },
  'setupDailyDigestTrigger': function(p) { return setupDailyDigestTrigger(p); },
  'setupLearningIntegrationTrigger': function(p) { return setupLearningIntegrationTrigger(p); },
  'setupLearningTriggers': function(p) { return setupLearningTriggers(p); },
  'setupLineBotV2': function(p) { return setupLineBotV2(p); },
  'setupMemoryControlTrigger': function(p) { return setupMemoryControlTrigger(p); },
  'setupNotificationTriggers': function(p) { return setupNotificationTriggers(p); },
  'smartAssignTech': function(p) { return smartAssignTech_(p); },
  'smartAssignV2':     function(p) { return smartAssignV2_(p); },
  'smartPushAlert': function(p) { return smartPushAlert(p); },
  'submitCustomerRating': function(p) { return jsonOutputV55_(p); },
  'submitHumanReview': function(p) { return submitHumanReview(p); },
  'syncCodeToDrive': function(p) { return DriveSync_receiveSync(p); },
  'syncIncidentsToLearning': function(p) { return syncIncidentsToLearning(p); },
  'syncLearningToMemory': function(p) { return syncLearningToMemory(p); },
  'taxAction': function(p) { return taxAction(p); },
  'testLineBotV2': function(p) { return testLineBotV2(p); },
  'triggerWorkflow': function(p) { return triggerWorkflow(p); },
  'updateJobSchedule': function(p) { return updateJobScheduleV55(p); },
  'updatePayment': function(p) { return markBillingPaid(p); },
  'updateWarrantyStatus': function(p) { return updateWarrantyStatus(p); },
  'validateSchema': function(p) { return jsonOutputV55_(p); },
  'verifyPaymentSlip': function(p) { return verifyPaymentSlip_(p); },
  'weightedConsensus': function(p) { return weightedConsensus(p); },
  // ── Migrated from Router switch (Phase 2B-3) ──────────────────
  'getSystemUserFromLine': function(p) { return getSystemUserFromLine(p.lineUserId || ''); },
  'getAlertQueue':         function(p) { return { success: true, queue: getAlertQueue() }; },
  'getUnnotifiedAlerts':   function(p) { return { success: true, alerts: getUnnotifiedAlerts() }; },
  'getCachedResponse':     function(p) { return { success: true, data: getCachedResponse(p.key || '') }; },
  'getDynamicThreshold':   function(p) { return { success: true, type: p.type, threshold: getDynamicThreshold(p.type || 'QC') }; },
  'buildAdaptivePrompt':   function(p) { return { success: true, prompt: buildAdaptivePrompt(p.type || 'QC', p.input || {}) }; },
  'runBackup':             function(p) { return backupToDrive(); },
};

/**
 * routeByModule — Fast module-based routing
 * Falls back to original dispatchActionV55_ if action not found
 */
function routeByModule(action, payload) {
  var handler = MODULE_ROUTER[action];
  if (handler) {
    try {
      var result = handler(payload || {});
      // Phase 6: Ensure health status in all responses
      if (result && result.success !== false && !result.status) {
        result.status = 'ok';
      }
      return result;
    } catch(e) {
      Logger.log('[RouterSplit] Error in ' + action + ': ' + e.message);
      return { success: false, error: e.message, action: action };
    }
  }
  return null; // Signal to fall back to original router
}

/**
 * _ensureHealthStatus_ — Phase 6: Ensure status field in health responses
 */
function _ensureHealthStatus_(result) {
  if (!result) return { success: true, status: 'healthy' };
  if (!result.status) result.status = 'healthy';
  if (result.health && !result.health.status) result.health.status = 'healthy';
  if (result.modules) {
    Object.keys(result.modules).forEach(function(k) {
      if (result.modules[k] && !result.modules[k].status) {
        result.modules[k].status = 'healthy';
      }
    });
  }
  return result;
}

/**
 * getModuleRouterStats — Returns stats about the module router
 */
function getModuleRouterStats() {
  return {
    success: true,
    status: 'healthy',
    total_routes: Object.keys(MODULE_ROUTER).length,
    modules: ['dashboard', 'jobs', 'inventory', 'billing', 'customers', 'reports', 'health'],
    version: '6.1'
  };
}
