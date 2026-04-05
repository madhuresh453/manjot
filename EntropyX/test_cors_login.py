#!/usr/bin/env python3
import requests
import json

print('Testing full login flow...')
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
        'timestamp': 1775338227583
    }
}

try:
    r = requests.post(
        'http://127.0.0.1:8000/api/login',
        json=payload,
        timeout=5,
        allow_redirects=False
    )
    print(f'✓ Login Status: {r.status_code}')

    if r.status_code == 200:
        data = r.json()
        print('✅ Login successful!')
        print(f'  - User: {data.get("email")}')
        print(f'  - Trust Score: {data.get("trust_score")}')
        print(f'  - Session ID: {data.get("session_id")}')

        # Check CORS headers
        if 'access-control-allow-origin' in r.headers:
            print(f'✅ CORS: {r.headers["access-control-allow-origin"]}')
        else:
            print('❌ Missing CORS headers')
    else:
        print(f'❌ Login failed: {r.text}')

except Exception as e:
    print(f'❌ Error: {e}')