@echo off
:: ============================================================
:: COMPHONE SUPERAPP - Auto Sync to GitHub
:: วางไฟล์นี้ไว้ที่ D:\Comphone-Superapp\auto-sync.bat
:: ============================================================

cd /d "D:\Comphone-Superapp"

echo [%date% %time%] Starting GitHub sync...

:: ดึงการเปลี่ยนแปลงล่าสุดจาก GitHub ก่อน
git pull origin main

:: เพิ่มไฟล์ที่เปลี่ยนแปลงทั้งหมด
git add -A

:: ตรวจสอบว่ามีการเปลี่ยนแปลงหรือไม่
git diff --cached --quiet
if %errorlevel% == 0 (
    echo [%date% %time%] No changes to commit. Already up to date.
    exit /b 0
)

:: Commit พร้อม timestamp อัตโนมัติ
git commit -m "auto-sync: %date% %time%"

:: Push ขึ้น GitHub
git push origin main

if %errorlevel% == 0 (
    echo [%date% %time%] SUCCESS: Sync completed
) else (
    echo [%date% %time%] ERROR: Push failed - check credentials
)
