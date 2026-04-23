# COMPHONE SUPER APP — QUICK REFERENCE

> อัปเดต: 17 เมษายน 2026 | v5.5.3 @439

## URLs ที่ใช้บ่อย

| รายการ | URL |
|--------|-----|
| **GAS API (หลัก)** | `https://script.google.com/macros/s/AKfycby-IRTHbHMfCZ8TiXSAJ8zr_T6xQcmJNvGNYYI2X2VoAEMPwYtHwlCp1mf9f6IzWSSJfQ/exec` |
| **LINE Webhook** | `https://comphone-line-webhook.narinoutagit.workers.dev/line/webhook` |
| **PWA** | `https://comphone.github.io/comphone-superapp/pwa/` |
| **Google Sheets DB** | `https://docs.google.com/spreadsheets/d/19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` |
| **GitHub** | `https://github.com/comphone/comphone-superapp` |

## Login
- Username: `admin` | Password: `admin1234` | Role: OWNER

## LINE Groups
| กลุ่ม | ID |
|-------|-----|
| TECHNICIAN | `C8ad22a115f38c9ad3cb5ea5c2ff4863b` |
| ACCOUNTING | `C7b939d1d367e6b854690e58b392e88cc` |
| PROCUREMENT | `Cfd103d59e77acf00e2f2f801d391c566` |
| SALES | `Cb7cc146227212f70e4f171ef3f2bce15` |
| EXECUTIVE | `Cb85204740fa90e38de63c727554e551a` |

## Deploy Commands
```bash
# GAS push
python3.11 /home/ubuntu/refresh_clasp_push.py

# Cloudflare Worker
cd /home/ubuntu/comphone-line-webhook && wrangler deploy

# GitHub
cd /home/ubuntu/github-clone && git add -A && git commit -m "..." && git push origin main
```

## Cloudflare
- Account ID: `838d6a5a046bfaa2a2003bd8005dd80b`
- API Token: `cfut_Dt***...***40b5843` (ดูใน Cloudflare Dashboard)
- Worker: `comphone-line-webhook`

## Gemini API Key
`AQ.Ab8R***...***OTgQ` (ดูใน Google AI Studio)

## รายละเอียดเพิ่มเติม
ดู `/docs/MASTER_BLUEPRINT.md`
