# แผนการพัฒนาเมนูและฟีเจอร์ในอนาคต (COMPHONE SUPER APP V5.5)

จากการวิเคราะห์โครงสร้าง Blueprint และ API ทั้งหมดในระบบ V5.5 (อ้างอิงจาก `Router.gs` และ `CHANGELOG_V55_CLEANUP.md`) พบว่า **Dashboard ปัจจุบันถูกออกแบบมาให้รองรับการขยายตัว (Scalable) ตาม Blueprint หลักได้อย่างสมบูรณ์** 

สถาปัตยกรรมแบบ Single Page Application (SPA) ที่ใช้การซ่อน/แสดง Section (เช่น `showSection('dashboard')`) ทำให้สามารถเพิ่มเมนูใหม่ๆ ได้โดยไม่ต้องโหลดหน้าเว็บใหม่ ซึ่งสอดคล้องกับแนวทางของ `line-tasks-auto`

---

## 1. ความสามารถของ Dashboard ในการรองรับ Blueprint

ระบบ Backend (Google Apps Script) มี API เตรียมไว้รองรับฟีเจอร์ต่างๆ แล้ว ดังนี้:

### 1.1 ระบบงานและสถานะ (Job Management)
- **API ที่มีอยู่:** `getDashboardData`, `getJobStateConfig`, `transitionJob`, `updateJobById`, `addQuickNote`
- **การรองรับใน Dashboard:** รองรับแล้วผ่านหน้า Dashboard หลัก และ Job Detail Modal

### 1.2 ระบบคลังสินค้า (Inventory)
- **API ที่มีอยู่:** `inventoryOverview`, `transferStock`
- **การรองรับใน Dashboard:** รองรับแล้วผ่านหน้า "คลังสินค้า" (Inventory Section) ที่เพิ่งสร้างขึ้น

### 1.3 ระบบลูกค้า (Customer Management)
- **API ที่มีอยู่:** `createCustomer`, `updateCustomer`, `getCustomer`, `listCustomers`
- **การรองรับใน Dashboard:** ปัจจุบันยังไม่มี UI แต่สามารถสร้าง Section ใหม่ `section-customers` ได้ทันที

### 1.4 ระบบผู้ใช้งานและสิทธิ์ (Auth & RBAC)
- **API ที่มีอยู่:** `loginUser`, `logoutUser`, `verifySession`, `listUsers`, `createUser`, `updateUserRole`
- **การรองรับใน Dashboard:** ปัจจุบันยังไม่มี UI แต่สามารถสร้างหน้า "ตั้งค่าผู้ใช้งาน" ได้

### 1.5 ระบบลงเวลาและประวัติช่าง (Attendance & Tech History)
- **API ที่มีอยู่:** `clockIn`, `clockOut`, `getAttendanceReport`, `getTechHistory`, `getAllTechsSummary`
- **การรองรับใน Dashboard:** ปัจจุบันยังไม่มี UI แต่สามารถสร้างหน้า "ทีมช่าง" ได้

### 1.6 ระบบบริการหลังการขาย (After-Sales Service)
- **API ที่มีอยู่:** `createAfterSalesRecord`, `getAfterSalesDue`, `logAfterSalesFollowUp`, `getAfterSalesSummary`
- **การรองรับใน Dashboard:** ปัจจุบันยังไม่มี UI แต่สามารถสร้างหน้า "บริการหลังการขาย" ได้

---

## 2. แผนการสร้างเมนูใหม่ในอนาคต (Future Menu Plan)

เพื่อไม่ให้ Dashboard รกเกินไป ควรจัดกลุ่มเมนูตาม Navigation Bar (ทั้ง Desktop และ Mobile Bottom Nav) ดังนี้:

### 📱 โครงสร้าง Navigation ที่แนะนำ

1. **🏠 Dashboard (หน้าหลัก)**
   - ภาพรวมระบบ, KPI, รายได้, สถานะงานแบบ Grouped, งานล่าสุด, แจ้งเตือนด่วน
2. **📋 งาน (Jobs)**
   - ตารางงานทั้งหมด, ค้นหาขั้นสูง, กรองตามช่าง/สถานะ/วันที่, Kanban Board (ลากวางเปลี่ยนสถานะ)
3. **📦 คลังสินค้า (Inventory)**
   - ภาพรวมสต็อก 3 ชั้น, รับของเข้า, โอนย้าย, ประวัติการเบิกจ่าย
4. **👥 ลูกค้า & หลังการขาย (CRM)**
   - ฐานข้อมูลลูกค้า, ประวัติการซ่อม, แจ้งเตือนรอบ PM (Preventive Maintenance), บันทึกการติดตาม (Follow-up)
5. **⚙️ ตั้งค่า & ทีมงาน (Settings & Team)**
   - จัดการผู้ใช้งาน (RBAC), ดูเวลาเข้า-ออกงาน (Attendance), ประวัติการทำงานของช่าง

---

## 3. ตัวอย่างการเพิ่มเมนูใหม่ (Technical Implementation)

การเพิ่มเมนูใหม่ในอนาคตทำได้ง่ายมาก โดยทำตาม 3 ขั้นตอน:

### ขั้นตอนที่ 1: เพิ่ม HTML Section
```html
<!-- ในไฟล์ Index.html -->
<div id="section-customers" class="hidden">
  <div class="panel">
    <h2>ฐานข้อมูลลูกค้า</h2>
    <!-- ใส่ตารางลูกค้าตรงนี้ -->
  </div>
</div>
```

### ขั้นตอนที่ 2: เพิ่มปุ่มใน Navigation
```html
<!-- Desktop Nav -->
<li class="nav-item">
  <a class="nav-link" href="#" onclick="showSection('customers'); return false;">
    <i class="fas fa-users me-1"></i>ลูกค้า
  </a>
</li>

<!-- Mobile Bottom Nav -->
<a class="nav-item" href="#" onclick="showSection('customers'); return false;" id="bnav-customers">
  <i class="fas fa-users"></i>ลูกค้า
</a>
```

### ขั้นตอนที่ 3: เพิ่ม JavaScript Logic
```javascript
// ในไฟล์ JS_Part2.html
async function loadCustomers() {
  var result = await api.callServer('listCustomers');
  // Render ข้อมูลลงตาราง
}
```

---

## 4. สรุป

Dashboard ใหม่ที่ออกแบบมานี้ **พร้อมรองรับฟีเจอร์ทั้งหมดใน Blueprint** สถาปัตยกรรมแบบ Section-based ทำให้สามารถทยอยเพิ่มเมนูใหม่ๆ (เช่น CRM, Team Management) ได้โดยไม่กระทบกับโค้ดเดิม และยังคงความเร็วในการโหลดหน้าเว็บ (SPA) ไว้ได้เป็นอย่างดี
