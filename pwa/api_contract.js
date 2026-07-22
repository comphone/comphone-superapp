(function(global) {
  'use strict';

  const API_CONTRACT = {
    version: '2026-05-07.phase65-line-command-center',
    responseShape: {
      success: '{ success: true, data?, meta? }',
      failure: '{ success: false, error, code, kind?, action?, request_id? }',
    },
    publicActions: [
      { action: 'health', menu: 'System', description: 'GAS health check', noAuth: true },
      { action: 'getVersion', menu: 'System', description: 'Backend version', noAuth: true },
    ],
    menus: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'bi-speedometer2',
        actions: [
          { action: 'getDashboardBundle', read: true, optional: true },
          { action: 'getDashboardData', required: true, read: true },
          { action: 'getTechPerformance', payload: { days: 7 }, read: true },
          { action: 'getRetailSales', payload: { days: 7 }, read: true },
          { action: 'getAllTechsSummary', read: true },
        ],
      },
      {
        id: 'crm',
        label: 'CRM',
        icon: 'bi-people-fill',
        actions: [
          { action: 'listCustomers', required: true, read: true },
          { action: 'createCustomer', destructive: true },
          { action: 'getAfterSalesDue', read: true },
          { action: 'getAttendanceReport', payload: { days: 7 }, read: true },
          { action: 'getCustomerListWithStats', read: true },
          { action: 'getCRMMetrics', read: true },
        ],
      },
      {
        id: 'inventory',
        label: 'Inventory',
        icon: 'bi-box-seam-fill',
        actions: [
          { action: 'inventoryOverview', required: true, read: true },
          { action: 'barcodeLookup', payload: { barcode: '__SMOKE_EMPTY__' }, read: true, optional: true },
          { action: 'checkStock', read: true },
        ],
      },
      {
        id: 'po',
        label: 'Purchase Orders',
        icon: 'bi-cart-check-fill',
        actions: [
          { action: 'listPurchaseOrders', payload: { limit: 10 }, required: true, read: true },
          { action: 'createPurchaseOrder', destructive: true },
          { action: 'receivePurchaseOrder', destructive: true },
        ],
      },
      {
        id: 'warranty',
        label: 'Warranty',
        icon: 'bi-shield-check',
        actions: [
          { action: 'listWarranties', payload: { limit: 20 }, read: true },
          { action: 'getWarrantyByJobId', payload: { job_id: '__SMOKE_EMPTY__' }, read: true, optional: true, smoke: false, smokeReason: 'requires a real job_id or warranty_id' },
          { action: 'createWarranty', destructive: true },
          { action: 'updateWarrantyStatus', destructive: true },
        ],
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: 'bi-graph-up-arrow',
        actions: [
          { action: 'getReportData', payload: { period: 'month' }, required: true, read: true },
          { action: 'getAttendanceMonthlySummary', payload: { group_by: 'month' }, read: true },
          { action: 'getDashboardBundle', payload: {}, read: true, optional: true },
          { action: 'inventoryOverview', payload: {}, read: true },
          { action: 'analyzeBusiness', payload: { period: '7d' }, read: true, optional: true },
          { action: 'getDashboardAnalytics', payload: { period: 'month' }, read: true, optional: true },
        ],
      },
      {
        id: 'billing',
        label: 'Billing',
        icon: 'bi-receipt-cutoff',
        actions: [
          { action: 'listBillings', payload: { limit: 10 }, required: true, read: true },
          { action: 'getBilling', payload: { job_id: '__SMOKE_EMPTY__' }, read: true, optional: true, smoke: false, smokeReason: 'requires a real job_id with an existing billing record' },
          { action: 'generatePromptPayQR', payload: { amount: 1, ref: 'SMOKE' }, read: true, optional: true },
        ],
      },
      {
        id: 'vision',
        label: 'AI Vision',
        icon: 'bi-camera-fill',
        actions: [
          { action: 'getVisionDashboardStats', payload: { days: 7 }, required: true, read: true },
          { action: 'getVisionPipelineVersion', required: true, read: true },
          { action: 'getVisionLearningVersion', read: true, optional: true },
          { action: 'getVisionLineIngressStatus', read: true, optional: true },
          { action: 'getVisionFieldContext', payload: {}, read: true, optional: true },
          { action: 'getVisionActionSuggestions', payload: {}, read: true, optional: true },
          { action: 'previewVisionSuggestion', payload: {}, read: true, optional: true, smoke: false, smokeReason: 'requires a current suggestion id/vision context' },
          { action: 'getVisionReviewQueue', payload: { limit: 10, days: 30 }, read: true, optional: true },
          { action: 'getPhotoGalleryData', payload: { jobId: '__SMOKE_EMPTY__' }, read: true, optional: true, smoke: false, smokeReason: 'requires a real jobId with photo records' },
        ],
      },
      {
        id: 'line-center',
        label: 'LINE Center',
        icon: 'bi-broadcast-pin',
        actions: [
          { action: 'getLineCommandCenter', payload: { days: 7 }, required: true, read: true },
          { action: 'getLineRoomStatus', required: true, read: true },
          { action: 'getIntelAlertQueue', payload: { includeAcknowledged: false }, read: true },
          { action: 'getGroupedAlerts', read: true },
          { action: 'getAlertAnalytics', payload: { days: 7 }, read: true },
          { action: 'previewLineRoomMessage', payload: { rooms: ['EXECUTIVE'], message: 'SMOKE PREVIEW' }, read: true, optional: true },
        ],
      },
      {
        id: 'admin',
        label: 'Admin',
        icon: 'bi-shield-fill-check',
        roles: ['admin', 'owner', 'ADMIN', 'OWNER'],
        actions: [
          { action: 'getSecurityStatus', required: true, read: true },
          { action: 'getAuditLog', payload: { limit: 5 }, read: true },
          { action: 'listUsers', read: true },
          { action: 'cleanupSmokeTestRecords', payload: { execute: false }, read: true, optional: true, smoke: false, smokeReason: 'review/cleanup action for smoke-created records; destructive execution requires explicit confirmation' },
          { action: 'cleanupSmokeTestRecords', destructive: true, smoke: false, smokeReason: 'archive/delete reviewed smoke-created records only; requires DELETE_REVIEWED_SMOKE_RECORDS confirmation' },
          { action: 'getDataRepairStatus', read: true, optional: true },
          { action: 'previewDataRepair', payload: { period: 'month' }, read: true, optional: true },
          { action: 'getDataReviewLog', read: true, optional: true },
          { action: 'saveDataReviewLog', smoke: false, smokeReason: 'writes owner review notes/status only; does not repair production data' },
          { action: 'executeDataRepair', destructive: true, smoke: false, smokeReason: 'production data repair requires preview, owner confirmation, archive-before-change, and EXECUTE_REVIEWED_DATA_REPAIR confirmation' },
        ],
      },
    ],
    workflows: [
      {
        id: 'job_e2e',
        label: 'Job Workflow',
        description: 'Open job -> timeline -> status -> billing chain',
        readOnly: [
          { action: 'getDashboardData', required: true },
          { action: 'checkJobs', payload: { limit: 10 }, required: true },
          { action: 'getJobDetail', payloadFrom: 'latestJob', required: true },
          { action: 'getJobStateConfig', required: true },
          { action: 'getJobTimeline', payloadFrom: 'latestJob', required: true },
        ],
        writeActions: [
          { action: 'openJob', destructive: true },
          { action: 'addQuickNote', destructive: true },
          { action: 'transitionJob', destructive: true },
          { action: 'deleteJob', destructive: true, smoke: false, smokeReason: 'archives to DBJOBS_ARCHIVE before deleting from DBJOBS; requires admin/owner and DELETE_JOB confirmation' },
          { action: 'restoreJob', destructive: true, smoke: false, smokeReason: 'restores from DBJOBS_ARCHIVE to DBJOBS; requires admin/owner and RESTORE_JOB confirmation; blocked if JobID already exists live' },
        ],
      },
      {
        id: 'job_archive',
        label: 'Job Archive',
        description: 'Read and restore archived jobs from DBJOBS_ARCHIVE',
        readOnly: [
          { action: 'listJobArchive', payload: { limit: 20 }, required: true },
          { action: 'previewJobRestore', required: false, smoke: false, smokeReason: 'requires a real archived job_id' },
        ],
        writeActions: [],
      },
      {
        id: 'billing_payment',
        label: 'Billing & Payment',
        description: 'Billing lookup, QR, payment, receipt, tax handoff',
        readOnly: [
          { action: 'getDashboardData', required: true },
          { action: 'getBilling', payloadFrom: 'latestJob', optional: true },
          { action: 'listBillings', payload: { limit: 10 }, required: true },
          { action: 'generatePromptPayQR', payload: { amount: 1, ref: 'SMOKE' }, required: true },
        ],
        writeActions: [
          { action: 'createBilling', destructive: true },
          { action: 'markBillingPaid', destructive: true },
          { action: 'generateTaxInvoice', destructive: true },
        ],
      },
      {
        id: 'inventory_pos',
        label: 'Inventory & POS',
        description: 'Stock overview, barcode, transfer, low-stock, PO',
        readOnly: [
          { action: 'inventoryOverview', required: true },
          { action: 'barcodeLookup', payload: { barcode: '__SMOKE_EMPTY__' }, optional: true },
          { action: 'checkStock', required: true },
          { action: 'listPurchaseOrders', payload: { limit: 10 }, required: true },
        ],
        writeActions: [
          { action: 'transferStock', destructive: true },
          { action: 'addInventoryItem', destructive: true },
          { action: 'createPurchaseOrder', destructive: true },
        ],
      },
      {
        id: 'crm_after_sales',
        label: 'CRM & After-sales',
        description: 'Customer, history, schedule, follow-up, nudges',
        readOnly: [
          { action: 'listCustomers', required: true },
          { action: 'getCustomerListWithStats', required: true },
          { action: 'getCRMFollowUpSchedule', required: true },
          { action: 'getAfterSalesDue', payload: { days: 7 }, required: true },
          { action: 'getCRMMetrics', required: true },
        ],
        writeActions: [
          { action: 'createCustomer', destructive: true },
          { action: 'scheduleFollowUp', destructive: true },
          { action: 'logFollowUpResult', destructive: true },
          { action: 'nudgeSalesTeam', destructive: true },
        ],
      },
      {
        id: 'observability',
        label: 'Observability',
        description: 'Health, menu, audit, router, error telemetry',
        readOnly: [
          { action: 'health', noAuth: true, required: true },
          { action: 'getVersion', noAuth: true, required: true },
          { action: 'healthCheck', required: true },
          { action: 'getAuditLog', payload: { limit: 5 }, required: true },
          { action: 'getSecurityStatus', required: true },
        ],
      },
      {
        id: 'vision_ai',
        label: 'AI Vision',
        description: 'Photo capture -> AI analysis -> QC/slip/human review',
        readOnly: [
          { action: 'getVisionDashboardStats', payload: { days: 7 }, required: true },
          { action: 'getVisionPipelineVersion', required: true },
          { action: 'getVisionLearningVersion', optional: true },
          { action: 'getVisionLineIngressStatus', optional: true },
          { action: 'getVisionFieldContext', payload: {}, optional: true },
          { action: 'getVisionActionSuggestions', payload: {}, optional: true },
          { action: 'previewVisionSuggestion', payload: {}, optional: true, smoke: false, smokeReason: 'requires a current suggestion id/vision context' },
          { action: 'getVisionReviewQueue', payload: { limit: 10, days: 30 }, optional: true },
          { action: 'getPhotoGalleryData', payload: { jobId: '__SMOKE_EMPTY__' }, optional: true, smoke: false, smokeReason: 'requires a real jobId with photo records' },
        ],
        writeActions: [
          { action: 'handleProcessPhotos', destructive: true, smoke: false, smokeReason: 'requires image base64 and may write Drive/Sheets' },
          { action: 'uploadPhoto', destructive: true, smoke: false, smokeReason: 'requires image base64 and may write Drive/Sheets' },
          { action: 'runVisionPipeline', destructive: true, smoke: false, smokeReason: 'requires image input and may write VISION_LOG/human-review state' },
          { action: 'runQCPipeline', destructive: true, smoke: false, smokeReason: 'requires job/image context and may write Vision logs' },
          { action: 'runSlipVerifyPipeline', destructive: true, smoke: false, smokeReason: 'requires slip image context and may update verification logs' },
          { action: 'verifyPaymentSlip', destructive: true, smoke: false, smokeReason: 'requires real billing/slip image context' },
          { action: 'submitHumanReview', destructive: true, smoke: false, smokeReason: 'writes human review feedback for learning loop' },
          { action: 'linkVisionToJobTimeline', destructive: true, smoke: false, smokeReason: 'writes a Vision review note into the selected job timeline' },
          { action: 'executeVisionSuggestion', destructive: true, smoke: false, smokeReason: 'controlled execution gate for Vision suggestions; requires explicit confirmation and may write jobs/billing/LINE/timeline' },
        ],
      },
      {
        id: 'line_command_center',
        label: 'LINE Command Center',
        description: 'Room status -> alert queue -> ack tracking -> safe room push',
        readOnly: [
          { action: 'getLineCommandCenter', payload: { days: 7 }, required: true },
          { action: 'getLineRoomStatus', required: true },
          { action: 'getLineNotificationSettings', required: true },
          { action: 'getIntelAlertQueue', payload: { includeAcknowledged: false }, required: true },
          { action: 'getGroupedAlerts', required: true },
          { action: 'getAlertAnalytics', payload: { days: 7 }, required: true },
          { action: 'previewLineRoomMessage', payload: { rooms: ['EXECUTIVE'], message: 'SMOKE PREVIEW' }, optional: true },
        ],
        writeActions: [
          { action: 'acknowledgeLineAlert', destructive: true, smoke: false, smokeReason: 'requires an existing alert id and changes ack state' },
          { action: 'bulkAcknowledgeLineAlerts', destructive: true, smoke: false, smokeReason: 'changes ack state for pending alerts' },
          { action: 'queueLineCommandAlert', destructive: true, smoke: false, smokeReason: 'creates a dashboard alert' },
          { action: 'updateLineNotificationSettings', destructive: true, smoke: false, smokeReason: 'toggles outbound room notifications only; backend processing and audit logs remain active' },
          { action: 'sendLineRoomMessage', destructive: true, smoke: false, smokeReason: 'pushes a LINE message and requires explicit confirmation' },
        ],
      },
    ],
  };

  API_CONTRACT.protectedActions = API_CONTRACT.menus
    .flatMap(menu => menu.actions.map(item => Object.assign({ menu: menu.id }, item)));

  global.COMPHONE_API_CONTRACT = API_CONTRACT;
  if (typeof module !== 'undefined' && module.exports) module.exports = API_CONTRACT;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
