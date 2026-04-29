// COMPHONE SUPER APP v5.9.0-phase2d
// ============================================================
// RetailSale.gs — POS / ขายหน้าร้าน Module
// ============================================================
// Sheet: DBRETAILSALES
// Columns: sale_id | created_at | cashier | items_json | subtotal | vat_amount | total | payment_method | customer_name | note

var RETAIL_SALE_SHEET = 'DBRETAILSALES';
var RETAIL_SALE_COLS = {
  SALE_ID: 1,
  CREATED_AT: 2,
  CASHIER: 3,
  ITEMS_JSON: 4,
  SUBTOTAL: 5,
  VAT_AMOUNT: 6,
  TOTAL: 7,
  PAYMENT_METHOD: 8,
  CUSTOMER_NAME: 9,
  NOTE: 10
};

/**
 * createRetailSale_(payload)
 * สร้างรายการขายหน้าร้าน
 * payload: { items: [{name, qty, price}], payment_method, customer_name, note, cashier }
 */
function createRetailSale_(payload) {
  try {
    payload = payload || {};
    var items = payload.items || [];
    if (!items.length) return { success: false, error: 'ต้องมีสินค้าอย่างน้อย 1 รายการ' };

    var ss = (typeof getComphoneSheet === 'function') ? getComphoneSheet() : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sheet = ss.getSheetByName(RETAIL_SALE_SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(RETAIL_SALE_SHEET);
      sheet.appendRow(['sale_id','created_at','cashier','items_json','subtotal','vat_amount','total','payment_method','customer_name','note']);
    }

    // คำนวณยอด
    var subtotal = items.reduce(function(sum, i) { return sum + ((i.price || 0) * (i.qty || 1)); }, 0);
    var vatRate = payload.vat_rate !== undefined ? parseFloat(payload.vat_rate) : 0.07;
    var vatAmount = Math.round(subtotal * vatRate);
    var total = subtotal + vatAmount;

    // สร้าง sale_id
    var saleId = 'SALE-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd') + '-' + String(Date.now()).slice(-4);

    var now = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM HH:mm');
    sheet.appendRow([
      saleId,
      now,
      payload.cashier || payload.username || 'CASHIER',
      JSON.stringify(items),
      subtotal,
      vatAmount,
      total,
      payload.payment_method || 'cash',
      payload.customer_name || '',
      payload.note || ''
    ]);

    // ตัดสต็อกอัตโนมัติ (ถ้ามี item_code)
    items.forEach(function(item) {
      if (item.item_code && typeof scanWithdrawStock === 'function') {
        try {
          scanWithdrawStock({ item_code: item.item_code, qty: item.qty || 1, note: 'POS Sale: ' + saleId });
        } catch(e) {}
      }
    });

    return {
      success: true,
      sale_id: saleId,
      subtotal: subtotal,
      vat_amount: vatAmount,
      total: total,
      message: 'บันทึกการขายสำเร็จ'
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * listRetailSales_(payload)
 * ดึงรายการขายหน้าร้าน
 * payload: { limit, date_from, date_to, cashier }
 */
function listRetailSales_(payload) {
  try {
    payload = payload || {};
    var ss = (typeof getComphoneSheet === 'function') ? getComphoneSheet() : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    var sheet = ss.getSheetByName(RETAIL_SALE_SHEET);
    if (!sheet) return { success: true, items: [], total_count: 0 };

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { success: true, items: [], total_count: 0 };

    var limit = parseInt(payload.limit || 50, 10);
    var rows = data.slice(1).reverse(); // ล่าสุดก่อน

    var items = rows.slice(0, limit).map(function(r) {
      var itemsArr = [];
      try { itemsArr = JSON.parse(r[RETAIL_SALE_COLS.ITEMS_JSON - 1] || '[]'); } catch(e) {}
      return {
        sale_id: r[RETAIL_SALE_COLS.SALE_ID - 1],
        created_at: r[RETAIL_SALE_COLS.CREATED_AT - 1],
        cashier: r[RETAIL_SALE_COLS.CASHIER - 1],
        items: itemsArr,
        subtotal: r[RETAIL_SALE_COLS.SUBTOTAL - 1],
        vat_amount: r[RETAIL_SALE_COLS.VAT_AMOUNT - 1],
        total: r[RETAIL_SALE_COLS.TOTAL - 1],
        payment_method: r[RETAIL_SALE_COLS.PAYMENT_METHOD - 1],
        customer_name: r[RETAIL_SALE_COLS.CUSTOMER_NAME - 1],
        note: r[RETAIL_SALE_COLS.NOTE - 1]
      };
    });

    return { success: true, items: items, total_count: rows.length };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * getRetailSaleSummary_(payload)
 * สรุปยอดขายหน้าร้าน
 */
function getRetailSaleSummary_(payload) {
  try {
    var res = listRetailSales_({ limit: 1000 });
    if (!res.success) return res;
    var items = res.items || [];

    var today = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM');
    var todayItems = items.filter(function(i) { return String(i.created_at || '').startsWith(today); });

    var totalRevenue = items.reduce(function(s, i) { return s + (parseFloat(i.total) || 0); }, 0);
    var todayRevenue = todayItems.reduce(function(s, i) { return s + (parseFloat(i.total) || 0); }, 0);
    var totalVat = items.reduce(function(s, i) { return s + (parseFloat(i.vat_amount) || 0); }, 0);

    return {
      success: true,
      summary: {
        total_sales: items.length,
        today_sales: todayItems.length,
        total_revenue: totalRevenue,
        today_revenue: todayRevenue,
        total_vat: totalVat,
        avg_sale: items.length ? Math.round(totalRevenue / items.length) : 0
      }
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
