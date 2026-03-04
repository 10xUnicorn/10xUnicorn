"""
Test Signal CRUD operations and Points System (Phase 2)
"""
import pytest
import requests
import uuid

class TestSignalCRUD:
    """Test Signal creation, read, update, delete operations"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    @pytest.fixture
    def test_signal_data(self):
        unique_id = str(uuid.uuid4())[:8]
        return {
            "name": f"TEST_Signal_{unique_id}",
            "description": "Test signal for automated testing",
            "points": 15,
            "is_public": True
        }
    
    def test_create_signal(self, base_url, api_client, auth_headers, test_signal_data):
        """Test creating a new signal"""
        response = api_client.post(
            f"{base_url}/api/signals",
            json=test_signal_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == test_signal_data["name"]
        assert data["description"] == test_signal_data["description"]
        assert data["points"] == test_signal_data["points"]
        assert data["is_public"] == test_signal_data["is_public"]
        assert "id" in data
        assert "user_id" in data
        assert "created_at" in data
        return data
    
    def test_list_signals(self, base_url, api_client, auth_headers):
        """Test listing all signals for user"""
        response = api_client.get(
            f"{base_url}/api/signals",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_signal_by_id(self, base_url, api_client, auth_headers, test_signal_data):
        """Test getting a specific signal by ID"""
        # First create a signal
        create_response = api_client.post(
            f"{base_url}/api/signals",
            json=test_signal_data,
            headers=auth_headers
        )
        signal_id = create_response.json()["id"]
        
        # Now get it
        response = api_client.get(
            f"{base_url}/api/signals/{signal_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == signal_id
        assert data["name"] == test_signal_data["name"]
    
    def test_update_signal(self, base_url, api_client, auth_headers, test_signal_data):
        """Test updating a signal"""
        # Create signal
        create_response = api_client.post(
            f"{base_url}/api/signals",
            json=test_signal_data,
            headers=auth_headers
        )
        signal_id = create_response.json()["id"]
        
        # Update it
        update_data = {
            "name": f"UPDATED_{test_signal_data['name']}",
            "points": 25
        }
        response = api_client.put(
            f"{base_url}/api/signals/{signal_id}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["points"] == update_data["points"]
        
        # Verify update persisted
        get_response = api_client.get(
            f"{base_url}/api/signals/{signal_id}",
            headers=auth_headers
        )
        assert get_response.json()["name"] == update_data["name"]
    
    def test_delete_signal(self, base_url, api_client, auth_headers, test_signal_data):
        """Test deleting a signal"""
        # Create signal
        create_response = api_client.post(
            f"{base_url}/api/signals",
            json=test_signal_data,
            headers=auth_headers
        )
        signal_id = create_response.json()["id"]
        
        # Delete it
        response = api_client.delete(
            f"{base_url}/api/signals/{signal_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Signal deleted"
        
        # Verify deletion
        get_response = api_client.get(
            f"{base_url}/api/signals/{signal_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404
    
    def test_delete_nonexistent_signal(self, base_url, api_client, auth_headers):
        """Test deleting a non-existent signal returns 404"""
        response = api_client.delete(
            f"{base_url}/api/signals/nonexistent-id-12345",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestSignalCompletion:
    """Test Signal completion and points system"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    @pytest.fixture
    def create_signal(self, base_url, api_client, auth_headers):
        """Helper to create a test signal"""
        unique_id = str(uuid.uuid4())[:8]
        response = api_client.post(
            f"{base_url}/api/signals",
            json={
                "name": f"TEST_Completion_{unique_id}",
                "description": "Signal for completion testing",
                "points": 10,
                "is_public": True
            },
            headers=auth_headers
        )
        return response.json()
    
    def test_complete_signal_basic(self, base_url, api_client, auth_headers, create_signal):
        """Test basic signal completion"""
        signal_id = create_signal["id"]
        
        response = api_client.post(
            f"{base_url}/api/signals/{signal_id}/complete",
            json={
                "signal_id": signal_id,
                "notes": "Completed this task successfully",
                "planned_yesterday": False
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "completion" in data
        assert "total_points_earned" in data
        assert data["completion"]["signal_id"] == signal_id
        assert data["completion"]["base_points"] == 10
        assert data["completion"]["notes"] == "Completed this task successfully"
    
    def test_complete_signal_with_planned_bonus(self, base_url, api_client, auth_headers, create_signal):
        """Test signal completion with planned ahead bonus (+5 pts)"""
        signal_id = create_signal["id"]
        
        response = api_client.post(
            f"{base_url}/api/signals/{signal_id}/complete",
            json={
                "signal_id": signal_id,
                "notes": "Planned this yesterday",
                "planned_yesterday": True
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        completion = data["completion"]
        assert completion["bonus_points"] >= 5  # At least planned_ahead bonus
        
        # Check bonuses include planned_ahead
        bonuses = completion.get("bonuses", [])
        bonus_types = [b["type"] for b in bonuses]
        assert "planned_ahead" in bonus_types
    
    def test_complete_nonexistent_signal(self, base_url, api_client, auth_headers):
        """Test completing a non-existent signal returns 404"""
        response = api_client.post(
            f"{base_url}/api/signals/nonexistent-id/complete",
            json={
                "signal_id": "nonexistent-id",
                "notes": "",
                "planned_yesterday": False
            },
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_list_signal_completions(self, base_url, api_client, auth_headers):
        """Test listing signal completions"""
        response = api_client.get(
            f"{base_url}/api/signal-completions",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestPointsSystem:
    """Test points summary and leaderboard"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_get_points_summary(self, base_url, api_client, auth_headers):
        """Test getting user's points summary"""
        response = api_client.get(
            f"{base_url}/api/points/summary",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "total_points" in data
        assert "weekly_points" in data
        assert "signal_streak" in data
        assert "rank" in data
        assert "total_users" in data
        
        assert isinstance(data["total_points"], int)
        assert isinstance(data["weekly_points"], int)
        assert isinstance(data["signal_streak"], int)
        assert isinstance(data["rank"], int)
    
    def test_get_leaderboard(self, base_url, api_client, auth_headers):
        """Test getting community leaderboard"""
        response = api_client.get(
            f"{base_url}/api/points/leaderboard",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        if len(data) > 0:
            first = data[0]
            assert "rank" in first
            assert "user_id" in first
            assert "display_name" in first
            assert "total_points" in first
            assert "weekly_points" in first
            assert "signal_streak" in first


class TestCommunityFeed:
    """Test community feed endpoint"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_get_community_feed(self, base_url, api_client, auth_headers):
        """Test getting public community feed"""
        response = api_client.get(
            f"{base_url}/api/community/feed",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        if len(data) > 0:
            first = data[0]
            assert "id" in first
            assert "user_id" in first
            assert "display_name" in first
            assert "signal_name" in first
            assert "total_points" in first
            assert "created_at" in first


class TestDailyBonuses:
    """Test daily bonuses endpoint"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    @pytest.fixture
    def today_date(self):
        from datetime import datetime, timezone
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    def test_award_daily_bonuses_no_entry(self, base_url, api_client, auth_headers):
        """Test awarding bonuses when no entry exists"""
        response = api_client.post(
            f"{base_url}/api/daily-entry/1999-01-01/award-bonuses",
            headers=auth_headers
        )
        # Should return 404 since entry doesn't exist
        assert response.status_code == 404
    
    def test_award_daily_bonuses_with_entry(self, base_url, api_client, auth_headers, today_date):
        """Test awarding bonuses after creating a daily entry"""
        # First ensure we have a daily entry
        api_client.get(
            f"{base_url}/api/daily-entry/{today_date}",
            headers=auth_headers
        )
        
        response = api_client.post(
            f"{base_url}/api/daily-entry/{today_date}/award-bonuses",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "bonuses" in data
        assert "total_bonus" in data
        assert "already_awarded" in data
        assert isinstance(data["bonuses"], list)
    
    def test_award_bonuses_for_top_action(self, base_url, api_client, auth_headers, today_date):
        """Test that completing top_action awards bonus points"""
        # Create entry and complete top action
        api_client.put(
            f"{base_url}/api/daily-entry/{today_date}",
            json={"top_priority_completed": True},
            headers=auth_headers
        )
        
        response = api_client.post(
            f"{base_url}/api/daily-entry/{today_date}/award-bonuses",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check if top_action bonus is present
        bonus_types = [b["type"] for b in data["bonuses"]]
        if "top_action" in bonus_types:
            top_action_bonus = next(b for b in data["bonuses"] if b["type"] == "top_action")
            assert top_action_bonus["points"] == 15  # POINTS_CONFIG['top_action_bonus']
