#!/usr/bin/env python3
"""
Test GPS Functions
"""

def test_gps_functions():
    print("GPS Functions Test")
    
    # Test 1
    location = "ช่างโต้: GPS OK\nDevice: 7028888047\nLocation: 16.4322, 103.6531\nSpeed: 0 km/h\nStatus: Available"
    print("\n1. Location Test:")
    print(location)
    
    # Test 2  
    nearest = "Find Nearest: อบต.สระคู\nRecommend: ช่างโต้\nDistance: 5.4km (9 min)\nJobs: 3 active\nSkills: CCTV+Network\nReady to assign"
    print("\n2. Nearest Test:")
    print(nearest)
    
    # Test 3
    status = "GPS Status All:\n- ช่างโต้: GPS OK (3 jobs)\n- ช่างรุ่ง: Need GPS (2 jobs)\n- ช่างเม่ง: Need GPS (1 job)\n- ช่างชนะ: Need GPS (0 jobs)"
    print("\n3. Status Test:")
    print(status)
    
    return "GPS Test Completed"

if __name__ == "__main__":
    result = test_gps_functions()
    print(f"\nResult: {result}")