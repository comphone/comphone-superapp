# คู่มือ Sync โฟลเดอร์ D:\Comphone-Superapp กับ GitHub

## วิธีที่ 1: ใช้ Script อัตโนมัติ (แนะนำ)

### ขั้นตอนการติดตั้ง

1. **ติดตั้ง Git for Windows**
   - ดาวน์โหลดจาก https://git-scm.com/download/win
   - ติดตั้งตามค่า default

2. **Clone Repository ไปที่ D:\Comphone-Superapp**
   ```bash
   git clone https://github.com/comphone/comphone-superapp.git "D:\Comphone-Superapp"
   ```

3. **สร้างไฟล์ `D:\Comphone-Superapp\auto-sync.bat`** (คัดลอกโค้ดด้านล่าง)

```batch
@echo off
:: COMPHONE SUPERAPP - Auto Sync to GitHub
:: วางไฟล์นี้ไว้ที่ D:\Comphone-Superapp\auto-sync.bat

cd /d "D:\Comphone-Superapp"

:: ดึงการเปลี่ยนแปลงล่าสุดจาก GitHub ก่อน
git pull origin main

:: เพิ่มไฟล์ที่เปลี่ยนแปลงทั้งหมด
git add -A

:: ตรวจสอบว่ามีการเปลี่ยนแปลงหรือไม่
git diff --cached --quiet
if %errorlevel% == 0 (
    echo [%date% %time%] No changes to commit
    exit /b 0
)

:: Commit พร้อม timestamp อัตโนมัติ
git commit -m "auto-sync: %date% %time%"

:: Push ขึ้น GitHub
git push origin main

echo [%date% %time%] Sync completed successfully
```

4. **ตั้งค่า Windows Task Scheduler ให้รัน auto-sync.bat อัตโนมัติ**
   - กด `Win + R` พิมพ์ `taskschd.msc`
   - คลิก "Create Basic Task"
   - ตั้งชื่อ: `Comphone GitHub Sync`
   - Trigger: **Daily** เวลา 23:00 น.
   - Action: Start a program → `D:\Comphone-Superapp\auto-sync.bat`

---

## วิธีที่ 2: ใช้ GitHub Desktop (ง่ายที่สุด)

1. ดาวน์โหลด [GitHub Desktop](https://desktop.github.com/)
2. Sign in ด้วย account `comphone`
3. Clone `comphone/comphone-superapp` ไปที่ `D:\Comphone-Superapp`
4. ทุกครั้งที่แก้ไขไฟล์ เปิด GitHub Desktop แล้วกด **Commit** → **Push**

---

## วิธีที่ 3: ใช้ VS Code (สำหรับนักพัฒนา)

1. เปิดโฟลเดอร์ `D:\Comphone-Superapp` ใน VS Code
2. ใช้ Source Control panel (Ctrl+Shift+G)
3. กด ✓ Commit แล้ว Push ได้เลย

---

## โครงสร้างโฟลเดอร์ที่แนะนำ

```
D:\Comphone-Superapp\
├── clasp-ready\        ← โค้ด GAS ทั้งหมด (sync กับ GitHub)
├── docs\               ← Blueprint และ Memory Log
├── Shop_vnext\         ← โค้ดเวอร์ชันเก่า (archived)
├── auto-sync.bat       ← Script Sync อัตโนมัติ
└── README.md
```

---

## หมายเหตุ: GitHub Actions Auto Backup

เมื่อได้ Token ที่มีสิทธิ์ `workflow` แล้ว ให้รันคำสั่งนี้เพื่อเพิ่ม Auto Backup Tag:

```bash
cd "D:\Comphone-Superapp"
mkdir .github\workflows
# วางไฟล์ auto-backup.yml ที่ได้รับมาไว้ใน .github\workflows\
git add .github\
git commit -m "ci: add auto backup workflow"
git push origin main
```

ไฟล์ `auto-backup.yml` อยู่ที่: [ดาวน์โหลด](https://github.com/comphone/comphone-superapp)
