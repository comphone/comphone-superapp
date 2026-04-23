#!/usr/bin/env python3
"""Upload all COMPHONE project files to Google Drive using OAuth2 token"""

import json
import os
import urllib.request
import urllib.parse
import urllib.error
import mimetypes
from pathlib import Path

# Config
FOLDER_ID = "1Wfa2cPdrIcLAeKMbXvmikCZBKDtRPuI7"
TOKEN_FILE = "/home/ubuntu/.comphone/drive_token.json"
CLIENT_FILE = "/home/ubuntu/.comphone/drive_oauth_client.json"

def get_access_token():
    """Get valid access token, refresh if needed"""
    with open(TOKEN_FILE) as f:
        token_data = json.load(f)
    
    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    
    # ลอง refresh token เพื่อให้ได้ token ใหม่ที่แน่ใจว่าใช้ได้
    if refresh_token:
        with open(CLIENT_FILE) as f:
            cs = json.load(f)
        if "installed" in cs:
            client_id = cs["installed"]["client_id"]
            client_secret = cs["installed"]["client_secret"]
        else:
            client_id = cs.get("client_id")
            client_secret = cs.get("client_secret")
        
        data = urllib.parse.urlencode({
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "refresh_token"
        }).encode()
        
        req = urllib.request.Request(
            "https://oauth2.googleapis.com/token",
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        try:
            resp = urllib.request.urlopen(req)
            new_token = json.loads(resp.read())
            access_token = new_token["access_token"]
            # อัปเดต token file
            token_data["access_token"] = access_token
            with open(TOKEN_FILE, "w") as f:
                json.dump(token_data, f, indent=2)
            print(f"✅ Token refreshed successfully")
        except Exception as e:
            print(f"⚠️ Token refresh failed: {e}, using existing token")
    
    return access_token

def create_folder(name, parent_id, token):
    """Create folder in Google Drive"""
    metadata = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
        "parents": [parent_id]
    }
    data = json.dumps(metadata).encode()
    req = urllib.request.Request(
        "https://www.googleapis.com/drive/v3/files",
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    )
    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())
        return result["id"]
    except urllib.error.HTTPError as e:
        error = json.loads(e.read().decode())
        print(f"  ⚠️ Create folder error: {error.get('error', {}).get('message', str(e))}")
        return None

def upload_file(file_path, folder_id, token):
    """Upload a single file to Google Drive"""
    file_path = Path(file_path)
    if not file_path.exists():
        return False
    
    file_size = file_path.stat().st_size
    if file_size == 0:
        return False
    
    mime_type = mimetypes.guess_type(str(file_path))[0] or "text/plain"
    
    # Metadata
    metadata = json.dumps({
        "name": file_path.name,
        "parents": [folder_id]
    }).encode()
    
    # Read file content
    with open(file_path, "rb") as f:
        file_content = f.read()
    
    # Multipart upload
    boundary = "boundary_comphone_upload"
    body = (
        f"--{boundary}\r\n"
        f"Content-Type: application/json; charset=UTF-8\r\n\r\n"
    ).encode() + metadata + (
        f"\r\n--{boundary}\r\n"
        f"Content-Type: {mime_type}\r\n\r\n"
    ).encode() + file_content + f"\r\n--{boundary}--".encode()
    
    req = urllib.request.Request(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/related; boundary={boundary}",
            "Content-Length": str(len(body))
        }
    )
    
    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())
        return result.get("id") is not None
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        try:
            error_msg = json.loads(error_body).get("error", {}).get("message", error_body[:100])
        except:
            error_msg = error_body[:100]
        print(f"  ❌ Upload error: {error_msg}")
        return False

