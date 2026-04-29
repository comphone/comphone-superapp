# COMPHONE API Contract Matrix

Source of truth: `pwa/api_contract.js`

This matrix is the operational checklist for menu/API parity between Mobile PWA, PC Dashboard, and Google Apps Script. Required actions must return a normalized response:

```js
{ success: true, data, meta }
{ success: false, error, code, kind, action, request_id }
```

| Menu | Action | Auth | Required | Expected behavior |
|---|---|---:|---:|---|
| System | `health` | Public | Yes | Health endpoint returns `success:true` or `status:"healthy"`. |
| System | `getVersion` | Public | Yes | Backend version endpoint returns `success:true`. |
| Dashboard | `getDashboardData` | Protected | Yes | Main dashboard payload for Mobile and PC. |
| Dashboard | `getDashboardBundle` | Protected | Optional | Optimized PC dashboard bundle, fallback to `getDashboardData`. |
| Dashboard | `getTechPerformance` | Protected | Optional | Technician performance widget. |
| Dashboard | `getRetailSales` | Protected | Optional | Retail sales widget. |
| Dashboard | `getAllTechsSummary` | Protected | Optional | Technician summary used by quick actions/workflow. |
| CRM | `listCustomers` | Protected | Yes | Customer list for CRM and billing flows. |
| CRM | `getAfterSalesDue` | Protected | Optional | After-sales follow-up queue. |
| CRM | `getAttendanceReport` | Protected | Optional | Attendance summary embedded in CRM dashboard. |
| CRM | `getCustomerListWithStats` | Protected | Optional | Extended CRM table. |
| CRM | `getCRMMetrics` | Protected | Optional | CRM KPI panel. |
| Inventory | `inventoryOverview` | Protected | Yes | Inventory dashboard and POS stock source. |
| Inventory | `barcodeLookup` | Protected | Optional | Barcode lookup may return empty result for smoke payload. |
| Inventory | `checkStock` | Protected | Optional | Stock status/checking helper. |
| Purchase Orders | `listPurchaseOrders` | Protected | Yes | PO list view. |
| Reports | `getReportData` | Protected | Yes | Reports dashboard for selected period. |
| Billing | `getBilling` | Protected | Optional | Billing detail by job. Empty smoke payload may fail gracefully. |
| Billing | `generatePromptPayQR` | Protected | Optional | QR generation smoke with tiny synthetic amount. |
| Admin | `getSecurityStatus` | Admin/Owner | Yes | Security status panel. |
| Admin | `getAuditLog` | Admin/Owner | Optional | Recent audit log panel. |
| Admin | `listUsers` | Admin/Owner | Optional | User management panel. |

Smoke test command:

```powershell
node scripts\pwa_api_smoke.js
$env:COMPHONE_AUTH_TOKEN='YOUR_SESSION_TOKEN'; node scripts\pwa_api_smoke.js
$env:COMPHONE_SMOKE_OPTIONAL='1'; $env:COMPHONE_AUTH_TOKEN='YOUR_SESSION_TOKEN'; node scripts\pwa_api_smoke.js
```

Latest report path: `test_reports/pwa_api_smoke_latest.json`
