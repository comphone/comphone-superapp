# 🔐 CREDENTIALS & ACCESS KEYS — สำหรับ Agent ใหม่

> **⚠️ ไฟล์นี้เป็นความลับ ห้ามเปิดเผยต่อสาธารณะหรือ commit ลง GitHub โดยเด็ดขาด**

---

## 1. GitHub Access

| รายการ | ค่า |
|---|---|
| **Repository** | `https://github.com/comphone/comphone-superapp` |
| **Branch หลัก** | `main` |
| **GitHub Personal Access Token (PAT)** | `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` |
| **Git User Name** | `COMPHONE AI Dev` |
| **Git User Email** | `narinoutagit@gmail.com` |

**วิธีใช้ใน Agent (clone + push):**
```bash
git clone https://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@github.com/comphone/comphone-superapp.git
cd comphone-superapp
git config user.name "COMPHONE AI Dev"
git config user.email "narinoutagit@gmail.com"
```

---

## 2. Google Drive Access

| รายการ | ค่า |
|---|---|
| **วิธียืนยันตัวตน** | OAuth2 (refresh_token) |
| **Scope** | `https://www.googleapis.com/auth/drive` |
| **Client ID** | `732739758651-ldbsivb44ub1526hvrdtshcg6ncfcr9a.apps.googleusercontent.com` |
| **Client Secret** | `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` |
| **Refresh Token** | `1//04K5isR3QbzM1CgYIARAAGAQSNwF-L9IrVsfWWgxURGkOhAUPse3Gin4WSo2r6A-S9Vsg6ljmvxdE642JUbd4foQoppjjsaU86IQ` |
| **Token URI** | `https://oauth2.googleapis.com/token` |

**วิธีใช้ใน Python (อัปโหลดไฟล์ลง Drive):**
```python
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

creds = Credentials(
    token=None,
    refresh_token="1//04K5isR3QbzM1CgYIARAAGAQSNwF-L9IrVsfWWgxURGkOhAUPse3Gin4WSo2r6A-S9Vsg6ljmvxdE642JUbd4foQoppjjsaU86IQ",
    token_uri="https://oauth2.googleapis.com/token",
    client_id="732739758651-ldbsivb44ub1526hvrdtshcg6ncfcr9a.apps.googleusercontent.com",
    client_secret="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",
    scopes=["https://www.googleapis.com/auth/drive"]
)

service = build('drive', 'v3', credentials=creds)

# อัปโหลดไฟล์
file_metadata = {'name': 'COMPHONE_FINAL_HANDOVER_v1611.zip', 'parents': ['FOLDER_ID']}
media = MediaFileUpload('path/to/file.zip', mimetype='application/zip')
file = service.files().create(body=file_metadata, media_body=media, fields='id').execute()
print(f"Uploaded: {file.get('id')}")
```

---

## 3. Google Apps Script (GAS) — clasp Access

| รายการ | ค่า |
|---|---|
| **GAS Script ID** | `1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043` |
| **clasp Client ID** | `1072944905499-vm2v2i5dvn0a0d2o4ca36i1vge8cvbn0.apps.googleusercontent.com` |
| **clasp Client Secret** | `v6V3fKV_zWU7iw1DrpO1rknX` |
| **clasp Refresh Token** | `1//047RbRVcyVbeaCgYIARAAGAQSNwF-L9Irjppbue6nvl22e9jmB8AT2O287s7eU4X2Trot8LBcjrv5F7IIapz_04XzqXJCg5BW4Nc` |
| **clasp Scope** | drive, script.projects, script.deployments, script.webapp.deploy, cloud-platform |

**วิธีตั้งค่า .clasprc.json ใน Agent ใหม่:**
```bash
cat > ~/.clasprc.json << 'EOF'
{
  "token": {
    "access_token": "",
    "refresh_token": "1//047RbRVcyVbeaCgYIARAAGAQSNwF-L9Irjppbue6nvl22e9jmB8AT2O287s7eU4X2Trot8LBcjrv5F7IIapz_04XzqXJCg5BW4Nc",
    "scope": "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/script.projects https://www.googleapis.com/auth/script.deployments https://www.googleapis.com/auth/script.webapp.deploy https://www.googleapis.com/auth/cloud-platform",
    "token_type": "Bearer",
    "expiry_date": 9999999999999
  },
  "oauth2ClientSettings": {
    "clientId": "1072944905499-vm2v2i5dvn0a0d2o4ca36i1vge8cvbn0.apps.googleusercontent.com",
    "clientSecret": "v6V3fKV_zWU7iw1DrpO1rknX",
    "redirectUri": "http://localhost:8888"
  },
  "isLocalCreds": false
}
EOF
```

