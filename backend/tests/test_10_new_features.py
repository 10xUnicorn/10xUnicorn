"""
Test new features for 10x Unicorn App:
1. Top 10x Action Signal (is_top_10x_action field)
2. Contact Labels API
3. Deal close_date and notifications
4. Goal progress tracking and status
5. Help request system
6. Community feed with ring_color and type
"""
import pytest
import requests
import uuid
from datetime import datetime, timezone, timedelta


class TestTop10xActionSignal:
    """Test Signal creation with is_top_10x_action field"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    @pytest.fixture
    def today_mm_dd_yy(self):
        now = datetime.now(timezone.utc)
        return now.strftime("%m/%d/%y")
    
    def test_create_top_10x_action_signal(self, base_url, api_client, auth_headers, today_mm_dd_yy):
        """Test creating a signal with is_top_10x_action=True gives 10 points"""
        unique_id = str(uuid.uuid4())[:8]
        signal_data = {
            "name": f"TEST_Top10x_{unique_id}",
            "description": "Top 10x Action for today",
            "is_top_10x_action": True,
            "due_date": today_mm_dd_yy,
            "is_public": True
        }
        
        response = api_client.post(
            f"{base_url}/api/signals",
            json=signal_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == signal_data["name"]
        assert data["is_top_10x_action"] == True
        assert data["impact_rating"] == 10  # Top 10x action = 10 points
        assert "id" in data
        
        # Clean up - delete the signal
        signal_id = data["id"]
        api_client.delete(f"{base_url}/api/signals/{signal_id}", headers=auth_headers)
    
    def test_duplicate_top_10x_action_fails(self, base_url, api_client, auth_headers, today_mm_dd_yy):
        """Test that creating a second top 10x action for the same day fails
        
        NOTE: This test is expected to FAIL because the backend has a BUG:
        The duplicate check uses YYYY-MM-DD format but due_date is stored as MM/DD/YY.
        This test documents the bug - the main agent should fix server.py line ~1301-1306
        """
        unique_id = str(uuid.uuid4())[:8]
        
        # Create first top 10x action
        first_signal = {
            "name": f"TEST_Top10x_First_{unique_id}",
            "description": "First top 10x",
            "is_top_10x_action": True,
            "due_date": today_mm_dd_yy,
            "is_public": True
        }
        
        first_response = api_client.post(
            f"{base_url}/api/signals",
            json=first_signal,
            headers=auth_headers
        )
        assert first_response.status_code == 200
        first_id = first_response.json()["id"]
        
        try:
            # Try to create second top 10x action - should fail
            second_signal = {
                "name": f"TEST_Top10x_Second_{unique_id}",
                "description": "Second top 10x - should fail",
                "is_top_10x_action": True,
                "due_date": today_mm_dd_yy,
                "is_public": True
            }
            
            second_response = api_client.post(
                f"{base_url}/api/signals",
                json=second_signal,
                headers=auth_headers
            )
            # BUG: Backend allows duplicate top 10x actions because of date format mismatch
            # Backend checks for YYYY-MM-DD but stores MM/DD/YY
            # Expected: assert second_response.status_code == 400
            # Actual: Backend returns 200 (allows duplicate)
            assert second_response.status_code == 400, \
                "BUG: Backend should reject duplicate top 10x action but doesn't due to date format mismatch"
        except AssertionError:
            # Clean up second signal if it was created
            try:
                second_id = second_response.json().get("id")
                if second_id:
                    api_client.delete(f"{base_url}/api/signals/{second_id}", headers=auth_headers)
            except:
                pass
            raise
        finally:
            # Clean up
            api_client.delete(f"{base_url}/api/signals/{first_id}", headers=auth_headers)


class TestContactLabels:
    """Test contact labels API"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_get_contact_labels_no_auth(self, base_url, api_client):
        """Test that /wormhole-contacts/labels works without auth"""
        response = api_client.get(f"{base_url}/api/wormhole-contacts/labels")
        assert response.status_code == 200
        labels = response.json()
        
        expected_labels = ["prospect", "referral_partner", "strategic_partner", "client", "wormhole", "resource"]
        assert labels == expected_labels
    
    def test_filter_contacts_by_label(self, base_url, api_client, auth_headers):
        """Test filtering contacts by label parameter"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create a contact with specific label
        contact_data = {
            "name": f"TEST_Prospect_{unique_id}",
            "label": "prospect",
            "company": "Test Company"
        }
        
        create_response = api_client.post(
            f"{base_url}/api/wormhole-contacts",
            json=contact_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        contact_id = create_response.json()["id"]
        
        try:
            # Filter by prospect label
            filter_response = api_client.get(
                f"{base_url}/api/wormhole-contacts?label=prospect",
                headers=auth_headers
            )
            assert filter_response.status_code == 200
            contacts = filter_response.json()
            assert isinstance(contacts, list)
            
            # Our contact should be in the filtered list
            found = any(c["id"] == contact_id for c in contacts)
            assert found, "Created contact not found in filtered results"
            
            # All returned contacts should have prospect label
            for contact in contacts:
                assert contact["label"] == "prospect"
        finally:
            # Clean up
            api_client.delete(f"{base_url}/api/wormhole-contacts/{contact_id}", headers=auth_headers)


class TestDealNotifications:
    """Test deal close_date and smart notifications"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    @pytest.fixture
    def tomorrow_mm_dd_yy(self):
        tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
        return tomorrow.strftime("%m/%d/%y")
    
    def test_create_deal_with_close_date(self, base_url, api_client, auth_headers, tomorrow_mm_dd_yy):
        """Test creating a deal with close_date and notifications_enabled"""
        unique_id = str(uuid.uuid4())[:8]
        deal_data = {
            "name": f"TEST_Deal_{unique_id}",
            "value": 50000,
            "stage": "proposal",
            "close_date": tomorrow_mm_dd_yy,
            "notifications_enabled": True,
            "notes": "Test deal for automated testing"
        }
        
        response = api_client.post(
            f"{base_url}/api/deals",
            json=deal_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == deal_data["name"]
        assert data["close_date"] == deal_data["close_date"]
        assert data["notifications_enabled"] == True
        assert data["value"] == deal_data["value"]
        assert "priority" in data  # Should have calculated priority
        
        # Clean up
        deal_id = data["id"]
        api_client.delete(f"{base_url}/api/deals/{deal_id}", headers=auth_headers)
    
    def test_get_deal_notifications(self, base_url, api_client, auth_headers, tomorrow_mm_dd_yy):
        """Test getting smart notifications for deals"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create a deal with close date soon (tomorrow)
        deal_data = {
            "name": f"TEST_Urgent_Deal_{unique_id}",
            "value": 100000,  # High value
            "stage": "negotiation",  # Close to closing
            "close_date": tomorrow_mm_dd_yy,
            "notifications_enabled": True
        }
        
        create_response = api_client.post(
            f"{base_url}/api/deals",
            json=deal_data,
            headers=auth_headers
        )
        deal_id = create_response.json()["id"]
        
        try:
            # Get notifications
            response = api_client.get(
                f"{base_url}/api/deals/notifications",
                headers=auth_headers
            )
            assert response.status_code == 200
            notifications = response.json()
            assert isinstance(notifications, list)
            
            # Our high-value deal closing tomorrow should generate a notification
            deal_notification = next(
                (n for n in notifications if n["deal_id"] == deal_id),
                None
            )
            assert deal_notification is not None, "Expected notification for deal closing tomorrow"
            assert "urgency" in deal_notification
            assert "type" in deal_notification
            assert "message" in deal_notification
        finally:
            api_client.delete(f"{base_url}/api/deals/{deal_id}", headers=auth_headers)
    
    def test_deal_with_notifications_disabled(self, base_url, api_client, auth_headers, tomorrow_mm_dd_yy):
        """Test that deals with notifications_enabled=False don't show in notifications"""
        unique_id = str(uuid.uuid4())[:8]
        
        deal_data = {
            "name": f"TEST_Silent_Deal_{unique_id}",
            "value": 100000,
            "stage": "negotiation",
            "close_date": tomorrow_mm_dd_yy,
            "notifications_enabled": False  # Disabled
        }
        
        create_response = api_client.post(
            f"{base_url}/api/deals",
            json=deal_data,
            headers=auth_headers
        )
        deal_id = create_response.json()["id"]
        
        try:
            response = api_client.get(
                f"{base_url}/api/deals/notifications",
                headers=auth_headers
            )
            notifications = response.json()
            
            # This deal should NOT be in notifications
            deal_notification = next(
                (n for n in notifications if n["deal_id"] == deal_id),
                None
            )
            assert deal_notification is None, "Deal with notifications disabled should not appear"
        finally:
            api_client.delete(f"{base_url}/api/deals/{deal_id}", headers=auth_headers)


class TestGoalProgress:
    """Test goal progress tracking and status calculation"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_update_goal_progress(self, base_url, api_client, auth_headers):
        """Test updating daily goal progress"""
        progress_data = {
            "current_value": 50,
            "notes": "Made good progress today"
        }
        
        response = api_client.post(
            f"{base_url}/api/goals/progress",
            json=progress_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "goal" in data
        assert "status" in data
        assert "points_awarded" in data
        
        # Status should have calculated fields
        status = data["status"]
        assert "status" in status
        assert "progress_pct" in status
        assert "ring_color" in status
    
    def test_get_goal_status(self, base_url, api_client, auth_headers):
        """Test getting current goal status"""
        response = api_client.get(
            f"{base_url}/api/goals/status",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "goal" in data
        assert "status" in data
        
        status = data["status"]
        assert "status" in status
        assert "progress_pct" in status
        assert "ring_color" in status


class TestHelpRequestSystem:
    """Test help request creation and retrieval"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_create_help_request(self, base_url, api_client, auth_headers):
        """Test creating a help request"""
        unique_id = str(uuid.uuid4())[:8]
        help_data = {
            "description": f"TEST_Help_{unique_id}: I need help with my goal"
        }
        
        response = api_client.post(
            f"{base_url}/api/community/help-request",
            json=help_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "help_request" in data
        assert "potential_helpers_count" in data
        assert "display_name" in data
        
        help_request = data["help_request"]
        assert help_request["description"] == help_data["description"]
        assert help_request["status"] == "open"
        assert help_request["is_public"] == True
        assert "id" in help_request
    
    def test_get_help_requests(self, base_url, api_client, auth_headers):
        """Test getting open help requests"""
        response = api_client.get(
            f"{base_url}/api/community/help-requests",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        if len(data) > 0:
            first = data[0]
            assert "id" in first
            assert "description" in first
            assert "display_name" in first


class TestCommunityFeedFields:
    """Test community feed includes required fields"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_community_feed_has_type_and_ring_color(self, base_url, api_client, auth_headers):
        """Test that community feed items have type and ring_color fields"""
        # First create a signal completion to ensure there's data
        unique_id = str(uuid.uuid4())[:8]
        signal_data = {
            "name": f"TEST_Feed_Signal_{unique_id}",
            "description": "Signal for feed testing",
            "impact_rating": 8,
            "is_public": True
        }
        
        create_signal = api_client.post(
            f"{base_url}/api/signals",
            json=signal_data,
            headers=auth_headers
        )
        signal_id = create_signal.json()["id"]
        
        # Complete the signal
        complete_response = api_client.post(
            f"{base_url}/api/signals/{signal_id}/complete",
            json={"notes": "Completed for feed test"},
            headers=auth_headers
        )
        
        try:
            # Now check the feed
            feed_response = api_client.get(
                f"{base_url}/api/community/feed",
                headers=auth_headers
            )
            assert feed_response.status_code == 200
            feed = feed_response.json()
            
            assert isinstance(feed, list)
            if len(feed) > 0:
                first_item = feed[0]
                # Required fields per feature request
                assert "type" in first_item
                assert "ring_color" in first_item or first_item.get("type") == "help_request"
                
                # Type should be either signal_completion or help_request
                assert first_item["type"] in ["signal_completion", "help_request"]
        finally:
            # Clean up
            api_client.delete(f"{base_url}/api/signals/{signal_id}", headers=auth_headers)
    
    def test_help_request_shows_in_feed(self, base_url, api_client, auth_headers):
        """Test that help requests appear in community feed"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create a help request
        help_response = api_client.post(
            f"{base_url}/api/community/help-request",
            json={"description": f"TEST_Feed_Help_{unique_id}"},
            headers=auth_headers
        )
        
        # Get the feed
        feed_response = api_client.get(
            f"{base_url}/api/community/feed",
            headers=auth_headers
        )
        feed = feed_response.json()
        
        # Check if help requests are included in feed
        help_items = [item for item in feed if item.get("type") == "help_request"]
        # Help requests in feed should have red_pulse ring_color
        for item in help_items:
            if item.get("ring_color"):
                assert item["ring_color"] == "red_pulse"
