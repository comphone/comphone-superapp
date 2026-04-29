#!/usr/bin/env python3
"""
COMPHONE SUPER APP - Create GAS Deployment
สร้าง Web App Deployment ใหม่หลังอัปเดตโค้ด
"""
import json
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime

# Config
SCRIPT_ID = "1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043"
CLASPRC = Path.home() / ".clasprc.json"

def get_access_token():
    """Refresh และอ่าน access token"""
    with open(CLASPRC) as f:
        data = json.load(f)
    
    token_data = data.get("tokens", {}).get("default", {})
    
    # Refresh token
    refresh_token = token_data.get("refresh_token")
    client_id = "1072944905499-vm2v2i5dvn0a0d2o4ca36i1vge8cvbn0.apps.googleusercontent.com"
    client_secret = "v6V3fKV_zWU7iw1DrpO1rknX"
    
    post_data = urllib.parse.urlencode({
        "refresh_token": refresh_token,
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "refresh_token"
    }).encode()
    
    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=post_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    with urllib.request.urlopen(req, timeout=30) as resp:
        new_tokens = json.loads(resp.read())
        return new_tokens.get("access_token")

def create_deployment(token):
    """สร้าง Web App Deployment ใหม่"""
    url = f"https://script.googleapis.com/v1/projects/{SCRIPT_ID}/deployments"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    body = {
        "description": f"COMPHONE v5.9.0-phase31 - {now}",
        "manifestFileName": "appsscript",
        "webAppConfig": {
            "access": "ANYONE_ANONYMUS",
            "executeAs": "USER_DEPLOYING"
        }
    }
    
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read())
            return True, result
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        return False, {"error": str(e.code), "detail": error_body}
    except Exception as e:
        return False, {"error": str(e)}

def main():
    print("=" * 60)
    print(" COMPHONE SUPER APP - Create GAS Deployment")
    print("=" * 60)
    
    print("\n[1/2] Refresh access token...")
    token = get_access_token()
    if not token:
        print("❌ ไม่สามารถ refresh token ได้")
        exit(1)
    print(f"   ✅ Token ยาว: {len(token)} ตัวอักษร")
    
    print("\n[2/2] สร้าง Web App Deployment...")
    success, result = create_deployment(token)
    
    if success:
        print("\n" + "=" * 60)
        print(" ✅ DEPLOYMENT สำเร็จ!")
        print("=" * 60)
        deployment_id = result.get("deploymentId", "N/A")
        deployment_url = result.get("webApp", {}).get("url", "N/A")
        version_number = result.get("versionNumber", "N/A")
        
        print(f"\n   Deployment ID : {deployment_id}")
        print(f"   Version Number: v{version_number}")
        print(f"   Web App URL    : {deployment_url}")
        print(f"\n   เปิด GAS Editor: https://script.google.com/d/{SCRIPT_ID}/edit")
        print()
    else:
        print("\n❌ สร้าง Deployment ล้มเหลว:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        exit(1)

if __name__ == "__main__":
    main()
