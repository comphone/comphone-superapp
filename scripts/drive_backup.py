#!/usr/bin/env python3
"""
COMPHONE SUPER APP — Google Drive Backup (Python Fallback)
PHASE 24: Hardened Backup System
ใช้งานเมื่อ rclone ยังไม่พร้อม หรือต้องการ upload แบบง่าย ๆ
Requirements: pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
"""

import os
import sys
import json
from datetime import datetime, timedelta
from pathlib import Path

# การตั้งค่า ทดแทน
def get_credentials():
    """
    โหลด credentials จากไฟล์ที่กำหนด
    ในอนาคตในอนาคต สามารถใช้ Service Account ได้
    """
    # ตรวจหา credentials ในที่ต่าง ๆ
    cred_paths = [
        os.path.expanduser("~/.config/rclone/service_account.json"),
        os.path.expanduser("~/comphone-service-account.json"),
        os.path.expanduser("/mnt/c/Users/Server/comphone-superapp/scripts/service_account.json"),
    ]
    for p in cred_paths:
        if os.path.isfile(p):
            return p
    return None

def upload_file_to_drive(local_path, drive_folder_id="1cExEgiIwmhBxZvLQpv10Wvq71ZTp4PfN"):
    """
    Upload file ไปยัง Google Drive โดยใช้ Google Drive API
    ต้องการ pip install google-api-python-client
    """
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload
    except ImportError:
        print("ERROR: google-api-python-client ยังไม่ได้ติดตั้ง")
        print("รัน: pip install google-api-python-client google-auth-httplib2")
        return False

    cred_path = get_credentials()
    if not cred_path:
        print("ERROR: ไม่พบ Service Account credentials")
        print("คำแนะนำ: วาง credentials JSON ไว้ที่ scripts/service_account.json")
        return False

    try:
        SCOPES = ['https://www.googleapis.com/auth/drive.file']
        credentials = service_account.Credentials.from_service_account_file(
            cred_path, scopes=SCOPES)
        service = build('drive', 'v3', credentials=credentials)

        file_name = os.path.basename(local_path)
        file_metadata = {
            'name': file_name,
            'parents': [drive_folder_id]
        }
        media = MediaFileUpload(local_path, resumable=True)

        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id,name,webViewLink'
        ).execute()

        print(f"SUCCESS: Uploaded {file_name}")
        print(f"  File ID: {file['id']}")
        print(f"  Link: {file.get('webViewLink', 'N/A')}")
        return True
    except Exception as e:
        print(f"ERROR: Upload failed - {e}")
        return False

def main():
    if len(sys.argv) < 2:
        print("ใช้งาน: python3 drive_backup.py <path/to/backup.tar.gz>")
        sys.exit(1)

    backup_path = sys.argv[1]
    if not os.path.isfile(backup_path):
        print(f"ERROR: ไม่พบไฟล์ {backup_path}")
        sys.exit(1)

    success = upload_file_to_drive(backup_path)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
