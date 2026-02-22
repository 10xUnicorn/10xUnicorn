import pytest
import requests

class TestHealthAndAuth:
    """Health check and authentication endpoints"""

    def test_health_check(self, base_url, api_client):
        """Test health endpoint is accessible"""
        response = api_client.get(f"{base_url}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "service" in data
        print(f"✅ Health check passed: {data}")

    def test_register_new_user(self, base_url, api_client):
        """Test user registration creates account and returns token"""
        import uuid
        test_email = f"test_reg_{uuid.uuid4().hex[:8]}@example.com"
        
        response = api_client.post(f"{base_url}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user_id" in data
        assert data["onboarded"] == False
        print(f"✅ User registered: {test_email}")

    def test_register_duplicate_email(self, base_url, api_client, test_user_credentials):
        """Test registering with existing email fails"""
        response = api_client.post(f"{base_url}/api/auth/register", json=test_user_credentials)
        assert response.status_code == 400
        data = response.json()
        assert "already registered" in data["detail"].lower()
        print(f"✅ Duplicate email correctly rejected")

    def test_login_valid_credentials(self, base_url, api_client, test_user_credentials):
        """Test login with valid credentials returns token"""
        response = api_client.post(f"{base_url}/api/auth/login", json=test_user_credentials)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user_id" in data
        print(f"✅ Login successful")

    def test_login_invalid_credentials(self, base_url, api_client):
        """Test login with wrong password fails"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print(f"✅ Invalid credentials correctly rejected")

    def test_get_me_with_valid_token(self, base_url, api_client, test_user_token):
        """Test /auth/me returns user info with valid token"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        response = api_client.get(f"{base_url}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "onboarded" in data
        print(f"✅ /auth/me returned user info")

    def test_get_me_without_token(self, base_url, api_client):
        """Test /auth/me fails without auth token"""
        response = api_client.get(f"{base_url}/api/auth/me")
        assert response.status_code == 403  # HTTPBearer returns 403 for missing auth
        print(f"✅ Unauthorized request correctly rejected")