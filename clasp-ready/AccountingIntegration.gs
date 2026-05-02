// ===========================================================
// COMPHONE SUPER APP v5.13.0-phase35
// AccountingIntegration.gs — Phase 35.1: Accounting Software Integration
// ===========================================================
// ฟังก์ชันสำหรับส่งข้อมูลบิลไปยังซอฟต์แวร์บัญชีภายนอก (Express, QuickBooks, etc.)
// ===========================================================

/**
 * ส่งออกข้อมูลบิลไปยังซอฟต์แวร์บัญชี
 * @param {string} billId - ID ของบิลที่ต้องการส่ง
 * @returns {Object} JSON response {success: boolean, data?: any, error?: string}
 */
function exportBillToAccounting(billId) {
  try {
    // Auth check already done in Router.gs via _checkAuthGateV55_()
    // Public actions are handled by the auth gate; this function assumes caller is authorized.
    
    // 2. ดึงข้อมูลบิลจาก DB_BILLING
    const billData = getBillById_(billId);
    if (!billData) {
      return { success: false, error: 'Bill not found', code: 'BILL_NOT_FOUND' };
    }
    
    // 3. แปลงข้อมูลให้อยู่ในรูปแบบที่ซอฟต์แวร์บัญชีต้องการ
    const accountingData = formatBillForAccounting_(billData);
    
    // 4. ส่งข้อมูลไปยังซอฟต์แวร์บัญชี (จำลองการส่ง)
    const sendResult = simulateSendToAccountingSoftware_(accountingData);
    
    // 5. บันทึกประวัติการส่งใน Sheet (ถ้าต้องการ)
    logAccountingExport_(billId, sendResult);
    
    return {
      success: true,
      data: {
        billId: billId,
        accountingRef: sendResult.ref,
        status: sendResult.status
      },
      message: 'Export to accounting software successful (simulated)'
    };
  } catch (e) {
    logSystemError_('exportBillToAccounting', e, { billId });
    return { success: false, error: e.message, code: 'EXPORT_ERROR' };
  }
}

/**
 * ดึงข้อมูลบิลตาม ID (helper function)
 * @private
 */
function getBillById_(billId) {
  const ss = SpreadsheetApp.openById(DB_SS_ID);
  const sheet = ss.getSheetByName('DB_BILLING');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == billId) { // column A = billId
      const bill = {};
      headers.forEach((h, idx) => bill[h] = data[i][idx]);
      return bill;
    }
  }
  return null;
}

/**
 * แปลงข้อมูลบิลให้อยู่ในรูปแบบที่ซอฟต์แวร์บัญชีต้องการ
 * @private
 */
function formatBillForAccounting_(bill) {
  return {
    transactionDate: bill.billingDate || new Date().toISOString().split('T')[0],
    invoiceNumber: bill.billId,
    customerName: bill.customerName || 'Unknown',
    totalAmount: parseFloat(bill.total) || 0,
    taxAmount: parseFloat(bill.tax) || 0,
    subtotal: parseFloat(bill.subtotal) || 0,
    paymentMethod: bill.paymentMethod || 'Unknown',
    items: bill.items ? JSON.parse(bill.items) : [],
    notes: bill.notes || ''
  };
}

/**
 * จำลองการส่งข้อมูลไปยังซอฟต์แวร์บัญชี (ปัจจุบันใช้จำลอง)
 * @private
 */
function simulateSendToAccountingSoftware_(data) {
  // TODO: เชื่อมต่อกับ API จริงของซอฟต์แวร์บัญชี (Express, QuickBooks, etc.)
  // ตัวอย่างการจำลอง:
  const simulatedRef = 'ACC-' + new Date().getTime();
  const success = Math.random() > 0.1; // จำลองความสำเร็จ 90%
  
  if (success) {
    return {
      status: 'SUCCESS',
      ref: simulatedRef,
      message: 'Data sent to accounting software (simulated)'
    };
  } else {
    return {
      status: 'FAILED',
      ref: simulatedRef,
      message: 'Simulated failure: Accounting software unavailable'
    };
  }
}

/**
 * บันทึกประวัติการส่งออกบัญชี
 * @private
 */
function logAccountingExport_(billId, result) {
  try {
    const ss = SpreadsheetApp.openById(DB_SS_ID);
    let sheet = ss.getSheetByName('DB_ACCOUNTING_EXPORTS');
    
    // สร้าง Sheet ถ้ายังไม่มี
    if (!sheet) {
      sheet = ss.insertSheet('DB_ACCOUNTING_EXPORTS');
      sheet.appendRow(['Timestamp', 'Bill ID', 'Status', 'Reference', 'Message']);
    }
    
    sheet.appendRow([
      new Date().toISOString(),
      billId,
      result.status,
      result.ref || '',
      result.message || ''
    ]);
  } catch (e) {
    logSystemError_('logAccountingExport_', e, { billId, result });
  }
}

/**
 * ตรวจสอบสถานะการเชื่อมต่อกับซอฟต์แวร์บัญชี
 * @returns {Object} JSON response
 */
function checkAccountingConnection() {
  try {
    // จำลองการตรวจสอบการเชื่อมต่อ
    const isConnected = true; // TODO: ตรวจสอบการเชื่อมต่อจริง
    return {
      success: true,
      data: {
        connected: isConnected,
        software: 'Simulated Accounting Software',
        lastSync: new Date().toISOString()
      }
    };
  } catch (e) {
    return { success: false, error: e.message, code: 'CONNECTION_CHECK_ERROR' };
  }
}