**วิธี push GAS ด้วย clasp:**
```bash
cd /path/to/github-clone/clasp-ready
clasp push
clasp deploy
```

---

## 4. OpenAI API (LLM Proxy)

| รายการ | ค่า |
|---|---|
| **API Key** | `sk-W5KT4JiPJZRqpkunmEP73y` |
| **Base URL** | `https://api.manus.im/api/llm-proxy/v1` |
| **Models ที่ใช้ได้** | `gpt-4.1-mini`, `gpt-4.1-nano`, `gemini-2.5-flash` |

**วิธีใช้ใน Python:**
```python
from openai import OpenAI
import os

client = OpenAI(
    api_key="sk-W5KT4JiPJZRqpkunmEP73y",
    base_url="https://api.manus.im/api/llm-proxy/v1"
)
```

---

## 5. สรุปการเข้าถึงที่ Agent ใหม่ทำได้ทันที

| ระบบ | สิทธิ์ | วิธีเข้าถึง |
|---|---|---|
| **GitHub** | Read + Write + Push | PAT Token ใน git remote URL |
| **Google Drive** | Read + Write (Upload/Download) | OAuth2 refresh_token |
| **Google Apps Script** | Push + Deploy | clasp + refresh_token |
| **OpenAI/LLM** | API Call | API Key + Base URL |

---

## 6. ไฟล์ที่ต้องสร้างใน Sandbox ของ Agent ใหม่

```bash
# 1. Clone GitHub repo
git clone https://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@github.com/comphone/comphone-superapp.git /home/ubuntu/github-clone

# 2. ตั้งค่า git identity
git config --global user.name "COMPHONE AI Dev"
git config --global user.email "narinoutagit@gmail.com"

# 3. ตั้งค่า Google Drive token
mkdir -p /home/ubuntu/.comphone
cat > /home/ubuntu/.comphone/token.json << 'EOF'
{"token": null, "refresh_token": "1//04K5isR3QbzM1CgYIARAAGAQSNwF-L9IrVsfWWgxURGkOhAUPse3Gin4WSo2r6A-S9Vsg6ljmvxdE642JUbd4foQoppjjsaU86IQ", "token_uri": "https://oauth2.googleapis.com/token", "client_id": "732739758651-ldbsivb44ub1526hvrdtshcg6ncfcr9a.apps.googleusercontent.com", "client_secret": "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", "scopes": ["https://www.googleapis.com/auth/drive"], "universe_domain": "googleapis.com"}
EOF

# 4. ตั้งค่า clasp
cat > ~/.clasprc.json << 'EOF'
{"token":{"access_token":"","refresh_token":"1//047RbRVcyVbeaCgYIARAAGAQSNwF-L9Irjppbue6nvl22e9jmB8AT2O287s7eU4X2Trot8LBcjrv5F7IIapz_04XzqXJCg5BW4Nc","scope":"https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/script.projects https://www.googleapis.com/auth/script.deployments https://www.googleapis.com/auth/script.webapp.deploy https://www.googleapis.com/auth/cloud-platform","token_type":"Bearer","expiry_date":9999999999999},"oauth2ClientSettings":{"clientId":"1072944905499-vm2v2i5dvn0a0d2o4ca36i1vge8cvbn0.apps.googleusercontent.com","clientSecret":"v6V3fKV_zWU7iw1DrpO1rknX","redirectUri":"http://localhost:8888"},"isLocalCreds":false}
EOF
```


ปรับปรุงล่าสุด

> Hermes-bot:
รับทราบครับพี่นรินทร์! ให้ผมสรุปโครงสร้างการเก็บไฟล์และ API Keys ทั้งระบบแบบละเอียดครับ 📂

---

📂 สรุปที่อยู่การเก็บไฟล์ทั้งหมด (Complete File Location Map)

🏠 1. LOCAL (เครื่อง Server — WSL/Linux)
📍 Path หลัก: /mnt/c/Users/Server/comphone-superapp/

