import pytest
import requests
import os

@pytest.fixture(scope="session")
def base_url():
    """Get backend URL from environment"""
    url = os.environ.get('EXPO_PUBLIC_BACKEND_URL')
    if not url:
        pytest.fail("EXPO_PUBLIC_BACKEND_URL not set in environment")
    return url.rstrip('/')

@pytest.fixture
def api_client():
    """Shared requests session for API calls"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="session")
def test_user_credentials():
    """Test user credentials for auth flows"""
    return {
        "email": "test_unicorn_001@example.com",
        "password": "testpass123456"
    }

@pytest.fixture(scope="session")
def test_user_token(base_url, test_user_credentials):
    """Create test user and return auth token"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Try to register
    try:
        response = session.post(
            f"{base_url}/api/auth/register",
            json=test_user_credentials
        )
        if response.status_code in [200, 201]:
            return response.json()["token"]
        elif response.status_code == 400:
            # User already exists, try login
            login_response = session.post(
                f"{base_url}/api/auth/login",
                json=test_user_credentials
            )
            if login_response.status_code == 200:
                return login_response.json()["token"]
    except Exception as e:
        pytest.fail(f"Failed to create test user: {e}")
    
    pytest.fail("Could not authenticate test user")
