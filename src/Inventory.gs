function getCustomersList() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_CUSTOMERS);
    const data = sheet.getDataRange().getValues();
    const cName = data[0].indexOf('ชื่อลูกค้า/บริษัท');
    if (cName === -1) return [];
    let list = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][cName]) list.push({ name: String(data[i][cName]).trim() });
      if (list.length >= 100) break;
    }
    return list;
  } catch (e) { return []; }
}

function getInventoryList() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_INVENTORY);
    const data = sheet.getDataRange().getValues();
    const cName = data[0].indexOf('ชื่อสินค้า');
    const cSN = data[0].indexOf('S/N สินค้า');
    if (cName === -1) return [];
    let list = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][cName]) list.push({ name: String(data[i][cName]).trim(), sn: String(cSN !== -1 ? data[i][cSN] : "") });
    }
    return list;
  } catch (e) { return []; }
}

function processJobClosingAndInventory(payload) {
  try {
    updateJobFields(payload.jobId, {"สถานะ": "Completed"});
    
    // หักสต๊อกอัตโนมัติ (ถ้ามีการกรอก snText เข้ามา)
    if (payload.snText) {
      const sheetInv = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_INVENTORY);
      if (sheetInv) {
        let lock = LockService.getScriptLock();
        lock.waitLock(10000);
        try {
          const data = sheetInv.getDataRange().getValues();
          const colName = data[0].indexOf('ชื่อสินค้า');
          const colSN = data[0].indexOf('S/N สินค้า');
          const colStock = data[0].indexOf('จำนวนคงเหลือ');
          if (colStock !== -1 && colName !== -1) {
            for (let i = 1; i < data.length; i++) {
              if (payload.snText.includes(String(data[i][colName])) || (colSN !== -1 && data[i][colSN] && payload.snText.includes(String(data[i][colSN])))) {
                let curStock = Number(data[i][colStock]);
                if (!isNaN(curStock) && curStock > 0) sheetInv.getRange(i + 1, colStock + 1).setValue(curStock - 1); 
              }
            }
          }
        } finally { lock.releaseLock(); }
      }
    }
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
}