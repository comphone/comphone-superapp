#!/usr/bin/env python3
"""
COMPHONE Drive Upload — ใช้ OAuth2 User Credentials (แก้ปัญหา Service Account quota)
วิธีใช้:
  1. รัน: python3 drive_oauth_upload.py --setup
     → จะเปิด browser ให้ login Google แล้วบันทึก token
  2. รัน: python3 drive_oauth_upload.py
     → อัปโหลดไฟล์ทั้งหมดด้วย token ที่บันทึกไว้
"""

import os
import sys
import json
import mimetypes
import argparse
from pathlib import Path
from datetime import datetime

CONFIG_DIR = Path.home() / ".comphone"
TOKEN_FILE = CONFIG_DIR / "drive_user_token.json"
CREDS_FILE = CONFIG_DIR / "drive_oauth_client.json"
REPO_ROOT = Path("/home/ubuntu/github-clone")
SESSION_FILE = Path("/memory/session.md")
FOLDER_ID = "1Wfa2cPdrIcLAeKMbXvmikCZBKDtRPuI7"

SCOPES = ['https://www.googleapis.com/auth/drive']

# OAuth2 Client ID สำหรับ Desktop App (ใช้ project linetasksauto)
# ผู้ใช้ต้องสร้าง OAuth2 Client ID ประเภท "Desktop app" จาก Google Cloud Console
# แล้วดาวน์โหลด JSON มาวางที่ ~/.comphone/drive_oauth_client.json

def get_credentials():
    """รับ credentials จาก token ที่บันทึกไว้ หรือขอใหม่"""
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request

    creds = None

    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDS_FILE.exists():
                print("❌ ไม่พบ OAuth2 client credentials")
                print(f"   กรุณาสร้าง OAuth2 Client ID และวางที่: {CREDS_FILE}")
                print()
                print("   วิธีสร้าง:")
                print("   1. https://console.cloud.google.com/apis/credentials")
                print("   2. Create Credentials → OAuth 2.0 Client ID")
                print("   3. Application type: Desktop app")
                print("   4. Download JSON → วางที่ ~/.comphone/drive_oauth_client.json")
                sys.exit(1)

            flow = InstalledAppFlow.from_client_secrets_file(str(CREDS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)

        CONFIG_DIR.mkdir(exist_ok=True)
        with open(TOKEN_FILE, 'w') as f:
            f.write(creds.to_json())
        print(f"✅ Token saved: {TOKEN_FILE}")

    return creds

def build_service():
    from googleapiclient.discovery import build
    creds = get_credentials()
    return build('drive', 'v3', credentials=creds)

def get_or_create_folder(service, name, parent_id):
    query = (
        f"name='{name}' and "
        f"mimeType='application/vnd.google-apps.folder' and "
        f"'{parent_id}' in parents and trashed=false"
    )
    results = service.files().list(q=query, fields="files(id, name)").execute()
    files = results.get('files', [])
    if files:
        return files[0]['id']
    meta = {'name': name, 'mimeType': 'application/vnd.google-apps.folder', 'parents': [parent_id]}
    folder = service.files().create(body=meta, fields='id').execute()
    return folder['id']

def upload_file(service, local_path, parent_id, filename=None):
    from googleapiclient.http import MediaFileUpload
    local_path = Path(local_path)
    name = filename or local_path.name
    mime_type = mimetypes.guess_type(str(local_path))[0] or 'text/plain'

    query = f"name='{name}' and '{parent_id}' in parents and trashed=false"
    results = service.files().list(q=query, fields="files(id)").execute()
    existing = results.get('files', [])

    media = MediaFileUpload(str(local_path), mimetype=mime_type, resumable=False)

    if existing:
        service.files().update(fileId=existing[0]['id'], media_body=media).execute()
        return "updated"
    else:
        meta = {'name': name, 'parents': [parent_id]}
        service.files().create(body=meta, media_body=media, fields='id').execute()
        return "created"

def main():
    print("=" * 60)
    print(f" 🚀 COMPHONE Drive Upload (OAuth2) — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)
    print()

    service = build_service()
    print("✅ Connected to Google Drive (as user)")
    print()

    ts = datetime.now().strftime("%Y%m%d_%H%M")
    version_name = f"v5.5.9_{ts}"
    version_id = get_or_create_folder(service, version_name, FOLDER_ID)
    print(f"📁 Version folder: {version_name}")
    print()

    folders = {}
    for fn in ["session", "clasp-ready", "pwa", "scripts", "docs", "workflows"]:
        folders[fn] = get_or_create_folder(service, fn, version_id)
        print(f"   📁 {fn}/")

    print()
    stats = {}

    # session.md
    print("📤 Uploading session.md...")
    if SESSION_FILE.exists():
        status = upload_file(service, SESSION_FILE, folders["session"])
        print(f"   ✅ session.md — {status}")
        stats["session"] = 1

    # GAS
    print("\n📤 Uploading GAS Backend...")
    stats["gs"] = 0
    gs_dir = REPO_ROOT / "clasp-ready"
    if gs_dir.exists():
        for f in sorted(gs_dir.glob("*.gs")):
            status = upload_file(service, f, folders["clasp-ready"])
            print(f"   ✅ {f.name} — {status}")
            stats["gs"] += 1
    print(f"   Total: {stats['gs']} files")

    # PWA
    print("\n📤 Uploading PWA Frontend...")
    stats["pwa"] = 0
    pwa_dir = REPO_ROOT / "pwa"
    if pwa_dir.exists():
        for ext in ["*.js", "*.html", "*.css", "*.json"]:
            for f in sorted(pwa_dir.glob(ext)):
                status = upload_file(service, f, folders["pwa"])
                print(f"   ✅ {f.name} — {status}")
                stats["pwa"] += 1
    print(f"   Total: {stats['pwa']} files")

    # Scripts
    print("\n📤 Uploading Scripts...")
    stats["scripts"] = 0
    scripts_dir = REPO_ROOT / "scripts"
    if scripts_dir.exists():
        for f in sorted(scripts_dir.iterdir()):
            if f.is_file():
                status = upload_file(service, f, folders["scripts"])
                print(f"   ✅ {f.name} — {status}")
                stats["scripts"] += 1
    print(f"   Total: {stats['scripts']} files")

    # Docs
    print("\n📤 Uploading Docs...")
    stats["docs"] = 0
    docs_dir = REPO_ROOT / "delivery" / "docs"
    if docs_dir.exists():
        for f in sorted(docs_dir.glob("*.md")):
            status = upload_file(service, f, folders["docs"])
            print(f"   ✅ {f.name} — {status}")
            stats["docs"] += 1
    print(f"   Total: {stats['docs']} files")

    # Workflows
    print("\n📤 Uploading GitHub Actions workflows...")
    stats["workflows"] = 0
    wf_dir = REPO_ROOT / ".github" / "workflows"
    if wf_dir.exists():
        for f in sorted(wf_dir.glob("*.yml")):
            status = upload_file(service, f, folders["workflows"])
            print(f"   ✅ {f.name} — {status}")
            stats["workflows"] += 1
    print(f"   Total: {stats['workflows']} files")

    total = sum(stats.values())
    print()
    print("=" * 60)
    print(f" ✅ UPLOAD COMPLETE — {total} files → Google Drive")
    print(f"    📁 COMPHONE_Backups/{version_name}/")
    print(f"    🔗 https://drive.google.com/drive/folders/{FOLDER_ID}")
    print("=" * 60)

if __name__ == "__main__":
    main()
