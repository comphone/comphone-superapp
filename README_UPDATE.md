# README_UPDATE.md

## รอบอัปเดตนี้แก้อะไรบ้าง

### 1) Inventory.gs
ยกระดับเป็น movement-based inventory และเพิ่ม robustness ดังนี้:
- รองรับตัดสต๊อกหลายรายการ
- รองรับคืนสต๊อก
- บันทึก `DB_STOCK_MOVEMENTS`
- บันทึก `DB_JOB_ITEMS`
- รองรับ fallback จาก `snText` แบบ legacy
- เพิ่ม `try-catch` ในฟังก์ชันสำคัญ
- ถ้าเกิด error จะ log ลง `DB_SYSTEM_LOGS`
- เพิ่ม JSDoc เพื่ออธิบายหน้าที่ของแต่ละฟังก์ชัน

### 2) Utils.gs
เพิ่ม helper สำคัญสำหรับ inventory และ logging:
- `INVENTORY_SCHEMA`
- `ensureSystemLogSheetReady()`
- `logSystemError()`
- `getSheet()` / `tryGetSheet()`
- `ensureSheetWithHeaders()`
- `mapRowByHeaders()`
- `_appendRowByHeaders()`
- `formatDateBkk()`
- `safeTrim()`
- `toNumber()`
- `toBoolean()`
- `splitSerials()`

### 3) Notifications.gs
คง LINE Messaging API แบบ modular และรองรับ:
- อ่าน token/group จาก `PropertiesService` ก่อน
- fallback ไป `CONFIG`
- ส่งแจ้งเตือนงานใหม่
- ส่งแจ้งเตือน low stock summary

### 4) Tests.gs
เพิ่มไฟล์ test สำหรับรันทดสอบ inventory flow:
- `testInventoryFlow()`
- สร้าง item mock ถ้ายังไม่มี
- ทดสอบ stock out
- ทดสอบ return stock
- สรุปผลกลับเป็น object

---

## โครงสร้างชีทที่ระบบ inventory ใช้

### DB_INVENTORY
- ItemID
- SKU
- ชื่อสินค้า
- หมวดหมู่
- หน่วย
- จำนวนคงเหลือ
- MinStock
- ต้นทุนเฉลี่ย
- ราคาขาย
- SerialRequired
- สถานะ

### DB_STOCK_MOVEMENTS
- MoveID
- วันที่เวลา
- JobID
- ItemID
- SKU
- ชื่อสินค้า
- ประเภท
- จำนวน
- หน่วย
- SerialNumber
- หมายเหตุ
- ผู้ทำรายการ
- อ้างอิงเอกสาร

### DB_JOB_ITEMS
- JobItemID
- JobID
- ItemID
- SKU
- ชื่อสินค้า
- จำนวน
- หน่วย
- SerialNumber
- ประเภท
- หมายเหตุ
- ผู้ทำรายการ
- วันที่เวลา
- สถานะรายการ

### DB_SYSTEM_LOGS
- LogID
- วันที่เวลา
- โมดูล
- ข้อความ
- รายละเอียด
- StackTrace

---

## ไฟล์ที่ได้รับผลกระทบ
- `src/Inventory.gs`
- `src/Utils.gs`
- `src/Notifications.gs`
- `src/Tests.gs`
- `src/Config.gs` (รอบก่อนหน้า)

---

## การใช้งานเบื้องต้น
1. ตรวจว่า `DB_INVENTORY` มี header ตรงตาม schema
2. ไม่จำเป็นต้องสร้าง `DB_STOCK_MOVEMENTS`, `DB_JOB_ITEMS`, `DB_SYSTEM_LOGS` เอง ถ้าเรียก flow inventory ระบบจะสร้างให้
3. รันทดสอบด้วย `testInventoryFlow()` จาก Apps Script editor
4. เช็คผล error/log ที่ชีท `DB_SYSTEM_LOGS`
