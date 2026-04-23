# COMPHONE SUPER APP — DEPLOYMENT BLUEPRINT
## สถาปัตยกรรมการตั้งค่าและ Deploy (PHASE 25.5+)

> **วัตถุประสงค์:** เอกสารอ้างอิงถาวรสำหรับ Agent และ Developer ทุกคนที่ทำงานกับโปรเจกต์นี้
> **อัปเดตล่าสุด:** 2026-04-23
> **เวอร์ชัน:** v5.6.3 (App) / v5.6.4 (Script Busting)

---

## 🔴 กฎเหล็ก (HARD RULES)

### กฎข้อที่ 1: ห้ามใช้ Service Account กับ Google Drive

```
⛔ NEVER:  service_account.Credentials.from_service_account_file(...)
✅ ALWAYS: OAuth2 จาก Environment Variables
```

**เหตุผล:** Service Account มีปัญหา `storageQuotaExceeded` เนื่องจากใช้ Drive quota ของตัวเอง (15GB) ไม่ใช่ของผู้ใช้ ทำให้ backup ล้มเหลวเมื่อ quota เต็ม

**วิธีที่ถูกต้อง:** ใช้ OAuth2 Credentials จาก Environment Variables 3 ตัว:
| Variable | ตัวอย่าง | คำอธิบาย |
|----------|---------|----------|
| `GOOGLE_CLIENT_ID` | `122530715604-xxx.apps.googleusercontent.com` | OAuth2 Client ID จาก Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxx` | OAuth2 Client Secret |
| `GOOGLE_REFRESH_TOKEN` | `1//0gkxxx` | OAuth2 Refresh Token (ไม่หมดอายุ) |

**รูปแบบโค้ดที่ถูกต้อง (Python):**
```python
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

creds = Credentials(
    token=None,
    refresh_token=os.environ['GOOGLE_REFRESH_TOKEN'],
    token_uri='https://oauth2.googleapis.com/token',
    client_id=os.environ['GOOGLE_CLIENT_ID'],
    client_secret=os.environ['GOOGLE_CLIENT_SECRET'],
    scopes=['https://www.googleapis.com/auth/drive'],
)
creds.refresh(Request())  # ดึง access_token ใหม่ทุกครั้ง
```

---

### กฎข้อที่ 2: ต้องสร้าง ~/.clasprc.json ใหม่ทุกครั้งก่อน Deploy GAS

```
⛔ NEVER:  clasp push (โดยไม่ refresh token)
✅ ALWAYS: สร้าง ~/.clasprc.json จาก $CLASP_TOKEN → แล้วค่อย clasp push
```

**เหตุผล:** Clasp token ใน `~/.clasprc.json` มี access_token ที่หมดอายุได้ ถ้าไม่ refresh ก่อน push จะได้ error 401

**วิธีที่ถูกต้อง (Bash):**
```bash
# อ่าน CLASP_TOKEN จาก env var → เขียน ~/.clasprc.json
if [ -n "$CLASP_TOKEN" ]; then
  CLASPRC="$HOME/.clasprc.json"
  if echo "$CLASP_TOKEN" | python3 -c "import sys,json; json.loads(sys.stdin.read())" 2>/dev/null; then
    echo "$CLASP_TOKEN" > "$CLASPRC"        # JSON ตรง
  else
    echo "$CLASP_TOKEN" | base64 -d > "$CLASPRC"  # base64 encoded
  fi
  chmod 600 "$CLASPRC"
fi
# แล้วค่อยรัน clasp push
```

**CLASP_TOKEN** คือ JSON string ของ `~/.clasprc.json` ทั้งก้อน ประกอบด้วย:
- `token.refresh_token` — OAuth2 refresh token สำหรับ Google Apps Script API
- `oauth2ClientSettings.clientId` — OAuth2 Client ID
- `oauth2ClientSettings.clientSecret` — OAuth2 Client Secret

---

## 📁 ไฟล์สคริปต์หลักที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ | กฎที่ใช้ |
|------|---------|----------|
| `deploy_all.sh` | Deploy Pipeline หลัก (backup → git → clasp → verify) | กฎ 1 + กฎ 2 |
| `scripts/drive_sync.py` | Sync code/session ขึ้น Google Drive | กฎ 1 |
| `scripts/drive_backup.py` | Upload backup.tar.gz ขึ้น Drive (fallback) | กฎ 1 |

---

