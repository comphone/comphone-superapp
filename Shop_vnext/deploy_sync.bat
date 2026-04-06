@echo off
REM ============================================================
REM deploy_sync.bat — Comphone V366
REM คลาส push to GAS + git sync to GitHub ในปุ่มเดียว
REM ============================================================
cd /d "%~dp0"

echo ==========================================
echo   Comphone Deploy + Sync V366
echo ==========================================
echo.

REM Step 1: clasp push
echo [1/4] Pushing to Google Apps Script...
clasp push --force
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: clasp push failed!
    pause
    exit /b 1
)
echo.

REM Step 2: clasp deploy
echo [2/4] Deploying new version...
clasp deploy --description "V366: %DATE% %TIME%"
echo.

REM Step 3: Git stage + commit
echo [3/4] Committing to Git...
git add .
git commit -m "Auto-deploy: V366 %DATE% %TIME%"
echo.

REM Step 4: Git push
echo [4/4] Pushing to GitHub...
git push origin main --force
echo.

echo ==========================================
echo   DEPLOY + SYNC COMPLETE
echo ==========================================
pause
