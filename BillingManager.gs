// ============================================================
// COMPHONE SUPER APP v5.9.0-phase31a
// BillingManager.gs — Master Billing Module Index
// Phase 31 Refactoring: Split into 3 sub-modules
//
// Sub-modules (auto-loaded by GAS global namespace):
//   BillingCore.gs    — autoGenerateBillingForJob, getBilling, sheet context, CRUD
//   BillingPayment.gs — generatePromptPayQR, verifyPaymentSlip, markBillingPaid, PromptPay helpers
//   BillingExport.gs  — generateReceiptPDF, buildReceiptHtml_, utility functions
//
// All sub-module functions are globally available to RouterSplit.gs MODULE_ROUTER
// ============================================================

var BILLING_SHEET_NAME = 'DB_BILLING';
var BILLING_DEFAULT_HEADERS = [
  'Billing_ID', 'Job_ID', 'Customer_Name', 'Phone', 'Parts_Description', 'Parts_Cost',
  'Labor_Cost', 'Subtotal', 'Discount', 'Total_Amount', 'Amount_Paid', 'Balance_Due',
  'Payment_Status', 'PromptPay_Biller_ID', 'PromptPay_Payload', 'PromptPay_QR_URL',
  'Slip_Image_URL', 'Slip_Payload', 'Transaction_Ref', 'Receipt_No', 'Receipt_File_ID',
  'Receipt_URL', 'Invoice_Date', 'Paid_At', 'Created_At', 'Updated_At', 'Notes'
];

// BillingManager.gs Phase 31 — All functions extracted to sub-modules above.
// This file serves as the single owner of BILLING_SHEET_NAME and BILLING_DEFAULT_HEADERS.
