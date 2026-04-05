#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class EntropyXAPITester:
    def __init__(self, base_url="http://127.0.0.1:8000"):
        self.base_url = base_url
        self.token = None
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")

    def test_api_health(self):
        """Test basic API health"""
        try:
            # Test entropy endpoint as health check since root returns HTML
            response = self.session.get(f"{self.base_url}/api/entropy/status")
            success = response.status_code == 200
            if success:
                data = response.json()
                confidence = data.get('confidence_score', 0)
                details = f"Status: {response.status_code}, API responding with confidence: {confidence}%"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            self.log_test("API Health Check", success, details)
            return success
        except Exception as e:
            self.log_test("API Health Check", False, f"Error: {str(e)}")
            return False

    def test_login(self, email, password):
        """Test login functionality"""
        try:
            login_data = {
                "email": email,
                "password": password,
                "device_fingerprint": {
                    "userAgent": "TestAgent/1.0",
                    "platform": "TestPlatform",
                    "screenResolution": "1920x1080"
                }
            }
            
            response = self.session.post(
                f"{self.base_url}/api/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                # Store token from cookie or response
                if 'access_token' in response.cookies:
                    self.token = response.cookies['access_token']
                details = f"User: {data.get('email')}, Trust Score: {data.get('trust_score')}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test(f"Login - {email}", success, details)
            return success, response.json() if success else {}
        except Exception as e:
            self.log_test(f"Login - {email}", False, f"Error: {str(e)}")
            return False, {}

    def test_auth_me(self):
        """Test authenticated user endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/auth/me")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", User: {data.get('email')}"
            else:
                details += f", Error: {response.text}"
            
            self.log_test("Auth Me", success, details)
            return success
        except Exception as e:
            self.log_test("Auth Me", False, f"Error: {str(e)}")
            return False

    def test_entropy_status(self):
        """Test entropy status endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/entropy/status")
            success = response.status_code == 200
            if success:
                data = response.json()
                confidence = data.get('confidence_score', 0)
                entropy_bits = data.get('total_entropy_bits', 0)
                details = f"Confidence: {confidence}%, Entropy Bits: {entropy_bits}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Entropy Status", success, details)
            return success
        except Exception as e:
            self.log_test("Entropy Status", False, f"Error: {str(e)}")
            return False

    def test_trust_ledger(self):
        """Test trust ledger endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/trust-ledger?limit=10")
            success = response.status_code == 200
            if success:
                data = response.json()
                blocks = data.get('blocks', [])
                chain_length = len(blocks)
                details = f"Chain Length: {chain_length} blocks"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Trust Ledger", success, details)
            return success
        except Exception as e:
            self.log_test("Trust Ledger", False, f"Error: {str(e)}")
            return False

    def test_device_simulate_trusted(self):
        """Test trusted device simulation"""
        try:
            response = self.session.post(
                f"{self.base_url}/api/device/simulate",
                json={"device_type": "trusted"},
                headers={"Content-Type": "application/json"}
            )
            success = response.status_code == 200
            if success:
                data = response.json()
                trust_score = data.get('trust_score', 0)
                access_granted = data.get('access_granted', False)
                details = f"Trust Score: {trust_score:.1f}%, Access: {'GRANTED' if access_granted else 'DENIED'}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Device Simulate - Trusted", success, details)
            return success
        except Exception as e:
            self.log_test("Device Simulate - Trusted", False, f"Error: {str(e)}")
            return False

    def test_device_simulate_spoofed(self):
        """Test spoofed device simulation"""
        try:
            response = self.session.post(
                f"{self.base_url}/api/device/simulate",
                json={"device_type": "spoofed"},
                headers={"Content-Type": "application/json"}
            )
            success = response.status_code == 200
            if success:
                data = response.json()
                trust_score = data.get('trust_score', 0)
                access_granted = data.get('access_granted', True)  # Should be False for spoofed
                spoof_indicators = len(data.get('spoof_indicators', []))
                details = f"Trust Score: {trust_score:.1f}%, Access: {'GRANTED' if access_granted else 'DENIED'}, Indicators: {spoof_indicators}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Device Simulate - Spoofed", success, details)
            return success
        except Exception as e:
            self.log_test("Device Simulate - Spoofed", False, f"Error: {str(e)}")
            return False

    def test_full_demo_simulation(self):
        """Test full demo simulation"""
        try:
            response = self.session.post(
                f"{self.base_url}/api/simulation/full-demo",
                headers={"Content-Type": "application/json"}
            )
            success = response.status_code == 200
            if success:
                data = response.json()
                steps = len(data.get('steps', []))
                summary = data.get('summary', {})
                trusted_logins = summary.get('trusted_logins', 0)
                blocked_attempts = summary.get('blocked_attempts', 0)
                details = f"Steps: {steps}, Trusted: {trusted_logins}, Blocked: {blocked_attempts}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Full Demo Simulation", success, details)
            return success
        except Exception as e:
            self.log_test("Full Demo Simulation", False, f"Error: {str(e)}")
            return False

    def test_trusted_devices(self):
        """Test trusted devices endpoint (requires auth)"""
        try:
            response = self.session.get(f"{self.base_url}/api/device/trusted")
            success = response.status_code == 200
            if success:
                data = response.json()
                devices = data.get('devices', [])
                details = f"Trusted Devices: {len(devices)}"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Trusted Devices", success, details)
            return success
        except Exception as e:
            self.log_test("Trusted Devices", False, f"Error: {str(e)}")
            return False

    def test_session_history(self):
        """Test session history endpoint (requires auth)"""
        try:
            response = self.session.get(f"{self.base_url}/api/session/history")
            success = response.status_code == 200
            if success:
                data = response.json()
                sessions = data.get('sessions', [])
                details = f"Session History: {len(sessions)} sessions"
            else:
                details = f"Status: {response.status_code}, Error: {response.text}"
            
            self.log_test("Session History", success, details)
            return success
        except Exception as e:
            self.log_test("Session History", False, f"Error: {str(e)}")
            return False

    def test_logout(self):
        """Test logout functionality"""
        try:
            response = self.session.post(f"{self.base_url}/api/logout")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Message: {data.get('message', 'N/A')}"
            
            self.log_test("Logout", success, details)
            return success
        except Exception as e:
            self.log_test("Logout", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🔒 ENTROPYX-ID API TESTING SUITE")
        print("=" * 50)
        
        # Test 1: API Health
        if not self.test_api_health():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        # Test 2: Public endpoints (no auth required)
        print("\n📡 Testing Public Endpoints...")
        self.test_entropy_status()
        self.test_trust_ledger()
        self.test_device_simulate_trusted()
        self.test_device_simulate_spoofed()
        self.test_full_demo_simulation()
        
        # Test 3: Authentication
        print("\n🔐 Testing Authentication...")
        login_success, login_data = self.test_login("admin@entropyx.io", "admin123")
        
        if login_success:
            # Test 4: Authenticated endpoints
            print("\n🛡️ Testing Authenticated Endpoints...")
            self.test_auth_me()
            self.test_trusted_devices()
            self.test_session_history()
            self.test_logout()
        else:
            print("❌ Login failed. Skipping authenticated endpoint tests.")
        
        # Test 5: Demo user login
        print("\n👤 Testing Demo User...")
        demo_login_success, _ = self.test_login("demo@entropyx.io", "demo123")
        
        # Summary
        print("\n" + "=" * 50)
        print(f"📊 TEST SUMMARY")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL TESTS PASSED!")
            return True
        else:
            print(f"⚠️ {self.tests_run - self.tests_passed} TESTS FAILED")
            return False

def main():
    tester = EntropyXAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open("test_reports/backend_api_results.json", "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total_tests": tester.tests_run,
            "passed_tests": tester.tests_passed,
            "success_rate": (tester.tests_passed/tester.tests_run*100) if tester.tests_run > 0 else 0,
            "results": tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())