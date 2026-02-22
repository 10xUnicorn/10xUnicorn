import pytest

class TestDashboard:
    """Dashboard stats and analytics tests"""

    def test_get_dashboard_stats(self, base_url, api_client, test_user_token):
        """Test dashboard stats endpoint returns complete data"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        response = api_client.get(f"{base_url}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields present
        assert "goal" in data
        assert "habit" in data
        assert "total_entries" in data
        assert "unicorn_wins" in data
        assert "priority_wins" in data
        assert "course_corrected" in data
        assert "losses" in data
        assert "compound_streak" in data
        assert "compound_7d" in data
        assert "compound_30d" in data
        assert "compound_90d" in data
        assert "win_streak" in data
        assert "longest_win_streak" in data
        assert "win_rate" in data
        assert "unicorn_rate" in data
        assert "determination_trend" in data
        assert "win_rate_trend" in data
        assert "five_completion_rates" in data
        assert "most_activated_contacts" in data
        assert "total_contacts" in data
        
        print(f"✅ Dashboard stats complete:")
        print(f"   Total entries: {data['total_entries']}")
        print(f"   Win rate: {data['win_rate']}%")
        print(f"   Unicorn wins: {data['unicorn_wins']}")
        print(f"   Compound streak: {data['compound_streak']}")
        print(f"   Total contacts: {data['total_contacts']}")

    def test_get_compound_streak(self, base_url, api_client, test_user_token):
        """Test compound streak endpoint"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        response = api_client.get(f"{base_url}/api/compound-streak", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "streak" in data
        assert "habit" in data
        assert isinstance(data["streak"], int)
        print(f"✅ Compound streak: {data['streak']} days")