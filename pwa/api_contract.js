(function(global) {
  'use strict';

  const API_CONTRACT = {
    version: '2026-05-02.phase35-partial',
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
        ],
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: 'bi-graph-up-arrow',
        actions: [
          { action: 'getReportData', payload: { period: 'month' }, required: true, read: true },
        ],
      },
      {
        id: 'billing',
        label: 'Billing',
        icon: 'bi-receipt-cutoff',
        actions: [
          { action: 'getBilling', payload: { job_id: '__SMOKE_EMPTY__' }, read: true, optional: true, smoke: false, smokeReason: 'requires a real job_id with an existing billing record' },
          { action: 'generatePromptPayQR', payload: { amount: 1, ref: 'SMOKE' }, read: true, optional: true },
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
          { action: 'getJobStateConfig', required: true },
          { action: 'getJobTimeline', payloadFrom: 'latestJob', required: true },
        ],
        writeActions: [
          { action: 'openJob', destructive: true },
          { action: 'addQuickNote', destructive: true },
          { action: 'transitionJob', destructive: true },
        ],
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
    ],
  };

  API_CONTRACT.protectedActions = API_CONTRACT.menus
    .flatMap(menu => menu.actions.map(item => Object.assign({ menu: menu.id }, item)));

  global.COMPHONE_API_CONTRACT = API_CONTRACT;
  if (typeof module !== 'undefined' && module.exports) module.exports = API_CONTRACT;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