โครงสร้างไดเรกทอรี:
comphone-superapp/
├── 📁 clasp-ready/           # ← GAS Backend Code (11 ไฟล์ .gs)
│   ├── Config.gs              # Config หลัก (VERSION, Sheet Names)
│   ├── Router.gs              # Entry point (651 บรรทัด)
│   ├── RouterSplit.gs         # Routing แยก (406 บรรทัด)
│   ├── Auth.gs                # Login/Permission
│   ├── BillingManager.gs      # ระบบเงิน (1071 บรรทัด)
│   ├── Inventory.gs           # สต็อก (1500 บรรทัด)
│   ├── Dashboard.gs           # Dashboard data
│   ├── Notify.gs              # LINE/Telegram notifications
│   ├── ErrorTelemetry.gs      # Error logging → DB_ERRORS
│   ├── HealthMonitor.gs       # System health
│   └── ... (อีก 32 ไฟล์ .gs)
│
├── 📁 pwa/                   # ← PWA Frontend (Mobile + PC)
│   ├── Index.html            # Mobile SPA (4 sections)
│   ├── dashboard_pc.html    # PC Dashboard (11 sections)
│   ├── executive_dashboard.html
│   ├── monitoring_dashboard.html
│   ├── gas_config.js         # GAS URL config
│   ├── execution_lock.js     # Security lock
│   ├── ai_executor_runtime.js
│   └── ... (JS/CSS files)
│
├── 📁 backups/              # ← Session & System backups
│   └── session/
│       └── session_latest.md  # อัปเดตล่าสุด v5.9.0-phase2d
│
├── 📁 scripts/               # ← Automation scripts
│   ├── drive_sync.py        # Google Drive sync
│   ├── deploy_all.sh        # Deploy script
│   └── ... (scripts อื่นๆ)
│
├── 📄 BLUEPRINT.md          # ← Master Blueprint (อัปเดตล่าสุด)
├── 📄 README.md
└── 📄 .gitignore


API Keys & Config (Local):
| ไฟล์/ตำแหน่ง | รายละเอียด | สถานะ |
|--------------|-------------|--------|
| **clasp-ready/Config.gs** | `GEMINI_API_KEY`, `LINE_CHANNEL_ACCESS_TOKEN`, LINE Group IDs | ✅ ในระบบ (อ่านจาก Script Properties) |
| **~/.hermes/config.yaml** | `telegram.token`, `telegram.chat_id`, `model` | ✅ แก้ไขแล้ว (ลบ quotes) |
| **memory/API_KEYS_REGISTRY.md** | รายการ API keys ทั้งหมด (ในโปรเจกต์) | ✅ เก็บใน memory/ |
| **~/.comphone/token.json** | Google OAuth2 token (narinoutagit@gmail.com) | ✅ Active (verify 2026-04-26) |
| **~/.comphone/sa.json** | Service Account (สำหรับ Drive sync) | ⚠️ Optional |


---

