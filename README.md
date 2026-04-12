# COMPHONE SUPER APP V5.5

ระบบจัดการงานซ่อม ลูกค้า สต็อก และทีมช่าง สำหรับร้าน COMPHONE  
พัฒนาบน **Google Apps Script (GAS)** + **Bootstrap 5.3** + **LINE Bot**

---

## โครงสร้าง Repository

| โฟลเดอร์ | คำอธิบาย |
|----------|----------|
| `clasp-ready/` | ซอร์สโค้ดทั้งหมดที่พร้อม deploy ผ่าน clasp |
| `docs/` | Blueprint, Memory Log, และเอกสารการพัฒนา |
| `Shop_vnext/` | โค้ดเวอร์ชันก่อนหน้า (archived) |
| `.github/workflows/` | GitHub Actions สำหรับ Auto Backup |

---

## ฟีเจอร์หลัก (V5.5)

- **Smart Dashboard** — KPI Cards, Revenue Tracking, Smart Search, Voice Search
- **Job Management** — 12-Step Workflow, Photo Gallery, Timeline, Status Editor
- **Inventory System** — คลัง 3 ชั้น (Main → Site → Van), แจ้งเตือนสต็อกต่ำ
- **CRM** — จัดการลูกค้า, ประวัติการซ่อม, Predictive Maintenance
- **Team & Attendance** — Clock In/Out, รายงานการทำงาน, Tech Summary
- **After-Sales** — ติดตามงานหลังการขาย, แจ้งเตือน PM, บันทึก Follow-up
- **LINE Bot** — รับงาน, อัปเดตสถานะ, แจ้งเตือนอัตโนมัติ

---

## การ Deploy

```bash
# ติดตั้ง clasp
npm install -g @google/clasp

# Login
clasp login

# Push โค้ด
cd clasp-ready
clasp push
```

---

## Auto Backup

ระบบ GitHub Actions จะสร้าง **Backup Tag** อัตโนมัติทุกวัน 09:00 น. (เวลาไทย)  
สามารถดู Tags ได้ที่: [Releases & Tags](https://github.com/comphone/comphone-superapp/tags)

---

## เอกสาร

- [Blueprint หลัก](docs/BLUEPRINT.md)
- [Memory Log การพัฒนา](docs/DEV_MEMORY.md)
- [แผนเมนูในอนาคต](docs/BLUEPRINT_MENU_PLAN.md)
