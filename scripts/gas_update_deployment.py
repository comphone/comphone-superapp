#!/usr/bin/env python3
"""
COMPHONE SUPER APP - List and Update Deployment
แสดง deployments ที่มี และแก้ไขให้ชี้ไปโค้ดใหม่
"""
import json
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path
from datetime import datetime

SCRIPT_ID = "1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043"
CLASPRC = Path.home() / ".clasprc.json"

CLIENT_ID = "1072944905499-vm2v2i5dvn0a0d2o4ca36i1vge8cvbn0.apps.googleusercontent.com"
CLIENT_SECRET = "v6V3fKV_zWU7iw1DrpO1rknX"

def get_access_token():
    with open(CLASPRC) as f:
        data = json.load(f)
    token_data = data.get("tokens", {}).get("default", {})
    refresh_token = token_data.get("refresh_token")
    
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
    
    with urllib.request.urlopen(req, timeout=30) as resp:
        new_tokens = json.loads(resp.read())
        return new_tokens.get("access_token")

def list_deployments(token):
    """แสดง deployments ทั้งหมด"""
    url = f"https://script.googleapis.com/v1/projects/{SCRIPT_ID}/deployments"
    headers = {"Authorization": f"Bearer {token}"}
    
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
            return True, result
    except urllib.error.HTTPError as e:
        return False, {"error": str(e.code), "detail": e.read().decode('utf-8')}
    except Exception as e:
        return False, {"error": str(e)}

def update_deployment(token, deployment_id, new_version):
    """แก้ไข deployment ให้ชี้ไปเวอร์ชันใหม่"""
    url = f"https://script.googleapis.com/v1/projects/{SCRIPT_ID}/deployments/{deployment_id}"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    body = {
        "deploymentConfig": {
            "versionNumber": new_version,
            "webApp": {
                "access": "ANYONE_ANONYMOUS",
                "executeAs": "USER_DEPLOYING"
            }
        },
        "description": f"COMPHONE v5.9.0-phase31 - {now}"
    }
    
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method="PUT")
    
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read())
            return True, result
    except urllib.error.HTTPError as e:
        return False, {"error": str(e.code), "detail": e.read().decode('utf-8')}
    except Exception as e:
        return False, {"error": str(e)}

def main():
    print("=" * 60)
    print(" COMPHONE SUPER APP - List/Update Deployments")
    print("=" * 60)
    
    print("\n[1/3] Refresh access token...")
    token = get_access_token()
    print(f"   ✅ Token ยาว: {len(token)} ตัวอักษร")
    
    print("\n[2/3] ตรวจสอบ Deployments...")
    success, result = list_deployments(token)
    
    if not success:
        print("\n❌ ไม่สามารถดู deployments ได้:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        exit(1)
    
    deployments = result.get("deployments", [])
    print(f"   ✅ พบ Deployments: {len(deployments)} รายการ")
    
    for d in deployments:
        deploy_id = d.get("deploymentId", "N/A")
        version = d.get("deploymentConfig", {}).get("versionNumber", "N/A")
        desc = d.get("description", "")
        web_app = d.get("deploymentConfig", {}).get("webApp", {})
        url = web_app.get("url", "N/A") if web_app else "N/A"
        
        print(f"\n   Deployment: {deploy_id}")
        print(f"      Version : {version}")
        print(f"      URL      : {url}")
        print(f"      Desc    : {desc}")
    
    print("\n[3/3] อัปเดต Deployments ให้ชี้ไปโค้ดใหม่...")
    
    # ลองแก้ไขทุก deployment
    for d in deployments:
        deploy_id = d.get("deploymentId")
        if not deploy_id:
            continue
        
        print(f"\n   กำลังอัปเดต {deploy_id}...")
        # ใช้ versionNumber = 0 (latest)
        success, result = update_deployment(token, deploy_id, 0)
        
        if success:
            print(f"   ✅ อัปเดตสำเร็จ!")
            new_url = result.get("deploymentConfig", {}).get("webApp", {}).get("url", "N/A")
            print(f"      New URL: {new_url}")
        else:
            print(f"   ❌ อัปเดตล้มเหลว:")
            print(f"      {json.dumps(result, indent=2, ensure_ascii=False)}")
    
    print("\n" + "=" * 60)
    print(" ✅ อัปเดต Deployments เสร็จ!")
    print("=" * 60)
    print(f"\n   GAS Editor: https://script.google.com/d/{SCRIPT_ID}/edit")
    print(f"   Version: v5.9.0-phase31")
    print()

if __name__ == "__main__":
    main()
