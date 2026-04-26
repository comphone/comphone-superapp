#!/usr/bin/env python3
"""
COMPHONE GDrive Auth Setup — ช่วยสร้าง refresh_token ใหม่
รันสคริปต์นี้บน Windows เพื่อทำ OAuth2 authentication
"""
import os
import json
from pathlib import Path

print("=" * 60)
print("🔐 COMPHONE Google Drive — OAuth2 Setup")
print("=" * 60)
print()
print("📋 ขั้นตอนการตั้งค่า:")
print()
print("1. เปิด https://console.cloud.google.com/")
print("2. เลือกโปรเจค หรือสร้างใหม่")
print("3. เปิดใช้งาน Google Drive API")
print("   → APIs & Services → Library → ค้นหา 'Google Drive API' → Enable")
print()
print("4. สร้าง OAuth2 Credentials:")
print("   → APIs & Services → Credentials → Create Credentials → OAuth Client ID")
print("   → Application type: Desktop App")
print("   → ดาวน์โหลด JSON file")
print()
print("5. แก้ไขบรรทัดด้านล่างนี้:")
print('   CLIENT_SECRET_FILE = r"C:\\path\\to\\your\\credentials.json"')
print()
print("6. รันสคริปต์นี้: python setup_gdrive_auth.py")
print("   (จะเปิด browser ให้ login ด้วย narinoutagit@gmail.com)")
print()
print("7. หลัง login สำเร็จ จะได้ refresh_token มาใส่ใน Environment Variables")
print()
print("=" * 60)
print()

# ===== ตั้งค่าพาธของ credentials.json ที่ดาวน์โหลดมา =====
CLIENT_SECRET_FILE = r"C:\Users\Server\comphone-superapp\scripts\credentials.json"

if not os.path.exists(CLIENT_SECRET_FILE):
    print(f"❌ ไม่พบไฟล์ credentials: {CLIENT_SECRET_FILE}")
    print()
    print("📥 ดาวน์โหลด credentials.json จาก Google Cloud Console มาไว้ที่:")
    print(f"   {CLIENT_SECRET_FILE}")
    print()
    exit(1)

# อ่าน credentials
with open(CLIENT_SECRET_FILE) as f:
    creds = json.load(f)

if "installed" not in creds:
    print("❌ ไฟล์ credentials ไม่ใช่แบบ Desktop App (installed)")
    print("   ต้องสร้าง OAuth Client ID แบบ Desktop App เท่านั้น")
    exit(1)

client_id = creds["installed"]["client_id"]
client_secret = creds["installed"]["client_secret"]

# สร้าง authorization URL
import urllib.parse

scopes = ["https://www.googleapis.com/auth/drive"]
redirect_uri = "http://localhost:8080"

auth_params = {
    "client_id": client_id,
    "redirect_uri": redirect_uri,
    "response_type": "code",
    "scope": " ".join(scopes),
    "access_type": "offline",  # สำคัญ: ขอ refresh_token
    "prompt": "consent"  # บังคับให้ได้ refresh_token ใหม่
}

auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(auth_params)

print("🌐 เปิด browser เพื่อ login Google Account...")
print()
print("⚠️  สำคัญ: ต้อง login ด้วย **narinoutagit@gmail.com** เท่านั้น")
print("   (ห้ามใช้ comphone.service101@gmail.com)")
print()
print("=" * 60)
print()
print("📋 Authorization URL (ถ้า browser ไม่เปิดอัตโนมัติ ให้ copy ไปเปิดเอง):")
print()
print(auth_url)
print()
print("=" * 60)
print()

# พยายามเปิด browser
try:
    import webbrowser
    webbrowser.open(auth_url)
    print("✅ เปิด browser แล้ว")
except:
    print("⚠️  ไม่สามารถเปิด browser อัตโนมัติ กรุณา copy URL ไปเปิดเอง")

print()
print("⏳ รอรับ authorization code...")
print("   (หลังจาก login และ allow permissions แล้ว จะถูก redirect ไป localhost:8080)")
print()

