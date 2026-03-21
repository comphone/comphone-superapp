// ==========================================
// Tests.gs
// COMPHONE SUPER APP - BASIC INVENTORY TESTS
// ==========================================

/**
 * ทดสอบ flow inventory แบบ mock data โดยไม่ต้องอิงงานจริง
 * สิ่งที่ตรวจ:
 * 1) สร้างชีทที่จำเป็นถ้ายังไม่มี
 * 2) เติม mock item ถ้ายังไม่มี
 * 3) ตัดสต๊อก 1 รายการ
 * 4) คืนสต๊อกกลับ
 * 5) สรุปผลลัพธ์กลับเป็น object
 *
 * หมายเหตุ:
 * - ฟังก์ชันนี้มีผลกับชีทจริงของโปรเจกต์
 * - ใช้ item ทดสอบชื่อ TEST ITEM AUTO
 */
function testInventoryFlow() {
  try {
    ensureInventorySheetsReady();
    ensureSystemLogSheetReady();

    const inventorySheet = getSheet(CONFIG.SHEET_INVENTORY);
    const headers = inventorySheet.getDataRange().getValues()[0];
    const idxItemId = headers.indexOf('ItemID');
    const idxName = headers.indexOf('ชื่อสินค้า');
    const idxQty = headers.indexOf('จำนวนคงเหลือ');
    const idxUnit = headers.indexOf('หน่วย');
    const idxStatus = headers.indexOf('สถานะ');

    if (idxItemId === -1 || idxName === -1 || idxQty === -1) {
      throw new Error('DB_INVENTORY header ไม่ครบสำหรับ testInventoryFlow');
    }

    const testItemId = 'TEST-INV-001';
    const testItemName = 'TEST ITEM AUTO';
    let values = inventorySheet.getDataRange().getValues();
    let foundRow = -1;

    for (let i = 1; i < values.length; i++) {
      if (safeTrim(values[i][idxItemId]) === testItemId) {
        foundRow = i + 1;
        break;
      }
    }

    if (foundRow === -1) {
      const row = new Array(headers.length).fill('');
      row[idxItemId] = testItemId;
      row[idxName] = testItemName;
      row[idxQty] = 10;
      if (idxUnit !== -1) row[idxUnit] = 'ชิ้น';
      if (idxStatus !== -1) row[idxStatus] = 'Active';
      inventorySheet.appendRow(row);
      values = inventorySheet.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
        if (safeTrim(values[i][idxItemId]) === testItemId) {
          foundRow = i + 1;
          break;
        }
      }
    }

    inventorySheet.getRange(foundRow, idxQty + 1).setValue(10);

    const beforeQty = toNumber(inventorySheet.getRange(foundRow, idxQty + 1).getValue());

    const outResult = commitStockOutForJob({
      jobId: 'TEST-JOB-001',
      tech: 'SYSTEM TEST',
      reference: 'testInventoryFlow',
      items: [
        {
          itemId: testItemId,
          qty: 2,
          unit: idxUnit !== -1 ? String(inventorySheet.getRange(foundRow, idxUnit + 1).getValue() || 'ชิ้น') : 'ชิ้น',
          serialNumber: '',
          remark: 'test stock out'
        }
      ]
    });

    const afterOutQty = toNumber(inventorySheet.getRange(foundRow, idxQty + 1).getValue());

    const returnResult = returnInventoryFromJob({
      jobId: 'TEST-JOB-001',
      tech: 'SYSTEM TEST',
      reference: 'testInventoryFlow',
      items: [
        {
          itemId: testItemId,
          qty: 2,
          unit: idxUnit !== -1 ? String(inventorySheet.getRange(foundRow, idxUnit + 1).getValue() || 'ชิ้น') : 'ชิ้น',
          serialNumber: '',
          remark: 'test stock return'
        }
      ]
    });

    const afterReturnQty = toNumber(inventorySheet.getRange(foundRow, idxQty + 1).getValue());

    return {
      success: true,
      beforeQty: beforeQty,
      afterOutQty: afterOutQty,
      afterReturnQty: afterReturnQty,
      outResult: outResult,
      returnResult: returnResult,
      message: 'testInventoryFlow completed'
    };
  } catch (err) {
    logSystemError('testInventoryFlow', err, {});
    return apiError('testInventoryFlow', 'TEST_FAILED', err.message, { stack: err.stack || '' });
  }
}