## 🔄 Deploy Flow (deploy_all.sh)

```
┌─────────────────────────────────────────────────┐
│  deploy_all.sh — Full Auto Deploy Pipeline      │
├─────────────────────────────────────────────────┤
│                                                 │
│  0. source ~/.bashrc                            │
│     └─ โหลด env vars ทั้งหมด                    │
│                                                 │
│  1. PRECHECK                                    │
│     └─ ตรวจ core files, git remote, .clasp.json │
│                                                 │
│  2. LOCAL BACKUP                                │
│     └─ tar -czf backups/backup_YYYY-MM-DD.tar.gz│
│                                                 │
│  3. GOOGLE DRIVE BACKUP                         │
│     ├─ rclone SA mode (ถ้ามี)                   │
│     ├─ rclone normal mode (ถ้ามี)               │
│     └─ scripts/drive_backup.py (fallback)       │
│         └─ ใช้ OAuth2 จาก env vars (กฎ 1)       │
│                                                 │
│  4. RETENTION POLICY                            │
│     └─ ลบ backup เก่า > 7 วัน (local + drive)   │
│                                                 │
│  5. GIT PUSH                                    │
│     └─ git add . → commit → push origin main    │
│                                                 │
│  6. SYNC PRODUCTION BRANCH                      │
│     └─ push main → production/v16-stable        │
│                                                 │
│  7. DEPLOY GAS  ⭐ จุดที่ใช้กฎ 2                 │
│     ├─ cd clasp-ready                           │
│     ├─ สร้าง ~/.clasprc.json จาก $CLASP_TOKEN  │
│     └─ clasp push                               │
│                                                 │
│  8. VERIFY                                      │
│     ├─ GitHub Pages (dashboard, index)          │
│     └─ Core files check                         │
│                                                 │
│  9. REPORT                                      │
│     └─ สรุปผล deploy ทั้งหมด                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🔐 Environment Variables Reference

ตั้งค่าใน `~/.bashrc` (WSL) หรือ System Environment (Server):

```bash
# 1. Google Drive Access (OAuth2) — กฎข้อที่ 1
export GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="GOCSPX-xxx"
export GOOGLE_REFRESH_TOKEN="1//0xxx"

# 2. Google Apps Script Deploy (Clasp Token) — กฎข้อที่ 2
export CLASP_TOKEN='{"token":{"access_token":"","refresh_token":"1//0xxx",...},"oauth2ClientSettings":{"clientId":"xxx","clientSecret":"xxx","redirectUri":"http://localhost:8888"},"isLocalCreds":false}'
```

**วิธีดึงค่า Refresh Token ใหม่ (ถ้าหมดอายุ):**
1. ไปที่ [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. สร้าง OAuth2 Client ID (Desktop App)
3. ใช้ `google-auth-oauthlib` flow เพื่อได้ refresh_token
4. บันทึกลง env var

---

## ⚠️ Common Pitfalls

| ปัญหา | สาเหตุ | วิธีแก้ |
|-------|--------|--------|
| `storageQuotaExceeded` | ใช้ Service Account (เก่า) | เปลี่ยนเป็น OAuth2 env vars (กฎ 1) |
| Clasp push 401 | Token หมดอายุ | สร้าง ~/.clasprc.json ใหม่จาก CLASP_TOKEN (กฎ 2) |
| `ไม่พบ Google API packages` | venv ไม่มี google-auth | `pip install google-auth google-api-python-client` |
| CLASP_TOKEN invalid JSON | ค่าใน .bashrc ถูก truncate | สร้างใหม่จาก `.clasprc.json` จริง |

---

## 📋 Checklist สำหรับ Agent ใหม่

ก่อนรัน `deploy_all.sh` ตรวจสอบว่า:

- [ ] `~/.bashrc` มี `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
- [ ] `~/.bashrc` มี `CLASP_TOKEN` (JSON สมบูรณ์)
- [ ] `pip3 install google-auth google-api-python-client` แล้ว
- [ ] `~/.clasprc.json` มีอยู่แล้ว หรือจะถูกสร้างจาก `CLASP_TOKEN` อัตโนมัติ
- [ ] ไม่มี code ใดๆ ใช้ `service_account.Credentials` (ตรวจสอบด้วย `grep -r "service_account" scripts/`)

---

*เอกสารนี้สร้างจาก PHASE 25.5 deployment hardening — 2026-04-23*
