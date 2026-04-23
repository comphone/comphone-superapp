#!/usr/bin/env python3
"""
COMPHONE Drive Upload — อัปโหลดไฟล์ทั้งหมดเข้า Shared Folder
Folder ID: 1Wfa2cPdrIcLAeKMbXvmikCZBKDtRPuI7
"""

import os
import json
import mimetypes
from pathlib import Path
from datetime import datetime

SA_FILE = Path.home() / ".comphone" / "service_account.json"
REPO_ROOT = Path("/home/ubuntu/github-clone")
SESSION_FILE = Path("/memory/session.md")

# Shared folder ID จากผู้ใช้
SHARED_FOLDER_ID = "1Wfa2cPdrIcLAeKMbXvmikCZBKDtRPuI7"

def build_service():
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    SCOPES = ['https://www.googleapis.com/auth/drive']
    creds = service_account.Credentials.from_service_account_file(
        str(SA_FILE), scopes=SCOPES
    )
    return build('drive', 'v3', credentials=creds)

def get_or_create_folder(service, name, parent_id):
    """หา folder ที่มีอยู่ใน parent หรือสร้างใหม่"""
    query = (
        f"name='{name}' and "
        f"mimeType='application/vnd.google-apps.folder' and "
        f"'{parent_id}' in parents and "
        f"trashed=false"
    )
    results = service.files().list(
        q=query,
        fields="files(id, name)",
        supportsAllDrives=True,
        includeItemsFromAllDrives=True
    ).execute()
    files = results.get('files', [])
    if files:
        return files[0]['id']

    meta = {
        'name': name,
        'mimeType': 'application/vnd.google-apps.folder',
        'parents': [parent_id]
    }
    folder = service.files().create(
        body=meta, fields='id',
        supportsAllDrives=True
    ).execute()
    return folder['id']

def upload_file(service, local_path, parent_id, filename=None):
    """อัปโหลดหรืออัปเดตไฟล์ใน parent folder"""
    from googleapiclient.http import MediaFileUpload

    local_path = Path(local_path)
    name = filename or local_path.name
    mime_type = mimetypes.guess_type(str(local_path))[0] or 'text/plain'

    # ตรวจสอบว่ามีไฟล์นี้อยู่แล้วหรือไม่
    query = f"name='{name}' and '{parent_id}' in parents and trashed=false"
    results = service.files().list(
        q=query, fields="files(id)",
        supportsAllDrives=True,
        includeItemsFromAllDrives=True
    ).execute()
    existing = results.get('files', [])

    media = MediaFileUpload(str(local_path), mimetype=mime_type, resumable=False)

    if existing:
        service.files().update(
            fileId=existing[0]['id'],
            media_body=media,
            supportsAllDrives=True
        ).execute()
        return "updated"
    else:
        meta = {'name': name, 'parents': [parent_id]}
        service.files().create(
            body=meta, media_body=media,
            fields='id', supportsAllDrives=True
        ).execute()
        return "created"

def main():
    print("=" * 60)
    print(f" 🚀 COMPHONE Drive Upload — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"    Folder: COMPHONE_Backups (shared)")
    print("=" * 60)
    print()

    service = build_service()
    print("✅ Connected to Google Drive")
    print(f"📁 Root folder ID: {SHARED_FOLDER_ID}")
    print()

    # สร้าง version subfolder ใน shared folder
    ts = datetime.now().strftime("%Y%m%d_%H%M")
    version_name = f"v5.5.9_{ts}"
    version_id = get_or_create_folder(service, version_name, SHARED_FOLDER_ID)
    print(f"📁 Version folder: {version_name}")
    print()

    # สร้าง subfolders
    folders = {}
    for folder_name in ["session", "clasp-ready", "pwa", "scripts", "docs", "workflows"]:
        folders[folder_name] = get_or_create_folder(service, folder_name, version_id)
        print(f"   📁 {folder_name}/")

    print()
    stats = {"session": 0, "gs": 0, "pwa": 0, "scripts": 0, "docs": 0, "workflows": 0}

    # ─── session.md ──────────────────────────────────────────
    print("📤 Uploading session.md...")
    if SESSION_FILE.exists():
        status = upload_file(service, SESSION_FILE, folders["session"])
        print(f"   ✅ session.md — {status}")
        stats["session"] = 1
    else:
        print("   ⚠️  session.md not found")

    # ─── GAS Backend ─────────────────────────────────────────
    print()
    print("📤 Uploading GAS Backend (.gs files)...")
    gs_dir = REPO_ROOT / "clasp-ready"
    if gs_dir.exists():
        for f in sorted(gs_dir.glob("*.gs")):
            status = upload_file(service, f, folders["clasp-ready"])
            print(f"   ✅ {f.name} — {status}")
            stats["gs"] += 1
    print(f"   Total: {stats['gs']} files")

    # ─── PWA Frontend ────────────────────────────────────────
    print()
    print("📤 Uploading PWA Frontend...")
    pwa_dir = REPO_ROOT / "pwa"
    if pwa_dir.exists():
        for ext in ["*.js", "*.html", "*.css", "*.json"]:
            for f in sorted(pwa_dir.glob(ext)):
                status = upload_file(service, f, folders["pwa"])
                print(f"   ✅ {f.name} — {status}")
                stats["pwa"] += 1
    print(f"   Total: {stats['pwa']} files")

    # ─── Scripts ─────────────────────────────────────────────
    print()
    print("📤 Uploading Scripts...")
    scripts_dir = REPO_ROOT / "scripts"
    if scripts_dir.exists():
        for f in sorted(scripts_dir.iterdir()):
            if f.is_file():
                status = upload_file(service, f, folders["scripts"])
                print(f"   ✅ {f.name} — {status}")
                stats["scripts"] += 1
    print(f"   Total: {stats['scripts']} files")

    # ─── Docs ────────────────────────────────────────────────
    print()
    print("📤 Uploading Docs...")
    docs_dir = REPO_ROOT / "delivery" / "docs"
    if docs_dir.exists():
        for f in sorted(docs_dir.glob("*.md")):
            status = upload_file(service, f, folders["docs"])
            print(f"   ✅ {f.name} — {status}")
            stats["docs"] += 1
    print(f"   Total: {stats['docs']} files")

    # ─── GitHub Actions Workflows ────────────────────────────
    print()
    print("📤 Uploading GitHub Actions workflows...")
    wf_dir = REPO_ROOT / ".github" / "workflows"
    if wf_dir.exists():
        for f in sorted(wf_dir.glob("*.yml")):
            status = upload_file(service, f, folders["workflows"])
            print(f"   ✅ {f.name} — {status}")
            stats["workflows"] += 1
    print(f"   Total: {stats['workflows']} files")

    # ─── Summary ─────────────────────────────────────────────
    total = sum(stats.values())
    print()
    print("=" * 60)
    print(f" ✅ UPLOAD COMPLETE — {total} files → Google Drive")
    print(f"    📁 COMPHONE_Backups/{version_name}/")
    print(f"    🔗 https://drive.google.com/drive/folders/{SHARED_FOLDER_ID}")
    print("=" * 60)

    return SHARED_FOLDER_ID, version_name, total

if __name__ == "__main__":
    main()
