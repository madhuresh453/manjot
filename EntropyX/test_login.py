#!/usr/bin/env python3
import requests
import json
import time

print("=" * 60)
print("TESTING ENTROPYX LOGIN ENDPOINT")
print("=" * 60)

url = 'http://127.0.0.1:8000/api/login'
payload = {
    'email': 'admin@entropyx.io',
    'password': 'admin123',
    'device_fingerprint': {
        'userAgent': 'Mozilla/5.0',
        'language': 'en',
        'platform': 'Linux', 
        'screenResolution': '1920x1080',
        'timezone': 'UTC',
        'canvasHash': 'test123',
        'timestamp': int(time.time() * 1000)
    }
}

print("\n1. Testing Login Endpoint")
print("-" * 60)
print(f"URL: {url}")
print(f"Payload: {json.dumps(payload, indent=2)}")

try:
    r = requests.post(url, json=payload, timeout=5)
    print(f"\n✓ Status: {r.status_code}")
    
    if r.status_code == 200:
        data = r.json()
        print(f"✓ Login successful!")
        print(f"  - User ID: {data.get('user_id', 'N/A')}")
        print(f"  - Email: {data.get('email', 'N/A')}")
        print(f"  - Trust Score: {data.get('trust_score', 'N/A')}")
        print(f"  - Device ID: {data.get('device', {}).get('device_id', 'N/A')}")
        print(f"  - Session ID: {data.get('session_id', 'N/A')}")
        
        # Check for cookies
        print(f"\n✓ Response headers contain:")
        if 'set-cookie' in r.headers:
            print(f"  - Set-Cookie: {r.headers['set-cookie'][:80]}...")
        print(f"  - Cookies: {r.cookies}")
    else:
        print(f"✗ Error {r.status_code}")
        print(f"Response: {r.text}")
        
except Exception as e:
    print(f"✗ Connection error: {type(e).__name__}: {e}")

# Test with new user registration
print("\n\n2. Testing Registration Endpoint")
print("-" * 60)

reg_url = 'http://127.0.0.1:8000/api/register'
reg_payload = {
    'email': f'newuser{int(time.time())}@test.io',
    'password': 'Test123456'
}

print(f"URL: {reg_url}")
print(f"Payload: {json.dumps(reg_payload, indent=2)}")

try:
    r = requests.post(reg_url, json=reg_payload, timeout=5)
    print(f"\n✓ Status: {r.status_code}")
    
    if r.status_code == 200:
        data = r.json()
        print(f"✓ Registration successful!")
        print(f"  - User ID: {data.get('user_id', 'N/A')}")
        print(f"  - Email: {data.get('email', 'N/A')}")
    else:
        print(f"✗ Error {r.status_code}")
        print(f"Response: {r.text}")
        
except Exception as e:
    print(f"✗ Connection error: {type(e).__name__}: {e}")

print("\n" + "=" * 60)
print("BACKEND API TESTS COMPLETE")
print("=" * 60)
