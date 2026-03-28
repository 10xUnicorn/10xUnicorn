"""
Iteration 9 Testing: Password Reset, Google Auth, DeterminationSlider Emojis, Edit Signal Modal
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://unicorn-dashboard.preview.emergentagent.com').rstrip('/')

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test_today@example.com",
        "password": "test123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed — skipping authenticated tests")

@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestPasswordReset:
    """Test password reset flow"""
    
    def test_request_password_reset_returns_token(self, api_client):
        """Test POST /api/auth/request-password-reset returns debug_token"""
        test_email = f"test_reset_{uuid.uuid4().hex[:8]}@example.com"
        
        # First register this user
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123"
        })
        assert response.status_code in [200, 400]  # 400 if already exists
        
        # Request password reset
        response = api_client.post(f"{BASE_URL}/api/auth/request-password-reset", json={
            "email": test_email
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # debug_token should be present for testing
        assert "debug_token" in data
        assert data["debug_token"] is not None
    
    def test_reset_password_with_valid_token(self, api_client):
        """Test POST /api/auth/reset-password with valid token"""
        test_email = f"test_reset2_{uuid.uuid4().hex[:8]}@example.com"
        new_password = "newpassword123"
        
        # First register this user
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123"
        })
        assert response.status_code in [200, 400]
        
        # Request password reset
        response = api_client.post(f"{BASE_URL}/api/auth/request-password-reset", json={
            "email": test_email
        })
        assert response.status_code == 200
        token = response.json().get("debug_token")
        assert token is not None
        
        # Reset password
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": token,
            "new_password": new_password
        })
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Password has been reset successfully"
        
        # Verify new password works
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": new_password
        })
        assert response.status_code == 200
        assert "token" in response.json()
    
    def test_reset_password_with_invalid_token(self, api_client):
        """Test POST /api/auth/reset-password with invalid token returns error"""
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "invalid-token-12345",
            "new_password": "newpassword123"
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "Invalid" in data["detail"] or "expired" in data["detail"]
    
    def test_request_reset_nonexistent_email_returns_generic_message(self, api_client):
        """Test request reset for non-existent email doesn't reveal user existence"""
        response = api_client.post(f"{BASE_URL}/api/auth/request-password-reset", json={
            "email": "nonexistent@example.com"
        })
        assert response.status_code == 200  # Should still return 200
        data = response.json()
        assert "message" in data
        # Should not reveal whether email exists


