import pytest
from datetime import datetime, timedelta

class TestDailyEntries:
    """Daily entry CRUD operations"""

    def test_get_daily_entry_creates_if_not_exists(self, base_url, api_client, test_user_token):
        """Test GET daily-entry creates empty entry if doesn't exist"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = api_client.get(f"{base_url}/api/daily-entry/{today}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["date"] == today
        assert data["determination_level"] == 5  # default
        assert "id" in data
        assert "five_item_statuses" in data
        print(f"✅ Daily entry auto-created for {today}")

    def test_update_daily_entry_determination(self, base_url, api_client, test_user_token):
        """Test updating determination level"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = api_client.put(f"{base_url}/api/daily-entry/{today}", json={
            "determination_level": 10
        }, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["determination_level"] == 10
        print(f"✅ Determination level updated to 10")
        
        # Verify persistence with GET
        get_response = api_client.get(f"{base_url}/api/daily-entry/{today}", headers=headers)
        assert get_response.status_code == 200
        assert get_response.json()["determination_level"] == 10
        print(f"✅ Determination level persisted correctly")

    def test_update_daily_entry_intention_and_focus(self, base_url, api_client, test_user_token):
        """Test updating intention and 10x focus"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = api_client.put(f"{base_url}/api/daily-entry/{today}", json={
            "intention": "I am being focused and productive",
            "ten_x_focus": "Ship MVP to first customers"
        }, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["intention"] == "I am being focused and productive"
        assert data["ten_x_focus"] == "Ship MVP to first customers"
        print(f"✅ Intention and 10x focus updated")

    def test_update_five_core_actions(self, base_url, api_client, test_user_token):
        """Test updating five core action checkboxes"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = api_client.put(f"{base_url}/api/daily-entry/{today}", json={
            "five_item_statuses": {
                "top_action": True,
                "wormhole": True,
                "scariest": False,
                "boldest": False,
                "meditation": False
            }
        }, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["five_item_statuses"]["top_action"] == True
        assert data["five_item_statuses"]["wormhole"] == True
        print(f"✅ Five core actions updated")

    def test_status_computation_priority_win(self, base_url, api_client, test_user_token):
        """Test status computes to priority_win when top priority completed"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        test_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = api_client.put(f"{base_url}/api/daily-entry/{test_date}", json={
            "top_priority_completed": True
        }, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["final_status"] == "priority_win"
        print(f"✅ Status correctly computed as priority_win")

    def test_status_computation_unicorn_win(self, base_url, api_client, test_user_token):
        """Test status computes to unicorn_win when all five actions done"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        test_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        response = api_client.put(f"{base_url}/api/daily-entry/{test_date}", json={
            "five_item_statuses": {
                "top_action": True,
                "wormhole": True,
                "scariest": True,
                "boldest": True,
                "meditation": True
            }
        }, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["final_status"] == "unicorn_win"
        print(f"✅ Status correctly computed as unicorn_win")

    def test_compound_habit_tracking(self, base_url, api_client, test_user_token):
        """Test compound habit done checkbox"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = api_client.put(f"{base_url}/api/daily-entry/{today}", json={
            "compound_done": True,
            "compound_notes": "Wrote code for 2.5 hours"
        }, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["compound_done"] == True
        assert data["compound_notes"] == "Wrote code for 2.5 hours"
        print(f"✅ Compound habit tracking updated")

    def test_list_daily_entries(self, base_url, api_client, test_user_token):
        """Test listing daily entries"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        response = api_client.get(f"{base_url}/api/daily-entries", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✅ Listed {len(data)} daily entries")