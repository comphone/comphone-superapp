@echo off
:: ============================================================
:: start-sync-all.bat — COMPHONE Triple Sync Watcher (Windows)
:: ดับเบิลคลิกเพื่อเริ่ม Auto-Sync: GitHub + Drive + Local
:: ============================================================

title COMPHONE Triple Sync Watcher

echo ============================================================
echo  COMPHONE SUPER APP V5.5 — Triple Sync Watcher
echo  GitHub + Google Drive + Local Backup
echo ============================================================
echo.

cd /d "%~dp0.."

where python >nul 2>nul
if %errorlevel% neq 0 (
    where python3 >nul 2>nul
    if %errorlevel% neq 0 (
        echo [ERROR] ไม่พบ Python กรุณาติดตั้ง Python 3.8+
        pause
        exit /b 1
    )
    set PYTHON=python3
) else (
    set PYTHON=python
)

echo [INFO] เริ่ม Triple Sync Watcher...
echo [INFO] กด Ctrl+C เพื่อหยุด
echo.

%PYTHON% scripts/sync_all.py --watch --debounce 15

echo.
echo [INFO] Watcher หยุดทำงาน
pause
