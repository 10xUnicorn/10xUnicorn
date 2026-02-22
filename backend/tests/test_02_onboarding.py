import pytest

class TestOnboarding:
    """Onboarding flow tests"""

    def test_complete_onboarding(self, base_url, api_client, test_user_token):
        """Test onboarding creates profile, goal, and habit"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        response = api_client.post(f"{base_url}/api/onboarding", json={
            "display_name": "Test Unicorn",
            "timezone_str": "America/New_York",
            "goal_title": "Build a $10M company",
            "goal_description": "Launch SaaS product",
            "compound_habit": "Write code for 2 hours daily"
        }, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["onboarded"] == True
        assert "message" in data
        print(f"✅ Onboarding completed")

    def test_profile_created_after_onboarding(self, base_url, api_client, test_user_token):
        """Test profile exists after onboarding"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        response = api_client.get(f"{base_url}/api/profile", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["profile"] is not None
        assert data["profile"]["display_name"] == "Test Unicorn"
        assert data["goal"] is not None
        assert data["goal"]["title"] == "Build a $10M company"
        assert data["habit"] is not None
        assert data["habit"]["habit_title"] == "Write code for 2 hours daily"
        print(f"✅ Profile, goal, and habit verified after onboarding")