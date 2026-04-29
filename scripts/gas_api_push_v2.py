#!/usr/bin/env python3
"""
COMPHONE SUPER APP - Direct GAS API Push v2
แก้ไขปัญหา 401 โดย refresh token อัตโนมัติ
"""
import json
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path
from datetime import datetime

# Config
SCRIPT_ID = "1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043"
CLASP_DIR = Path(__file__).resolve().parent.parent / "clasp-ready"
CLASPRC = Path.home() / ".clasprc.json"

# clasp credentials (from .clasprc.json)
CLIENT_ID = "1072944905499-vm2v2i5dvn0a0d2o4ca36i1vge8cvbn0.apps.googleusercontent.com"
CLIENT_SECRET = "v6V3fKV_zWU7iw1DrpO1rknX"

def refresh_access_token():
    """Refresh access token จาก refresh_token"""
    with open(CLASPRC) as f:
        data = json.load(f)
    
    token_data = data.get("tokens", {}).get("default", {})
    refresh_token = token_data.get("refresh_token")
    
    if not refresh_token:
        print("❌ ไม่มี refresh_token")
        return None
    
    # Refresh
    post_data = urllib.parse.urlencode({
        "refresh_token": refresh_token,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type": "refresh_token"
    }).encode()
    
    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=post_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            new_tokens = json.loads(resp.read())
            access_token = new_tokens.get("access_token")
            
            # อัปเดตไฟล์
            token_data["access_token"] = access_token
            if "expires_in" in new_tokens:
                import time
                token_data["expiry_date"] = int(time.time() * 1000) + new_tokens["expires_in"] * 1000
            
            with open(CLASPRC, 'w') as f:
                json.dump(data, f, indent=2)
            
            print(f"✅ Refresh token สำเร็จ (ยาว: {len(access_token)} ตัวอักษร)")
            return access_token
    except Exception as e:
        print(f"❌ Refresh ล้มเหลว: {e}")
        return None

def read_all_files():
    """อ่านไฟล์ทั้งหมดจาก clasp-ready/"""
    files_data = []
    
    # อ่านไฟล์ .gs
    for gf in CLASP_DIR.glob("*.gs"):
        with open(gf, 'r', encoding='utf-8') as f:
            content = f.read()
        files_data.append({
            "name": gf.stem,
            "type": "SERVER_JS",
            "source": content
        })
    
    # อ่าน appsscript.json
    appscript = CLASP_DIR / "appsscript.json"
    if appscript.exists():
        with open(appscript, 'r', encoding='utf-8') as f:
            content = f.read()
        files_data.append({
            "name": "appsscript",
            "type": "JSON",
            "source": content
        })
    
    return files_data

def update_project(token, files_data):
    """อัปเดต GAS Project"""
    url = f"https://script.googleapis.com/v1/projects/{SCRIPT_ID}/content"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    body = {"files": files_data}
    data = json.dumps(body).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers=headers, method="PUT")
    
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read())
            return True, result
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        return False, {"error": str(e.code), "detail": error_body}
    except Exception as e:
        return False, {"error": str(e)}

def main():
    print("=" * 60)
    print(" COMPHONE SUPER APP - GAS API Push v2")
    print("=" * 60)
    
    # Step 1: Refresh token
    print("\n[1/3] Refresh access token...")
    token = refresh_access_token()
    if not token:
        print("❌ ไม่สามารถ refresh token ได้")
        exit(1)
    
    # Step 2: อ่านไฟล์
    print("\n[2/3] อ่านไฟล์ .gs...")
    files_data = read_all_files()
    print(f"   ✅ พบไฟล์: {len(files_data)} ไฟล์")
    
    # Step 3: อัปเดต GAS
    print("\n[3/3] อัปเดต GAS Project...")
    print(f"   Script ID: {SCRIPT_ID}")
    success, result = update_project(token, files_data)
    
    if success:
        print("\n" + "=" * 60)
        print(" ✅ DEPLOY สำเร็จ!")
        print("=" * 60)
        print(f"\n   GAS Editor: https://script.google.com/d/{SCRIPT_ID}/edit")
        print(f"   Version: v5.9.0-phase31")
        print(f"   ไฟล์ทั้งหมด: {len(files_data)} ไฟล์")
        print()
    else:
        print("\n❌ Deploy ล้มเหลว:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        exit(1)

if __name__ == "__main__":
    main()
