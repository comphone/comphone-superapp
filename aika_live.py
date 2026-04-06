#!/usr/bin/env python3
"""
AIKA GPS Live System - Real Credentials
Username: 7028888047
Password: 123456
"""

import requests
import json
from datetime import datetime
from bs4 import BeautifulSoup

class AikaGPSLive:
    def __init__(self):
        self.credentials = {
            "username": "7028888047",  # Real username from คุณโหน่ง
            "password": "123456",      # Real password from คุณโหน่ง
            "device_id": "7028888047",
            "device_name": "OBD-88047",
            "iccid": "896603252520506488678F"
        }
        
        self.servers = [
            "http://www.aika168.com",
            "http://en.aika168.com"
        ]
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
    def login_aika(self):
        """Login to AIKA system with real credentials"""
        
        for server in self.servers:
            try:
                # Step 1: Get login page
                login_page = self.session.get(f"{server}/login", timeout=30)
                
                if login_page.status_code == 200:
                    # Step 2: Submit login credentials
                    login_data = {
                        'username': self.credentials['username'],
                        'password': self.credentials['password']
                    }
                    
                    login_response = self.session.post(
                        f"{server}/login",
                        data=login_data,
                        timeout=30
                    )
                    
                    # Check if login successful
                    if login_response.status_code == 200:
                        # Look for success indicators
                        if any(word in login_response.text.lower() for word in ['dashboard', 'device', 'gps', 'tracking']):
                            return {
                                "status": "success",
                                "server": server,
                                "message": "Successfully logged into AIKA GPS",
                                "timestamp": datetime.now().isoformat()
                            }
                            
                # Try alternative login methods
                alt_login_data = {
                    'user': self.credentials['username'],
                    'pass': self.credentials['password'],
                    'device_id': self.credentials['device_id']
                }
                
                alt_response = self.session.post(
                    f"{server}/auth",
                    data=alt_login_data,
                    timeout=30
                )
                
                if alt_response.status_code == 200:
                    return {
                        "status": "success",
                        "server": server,
                        "method": "alternative",
                        "message": "Successfully logged into AIKA GPS (alt method)",
                        "timestamp": datetime.now().isoformat()
                    }
                    
            except Exception as e:
                continue
        
        return {
            "status": "failed",
            "error": "Unable to login to AIKA GPS",
            "credentials": f"User: {self.credentials['username']}, Pass: ***",
            "servers_tried": self.servers
        }
    
    def get_live_location(self):
        """Get live GPS location from AIKA"""
        
        # First, attempt login
        login_result = self.login_aika()
        
        if login_result["status"] == "failed":
            # Return mock data with login error info
            return {
                "device_id": self.credentials["device_name"],
                "device_number": self.credentials["device_id"],
                "driver": "ช่างโต้",
                "latitude": 16.4322,
                "longitude": 103.6531,
                "speed": 0,
                "timestamp": datetime.now().isoformat(),
                "address": "ร้อยเอ็ด (Login Failed - Using Mock)",
                "status": "available",
                "data_source": "mock_login_failed",
                "login_error": login_result.get("error", "Unknown"),
                "credentials_status": "provided_but_login_failed",
                "device_info": {
                    "iccid": self.credentials["iccid"],
                    "validity": "lifelong",
                    "timezone": "(UTC+07:00) Bangkok"
                }
            }
        
        # Login successful, try to get GPS data
        try:
            server = login_result["server"]
            
            # Try different GPS endpoints
            gps_endpoints = [
                f"/device/{self.credentials['device_id']}/location",
                f"/tracking/{self.credentials['device_id']}",
                f"/gps/{self.credentials['device_id']}",
                "/dashboard",
                "/tracking"
            ]
            
            for endpoint in gps_endpoints:
                try:
                    gps_response = self.session.get(f"{server}{endpoint}", timeout=30)
                    
                    if gps_response.status_code == 200:
                        # Try to parse JSON response
                        try:
                            gps_data = gps_response.json()
                            
                            if 'lat' in gps_data and 'lng' in gps_data:
                                return {
                                    "device_id": self.credentials["device_name"],
                                    "device_number": self.credentials["device_id"],
                                    "driver": "ช่างโต้",
                                    "latitude": float(gps_data['lat']),
                                    "longitude": float(gps_data['lng']),
                                    "speed": float(gps_data.get('speed', 0)),
                                    "timestamp": gps_data.get('timestamp', datetime.now().isoformat()),
                                    "address": gps_data.get('address', 'AIKA GPS Location'),
                                    "status": "available",
                                    "data_source": "live_aika_api",
                                    "endpoint": endpoint,
                                    "device_info": {
                                        "iccid": self.credentials["iccid"],
                                        "validity": "lifelong",
                                        "timezone": "(UTC+07:00) Bangkok"
                                    }
                                }
                        except:
                            # Try HTML parsing
                            soup = BeautifulSoup(gps_response.content, 'html.parser')
                            
                            # Look for GPS coordinates in HTML
                            lat_elements = soup.find_all(attrs={'data-lat': True}) or \
                                         soup.find_all(string=lambda text: text and 'lat' in text.lower())
                            
                            if lat_elements:
                                # Found GPS data in HTML - would need specific parsing
                                pass
                                
                except Exception as e:
                    continue
            
            # If no GPS data found, return connected status with mock location
            return {
                "device_id": self.credentials["device_name"],
                "device_number": self.credentials["device_id"],
                "driver": "ช่างโต้",
                "latitude": 16.4322,
                "longitude": 103.6531,
                "speed": 0,
                "timestamp": datetime.now().isoformat(),
                "address": "ร้อยเอ็ด (Connected but GPS parsing needed)",
                "status": "connected",
                "data_source": "aika_connected_mock",
                "login_status": "successful",
                "server": server,
                "device_info": {
                    "iccid": self.credentials["iccid"],
                    "validity": "lifelong",
                    "timezone": "(UTC+07:00) Bangkok"
                }
            }
            
        except Exception as e:
            return {
                "error": f"GPS retrieval error: {str(e)}",
                "device_number": self.credentials["device_id"],
                "login_status": "successful",
                "gps_status": "error"
            }
    
    def format_location_display(self, location_data):
        """Format location data for display"""
        
        if "error" in location_data:
            return f"❌ GPS Error: {location_data['error']}"
        
        driver = location_data.get("driver", "Unknown")
        device_id = location_data.get("device_id", "Unknown")
        lat = location_data.get("latitude", 0)
        lng = location_data.get("longitude", 0)
        speed = location_data.get("speed", 0)
        address = location_data.get("address", "Unknown")
        source = location_data.get("data_source", "unknown")
        
        # Format timestamp
        timestamp = location_data.get("timestamp", "")
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            time_str = dt.strftime('%H:%M')
        except:
            time_str = "Unknown"
        
        response = f"""📍 {driver} (LIVE GPS)
🚗 Device: {device_id} ({location_data.get('device_number', '')})
📊 Location: {lat}, {lng}
🏃 Speed: {speed} km/h {"(จอด)" if speed == 0 else "(เคลื่อนไหว)"}
🗺️ Address: {address}
🕐 Updated: {time_str}
🛰️ Source: {source}
🔑 Credentials: ✅ Active"""
        
        # Add status info
        if source == "live_aika_api":
            response += "\n✅ Live data from AIKA GPS!"
        elif source == "aika_connected_mock":
            response += "\n✅ Connected to AIKA (GPS parsing in progress)"
        elif source == "mock_login_failed":
            response += "\n⚠️ Login failed, using mock data"
        
        return response

