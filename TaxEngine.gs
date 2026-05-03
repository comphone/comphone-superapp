// ============================================================
// TaxEngine.gs — VAT Flexible + WHT (ภงด.) + Auto-Tax Engine
// COMPHONE SUPER APP v5.9.0-phase31a
// ============================================================
//
// TASK 1: VAT Flexible (VAT7 / ZERO / EXEMPT / MIXED)
// TASK 2: WHT (ภงด.) 1%, 3%, 5% — คำนวณ net payable
//
// ทุก action เขียน Audit Log ตาม RULE 5
// ทุกค่า Config ใช้ getConfig() ตาม RULE 4
// ============================================================

// ── Tax Mode Constants ──────────────────────────────────────
var TAX_MODE = {
  VAT7:   'VAT7',    // มี VAT 7%
  ZERO:   'ZERO',    // VAT 0% (ส่งออก/ผู้ประกอบการ VAT 0%)
  EXEMPT: 'EXEMPT',  // ไม่มี VAT (สินค้าได้รับยกเว้น)
  MIXED:  'MIXED'    // ใบเดียวมีทั้ง VAT และ EXEMPT
};

var WHT_RATE_MAP = {
  '1':  0.01,
  '3':  0.03,
  '5':  0.05,
  '0':  0.00
};

// ── Sheet Name สำหรับ Tax Report ────────────────────────────
var TAX_REPORT_SHEET = 'DB_TAX_REPORT';
var TAX_REPORT_HEADERS = [
  'Report_ID', 'Period', 'Bill_ID', 'Job_ID', 'Customer_Name',
  'Invoice_Date', 'Subtotal', 'VAT_Mode', 'VAT_Base', 'VAT_Amount',
  'WHT_Rate', 'WHT_Base', 'WHT_Amount', 'Total_Before_WHT', 'Net_Payable',
  'Payment_Status', 'Created_At'
];

// ============================================================
// 🔧 CORE: calculateTax(options)
// ============================================================
// options:
//   subtotal       — ยอดก่อนภาษี (required)
//   vat_mode       — 'VAT7' | 'ZERO' | 'EXEMPT' | 'MIXED' (default: getConfig TAX_MODE)
//   vat_base       — ยอดที่ต้องคำนวณ VAT (สำหรับ MIXED, default = subtotal)
//   wht_rate_pct   — 0 | 1 | 3 | 5 (default: getConfig WHT_RATE * 100)
//   wht_base       — ยอดที่ต้องหัก ณ ที่จ่าย (default = subtotal)
//   discount       — ส่วนลด (default 0)
// ============================================================
function calculateTax(options) {
  options = options || {};

  var subtotal   = roundMoney_(Number(options.subtotal || 0));
  var discount   = roundMoney_(Number(options.discount || 0));
  var netSubtotal = roundMoney_(subtotal - discount);

  // ── VAT Mode ──
  var vatMode = String(options.vat_mode || getConfig('TAX_MODE', TAX_MODE.VAT7)).toUpperCase();
  if (!TAX_MODE[vatMode]) vatMode = TAX_MODE.VAT7;

  var vatRate   = parseFloat(getConfig('VAT_RATE', 0.07));
  var vatBase   = roundMoney_(Number(options.vat_base !== undefined ? options.vat_base : netSubtotal));
  var vatAmount = 0;

  if (vatMode === TAX_MODE.VAT7) {
    vatAmount = roundMoney_(vatBase * vatRate);
  } else if (vatMode === TAX_MODE.ZERO) {
    vatAmount = 0;
  } else if (vatMode === TAX_MODE.EXEMPT) {
    vatAmount = 0;
    vatBase   = 0;
  } else if (vatMode === TAX_MODE.MIXED) {
    // vatBase = ส่วนที่ต้องเสีย VAT (ส่วนที่เหลือ = EXEMPT)
    vatAmount = roundMoney_(vatBase * vatRate);
  }

  var totalBeforeWht = roundMoney_(netSubtotal + vatAmount);

  // ── WHT (ภงด.) ──
  var whtRatePct = String(options.wht_rate_pct !== undefined ? options.wht_rate_pct : Math.round(parseFloat(getConfig('WHT_RATE', 0.03)) * 100));
  var whtRate    = WHT_RATE_MAP[whtRatePct] !== undefined ? WHT_RATE_MAP[whtRatePct] : 0.03;
  var whtBase    = roundMoney_(Number(options.wht_base !== undefined ? options.wht_base : netSubtotal));
  var whtAmount  = roundMoney_(whtBase * whtRate);
  var netPayable = roundMoney_(totalBeforeWht - whtAmount);

  return {
    subtotal:         subtotal,
    discount:         discount,
    net_subtotal:     netSubtotal,
    vat_mode:         vatMode,
    vat_rate:         vatRate,
    vat_base:         vatBase,
    vat_amount:       vatAmount,
    total_before_wht: totalBeforeWht,
    wht_rate_pct:     Number(whtRatePct),
    wht_rate:         whtRate,
    wht_base:         whtBase,
    wht_amount:       whtAmount,
    net_payable:      netPayable
  };
}

