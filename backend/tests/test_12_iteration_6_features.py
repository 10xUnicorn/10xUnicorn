"""
Test Iteration 6 Features:
1. Signal uncomplete endpoint - POST /api/signals/{id}/uncomplete
2. Profile update with first_name and profile_emoji - PUT /api/profile
3. Signals endpoint for CRM tab - GET /api/signals

These tests validate the new features for the 10x Unicorn mobile app updates.
"""
import pytest
import requests
import uuid
from datetime import datetime


class TestSignalUncomplete:
    """Test Signal uncomplete endpoint (new feature)"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    @pytest.fixture
    def test_signal_data(self):
        unique_id = str(uuid.uuid4())[:8]
        return {
            "name": f"TEST_Uncomplete_Signal_{unique_id}",
            "description": "Test signal for uncomplete testing",
            "impact_rating": 5,
            "is_public": True
        }
    
    def test_uncomplete_signal_not_completed_returns_400(self, base_url, api_client, auth_headers, test_signal_data):
        """Test uncompleting a signal that hasn't been completed returns 400"""
        # Create a signal
        create_response = api_client.post(
            f"{base_url}/api/signals",
            json=test_signal_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200, f"Failed to create signal: {create_response.text}"
        signal_id = create_response.json()["id"]
        
        # Try to uncomplete it without completing first - should return 400
        uncomplete_response = api_client.post(
            f"{base_url}/api/signals/{signal_id}/uncomplete",
            headers=auth_headers
        )
        assert uncomplete_response.status_code == 400
        data = uncomplete_response.json()
        assert "detail" in data
        assert "not completed" in data["detail"].lower() or "signal not completed" in data["detail"].lower()
        
        # Cleanup
        api_client.delete(f"{base_url}/api/signals/{signal_id}", headers=auth_headers)
    
    def test_uncomplete_signal_not_found_returns_404(self, base_url, api_client, auth_headers):
        """Test uncompleting a non-existent signal returns 404"""
        fake_id = str(uuid.uuid4())
        response = api_client.post(
            f"{base_url}/api/signals/{fake_id}/uncomplete",
            headers=auth_headers
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
    
    def test_complete_and_uncomplete_signal(self, base_url, api_client, auth_headers, test_signal_data):
        """Test full flow: create signal, complete it, then uncomplete it"""
        # Create a signal
        create_response = api_client.post(
            f"{base_url}/api/signals",
            json=test_signal_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        signal_id = create_response.json()["id"]
        
        # Complete the signal - note: signal_id is required in body
        complete_response = api_client.post(
            f"{base_url}/api/signals/{signal_id}/complete",
            json={"signal_id": signal_id, "notes": "Test completion"},
            headers=auth_headers
        )
        assert complete_response.status_code == 200, f"Failed to complete signal: {complete_response.text}"
        complete_data = complete_response.json()
        # API returns total_points_earned, not points_earned
        assert "total_points_earned" in complete_data or "completion" in complete_data
        points_earned = complete_data.get("total_points_earned", 0)
        
        # Get current points
        points_before = api_client.get(
            f"{base_url}/api/points/summary",
            headers=auth_headers
        ).json()
        
        # Now uncomplete the signal
        uncomplete_response = api_client.post(
            f"{base_url}/api/signals/{signal_id}/uncomplete",
            headers=auth_headers
        )
        assert uncomplete_response.status_code == 200, f"Failed to uncomplete signal: {uncomplete_response.text}"
        uncomplete_data = uncomplete_response.json()
        assert "message" in uncomplete_data
        assert "uncomplete" in uncomplete_data["message"].lower()
        assert "points_deducted" in uncomplete_data
        
        # Cleanup
        api_client.delete(f"{base_url}/api/signals/{signal_id}", headers=auth_headers)


class TestProfileUpdateNewFields:
    """Test Profile update with first_name and profile_emoji (new fields)"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_update_profile_with_first_name(self, base_url, api_client, auth_headers):
        """Test updating profile with first_name field"""
        unique_name = f"TestFirst_{str(uuid.uuid4())[:6]}"
        
        response = api_client.put(
            f"{base_url}/api/profile",
            json={"first_name": unique_name},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("first_name") == unique_name
        
        # Verify via GET
        get_response = api_client.get(
            f"{base_url}/api/profile",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        profile_data = get_response.json()
        assert profile_data.get("profile", {}).get("first_name") == unique_name
    
    def test_update_profile_with_profile_emoji(self, base_url, api_client, auth_headers):
        """Test updating profile with profile_emoji field"""
        test_emoji = "🦄"
        
        response = api_client.put(
            f"{base_url}/api/profile",
            json={"profile_emoji": test_emoji},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("profile_emoji") == test_emoji
        
        # Verify via GET
        get_response = api_client.get(
            f"{base_url}/api/profile",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        profile_data = get_response.json()
        assert profile_data.get("profile", {}).get("profile_emoji") == test_emoji
    
    def test_update_profile_with_both_new_fields(self, base_url, api_client, auth_headers):
        """Test updating profile with both first_name and profile_emoji"""
        unique_name = f"Test_{str(uuid.uuid4())[:6]}"
        test_emoji = "💎"
        
        response = api_client.put(
            f"{base_url}/api/profile",
            json={
                "first_name": unique_name,
                "profile_emoji": test_emoji
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("first_name") == unique_name
        assert data.get("profile_emoji") == test_emoji
        
        # Verify via GET
        get_response = api_client.get(
            f"{base_url}/api/profile",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        profile_data = get_response.json()
        assert profile_data.get("profile", {}).get("first_name") == unique_name
        assert profile_data.get("profile", {}).get("profile_emoji") == test_emoji
    
    def test_update_profile_emoji_variety(self, base_url, api_client, auth_headers):
        """Test profile_emoji with various emoji characters"""
        emojis = ["🔥", "🚀", "⭐", "🌟", "💪", "🎯", "👑", "🦅"]
        
        for emoji in emojis:
            response = api_client.put(
                f"{base_url}/api/profile",
                json={"profile_emoji": emoji},
                headers=auth_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data.get("profile_emoji") == emoji


class TestSignalsEndpointForCRM:
    """Test Signals endpoint for CRM tab"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_list_signals_endpoint(self, base_url, api_client, auth_headers):
        """Test GET /api/signals returns list of signals"""
        response = api_client.get(
            f"{base_url}/api/signals",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Each signal should have expected fields
        if len(data) > 0:
            signal = data[0]
            expected_fields = ["id", "name", "user_id"]
            for field in expected_fields:
                assert field in signal, f"Missing field: {field}"
    
    def test_create_and_list_signal(self, base_url, api_client, auth_headers):
        """Test creating a signal and verifying it appears in list"""
        unique_id = str(uuid.uuid4())[:8]
        signal_data = {
            "name": f"TEST_CRM_Signal_{unique_id}",
            "description": "Test signal for CRM tab testing",
            "impact_rating": 6,
            "is_public": True
        }
        
        # Create signal
        create_response = api_client.post(
            f"{base_url}/api/signals",
            json=signal_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_signal = create_response.json()
        signal_id = created_signal["id"]
        
        # List signals
        list_response = api_client.get(
            f"{base_url}/api/signals",
            headers=auth_headers
        )
        assert list_response.status_code == 200
        signals = list_response.json()
        
        # Find our created signal
        found = False
        for signal in signals:
            if signal["id"] == signal_id:
                found = True
                assert signal["name"] == signal_data["name"]
                break
        
        assert found, f"Created signal {signal_id} not found in list"
        
        # Cleanup
        api_client.delete(f"{base_url}/api/signals/{signal_id}", headers=auth_headers)
    
    def test_signals_with_top_10x_action_flag(self, base_url, api_client, auth_headers):
        """Test signals endpoint returns is_top_10x_action field"""
        # Create a regular signal
        unique_id = str(uuid.uuid4())[:8]
        signal_data = {
            "name": f"TEST_Regular_Signal_{unique_id}",
            "description": "Regular test signal",
            "impact_rating": 5,
            "is_public": True,
            "is_top_10x_action": False
        }
        
        create_response = api_client.post(
            f"{base_url}/api/signals",
            json=signal_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        signal_id = create_response.json()["id"]
        
        # Verify in list
        list_response = api_client.get(
            f"{base_url}/api/signals",
            headers=auth_headers
        )
        assert list_response.status_code == 200
        signals = list_response.json()
        
        # Find our signal and check the flag
        for signal in signals:
            if signal["id"] == signal_id:
                assert "is_top_10x_action" in signal or signal.get("is_top_10x_action") is False
                break
        
        # Cleanup
        api_client.delete(f"{base_url}/api/signals/{signal_id}", headers=auth_headers)


class TestDashboardStats:
    """Test Dashboard stats endpoint (referenced in tab layout)"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_get_dashboard_stats(self, base_url, api_client, auth_headers):
        """Test GET /api/dashboard/stats returns expected fields"""
        response = api_client.get(
            f"{base_url}/api/dashboard/stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check expected fields per PRD
        expected_fields = ["win_streak", "longest_win_streak", "unicorn_wins", "priority_wins"]
        for field in expected_fields:
            assert field in data, f"Missing dashboard field: {field}"


class TestTabLayoutAPIs:
    """Test APIs needed for the tab layout (Daily, Dashboard, Community, CRM, Profile)"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_daily_entry_endpoint(self, base_url, api_client, auth_headers):
        """Test GET /api/daily-entry/{date} endpoint for Daily tab"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = api_client.get(
            f"{base_url}/api/daily-entry/{today}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "entry" in data or isinstance(data, dict)
    
    def test_community_members_endpoint(self, base_url, api_client, auth_headers):
        """Test GET /api/community/members endpoint for Community tab"""
        response = api_client.get(
            f"{base_url}/api/community/members",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))
    
    def test_crm_deals_endpoint(self, base_url, api_client, auth_headers):
        """Test GET /api/deals endpoint for CRM tab"""
        response = api_client.get(
            f"{base_url}/api/deals",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_crm_contacts_endpoint(self, base_url, api_client, auth_headers):
        """Test GET /api/wormhole-contacts endpoint for CRM tab"""
        response = api_client.get(
            f"{base_url}/api/wormhole-contacts",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_profile_endpoint(self, base_url, api_client, auth_headers):
        """Test GET /api/profile endpoint for Profile tab"""
        response = api_client.get(
            f"{base_url}/api/profile",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "profile" in data or "goal" in data or "habit" in data