def main():
    print("=" * 60)
    print("📤 COMPHONE Google Drive Upload")
    print("=" * 60)
    
    # รับ token
    token = get_access_token()
    print(f"Access token: {token[:30]}...")
    
    # สร้าง folder structure
    print("\n📁 Creating folder structure...")
    
    # สร้าง COMPHONE_v559 folder
    main_folder_id = create_folder("COMPHONE_v5.5.9", FOLDER_ID, token)
    if not main_folder_id:
        print("❌ Cannot create main folder")
        return
    print(f"  ✅ COMPHONE_v5.5.9 folder created: {main_folder_id}")
    
    # สร้าง subfolders
    subfolders = {}
    for name in ["clasp-ready", "pwa", "scripts", "memory", "docs"]:
        fid = create_folder(name, main_folder_id, token)
        if fid:
            subfolders[name] = fid
            print(f"  ✅ {name}/ folder created")
    
    # Files to upload
    upload_map = {
        "clasp-ready": [
            "/home/ubuntu/github-clone/clasp-ready/Router.gs",
            "/home/ubuntu/github-clone/clasp-ready/DriveSync.gs",
            "/home/ubuntu/github-clone/clasp-ready/PushNotifications.gs",
            "/home/ubuntu/github-clone/clasp-ready/DataSeeding.gs",
            "/home/ubuntu/github-clone/clasp-ready/CustomerPortal.gs",
            "/home/ubuntu/github-clone/clasp-ready/SessionBackup.gs",
        ],
        "pwa": [
            "/home/ubuntu/github-clone/pwa/app.js",
            "/home/ubuntu/github-clone/pwa/admin.js",
            "/home/ubuntu/github-clone/pwa/offline_db.js",
            "/home/ubuntu/github-clone/pwa/reports.js",
            "/home/ubuntu/github-clone/pwa/push_notifications.js",
            "/home/ubuntu/github-clone/pwa/after_sales_enhanced.js",
            "/home/ubuntu/github-clone/pwa/billing_slip_verify.js",
            "/home/ubuntu/github-clone/pwa/customer_portal.html",
            "/home/ubuntu/github-clone/pwa/customer_sw.js",
            "/home/ubuntu/github-clone/pwa/customer_manifest.json",
            "/home/ubuntu/github-clone/pwa/index.html",
            "/home/ubuntu/github-clone/pwa/sw.js",
        ],
        "scripts": [
            "/home/ubuntu/github-clone/scripts/auto_push.py",
            "/home/ubuntu/github-clone/scripts/drive_sync.py",
            "/home/ubuntu/github-clone/scripts/sync_all.py",
            "/home/ubuntu/github-clone/scripts/quick-push.sh",
            "/home/ubuntu/github-clone/scripts/start-watcher.sh",
            "/home/ubuntu/github-clone/scripts/start-sync-all.sh",
            "/home/ubuntu/github-clone/scripts/install-hooks.sh",
            "/home/ubuntu/github-clone/scripts/start-watcher.bat",
            "/home/ubuntu/github-clone/scripts/start-sync-all.bat",
        ],
        "memory": [
            "/memory/session.md",
        ],
        "docs": [
            "/home/ubuntu/COMPHONE_CODE_AUDIT_v556.md",
            "/home/ubuntu/github-clone/delivery/docs/LINE_WEBHOOK_CHECKLIST.md",
        ]
    }
    
    # Upload files
    print("\n📤 Uploading files...")
    total = 0
    success = 0
    
    for folder_name, files in upload_map.items():
        folder_id = subfolders.get(folder_name, main_folder_id)
        for file_path in files:
            total += 1
            fname = Path(file_path).name
            if upload_file(file_path, folder_id, token):
                success += 1
                print(f"  ✅ {folder_name}/{fname}")
            else:
                print(f"  ⚠️ {folder_name}/{fname} — skipped")
    
    # Upload ZIP handover
    zip_path = "/home/ubuntu/comphone-handover-v559.zip"
    if Path(zip_path).exists():
        total += 1
        if upload_file(zip_path, main_folder_id, token):
            success += 1
            print(f"  ✅ comphone-handover-v559.zip")
    
    print(f"\n{'=' * 60}")
    print(f"✅ Upload complete: {success}/{total} files")
    print(f"📁 Drive folder: https://drive.google.com/drive/folders/{FOLDER_ID}")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    main()
