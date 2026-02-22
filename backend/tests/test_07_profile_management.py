import pytest

class TestProfileManagement:
    """Profile, goal, and habit management tests"""

    def test_update_profile_name(self, base_url, api_client, test_user_token):
        """Test updating profile display name"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        response = api_client.put(f"{base_url}/api/profile", json={
            "display_name": "Updated Test Unicorn"
        }, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["display_name"] == "Updated Test Unicorn"
        print(f"✅ Profile name updated")

    def test_update_goal(self, base_url, api_client, test_user_token):
        """Test updating goal title"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        response = api_client.put(f"{base_url}/api/goal", json={
            "title": "Build a $50M unicorn company"
        }, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Build a $50M unicorn company"
        print(f"✅ Goal updated")

    def test_update_habit(self, base_url, api_client, test_user_token):
        """Test updating habit title"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        response = api_client.put(f"{base_url}/api/habit", json={
            "habit_title": "Code + meditate daily"
        }, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["habit_title"] == "Code + meditate daily"
        print(f"✅ Habit updated")