// ============================================================
// 🔧 applyTaxToBilling(billingData, taxOptions)
// ============================================================
// เพิ่มฟิลด์ภาษีเข้าไปใน billing object แล้ว return billing ใหม่
// ============================================================
function applyTaxToBilling(billingData, taxOptions) {
  taxOptions = taxOptions || {};
  billingData = billingData || {};

  var subtotal = roundMoney_(Number(billingData.subtotal || 0));
  var discount = roundMoney_(Number(billingData.discount || 0));

  var tax = calculateTax({
    subtotal:     subtotal,
    discount:     discount,
    vat_mode:     taxOptions.vat_mode || billingData.vat_mode,
    vat_base:     taxOptions.vat_base,
    wht_rate_pct: taxOptions.wht_rate_pct || billingData.wht_rate_pct,
    wht_base:     taxOptions.wht_base
  });

  return {
    subtotal:         tax.subtotal,
    discount:         tax.discount,
    vat_mode:         tax.vat_mode,
    vat_base:         tax.vat_base,
    vat_amount:       tax.vat_amount,
    wht_rate_pct:     tax.wht_rate_pct,
    wht_amount:       tax.wht_amount,
    total_before_wht: tax.total_before_wht,
    net_payable:      tax.net_payable,
    total_amount:     tax.net_payable,  // ยอดที่ลูกค้าต้องจ่ายจริง
    balance_due:      roundMoney_(Math.max(0, tax.net_payable - roundMoney_(Number(billingData.amount_paid || 0))))
  };
}

// ============================================================
// 🔧 calculateTaxFromBillingId(billingId, taxOptions)
// ============================================================
// คำนวณภาษีจาก Billing ID จริงใน DB_BILLING
// ============================================================
function calculateTaxFromBillingId(billingId, taxOptions) {
  try {
    taxOptions = taxOptions || {};
    if (!billingId) return { success: false, error: 'billingId is required' };

    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = findSheetByName(ss, BILLING_SHEET_NAME || 'DB_BILLING');
    if (!sh) return { success: false, error: 'DB_BILLING sheet not found' };

    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var lastRow  = sh.getLastRow();
    if (lastRow < 2) return { success: false, error: 'No billing records found' };

    var bidIdx = findHeaderIndex_(headers, ['Billing_ID', 'Bill_ID', 'billing_id']);
    var rows   = sh.getRange(2, 1, lastRow - 1, headers.length).getValues();
    var found  = null;
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][bidIdx] || '').trim() === String(billingId).trim()) {
        found = rows[i];
        break;
      }
    }
    if (!found) return { success: false, error: 'Billing not found: ' + billingId };

    var subtotalIdx = findHeaderIndex_(headers, ['Subtotal', 'subtotal']);
    var discountIdx = findHeaderIndex_(headers, ['Discount', 'discount']);
    var subtotal    = subtotalIdx > -1 ? Number(found[subtotalIdx] || 0) : 0;
    var discount    = discountIdx > -1 ? Number(found[discountIdx] || 0) : 0;

    var tax = calculateTax({
      subtotal:     subtotal,
      discount:     discount,
      vat_mode:     taxOptions.vat_mode,
      vat_base:     taxOptions.vat_base,
      wht_rate_pct: taxOptions.wht_rate_pct,
      wht_base:     taxOptions.wht_base
    });

    writeAuditLog('TAX_CALCULATE', taxOptions.user || 'SYSTEM', billingId + ' VAT=' + tax.vat_amount + ' WHT=' + tax.wht_amount, { result: 'success' });

    return { success: true, billing_id: billingId, tax: tax };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔧 saveTaxReport(billingId, jobId, tax, billingData)
