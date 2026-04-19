# COMPHONE SUPER APP V5.5.8

ระบบจัดการงานซ่อม ลูกค้า สต็อก และทีมช่าง สำหรับร้าน COMPHONE  
พัฒนาบน **Google Apps Script (GAS)** + **Progressive Web App (PWA)** + **LINE Bot**

---

## 🏛️ Architecture (V5.5.8 — API-Only)

| Layer | Technology | URL | Role |
|-------|-----------|-----|------|
| **Backend** | Google Apps Script | `...exec` | **API ONLY** — JSON responses เท่านั้น |
| **Frontend** | PWA (GitHub Pages) | [`/pwa/`](https://comphone.github.io/comphone-superapp/pwa/) | **UI Source — SINGLE SOURCE OF TRUTH** |
| **Database** | Google Sheets | — | Data Storage |
| **Notifications** | LINE Bot | — | Push Alerts |

> ⚠️ **RULE: GAS เป็น API Backend เท่านั้น** — ไม่มี HtmlService อีกต่อไป (V5.5.8+)  
> ✅ **UI Source = PWA ONLY** — ทุก navigation ไปที่ PWA Dashboard เท่านั้น

---

## 🔗 URLs

| ชื่อ | URL |
|------|-----|
| **PWA Dashboard (Production)** | `https://comphone.github.io/comphone-superapp/pwa/` |
| **GAS API Endpoint** | `https://script.google.com/macros/s/AKfycbxbIBi05t_3e2dpLbOyHkQs9Ddzky_mFUYAs7y9jBJBcPc_s_ZnMuJp5i-IlzDfqdVgyg/exec` |

---

## 📡 API Endpoints (GET)

| Endpoint | Description |
|----------|-------------|
| `?action=health` | Health Check — ตรวจสอบสถานะระบบ |
| `?action=getVersion` | Version Info |
| `?action=getDashboardData` | Dashboard KPIs |
| `?action=getJobQRData&jobId=...` | Job QR Data |
| `?action=getPhotoGalleryData&jobId=...` | Photo Gallery Data |
| (no action) | API Ready JSON + ui_url hint |

---

## โครงสร้าง Repository

| โฟลเดอร์ | คำอธิบาย |
|----------|----------|
| `clasp-ready/` | GAS Backend ทั้งหมด (API-Only, พร้อม deploy ผ่าน clasp) |
| `pwa/` | PWA Frontend — Single UI Source |
| `docs/` | Blueprint, Memory Log, และเอกสารการพัฒนา |
| `scripts/` | Python scripts สำหรับ sync + automation |
| `.github/workflows/` | GitHub Actions สำหรับ Auto Backup |

---

## ฟีเจอร์หลัก (V5.5.8)

- **Smart Dashboard** — KPI Cards, Revenue Tracking, Smart Search, Voice Search
- **Job Management** — 12-Step Workflow, Photo Gallery, Timeline, Status Editor
- **Inventory System** — คลัง 3 ชั้น (Main → Site → Van), แจ้งเตือนสต็อกต่ำ
- **CRM** — จัดการลูกค้า, ประวัติการซ่อม, Predictive Maintenance
- **Team & Attendance** — Clock In/Out, รายงานการทำงาน, Tech Summary
- **After-Sales** — ติดตามงานหลังการขาย, แจ้งเตือน PM, บันทึก Follow-up
- **LINE Bot** — รับงาน, อัปเดตสถานะ, แจ้งเตือนอัตโนมัติ
- **Security** — HMAC-SHA256 Token, CacheService Session, Auto-cleanup Trigger

---

## 🔐 Security (V5.5.8)

| Feature | Implementation |
|---------|---------------|
| Session Storage | `CacheService.getScriptCache()` (ไม่ใช้ ScriptProperties) |
| Token Format | `HMAC-SHA256 signed: <32hex>.<8hex>` |
| Token TTL | 6 ชั่วโมง (CacheService TTL) |
| Auto Cleanup | Trigger ทุก 6h → `cleanupSessions()` |
| Suspicious Activity | `logSuspiciousActivity_()` |

---

## การ Deploy

### GAS Backend

```bash
# ติดตั้ง clasp
npm install -g @google/clasp

# Login
clasp login

# Push โค้ด
cd clasp-ready
clasp push

# Deploy Web App ใหม่ใน GAS Editor
# → Deploy → New Deployment → Web App → Execute as Me → Anyone
```

### หลัง Deploy GAS ใหม่

เปิด GAS Editor → เลือก function `setupAllTriggers` → กด **Run** (ตั้ง triggers ทั้งหมด)

---

## Auto Backup

ระบบ GitHub Actions จะสร้าง **Backup Tag** อัตโนมัติทุกวัน 09:00 น. (เวลาไทย)  
สามารถดู Tags ได้ที่: [Releases & Tags](https://github.com/comphone/comphone-superapp/tags)

---

## เอกสาร

- [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) — Blueprint หลัก
- [CODE_STANDARD.md](CODE_STANDARD.md) — มาตรฐานการเขียนโค้ด
- [ANTI_REGRESSION.md](ANTI_REGRESSION.md) — Anti-pattern checklist
- [Blueprint หลัก](docs/BLUEPRINT.md)
- [Memory Log การพัฒนา](docs/DEV_MEMORY.md)
