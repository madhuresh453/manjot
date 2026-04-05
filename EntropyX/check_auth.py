import requests
url = 'http://localhost:8000/api/login'
body = {
    'email': 'admin@entropyx.io',
    'password': 'admin123',
    'device_fingerprint': {
        'userAgent': 'Test/1.0',
        'platform': 'Test',
        'screenResolution': '1920x1080'
    }
}
with requests.Session() as s:
    r = s.post(url, json=body)
    print('login status', r.status_code)
    print('resp', r.text)
    print('cookies', s.cookies.get_dict())
    if r.status_code == 200:
        r2 = s.get('http://localhost:8000/api/device/trusted')
        print('trusted cookie status', r2.status_code)
        print(r2.text)
        token = r.json().get('access_token')
        r3 = requests.get('http://localhost:8000/api/device/trusted', headers={'Authorization': f'Bearer {token}'})
        print('trusted auth header status', r3.status_code)
        print(r3.text)
