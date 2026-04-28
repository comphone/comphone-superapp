@echo off
:: ============================================================
:: COMPHONE SUPERAPP - Triple Backup Script
:: 1. Local Backup to D:
:: 2. Git Sync to GitHub
:: ============================================================

:: Step 1: Local Backup to D:
echo [%date% %time%] Starting Local Backup to D:...
xcopy "C:\Users\Server\comphone-superapp\*" "D:\Comphone-Superapp-Backup\" /E /H /C /I /Y
if %errorlevel% == 0 (
    echo [%date% %time%] SUCCESS: Local Backup to D: completed
) else (
    echo [%date% %time%] ERROR: Local Backup failed
)

:: Step 2: Git Sync (GitHub Backup)
echo [%date% %time%] Starting GitHub sync...
cd /d "C:\Users\Server\comphone-superapp"

:: Pull latest changes first
git pull origin main

:: Add all changes
git add -A

:: Check if there are changes to commit
git diff --cached --quiet
if %errorlevel% == 0 (
    echo [%date% %time%] No changes to commit. Already up to date.
    exit /b 0
)

:: Commit with timestamp
git commit -m "auto-sync: %date% %time%"

:: Push to GitHub
git push origin main

if %errorlevel% == 0 (
    echo [%date% %time%] SUCCESS: Sync completed
) else (
    echo [%date% %time%] ERROR: Push failed - check credentials
)