// ============================================================
// บันทึก Tax Report ลง DB_TAX_REPORT sheet
// ============================================================
function saveTaxReport(billingId, jobId, tax, billingData) {
  try {
    billingData = billingData || {};
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };

    var sh = findSheetByName(ss, TAX_REPORT_SHEET);
    if (!sh) {
      sh = ss.insertSheet(TAX_REPORT_SHEET);
      sh.getRange(1, 1, 1, TAX_REPORT_HEADERS.length).setValues([TAX_REPORT_HEADERS]);
    }

    var now     = new Date();
    var period  = Utilities.formatDate(now, 'Asia/Bangkok', 'yyyy-MM');
    var reportId = 'TR' + Utilities.formatDate(now, 'Asia/Bangkok', 'yyyyMMddHHmmss');

    sh.appendRow([
      reportId,
      period,
      billingId || '',
      jobId || '',
      billingData.customer_name || '',
      billingData.invoice_date || Utilities.formatDate(now, 'Asia/Bangkok', 'yyyy-MM-dd'),
      tax.subtotal,
      tax.vat_mode,
      tax.vat_base,
      tax.vat_amount,
      tax.wht_rate_pct,
      tax.wht_base,
      tax.wht_amount,
      tax.total_before_wht,
      tax.net_payable,
      billingData.payment_status || 'UNPAID',
      Utilities.formatDate(now, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss')
    ]);

    return { success: true, report_id: reportId, period: period };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ============================================================
// 🔧 getTaxReport(period) — ดึง Tax Report รายเดือน
// ============================================================
// period: 'yyyy-MM' เช่น '2026-04' หรือ '' = เดือนปัจจุบัน
// ============================================================
function getTaxReport(period) {
  try {
    if (!period) period = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM');

    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sh = findSheetByName(ss, TAX_REPORT_SHEET);
    if (!sh || sh.getLastRow() < 2) return { success: true, period: period, records: [], summary: buildEmptyTaxSummary_(period) };

    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var rows    = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues();
    var periodIdx = findHeaderIndex_(headers, ['Period', 'period']);

    var records = [];
    for (var i = 0; i < rows.length; i++) {
      var rowPeriod = String(rows[i][periodIdx] || '').trim();
      if (rowPeriod === period) {
        records.push(buildTaxReportObject_(rows[i], headers));
      }
    }

    var summary = buildTaxSummary_(records, period);
    return { success: true, period: period, records: records, summary: summary };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function buildTaxReportObject_(row, headers) {
  var obj = {};
  TAX_REPORT_HEADERS.forEach(function (h, i) {
    var idx = findHeaderIndex_(headers, [h]);
    obj[h.toLowerCase()] = idx > -1 ? row[idx] : '';
  });
  return obj;
}

function buildTaxSummary_(records, period) {
  var totalSubtotal     = 0;
  var totalVatBase      = 0;
  var totalVatAmount    = 0;
  var totalWhtAmount    = 0;
  var totalNetPayable   = 0;
  var vatModeCount      = {};

  records.forEach(function (r) {
    totalSubtotal   += Number(r.subtotal   || 0);
    totalVatBase    += Number(r.vat_base   || 0);
    totalVatAmount  += Number(r.vat_amount || 0);
    totalWhtAmount  += Number(r.wht_amount || 0);
    totalNetPayable += Number(r.net_payable || 0);
    var mode = String(r.vat_mode || 'VAT7');
    vatModeCount[mode] = (vatModeCount[mode] || 0) + 1;
  });

  return {
    period:            period,
    record_count:      records.length,
    total_subtotal:    roundMoney_(totalSubtotal),
    total_vat_base:    roundMoney_(totalVatBase),
    total_vat_amount:  roundMoney_(totalVatAmount),
    total_wht_amount:  roundMoney_(totalWhtAmount),
    total_net_payable: roundMoney_(totalNetPayable),
    vat_mode_breakdown: vatModeCount
  };
}

// buildEmptyTaxSummary_ consolidated to Utils.gs (PHMP v1 dedup)

// ============================================================
// 🔧 API Handler: taxAction(data)
// ============================================================
// เรียกจาก Router.gs case 'calculateTax', 'getTaxReport', 'saveTaxReport'
// ============================================================
function taxAction(data) {
  data = data || {};
  var sub = String(data.sub || data.subAction || '').trim();

  if (sub === 'calculate' || sub === 'calculateTax') {
    var result = calculateTax({
      subtotal:     Number(data.subtotal || 0),
      discount:     Number(data.discount || 0),
      vat_mode:     data.vat_mode,
      vat_base:     data.vat_base !== undefined ? Number(data.vat_base) : undefined,
      wht_rate_pct: data.wht_rate_pct,
      wht_base:     data.wht_base !== undefined ? Number(data.wht_base) : undefined
    });
    writeAuditLog('TAX_CALCULATE_API', data.user || 'API', 'subtotal=' + data.subtotal + ' vat_mode=' + (data.vat_mode || 'default'), { result: 'success' });
    return { success: true, tax: result };
  }

  if (sub === 'report' || sub === 'getTaxReport') {
    return getTaxReport(data.period || '');
  }

  if (sub === 'save' || sub === 'saveTaxReport') {
    var tax2 = calculateTax({
      subtotal:     Number(data.subtotal || 0),
      discount:     Number(data.discount || 0),
      vat_mode:     data.vat_mode,
      wht_rate_pct: data.wht_rate_pct
    });
    return saveTaxReport(data.billing_id || '', data.job_id || '', tax2, data);
  }

  return { success: false, error: 'Unknown sub-action. Use: calculate | report | save' };
}

// ============================================================
// 🔧 Helper: roundMoney_ (ถ้ายังไม่ได้ประกาศใน scope นี้)
// roundMoney_ consolidated to Utils.gs (PHMP v1 dedup)
