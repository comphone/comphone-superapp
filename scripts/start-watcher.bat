@echo off
:: ============================================================
:: start-watcher.bat — COMPHONE Auto-Push Watcher (Windows)
:: ดับเบิลคลิกเพื่อเริ่ม File Watcher
:: ============================================================

title COMPHONE Auto-Push Watcher

echo ============================================================
echo  COMPHONE SUPER APP V5.5 — Auto-Push Watcher
echo ============================================================
echo.

:: เปลี่ยนไปยัง repo root (โฟลเดอร์ที่อยู่เหนือ scripts/)
cd /d "%~dp0.."

:: ตรวจสอบว่ามี Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    where python3 >nul 2>nul
    if %errorlevel% neq 0 (
        echo [ERROR] ไม่พบ Python กรุณาติดตั้ง Python 3.8+ ก่อน
        pause
        exit /b 1
    )
    set PYTHON=python3
) else (
    set PYTHON=python
)

:: ตรวจสอบ git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] ไม่พบ git กรุณาติดตั้ง Git ก่อน
    pause
    exit /b 1
)

echo [INFO] Python: %PYTHON%
echo [INFO] Repo: %CD%
echo [INFO] Branch: main
echo [INFO] Debounce: 15 วินาที
echo.
echo กด Ctrl+C เพื่อหยุด Watcher
echo ============================================================
echo.

:: รัน watcher
%PYTHON% scripts/auto_push.py --repo . --branch main --debounce 15

echo.
echo [INFO] Watcher หยุดทำงาน
pause