🌐 2. GITHUB (Repository — https://github.com/comphone/comphone-superapp)

ข้อมูลรีโพสิทอรีย่อย:
| รายการ | รายละเอียด |
|--------|-------------|
| **Repository URL** | `https://github.com/comphone/comphone-superapp` |
| **Default Branch** | `main` |
| **Latest Commit** | `e0a2f2e` (BLUEPRINT.md fix) |
| **Latest Tag** | `v5.9.0-phase2d` |
| **GitHub Pages URL** | `https://comphone.github.io/comphone-superapp/pwa/` |


โครงสร้างสำคัญบน GitHub:
GitHub: comphone-superapp/
├── 📁 pwa/                   # ← Deploy ไป GitHub Pages
│   ├── Index.html
│   ├── dashboard_pc.html
│   ├── gas_config.js
│   └── sw.js                  # Service Worker
│
├── 📁 clasp-ready/           # ← GAS Source Code
│   └── (11+ .gs files)
│
├── 📁 .github/
│   └── workflows/
│       └── auto-deploy.yml    # ← Auto-deploy to GitHub Pages
│
├── 📄 BLUEPRINT.md          # ← Single Source of Truth
└── 📄 README.md


การ Deploy อัตโนมัติ:
- ✅ GitHub Actions: .github/workflows/auto-deploy.yml → Deploy pwa/ ไป GitHub Pages
- ✅ Pre-commit hook: Auto-push ไป origin/main ทุกครั้งที่ commit
- ✅ Last deploy: Commit b9adb13 (AUTO DEPLOY 2026-04-26_12-10-01)

---

☁️ 3. GOOGLE DRIVE (File Storage & Backup)

โฟลเดอร์หลัก (2 ตำแหน่ง):
 (1/3)

> Hermes-bot:
| ชื่อโฟลเดอร์ | Folder ID | หน้าที่ | URL |
|--------------|-----------|---------|-----|
| **Root Folder** | `1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0` | เก็บรูปงาน, PDF ใบเสร็จ, เอกสารหลัก | [🔗 เปิด Folder](https://drive.google.com/drive/folders/1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0) |
| **Sync Folder** | `1cExEgiIwmhBxZvLQpv10Wvq71ZTp4PfN` | Sync ไฟล์โค้ดจาก Local → Drive (Auto-sync) | [🔗 เปิด Folder](https://drive.google.com/drive/folders/1cExEgiIwmhBxZvLQpv10Wvq71ZTp4PfN) |


สิ่งที่เก็บใน Google Drive:
Google Drive Root (1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0)/
├── 📁 JOBS_PHOTOS/          # รูปงาน Before/After/Survey/Equipment
├── 📁 BILLING_RECEIPTS/     # PDF ใบเสร็จที่ออกให้ลูกค้า
├── 📁 SLIPS_VERIFICATION/    # สลิปโอนเงินที่ตรวจสอบแล้ว
├── 📁 TEMP_AI_QUEUE/        # คิวรูปสำหรับ AI วิเคราะห์
└── 📁 PURCHASE_ORDERS/      # เอกสาร PO

Google Drive Sync (1cExEgiIwmhBxZvLQpv10Wvq71ZTp4PfN)/
├── 📄 BLUEPRINT.md          # ← Sync จาก Local
├── 📄 session_latest.md      # ← Session context
├── 📁 clasp-ready/         # ← GAS Code backup
└── 📁 pwa/                 # ← PWA Frontend backup


Sync สถานะ:
- ✅ Token: narinoutagit@gmail.com (Active)
- ⚠️ Last Sync: v5.9.0-phase2d_20260426_1025 (จาก Memory)
- ⚠️ Sync Script: python3 scripts/drive_sync.py --all (ต้องรันด้วย token ที่ถูกต้อง)

---

🔑 4. API KEYS & TOKENS (สรุปทั้งหมด)

| ชื่อ Key/Token | ตำแหน่งเก็บ | การเข้าถึง | สถานะ |
|---------------|-------------|-------------|--------|
| **GEMINI_API_KEY** | `clasp-ready/Config.gs` (Script Properties) | `getConfig('GEMINI_API_KEY')` | ✅ Active |
| **LINE_CHANNEL_ACCESS_TOKEN** | `clasp-ready/Config.gs` (Script Properties) | `getConfig('LINE_CHANNEL_ACCESS_TOKEN')` | ✅ Active |
| **LINE Group IDs** | `clasp-ready/Config.gs` (Script Properties) | `getConfig('LINE_GROUP_TECHNICIAN')` etc. | ✅ Configured |
| **TELEGRAM_BOT_TOKEN** | `~/.hermes/config.yaml` | `telegram.token` | ✅ Fixed (ลบ quotes แล้ว) |
| **TELEGRAM_CHAT_ID** | `~/.hermes/config.yaml` | `telegram.chat_id` | ✅ 8716354390 |
| **Google OAuth2 Token** | `~/.comphone/token.json` | Google Drive API | ✅ Valid (2026-04-26) |
| **Service Account** | `~/.comphone/sa.json` (optional) | Drive sync | ⚠️ ไม่บังคับ |
| **GAS Script ID** | Memory + BLUEPRINT.md | `1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043` | ✅ @497 |
| **Spreadsheet ID** | Config.gs + Memory | `19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA` | ✅ Active |


---

📋 5. GAS (Google Apps Script) — Production Endpoint

| รายการ | รายละเอียด |
|--------|-------------|
| **Script ID** | `1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043` |
| **Deploy ID** | `@497` (Production) |
| **Web App URL** | `https://script.google.com/macros/s/AKfycbzE5tyKNA-W6gDQEixw9VTDznTNn5FuToVeVuO_OQL75fDSrpW8U9BT3bhVn4kjKc37/exec` |
| **Last Deploy** | 2026-04-26 (v5.9.0-phase2d) |
| **Cloudflare Worker** | `https://comphone-line-webhook.narinoutagit.workers.dev/line/webhook` |


---

🎯 สรุปสั้นๆ (Quick Summary)

ที่อยู่ไฟล์หลัก:
1. Local: /mnt/c/Users/Server/comphone-superapp/ (Working directory)
2. GitHub: https://github.com/comphone/comphone-superapp (Backup + GitHub Pages)
3. Google Drive: 
   - Root: 1YRZRG9r1Y_jMHg2XFFKYjK4Hx-sW0Eq0 (Files/Photos)
   - Sync: 1cExEgiIwmhBxZvLQpv10Wvq71ZTp4PfN (Code backup)

API Keys:
- ✅ เก็บใน clasp-ready/Config.gs (Script Properties) — อ่านผ่าน getConfig()
- ✅ Telegram Token ใน ~/.hermes/config.yaml — แก้ไขเรียบร้อย
- ✅ Google Token ใน ~/.comphone/token.json — Active

Verification:
- ✅ GitHub: git log --oneline -1 → e0a2f2e
- ✅ Local: grep "v5.9.0-phase2d" clasp-ready/Config.gs → Match
- ⚠️ GAS: ต้องเข้า script.google.com → Deploy → Manage → ตรวจสอบ @497
- ⚠️ Drive: ต้องรัน python3 scripts/drive_sync.py --status (ต้องติดตั้ง packages แล้ว)

---
 