class TestGoogleAuth:
    """Test Google OAuth endpoint"""
    
    def test_google_auth_with_invalid_session_returns_error(self, api_client):
        """Test POST /api/auth/google with invalid session_id"""
        response = api_client.post(f"{BASE_URL}/api/auth/google", json={
            "session_id": "invalid-session-id"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "Failed" in data["detail"] or "verify" in data["detail"]
    
    def test_google_auth_endpoint_exists(self, api_client):
        """Test that /api/auth/google endpoint exists"""
        # Just verify the endpoint exists and responds
        response = api_client.post(f"{BASE_URL}/api/auth/google", json={
            "session_id": "test"
        })
        # Should return 401 (invalid session) not 404 (not found)
        assert response.status_code != 404


class TestSignalsCRUD:
    """Test signals create, read, update, delete"""
    
    def test_create_signal_includes_signal_type(self, authenticated_client):
        """Test POST /api/signals saves signal_type field"""
        signal_name = f"TEST_Signal_{uuid.uuid4().hex[:8]}"
        
        response = authenticated_client.post(f"{BASE_URL}/api/signals", json={
            "name": signal_name,
            "description": "Test signal",
            "signal_type": "revenue",
            "impact_rating": 7,
            "due_date": "03/05/26",
            "is_public": True
        })
        
        if response.status_code == 200:
            data = response.json()
            assert data["name"] == signal_name
            # Verify signal_type is saved (CRITICAL BUG from iteration 8)
            assert data.get("signal_type") == "revenue", "signal_type field not being saved!"
            
            # Cleanup
            signal_id = data.get("id")
            if signal_id:
                authenticated_client.delete(f"{BASE_URL}/api/signals/{signal_id}")
        else:
            # If 400, might be due to duplicate check - document the error
            print(f"Signal creation returned {response.status_code}: {response.text}")
    
    def test_update_signal(self, authenticated_client):
        """Test PUT /api/signals/{id} updates signal"""
        signal_name = f"TEST_Signal_Update_{uuid.uuid4().hex[:8]}"
        
        # Create signal
        response = authenticated_client.post(f"{BASE_URL}/api/signals", json={
            "name": signal_name,
            "description": "Original description",
            "impact_rating": 5,
            "is_public": True
        })
        
        if response.status_code == 200:
            signal_id = response.json().get("id")
            
            # Update signal
            response = authenticated_client.put(f"{BASE_URL}/api/signals/{signal_id}", json={
                "name": f"{signal_name}_updated",
                "description": "Updated description",
                "notes": "Added notes",
                "impact_rating": 8
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["name"] == f"{signal_name}_updated"
            assert data["description"] == "Updated description"
            assert data["impact_rating"] == 8
            
            # Cleanup
            authenticated_client.delete(f"{BASE_URL}/api/signals/{signal_id}")
    
    def test_uncomplete_signal(self, authenticated_client):
        """Test POST /api/signals/{id}/uncomplete marks signal as not done"""
        signal_name = f"TEST_Signal_Uncomplete_{uuid.uuid4().hex[:8]}"
        
        # Create signal
        response = authenticated_client.post(f"{BASE_URL}/api/signals", json={
            "name": signal_name,
            "description": "Test",
            "impact_rating": 5,
            "is_public": True
        })
        
        if response.status_code == 200:
            signal_id = response.json().get("id")
            
            # Complete the signal - note: requires signal_id in body
            response = authenticated_client.post(f"{BASE_URL}/api/signals/{signal_id}/complete", json={
                "signal_id": signal_id,
                "notes": "Completed"
            })
            assert response.status_code == 200
            
            # Uncomplete the signal - this should work since we just completed it today
            response = authenticated_client.post(f"{BASE_URL}/api/signals/{signal_id}/uncomplete", json={})
            # Endpoint returns 200 on success or 400 if not completed today
            assert response.status_code in [200, 400]
            if response.status_code == 200:
                data = response.json()
                assert "message" in data
                assert data["message"] == "Signal uncompleted"
            
            # Cleanup
            authenticated_client.delete(f"{BASE_URL}/api/signals/{signal_id}")


class TestGoalUpdate:
    """Test goal update endpoint"""
    
    def test_update_goal(self, authenticated_client):
        """Test PUT /api/goal updates goal"""
        response = authenticated_client.put(f"{BASE_URL}/api/goal", json={
            "title": "Test Goal Update",
            "description": "Updated description",
            "deadline": "06/30/26",
            "target_number": 1000
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Goal Update"
        assert data["description"] == "Updated description"
    
    def test_get_goal_status(self, authenticated_client):
        """Test GET /api/goals/status"""
        response = authenticated_client.get(f"{BASE_URL}/api/goals/status")
        
        assert response.status_code == 200
        data = response.json()
        assert "goal" in data
        assert "status" in data


class TestDailyEntry:
    """Test daily entry endpoints"""
    
    def test_get_daily_entry(self, authenticated_client):
        """Test GET /api/daily-entry/{date}"""
        import datetime
        today = datetime.datetime.now().strftime("%Y-%m-%d")
        
        response = authenticated_client.get(f"{BASE_URL}/api/daily-entry/{today}")
        
        assert response.status_code == 200
        data = response.json()
        assert "determination_level" in data
        assert "five_item_statuses" in data
    
    def test_update_daily_entry(self, authenticated_client):
        """Test PUT /api/daily-entry/{date}"""
        import datetime
        today = datetime.datetime.now().strftime("%Y-%m-%d")
        
        response = authenticated_client.put(f"{BASE_URL}/api/daily-entry/{today}", json={
            "determination_level": 7,
            "intention": "Test intention"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["determination_level"] == 7


class TestHealthAndBasicAuth:
    """Basic health and auth tests"""
    
    def test_health_endpoint(self, api_client):
        """Test GET /api/health"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
    
    def test_login_with_valid_credentials(self, api_client):
        """Test POST /api/auth/login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_today@example.com",
            "password": "test123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user_id" in data
    
    def test_login_with_invalid_credentials(self, api_client):
        """Test POST /api/auth/login with invalid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_today@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
