# 🧠 Session Context — COMPHONE SUPER APP V5.9.0-phase2d

> **เวอร์ชัน:** v5.9.0-phase2d | **อัปเดต:** 27 เมษายน 2569 | **สถานะ:** 🟢 PRODUCTION — Phase 29 Complete + All Systems Operational
> **ไฟล์นี้คือ "สมองสำรอง" ของ AI — อ่านก่อนเริ่มงานทุกครั้ง**

## 👤 User Context

| รายการ | ข้อมูล |
|--------|--------|
| **ตัวตน / บทบาท** | เจ้าของร้านซ่อมคอมพิวเตอร์/มือถือ (Owner) + ทีมช่าง (Technicians) |
| **ชื่อบริษัท** | หจก.คอมโฟน แอนด์ อิเล็คโทรนิคส์ |
| **ลักษณะการใช้งาน** | Hybrid — Mobile PWA สำหรับช่างหน้างาน / PC Dashboard สำหรับ Admin/บัญชี |
| **เป้าหมาย** | บริหารจัดการงานซ่อม, สต็อก, CRM, การเงิน ครบวงจรผ่าน GAS |
| **ทีมงาน** | ช่างโต้, ช่างเหม่ง, ช่างรุ่ง (ข้อมูลจริงจาก DBJOBS) |
| **ความต้องการพิเศษ** | Mobile-first, ทำงานอัตโนมัติสูงสุด, AI ช่วยเขียนโค้ด/push/deploy เอง |

## 🏢 Project Overview

| รายการ | ข้อมูล |
|--------|--------|
| **ชื่อระบบ** | COMPHONE SUPER APP V5.9.0-phase2d |
| **ประเภท** | ERP / POS / Job Management System |
| **สถาปัตยกรรม** | GAS Backend + PWA Single Page Application (SPA) |
| **ฐานข้อมูล** | Google Sheets (13 tables) |
| **GitHub** | https://github.com/comphone/comphone-superapp |
| **GAS Script ID** | `1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043` |
| **Spreadsheet ID** | `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` |
| **GAS Deploy** | @497 (ล่าสุด) — Online ✅ |
| **PWA URL** | https://comphone.github.io/comphone-superapp/pwa/ |
| **API Keys Registry** | `memory/API_KEYS_REGISTRY.md` |
| **Skills Context** | `memory/SKILLS_CONTEXT.md` |
| **ข้อมูลจริง** | 19+ งาน (J0001–J0020) ใน DBJOBS |

## ⚙️ Tech Stack

| Layer | เทคโนโลยี | รายละเอียด |
|-------|-----------|-----------|
| **Backend** | Google Apps Script (GAS) V8 Runtime | doPost() → Router.gs → Modules |
| **Frontend** | PWA — HTML5 + Bootstrap 5.3 + Font Awesome 6 | SPA ซ่อน/แสดง `<div id="section-xxx">` |
| **Database** | Google Sheets | 13 sheets ครบ |
| **Notification** | LINE Messaging API + LINE Notify | Multi-channel, role-based routing (5 กลุ่ม) |
| **AI** | Gemini API (Flash) | Slip verification, Smart Assignment, Vision Analysis |
| **Storage** | Google Drive | รูปภาพงาน (ROOT_FOLDER_ID), PDF ใบเสร็จ |
| **Charts** | Chart.js | Dashboard KPI |
| **Voice** | Web Speech API | Voice Search (th-TH) |
| **GPS** | GpsPipeline.gs | Geofence + Route Optimization |

## 📊 Current System State (2026-04-27)

| Component | Version/Status | Details |
|-----------|----------------|---------|
| **Config.gs** | v5.9.0-phase2d | VERSION: '5.9.0-phase2d' ✅ |
| **GitHub** | b9adb13 → e0a2f2e | BLUEPRINT.md updated (GAS@497 fix) ✅ |
| **PWA Sections** | 4 sections | section-content (Index.html) ✅ |
| **System Sections** | 11 sections | According to Memory record ✅ |
| **GAS Deploy** | @497 | Production stable ✅ |
| **Google Drive** | v5.9.0-phase2d_20260426_1025 | Sync pending (token check needed) ⚠️ |
| **Telegram Gateway** | FIXED | Config.yaml token quotes removed ✅ |
| **Government Price Refs** | 2 files | Computer(2568), CCTV(2564) → saved in Memory ✅ |

## 🎯 Immediate Priorities (Next Steps)

1. **Verify GAS @497**: Install clasp → `clasp deployments` to confirm
2. **Complete GDrive Sync**: Check token.json → re-run `drive_sync.py --all`
3. **Phase 30 Planning**: CCTV & Computer Quotation Module (using price refs)
4. **Session File**: This file updated to v5.9.0-phase2d ✅

---
*Updated: 2026-04-27 17:00 by Hermes Agent*
*Golden Rule: After ANY update MUST: (1)Update BLUEPRINT.md, (2)Git commit+push, (3)Sync to GDrive, (4)Verify deployment.*
