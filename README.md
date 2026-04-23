# COMPHONE SUPER APP V5.6

ระบบจัดการงานซ่อม ลูกค้า สต็อก และทีมช่าง สำหรับร้าน COMPHONE  
พัฒนาบน **Google Apps Script (GAS)** + **PWA SPA** + **LINE Bot** + **Cloudflare Worker**

---

## 📘 Blueprint

> **Single Source of Truth:** [BLUEPRINT.md](BLUEPRINT.md)
> 
> อ่านไฟล์นี้ก่อนเริ่มงานทุกครั้ง — ครอบคลุมสถาปัตยกรรม ฟีเจอร์ URLs ความปลอดภัย deploy และกฎการออกแบบ

---

## โครงสร้าง Repository

| โฟลเดอร์ | คำอธิบาย |
|----------|----------|
| `clasp-ready/` | GAS Backend source (67 files) — deploy ผ่าน clasp |
| `pwa/` | PWA Frontend (47+ files) — deploy to GitHub Pages |
| `workers/line-webhook/` | Cloudflare Worker — LINE Webhook async proxy |
| `docs/` | เอกสารประกอบ (reviews, specs, audit logs) |
| `memory/` | AI session context |
| `.github/workflows/` | GitHub Actions (auto-deploy) |

---

## Quick Start

```bash
# Deploy ทั้งหมด (WSL)
bash deploy_all.sh

# หรือ deploy แยก
cd clasp-ready && clasp push --force && clasp deploy  # GAS
git push origin main                                    # GitHub Pages (auto)
```

---

## URLs สำคัญ

| รายการ | URL |
|--------|-----|
| **GAS API** | See `BLUEPRINT.md` §3 |
| **PWA Mobile** | https://comphone.github.io/comphone-superapp/pwa/ |
| **PC Dashboard** | https://comphone.github.io/comphone-superapp/pwa/dashboard_pc.html |
| **GitHub** | https://github.com/comphone/comphone-superapp |

---

## เอกสาร

- **[BLUEPRINT.md](BLUEPRINT.md)** — Single Source of Truth (Architecture, Features, Security, Deploy, Rules)
- **[memory/session.md](memory/session.md)** — AI Session Context (สมองสำรองของ Agent)
- **[FREEZE_POLICY.md](FREEZE_POLICY.md)** — Architecture Freeze Policy (PHMP v1)
