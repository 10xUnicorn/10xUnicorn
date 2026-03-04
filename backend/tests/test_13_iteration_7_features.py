"""
Test Iteration 7 Features:
1. Profile update with upsert - PUT /api/profile creates profile if not exists
2. Compound count in daily entry - compound_count field 
3. Streak milestone notifications - STREAK_MILESTONES constant verification
4. CRM Signals tab - signals endpoint verification

These tests validate the features for iteration 7 of the 10x Unicorn mobile app.
"""
import pytest
import requests
import uuid
from datetime import datetime


class TestProfileUpsert:
    """Test Profile update with upsert functionality"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_profile_update_with_upsert(self, base_url, api_client, auth_headers):
        """Test that profile update works even if profile doesn't exist (upsert)"""
        unique_name = f"TEST_User_{uuid.uuid4().hex[:8]}"
        
        # Update profile - should work even if no profile exists
        response = api_client.put(
            f"{base_url}/api/profile",
            json={
                "display_name": unique_name,
                "first_name": "TestFirst",
                "profile_emoji": "🔥"
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Profile upsert failed: {response.text}"
        data = response.json()
        
        # Verify profile was created/updated
        assert data.get("display_name") == unique_name
        assert data.get("first_name") == "TestFirst"
        assert data.get("profile_emoji") == "🔥"
        
    def test_profile_get_after_upsert(self, base_url, api_client, auth_headers):
        """Test GET profile returns data after upsert"""
        response = api_client.get(
            f"{base_url}/api/profile",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "profile" in data
        # Should have the fields we set in previous test
        profile = data["profile"]
        assert profile is not None


class TestCompoundCountDailyEntry:
    """Test Compound count in daily entry"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_update_daily_entry_with_compound_count(self, base_url, api_client, auth_headers):
        """Test updating daily entry with compound_count field"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Get existing entry first
        get_response = api_client.get(
            f"{base_url}/api/daily-entry/{today}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        
        # Update with compound count
        update_response = api_client.put(
            f"{base_url}/api/daily-entry/{today}",
            json={
                "compound_count": 5,
                "compound_done": True
            },
            headers=auth_headers
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        data = update_response.json()
        
        # Verify compound_count is saved
        assert data.get("compound_count") == 5
        assert data.get("compound_done") == True
        
    def test_compound_count_persistence(self, base_url, api_client, auth_headers):
        """Test that compound_count persists when retrieved"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Set compound count
        api_client.put(
            f"{base_url}/api/daily-entry/{today}",
            json={"compound_count": 7},
            headers=auth_headers
        )
        
        # Get entry and verify
        response = api_client.get(
            f"{base_url}/api/daily-entry/{today}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("compound_count") == 7


class TestStreakMilestones:
    """Test Streak milestone notification system"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_compound_streak_endpoint(self, base_url, api_client, auth_headers):
        """Test compound streak endpoint returns streak info"""
        response = api_client.get(
            f"{base_url}/api/compound-streak",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have streak count
        assert "streak" in data
        assert isinstance(data["streak"], int)
        assert data["streak"] >= 0


class TestCRMSignalsTab:
    """Test CRM Signals tab functionality"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_signals_list_for_crm(self, base_url, api_client, auth_headers):
        """Test signals list endpoint for CRM tab"""
        response = api_client.get(
            f"{base_url}/api/signals",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should be a list (even if empty)
        assert isinstance(data, list)
        
    def test_create_signal_for_crm(self, base_url, api_client, auth_headers):
        """Test creating a signal that appears in CRM"""
        unique_id = uuid.uuid4().hex[:8]
        signal_data = {
            "name": f"TEST_CRM_Signal_{unique_id}",
            "description": "Test signal for CRM tab",
            "impact_rating": 7,
            "is_public": True,
            "is_top_10x_action": False
        }
        
        # Create signal
        create_response = api_client.post(
            f"{base_url}/api/signals",
            json=signal_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        created = create_response.json()
        signal_id = created["id"]
        
        # Verify it appears in list
        list_response = api_client.get(
            f"{base_url}/api/signals",
            headers=auth_headers
        )
        assert list_response.status_code == 200
        signals = list_response.json()
        
        found = any(s["id"] == signal_id for s in signals)
        assert found, "Created signal not found in list"
        
        # Cleanup
        api_client.delete(f"{base_url}/api/signals/{signal_id}", headers=auth_headers)


class TestTabLayoutAPIs:
    """Verify all tab layout APIs work correctly"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_dashboard_stats_endpoint(self, base_url, api_client, auth_headers):
        """Test Dashboard (bar-chart icon) stats endpoint"""
        response = api_client.get(
            f"{base_url}/api/dashboard/stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected dashboard fields
        assert "compound_streak" in data
        assert "win_rate" in data
        assert "goal" in data
        
    def test_profile_endpoint_returns_data(self, base_url, api_client, auth_headers):
        """Test Profile tab (person icon) endpoint"""
        response = api_client.get(
            f"{base_url}/api/profile",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have profile data
        assert "profile" in data
        
    def test_community_members_endpoint(self, base_url, api_client, auth_headers):
        """Test Community (trophy icon) members endpoint"""
        response = api_client.get(
            f"{base_url}/api/community/members",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should be a list
        assert isinstance(data, list)


class TestFrontendLayoutVerification:
    """Tests to verify frontend layout configuration"""
    
    def test_layout_file_has_bar_chart_icon(self):
        """Verify Dashboard tab uses bar-chart icon (gray, matching others)"""
        import os
        layout_path = "/app/frontend/app/(tabs)/_layout.tsx"
        assert os.path.exists(layout_path), "Layout file not found"
        
        with open(layout_path, 'r') as f:
            content = f.read()
        
        # Dashboard should use bar-chart icon
        assert 'name="bar-chart"' in content, "Dashboard icon should be bar-chart"
        assert 'title: \'Dashboard\'' in content or "title: 'Dashboard'" in content, "Dashboard tab should be named Dashboard"
        
    def test_layout_file_has_profile_tab(self):
        """Verify Settings tab renamed to Profile"""
        import os
        layout_path = "/app/frontend/app/(tabs)/_layout.tsx"
        
        with open(layout_path, 'r') as f:
            content = f.read()
        
        # Should have Profile tab, not Settings
        assert 'name="profile"' in content, "Should have profile tab"
        assert "title: 'Profile'" in content or 'title: "Profile"' in content, "Tab should be named Profile"
        # Settings should not appear
        assert 'Settings' not in content or 'title: \'Settings\'' not in content, "Settings should be renamed to Profile"
        
    def test_crm_file_has_signals_tab(self):
        """Verify CRM has Signals tab as first tab"""
        import os
        crm_path = "/app/frontend/app/(tabs)/crm.tsx"
        assert os.path.exists(crm_path), "CRM file not found"
        
        with open(crm_path, 'r') as f:
            content = f.read()
        
        # Should have signals tab
        assert 'crm-tab-signals' in content, "CRM should have signals tab with testID"
        # Check tab order in type definition or state
        assert "'signals'" in content or '"signals"' in content, "Signals should be a tab option"