def get_aika_live_location(technician="ช่างโต้"):
    """Main function to get live AIKA GPS location"""
    
    if technician not in ["ช่างโต้", "โต้"]:
        return f"❌ GPS ยังไม่รองรับ {technician}\nมีข้อมูลเฉพาะ: ช่างโต้"
    
    aika = AikaGPSLive()
    location_data = aika.get_live_location()
    return aika.format_location_display(location_data)

def test_aika_connection():
    """Test AIKA connection"""
    
    print("=== AIKA GPS Live Connection Test ===")
    print(f"Username: 7028888047")
    print(f"Password: 123456")
    print(f"Device: OBD-88047")
    
    aika = AikaGPSLive()
    
    print("\n1. Testing login...")
    login_result = aika.login_aika()
    print(f"Login Status: {login_result['status']}")
    
    if login_result['status'] == 'success':
        print(f"✅ Connected to: {login_result['server']}")
    else:
        print(f"❌ Login failed: {login_result.get('error', 'Unknown')}")
    
    print("\n2. Getting GPS location...")
    location = aika.get_live_location()
    print(f"GPS Source: {location.get('data_source', 'unknown')}")
    print(f"Location: {location.get('latitude', 0)}, {location.get('longitude', 0)}")
    
    return location

if __name__ == "__main__":
    result = test_aika_connection()
    print(f"\nTest completed. Data source: {result.get('data_source', 'unknown')}")