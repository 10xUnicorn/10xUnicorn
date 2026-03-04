import pytest
from datetime import datetime, timedelta

class TestDailyEntries:
    """Daily entry CRUD operations"""

    def test_get_daily_entry_creates_if_not_exists(self, base_url, api_client, test_user_token):
        """Test GET daily-entry creates empty entry if doesn't exist"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        # Use a unique future date to ensure entry doesn't exist yet
        test_date = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
        
        response = api_client.get(f"{base_url}/api/daily-entry/{test_date}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["date"] == test_date
        assert data["determination_level"] == 5  # default for new entries
        assert "id" in data
        assert "five_item_statuses" in data
        # Verify updated Phase 1 keys exist in new entry
        five = data["five_item_statuses"]
        assert "top_action" in five
        assert "meditation" in five
        assert "wormhole" in five
        assert "distractions" in five
        assert "plan_tomorrow" in five
        print(f"✅ Daily entry auto-created for {test_date} with default determination_level=5")

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
        """Test updating five core action checkboxes (updated Phase 1 keys)"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Updated five core actions:
        # 1. top_action - Top 10x Action Item
        # 2. meditation - 7-Minute Future Self Meditation
        # 3. wormhole - Wormhole Relationship
        # 4. distractions - Avoid Distractions
        # 5. plan_tomorrow - Plan the Next Day Ahead of Time
        response = api_client.put(f"{base_url}/api/daily-entry/{today}", json={
            "five_item_statuses": {
                "top_action": True,
                "meditation": False,
                "wormhole": True,
                "distractions": False,
                "plan_tomorrow": False
            }
        }, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["five_item_statuses"]["top_action"] == True
        assert data["five_item_statuses"]["wormhole"] == True
        assert "distractions" in data["five_item_statuses"]
        assert "plan_tomorrow" in data["five_item_statuses"]
        print(f"✅ Five core actions updated with new Phase 1 keys")

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
        """Test status computes to unicorn_win when all five actions done (Phase 1 updated keys)"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        test_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        # Updated win logic: unicorn_win if all 5 core actions completed
        # Keys: top_action, meditation, wormhole, distractions, plan_tomorrow
        response = api_client.put(f"{base_url}/api/daily-entry/{test_date}", json={
            "five_item_statuses": {
                "top_action": True,
                "meditation": True,
                "wormhole": True,
                "distractions": True,
                "plan_tomorrow": True
            }
        }, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["final_status"] == "unicorn_win"
        print(f"✅ Status correctly computed as unicorn_win with updated Phase 1 keys")

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