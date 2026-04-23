@echo off
REM ============================================================
REM clasp_push.bat — COMPHONE SUPER APP V5.5
REM Push ไฟล์ GAS ทั้งหมดขึ้น Google Apps Script (Windows)
REM
REM วิธีใช้ (รันจาก root ของโปรเจกต์):
REM   scripts\clasp_push.bat              -- push อย่างเดียว
REM   scripts\clasp_push.bat --deploy     -- push + deploy ใหม่
REM   scripts\clasp_push.bat --triggers   -- push + setup triggers
REM   scripts\clasp_push.bat --full       -- push + deploy + triggers
REM ============================================================
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%.."
set "CLASP_DIR=%REPO_ROOT%\clasp-ready"
set "SCRIPT_ID=1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043"

set "DO_DEPLOY=false"
set "DO_TRIGGERS=false"

REM Parse arguments
for %%A in (%*) do (
    if "%%A"=="--deploy"   set "DO_DEPLOY=true"
    if "%%A"=="--triggers" set "DO_TRIGGERS=true"
    if "%%A"=="--full"     set "DO_DEPLOY=true" & set "DO_TRIGGERS=true"
)

echo ============================================================
echo  COMPHONE SUPER APP V5.5 -- clasp push (Windows)
echo ============================================================
echo  Script ID : %SCRIPT_ID%
echo  Source    : %CLASP_DIR%
echo  Deploy    : %DO_DEPLOY%
echo  Triggers  : %DO_TRIGGERS%
echo ============================================================
echo.

REM ── Step 1: ตรวจสอบ clasp ──────────────────────────────────
echo [1/5] ตรวจสอบ clasp...
where clasp >nul 2>&1
if errorlevel 1 (
    echo [ERROR] ไม่พบคำสั่ง 'clasp'
    echo         กรุณาติดตั้งด้วยคำสั่ง: npm install -g @google/clasp
    exit /b 1
)
for /f "tokens=*" %%v in ('clasp --version 2^>nul') do set "CLASP_VER=%%v"
echo [OK] clasp พร้อมใช้งาน ^(%CLASP_VER%^)

REM ── Step 2: ตรวจสอบ login ──────────────────────────────────
echo.
echo [2/5] ตรวจสอบ clasp login...
if not exist "%USERPROFILE%\.clasprc.json" (
    echo [ERROR] ยังไม่ได้ Login clasp
    echo         กรุณารันคำสั่ง: clasp login
    exit /b 1
)
echo [OK] Login แล้ว

REM ── Step 3: ตรวจสอบ .clasp.json ───────────────────────────
echo.
echo [3/5] ตรวจสอบ .clasp.json...
if not exist "%CLASP_DIR%\.clasp.json" (
    echo [ERROR] ไม่พบ .clasp.json ใน %CLASP_DIR%
    exit /b 1
)
echo [OK] .clasp.json พบแล้ว

REM ── Step 4: clasp push ─────────────────────────────────────
echo.
echo [4/5] กำลัง push ไฟล์ขึ้น Google Apps Script...
cd /d "%CLASP_DIR%"

set "PUSH_SUCCESS=false"
for /l %%i in (1,1,3) do (
    if "!PUSH_SUCCESS!"=="false" (
        echo   ครั้งที่ %%i/3...
        clasp push --force
        if not errorlevel 1 (
            set "PUSH_SUCCESS=true"
            echo [OK] Push สำเร็จ!
        ) else (
            echo   Push ล้มเหลว รอ 5 วินาที...
            timeout /t 5 /nobreak >nul
        )
    )
)

if "!PUSH_SUCCESS!"=="false" (
    echo.
    echo [ERROR] clasp push ล้มเหลวทั้ง 3 ครั้ง
    echo.
    echo วิธีแก้ไข:
    echo   1. เปิดใช้งาน Apps Script API:
    echo      https://script.google.com/home/usersettings
    echo   2. ตรวจสอบ Script ID ใน .clasp.json
    echo   3. ลอง login ใหม่: clasp login
    exit /b 1
)

REM ── Step 5a (optional): Deploy ─────────────────────────────
if "%DO_DEPLOY%"=="true" (
    echo.
    echo [5a] สร้าง Web App Deployment ใหม่...
    for /f "tokens=*" %%d in ('date /t') do set "TODAY=%%d"
    clasp deploy --description "COMPHONE v5.5 -- %TODAY%"
    if not errorlevel 1 (
        echo [OK] Deploy สำเร็จ
    ) else (
        echo [WARN] Deploy อาจมีปัญหา ตรวจสอบใน GAS Editor
    )
)

REM ── Step 5b (optional): Setup Triggers ─────────────────────
if "%DO_TRIGGERS%"=="true" (
    echo.
    echo [5b] ตั้งค่า Triggers อัตโนมัติ...
    clasp run setupAllTriggers
    if not errorlevel 1 (
        echo [OK] Triggers ตั้งค่าสำเร็จ
    ) else (
        echo [WARN] ไม่สามารถรัน setupAllTriggers^(^) อัตโนมัติได้
        echo        กรุณารันด้วยตนเองใน GAS Editor:
        echo        AutoBackup.gs -^> setupAllTriggers -^> Run
    )
)

REM ── Summary ────────────────────────────────────────────────
echo.
echo ============================================================
echo  SUMMARY
echo ============================================================
echo   GAS Push      SUCCESS
if "%DO_DEPLOY%"=="true"   echo   Web App Deploy DONE
if "%DO_TRIGGERS%"=="true" echo   Triggers Setup DONE
echo.
echo   GAS Editor : https://script.google.com/d/%SCRIPT_ID%/edit
echo   Triggers   : https://script.google.com/home/triggers
echo ============================================================

cd /d "%REPO_ROOT%"
endlocal
