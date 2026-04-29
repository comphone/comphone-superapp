#!/usr/bin/env python3
"""
COMPHONE SUPER APP - Direct GAS API Push
ใช้งาน Google Apps Script API โดยตรง แทน clasp CLI
แก้ปัญหา clasp timeout
"""
import json
import os
import sys
from pathlib import Path
import urllib.request
import urllib.error

# Config
SCRIPT_ID = "1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043"
CLASP_DIR = Path(__file__).resolve().parent.parent / "clasp-ready"
CLASPRC = Path.home() / ".clasprc.json"

def get_access_token():
    """อ่าน access token จาก .clasprc.json"""
    if not CLASPRC.exists():
        print(f"❌ ไม่พบไฟล์: {CLASPRC}")
        sys.exit(1)
    
    with open(CLASPRC) as f:
        data = json.load(f)
    
    token_data = data.get("tokens", {}).get("default", {})
    access_token = token_data.get("access_token")
    
    if not access_token:
        print("❌ ไม่พบ access_token ใน .clasprc.json")
        sys.exit(1)
    
    return access_token

def read_gs_files():
    """อ่านไฟล์ .gs ทั้งหมดจาก clasp-ready/"""
    gs_files = list(CLASP_DIR.glob("*.gs"))
    files_data = []
    
    for gf in gs_files:
        with open(gf, 'r', encoding='utf-8') as f:
            content = f.read()
        files_data.append({
            "name": gf.stem,  # ชื่อไฟล์ไม่รวม .gs
            "type": "SERVER_JS",
            "source": content
        })
    
    # เพิ่ม appsscript.json
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
    """อัปเดต GAS project ผ่าน API"""
    url = f"https://script.googleapis.com/v1/projects/{SCRIPT_ID}/content"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    body = {
        "files": files_data
    }
    
    data = json.dumps(body).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers=headers, method="PUT")
    
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())
            print(f"✅ อัปเดตสำเร็จ!")
            print(f"   Script ID: {result.get('scriptId', SCRIPT_ID)}")
            return True
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Error: {e.code}")
        print(f"   {e.read().decode('utf-8')}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("=" * 60)
    print(" COMPHONE SUPER APP - GAS API Push (No clasp)")
    print("=" * 60)
    
    print("\n[1/3] อ่าน access token...")
    token = get_access_token()
    print(f"   ✅ Token ยาว: {len(token)} ตัวอักษร")
    
    print("\n[2/3] อ่านไฟล์ .gs...")
    files_data = read_gs_files()
    print(f"   ✅ พบไฟล์: {len(files_data)} ไฟล์")
    for f in files_data:
        print(f"      - {f['name']} ({f['type']})")
    
    print("\n[3/3] อัปเดต GAS Project...")
    success = update_project(token, files_data)
    
    if success:
        print("\n" + "=" * 60)
        print(" ✅ DEPLOY สำเร็จ!")
        print("=" * 60)
        print(f"\n   GAS Editor: https://script.google.com/d/{SCRIPT_ID}/edit")
        print(f"   Version: v5.9.0-phase31")
        print()
    else:
        print("\n❌ Deploy ล้มเหลว")
        sys.exit(1)

if __name__ == "__main__":
    main()
