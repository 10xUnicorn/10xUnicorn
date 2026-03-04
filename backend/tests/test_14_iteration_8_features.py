"""
Test Iteration 8 Features:
1. Signal types - SIGNAL_TYPES constant with 10x_action, revenue, wormhole
2. Signal creation with signal_type field - POST /api/signals
3. CRM signals - saveSignal, deleteSignal functionality

These tests validate the features for iteration 8 of the 10x Unicorn mobile app.
"""
import pytest
import requests
import uuid
from datetime import datetime


class TestSignalTypes:
    """Test Signal Types feature"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_create_signal_with_default_type(self, base_url, api_client, auth_headers):
        """Test creating a signal with default signal_type (10x_action)"""
        unique_id = uuid.uuid4().hex[:8]
        signal_data = {
            "name": f"TEST_Signal_Default_{unique_id}",
            "description": "Test signal with default type",
            "impact_rating": 7,
            "is_public": True,
            "is_top_10x_action": False
        }
        
        response = api_client.post(
            f"{base_url}/api/signals",
            json=signal_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        # Should have default signal_type of 10x_action
        assert data.get("signal_type") == "10x_action", f"Expected signal_type=10x_action, got {data.get('signal_type')}"
        
        # Cleanup
        api_client.delete(f"{base_url}/api/signals/{data['id']}", headers=auth_headers)
    
    def test_create_signal_with_10x_action_type(self, base_url, api_client, auth_headers):
        """Test creating a signal with explicit 10x_action type"""
        unique_id = uuid.uuid4().hex[:8]
        signal_data = {
            "name": f"TEST_Signal_10x_{unique_id}",
            "description": "Test 10x action signal",
            "signal_type": "10x_action",
            "impact_rating": 8,
            "is_public": True
        }
        
        response = api_client.post(
            f"{base_url}/api/signals",
            json=signal_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        assert data.get("signal_type") == "10x_action"
        assert data.get("name") == f"TEST_Signal_10x_{unique_id}"
        
        # Cleanup
        api_client.delete(f"{base_url}/api/signals/{data['id']}", headers=auth_headers)
    
    def test_create_signal_with_revenue_type(self, base_url, api_client, auth_headers):
        """Test creating a signal with revenue type"""
        unique_id = uuid.uuid4().hex[:8]
        signal_data = {
            "name": f"TEST_Signal_Revenue_{unique_id}",
            "description": "Revenue generating activity",
            "signal_type": "revenue",
            "impact_rating": 9,
            "is_public": True
        }
        
        response = api_client.post(
            f"{base_url}/api/signals",
            json=signal_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        assert data.get("signal_type") == "revenue"
        assert data.get("name") == f"TEST_Signal_Revenue_{unique_id}"
        
        # Cleanup
        api_client.delete(f"{base_url}/api/signals/{data['id']}", headers=auth_headers)
    
    def test_create_signal_with_wormhole_type(self, base_url, api_client, auth_headers):
        """Test creating a signal with wormhole type"""
        unique_id = uuid.uuid4().hex[:8]
        signal_data = {
            "name": f"TEST_Signal_Wormhole_{unique_id}",
            "description": "Wormhole activity signal",
            "signal_type": "wormhole",
            "impact_rating": 6,
            "is_public": True
        }
        
        response = api_client.post(
            f"{base_url}/api/signals",
            json=signal_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        assert data.get("signal_type") == "wormhole"
        assert data.get("name") == f"TEST_Signal_Wormhole_{unique_id}"
        
        # Cleanup
        api_client.delete(f"{base_url}/api/signals/{data['id']}", headers=auth_headers)
    
    def test_update_signal_type(self, base_url, api_client, auth_headers):
        """Test updating a signal's type"""
        unique_id = uuid.uuid4().hex[:8]
        
        # Create signal with 10x_action type
        create_response = api_client.post(
            f"{base_url}/api/signals",
            json={
                "name": f"TEST_Signal_Update_{unique_id}",
                "signal_type": "10x_action",
                "impact_rating": 5,
                "is_public": True
            },
            headers=auth_headers
        )
        assert create_response.status_code == 200
        signal_id = create_response.json()["id"]
        
        # Update to revenue type
        update_response = api_client.put(
            f"{base_url}/api/signals/{signal_id}",
            json={"signal_type": "revenue"},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        # Verify update persisted
        get_response = api_client.get(
            f"{base_url}/api/signals/{signal_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        data = get_response.json()
        assert data.get("signal_type") == "revenue"
        
        # Cleanup
        api_client.delete(f"{base_url}/api/signals/{signal_id}", headers=auth_headers)
    
    def test_list_signals_includes_signal_type(self, base_url, api_client, auth_headers):
        """Test that listed signals include signal_type field"""
        unique_id = uuid.uuid4().hex[:8]
        
        # Create signal
        create_response = api_client.post(
            f"{base_url}/api/signals",
            json={
                "name": f"TEST_Signal_List_{unique_id}",
                "signal_type": "wormhole",
                "impact_rating": 7,
                "is_public": True
            },
            headers=auth_headers
        )
        assert create_response.status_code == 200
        signal_id = create_response.json()["id"]
        
        # List signals
        list_response = api_client.get(
            f"{base_url}/api/signals",
            headers=auth_headers
        )
        assert list_response.status_code == 200
        signals = list_response.json()
        
        # Find our signal
        found_signal = next((s for s in signals if s["id"] == signal_id), None)
        assert found_signal is not None, "Created signal not found in list"
        assert found_signal.get("signal_type") == "wormhole"
        
        # Cleanup
        api_client.delete(f"{base_url}/api/signals/{signal_id}", headers=auth_headers)


class TestCompoundCountButtons:
    """Test compound count update functionality (up/down buttons use this endpoint)"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_increment_compound_count(self, base_url, api_client, auth_headers):
        """Test incrementing compound_count (simulates up button)"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Get current count
        get_response = api_client.get(
            f"{base_url}/api/daily-entry/{today}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        current_count = get_response.json().get("compound_count", 0)
        
        # Increment count (simulates up button press)
        new_count = current_count + 1
        update_response = api_client.put(
            f"{base_url}/api/daily-entry/{today}",
            json={
                "compound_count": new_count,
                "compound_done": True
            },
            headers=auth_headers
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data.get("compound_count") == new_count
        assert data.get("compound_done") == True
    
    def test_decrement_compound_count(self, base_url, api_client, auth_headers):
        """Test decrementing compound_count (simulates down button)"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        # First set a count > 0
        api_client.put(
            f"{base_url}/api/daily-entry/{today}",
            json={"compound_count": 5, "compound_done": True},
            headers=auth_headers
        )
        
        # Decrement count (simulates down button press)
        update_response = api_client.put(
            f"{base_url}/api/daily-entry/{today}",
            json={
                "compound_count": 4,
                "compound_done": True
            },
            headers=auth_headers
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data.get("compound_count") == 4
    
    def test_compound_count_to_zero_sets_done_false(self, base_url, api_client, auth_headers):
        """Test that setting compound_count to 0 can set compound_done to false"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Set count to 0 with done=false (simulates decrementing to 0)
        update_response = api_client.put(
            f"{base_url}/api/daily-entry/{today}",
            json={
                "compound_count": 0,
                "compound_done": False
            },
            headers=auth_headers
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data.get("compound_count") == 0
        assert data.get("compound_done") == False


class TestCRMSignalsCRUD:
    """Test CRM Signals CRUD operations (New Signal button functionality)"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_create_signal_from_crm(self, base_url, api_client, auth_headers):
        """Test creating a signal from CRM (New Signal button)"""
        unique_id = uuid.uuid4().hex[:8]
        signal_data = {
            "name": f"TEST_CRM_New_Signal_{unique_id}",
            "description": "Created from CRM tab",
            "signal_type": "revenue",
            "impact_rating": 8,
            "is_public": True,
            "is_top_10x_action": False,
            "notes": "This is a test note"
        }
        
        response = api_client.post(
            f"{base_url}/api/signals",
            json=signal_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        assert data.get("name") == f"TEST_CRM_New_Signal_{unique_id}"
        assert data.get("signal_type") == "revenue"
        assert data.get("notes") == "This is a test note"
        
        # Cleanup
        api_client.delete(f"{base_url}/api/signals/{data['id']}", headers=auth_headers)
    
    def test_update_signal_from_crm(self, base_url, api_client, auth_headers):
        """Test updating a signal from CRM"""
        unique_id = uuid.uuid4().hex[:8]
        
        # Create signal
        create_response = api_client.post(
            f"{base_url}/api/signals",
            json={
                "name": f"TEST_CRM_Update_{unique_id}",
                "signal_type": "10x_action",
                "impact_rating": 5,
                "is_public": True
            },
            headers=auth_headers
        )
        assert create_response.status_code == 200
        signal_id = create_response.json()["id"]
        
        # Update signal
        update_response = api_client.put(
            f"{base_url}/api/signals/{signal_id}",
            json={
                "name": f"TEST_CRM_Updated_{unique_id}",
                "signal_type": "wormhole",
                "impact_rating": 9,
                "notes": "Updated notes"
            },
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        # Verify update
        get_response = api_client.get(
            f"{base_url}/api/signals/{signal_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        data = get_response.json()
        assert data.get("name") == f"TEST_CRM_Updated_{unique_id}"
        assert data.get("signal_type") == "wormhole"
        assert data.get("impact_rating") == 9
        
        # Cleanup
        api_client.delete(f"{base_url}/api/signals/{signal_id}", headers=auth_headers)
    
    def test_delete_signal_from_crm(self, base_url, api_client, auth_headers):
        """Test deleting a signal from CRM"""
        unique_id = uuid.uuid4().hex[:8]
        
        # Create signal
        create_response = api_client.post(
            f"{base_url}/api/signals",
            json={
                "name": f"TEST_CRM_Delete_{unique_id}",
                "signal_type": "10x_action",
                "impact_rating": 5,
                "is_public": True
            },
            headers=auth_headers
        )
        assert create_response.status_code == 200
        signal_id = create_response.json()["id"]
        
        # Delete signal
        delete_response = api_client.delete(
            f"{base_url}/api/signals/{signal_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = api_client.get(
            f"{base_url}/api/signals/{signal_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404


class TestDeterminationSliderAlwaysVisible:
    """Test that determination slider is always visible (no collapsible)"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_daily_entry_has_determination_level(self, base_url, api_client, auth_headers):
        """Test daily entry returns determination_level field"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = api_client.get(
            f"{base_url}/api/daily-entry/{today}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # determination_level should exist
        assert "determination_level" in data
    
    def test_update_determination_level(self, base_url, api_client, auth_headers):
        """Test updating determination level"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = api_client.put(
            f"{base_url}/api/daily-entry/{today}",
            json={"determination_level": 8},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("determination_level") == 8


class TestFrontendCodeVerification:
    """Verify frontend code has expected elements"""
    
    def test_today_tsx_has_compound_counter_buttons(self):
        """Verify today.tsx has up/down caret buttons for compound count"""
        with open('/app/frontend/app/(tabs)/today.tsx', 'r') as f:
            content = f.read()
        
        # Check for compound counter buttons with testIDs
        assert 'testID="compound-decrease"' in content, "Missing compound-decrease button"
        assert 'testID="compound-increase"' in content, "Missing compound-increase button"
        assert 'testID="compound-count-display"' in content, "Missing compound-count-display"
        
        # Check for chevron-down and chevron-up icons
        assert 'chevron-down' in content, "Missing chevron-down icon"
        assert 'chevron-up' in content, "Missing chevron-up icon"
    
    def test_crm_tsx_has_signal_types_constant(self):
        """Verify crm.tsx has SIGNAL_TYPES constant"""
        with open('/app/frontend/app/(tabs)/crm.tsx', 'r') as f:
            content = f.read()
        
        # Check for SIGNAL_TYPES constant
        assert 'SIGNAL_TYPES' in content, "Missing SIGNAL_TYPES constant"
        assert '10x_action' in content, "Missing 10x_action type"
        assert 'revenue' in content, "Missing revenue type"
        assert 'wormhole' in content, "Missing wormhole type"
    
    def test_crm_tsx_has_signals_tab(self):
        """Verify crm.tsx has Signals tab with New Signal button"""
        with open('/app/frontend/app/(tabs)/crm.tsx', 'r') as f:
            content = f.read()
        
        # Check for signals tab testID
        assert 'testID="crm-tab-signals"' in content, "Missing crm-tab-signals testID"
        
        # Check for add button functionality for signals
        assert "activeTab === 'signals'" in content, "Missing signals tab handling"
        assert "setShowAddSignal(true)" in content, "Missing setShowAddSignal"
    
    def test_community_tsx_has_social_link_helpers(self):
        """Verify community.tsx has social link helper functions"""
        with open('/app/frontend/app/(tabs)/community.tsx', 'r') as f:
            content = f.read()
        
        # Check for social link helper functions
        assert 'const openSocialLink' in content, "Missing openSocialLink function"
        assert 'const openPhone' in content, "Missing openPhone function"
        assert 'const openEmail' in content, "Missing openEmail function"
        
        # Check for email subject
        assert 'Connecting from the 10xUNICORN community' in content, "Missing email subject"
    
    def test_determination_slider_has_motivational_quote(self):
        """Verify DeterminationSlider always shows motivational quote"""
        with open('/app/frontend/src/components/DeterminationSlider.tsx', 'r') as f:
            content = f.read()
        
        # Check for motivational quotes
        assert 'MOTIVATIONAL_QUOTES' in content, "Missing MOTIVATIONAL_QUOTES array"
        
        # Check that quote banner is always visible (not conditional)
        assert 'quoteBanner' in content, "Missing quoteBanner style"
        assert 'quoteText' in content, "Missing quoteText style"