# รับ authorization code ผ่าน HTTP server แบบง่าย
try:
    from http.server import HTTPServer, BaseHTTPRequestHandler
    import threading
    import urllib.parse
    
    received_code = None
    received_error = None
    
    class CallbackHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            global received_code, received_error
            query = urllib.parse.urlparse(self.path).query
            params = urllib.parse.parse_qs(query)
            
            if "code" in params:
                received_code = params["code"][0]
                self.send_response(200)
                self.send_header("Content-type", "text/html")
                self.end_headers()
                self.wfile.write(b"<h1>Auth Success!</h1><p>You can close this window.</p>")
            elif "error" in params:
                received_error = params["error"][0]
                self.send_response(400)
                self.send_header("Content-type", "text/html")
                self.end_headers()
                self.wfile.write(f"<h1>Auth Error</h1><p>{received_error}</p>".encode())
            else:
                self.send_response(400)
                self.end_headers()
        
        def log_message(self, format, *args):
            pass  # ซ่อน log
    
    server = HTTPServer(("localhost", 8080), CallbackHandler)
    server.timeout = 120  # รอ 2 นาที
    
    print("🎧 กำลังรอ response ที่ localhost:8080...")
    print("   (มีเวลา 2 นาที)")
    print()
    
    server.handle_request()
    server.server_close()
    
    if received_error:
        print(f"❌ เกิดข้อผิดพลาด: {received_error}")
        exit(1)
    
    if not received_code:
        print("❌ ไม่ได้รับ authorization code")
        print("   ลอง copy URL ไปเปิดเอง แล้วทำตามขั้นตอน")
        exit(1)
    
    print(f"✅ ได้รับ authorization code แล้ว")
    print()
    
    # แลก code เป็น token
    print("🔄 กำลังแลก code เป็น access_token + refresh_token...")
    
    import urllib.request
    
    token_data = urllib.parse.urlencode({
        "code": received_code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }).encode()
    
    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=token_data)
    
    try:
        resp = urllib.request.urlopen(req)
        tokens = json.loads(resp.read())
        
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        
        if not refresh_token:
            print("⚠️  ไม่ได้รับ refresh_token")
            print("   ลองตั้งค่า prompt=consent และ access_type=offline ใหม่")
            print("   หรือลบ app ออกจาก https://myaccount.google.com/permissions แล้วลองใหม่")
            exit(1)
        
        print()
        print("=" * 60)
        print("✅ ได้ refresh_token แล้ว!")
        print("=" * 60)
        print()
        print("📝 ตั้งค่า Environment Variables (Windows):")
        print()
        print(f'setx GOOGLE_CLIENT_ID "{client_id}"')
        print(f'setx GOOGLE_CLIENT_SECRET "{client_secret}"')
        print(f'setx GOOGLE_REFRESH_TOKEN "{refresh_token}"')
        print()
        print("หรือ (PowerShell):")
        print()
        print(f'$env:GOOGLE_CLIENT_ID = "{client_id}"')
        print(f'$env:GOOGLE_CLIENT_SECRET = "{client_secret}"')
        print(f'$env:GOOGLE_REFRESH_TOKEN = "{refresh_token}"')
        print()
        print("=" * 60)
        print()
        print("💾 หรือบันทึกลงไฟล์ token.json:")
        print()
        
        token_file = Path.home() / ".comphone" / "token.json"
        token_file.parent.mkdir(parents=True, exist_ok=True)
        
        token_json = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_uri": "https://oauth2.googleapis.com/token",
            "client_id": client_id,
            "client_secret": client_secret,
            "scopes": ["https://www.googleapis.com/auth/drive"]
        }
        
        with open(token_file, "w") as f:
            json.dump(token_json, f, indent=2)
        
        print(f"✅ บันทึกแล้วที่: {token_file}")
        print()
        print("🚀 ตอนนี้สามารถรัน sync ได้แล้ว:")
        print("   python scripts\\drive_sync.py --all")
        print()
        
    except Exception as e:
        print(f"❌ ไม่สามารถแลก code เป็น token ได้: {e}")
        exit(1)
        
except ImportError:
    print("❌ ต้องการ Python ที่มี http.server module")
    exit(1)
except Exception as e:
    print(f"❌ เกิดข้อผิดพลาด: {e}")
    exit(1)
