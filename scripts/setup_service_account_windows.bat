@echo off
chcp 65001 >nul
echo ============================================================
echo  COMPHONE SUPER APP - PHASE 24.2 Service Account Setup
echo ============================================================
echo.
echo 🔐 ขั้นตอนที่ 1: สร้าง Service Account ใน Google Cloud Console
echo.
echo    1. ไปที่ https://console.cloud.google.com/
echo    2. เลือกโปรเจกต์ → IAM ^& Admin → Service Accounts
echo    3. กด CREATE SERVICE ACCOUNT
echo    4. Name: comphone-backup
echo    5. กด Create and Continue
echo    6. Role: เลือก "Storage Object Admin" (หรือ "Editor")
echo    7. กด Continue → DONE
echo    8. คลิก Service Account ที่สร้าง → KEYS → ADD KEY → JSON
echo    9. ไฟล์ JSON จะดาวน์โหลดอัตโนมัติ (มักจะอยู่ใน Downloads)
echo.
echo 📁 ขั้นตอนที่ 2: คัดลอกไฟล์มาวางใน WSL
echo.
echo    รันคำสั่งนี้ใน PowerShell:
echo.
echo    $json = Get-ChildItem "$env:USERPROFILE\Downloads\comphone-backup-*.json" ^| Select-Object -First 1
echo    wsl mkdir -p /home/server/.config/rclone
echo    wsl cp "$($json.FullName.Replace('\','/').Replace('C:','/mnt/c'))" /home/server/.config/rclone/service-account.json
echo    wsl bash /mnt/c/Users/Server/comphone-superapp/scripts/setup_service_account.sh
echo.
pause
