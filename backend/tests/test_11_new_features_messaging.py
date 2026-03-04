"""
Test new features for 10x Unicorn App Phase 3:
1. Wormhole contact options API (connection_levels, tags, platforms)
2. Wormhole logs (add and retrieve logs timeline)
3. Direct messaging
4. Group messaging
5. Notification settings
6. Profile photo upload
"""
import pytest
import requests
import uuid
from datetime import datetime, timezone


class TestWormholeContactOptions:
    """Test GET /api/wormhole-contacts/options endpoint"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_get_contact_options(self, base_url, api_client, auth_headers):
        """Test GET /api/wormhole-contacts/options returns all field options"""
        response = api_client.get(
            f"{base_url}/api/wormhole-contacts/options",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check all expected keys are present
        assert "labels" in data
        assert "connection_levels" in data
        assert "tags" in data
        assert "platforms" in data
        assert "engagement_types" in data
        assert "leverage_categories" in data
        
        # Check labels content
        labels = data["labels"]
        assert isinstance(labels, list)
        assert "prospect" in labels
        assert "wormhole" in labels
        assert "client" in labels
        
        # Check connection_levels structure (list of objects with key, label, color)
        conn_levels = data["connection_levels"]
        assert isinstance(conn_levels, list)
        assert len(conn_levels) > 0
        assert "key" in conn_levels[0]
        assert "label" in conn_levels[0]
        assert "color" in conn_levels[0]
        
        # Check tags - tags defined in server.py CONTACT_TAGS
        tags = data["tags"]
        assert isinstance(tags, list)
        assert "business_owner" in tags
        assert "influencer" in tags
        assert "community_partner" in tags
        
        # Check platforms
        platforms = data["platforms"]
        assert isinstance(platforms, list)
        assert "text" in platforms
        assert "email" in platforms
        assert "video_call" in platforms


class TestWormholeLogs:
    """Test wormhole contact logs functionality"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    @pytest.fixture
    def test_contact(self, base_url, api_client, auth_headers):
        """Create a test wormhole contact"""
        unique_id = str(uuid.uuid4())[:8]
        contact_data = {
            "name": f"TEST_LogContact_{unique_id}",
            "company": "Test Company",
            "label": "wormhole",
            "connection_level": "warm_local"
        }
        response = api_client.post(
            f"{base_url}/api/wormhole-contacts",
            json=contact_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        contact = response.json()
        yield contact
        # Cleanup
        api_client.delete(f"{base_url}/api/wormhole-contacts/{contact['id']}", headers=auth_headers)
    
    def test_add_wormhole_log(self, base_url, api_client, auth_headers, test_contact):
        """Test POST /api/wormhole-contacts/{contact_id}/logs adds a log"""
        log_data = {
            "contact_id": test_contact["id"],
            "action_type": "call",
            "notes": "Had a great conversation about partnership opportunities"
        }
        
        response = api_client.post(
            f"{base_url}/api/wormhole-contacts/{test_contact['id']}/logs",
            json=log_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["contact_id"] == test_contact["id"]
        assert data["action_type"] == "call"
        assert data["notes"] == log_data["notes"]
        assert "date" in data
        assert "created_at" in data
    
    def test_add_log_with_custom_date(self, base_url, api_client, auth_headers, test_contact):
        """Test adding a log with a specific date"""
        log_data = {
            "contact_id": test_contact["id"],
            "action_type": "meeting",
            "notes": "In-person meeting at conference",
            "date": "01/15/26"  # MM/DD/YY format
        }
        
        response = api_client.post(
            f"{base_url}/api/wormhole-contacts/{test_contact['id']}/logs",
            json=log_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["date"] == "01/15/26"
        assert data["action_type"] == "meeting"
    
    def test_get_wormhole_logs(self, base_url, api_client, auth_headers, test_contact):
        """Test GET /api/wormhole-contacts/{contact_id}/logs returns logs timeline"""
        # First add some logs
        log_types = ["call", "dm", "email"]
        for action_type in log_types:
            api_client.post(
                f"{base_url}/api/wormhole-contacts/{test_contact['id']}/logs",
                json={
                    "contact_id": test_contact["id"],
                    "action_type": action_type,
                    "notes": f"Test {action_type} log"
                },
                headers=auth_headers
            )
        
        # Get logs
        response = api_client.get(
            f"{base_url}/api/wormhole-contacts/{test_contact['id']}/logs",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check structure
        assert "logs" in data
        assert "daily_selections" in data
        assert "total_logs" in data
        assert "total_selections" in data
        
        # Verify logs
        logs = data["logs"]
        assert isinstance(logs, list)
        assert data["total_logs"] >= 3  # At least our 3 test logs
        
        # Verify log entries have required fields
        if len(logs) > 0:
            log = logs[0]
            assert "id" in log
            assert "action_type" in log
            assert "notes" in log
            assert "date" in log
    
    def test_add_log_updates_last_contact_date(self, base_url, api_client, auth_headers, test_contact):
        """Test that adding a log updates the contact's last_contact_date"""
        # Add a log
        api_client.post(
            f"{base_url}/api/wormhole-contacts/{test_contact['id']}/logs",
            json={
                "contact_id": test_contact["id"],
                "action_type": "coffee_chat",
                "notes": "Coffee meeting"
            },
            headers=auth_headers
        )
        
        # Get contact and verify last_contact_date is set
        contact_response = api_client.get(
            f"{base_url}/api/wormhole-contacts/{test_contact['id']}",
            headers=auth_headers
        )
        assert contact_response.status_code == 200
        contact = contact_response.json()
        
        assert contact["last_contact_date"] is not None
    
    def test_add_log_increments_engagement_score(self, base_url, api_client, auth_headers, test_contact):
        """Test that adding a log increments engagement_score"""
        initial_score = test_contact.get("engagement_score", 0)
        
        # Add a log
        api_client.post(
            f"{base_url}/api/wormhole-contacts/{test_contact['id']}/logs",
            json={
                "contact_id": test_contact["id"],
                "action_type": "follow_up",
                "notes": "Follow up call"
            },
            headers=auth_headers
        )
        
        # Get contact and verify engagement_score increased
        contact_response = api_client.get(
            f"{base_url}/api/wormhole-contacts/{test_contact['id']}",
            headers=auth_headers
        )
        contact = contact_response.json()
        
        assert contact["engagement_score"] > initial_score
    
    def test_add_log_nonexistent_contact_fails(self, base_url, api_client, auth_headers):
        """Test adding log to non-existent contact returns 404"""
        response = api_client.post(
            f"{base_url}/api/wormhole-contacts/nonexistent-id/logs",
            json={
                "contact_id": "nonexistent-id",
                "action_type": "call",
                "notes": "Should fail"
            },
            headers=auth_headers
        )
        assert response.status_code == 404


class TestDirectMessaging:
    """Test direct messaging functionality"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    @pytest.fixture
    def second_user(self, base_url, api_client):
        """Create a second test user for messaging"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "email": f"test_msg_user_{unique_id}@example.com",
            "password": "testpass123456"
        }
        
        response = api_client.post(
            f"{base_url}/api/auth/register",
            json=user_data
        )
        if response.status_code == 200:
            data = response.json()
            return {"user_id": data["user_id"], "token": data["token"]}
        elif response.status_code == 400:
            # Already exists, try login
            login_response = api_client.post(
                f"{base_url}/api/auth/login",
                json=user_data
            )
            if login_response.status_code == 200:
                data = login_response.json()
                return {"user_id": data["user_id"], "token": data["token"]}
        
        pytest.skip("Could not create second user for messaging test")
    
    def test_send_direct_message(self, base_url, api_client, auth_headers, second_user):
        """Test POST /api/messages/direct sends a message"""
        message_data = {
            "content": "Hello, this is a test message!",
            "recipient_id": second_user["user_id"]
        }
        
        response = api_client.post(
            f"{base_url}/api/messages/direct",
            json=message_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["content"] == message_data["content"]
        assert data["recipient_id"] == second_user["user_id"]
        assert data["type"] == "direct"
        assert "sender_id" in data
        assert "created_at" in data
    
    def test_send_direct_message_no_recipient_fails(self, base_url, api_client, auth_headers):
        """Test sending message without recipient_id fails"""
        response = api_client.post(
            f"{base_url}/api/messages/direct",
            json={"content": "Message without recipient"},
            headers=auth_headers
        )
        assert response.status_code == 400
    
    def test_send_direct_message_invalid_recipient_fails(self, base_url, api_client, auth_headers):
        """Test sending message to non-existent recipient fails"""
        response = api_client.post(
            f"{base_url}/api/messages/direct",
            json={
                "content": "Message to nobody",
                "recipient_id": "nonexistent-user-id"
            },
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_get_conversations(self, base_url, api_client, auth_headers, second_user):
        """Test GET /api/messages/conversations returns conversation list"""
        # First send a message to have something in conversations
        api_client.post(
            f"{base_url}/api/messages/direct",
            json={
                "content": "Test message for conversation list",
                "recipient_id": second_user["user_id"]
            },
            headers=auth_headers
        )
        
        # Get conversations
        response = api_client.get(
            f"{base_url}/api/messages/conversations",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        # Should have at least one conversation
        assert len(data) >= 1
        
        # Check conversation structure
        conv = data[0]
        assert "user_id" in conv
        assert "display_name" in conv
        assert "last_message" in conv
        assert "last_message_at" in conv
        assert "unread_count" in conv


class TestGroupMessaging:
    """Test group chat functionality"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    @pytest.fixture
    def second_user(self, base_url, api_client):
        """Create a second test user for group"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "email": f"test_grp_user_{unique_id}@example.com",
            "password": "testpass123456"
        }
        
        response = api_client.post(
            f"{base_url}/api/auth/register",
            json=user_data
        )
        if response.status_code == 200:
            data = response.json()
            return {"user_id": data["user_id"], "token": data["token"]}
        elif response.status_code == 400:
            login_response = api_client.post(
                f"{base_url}/api/auth/login",
                json=user_data
            )
            if login_response.status_code == 200:
                data = login_response.json()
                return {"user_id": data["user_id"], "token": data["token"]}
        
        pytest.skip("Could not create second user for group test")
    
    def test_create_group_chat(self, base_url, api_client, auth_headers, second_user):
        """Test POST /api/messages/groups creates a group"""
        unique_id = str(uuid.uuid4())[:8]
        group_data = {
            "name": f"TEST_Group_{unique_id}",
            "description": "Test group for automated testing",
            "member_ids": [second_user["user_id"]]
        }
        
        response = api_client.post(
            f"{base_url}/api/messages/groups",
            json=group_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["name"] == group_data["name"]
        assert data["description"] == group_data["description"]
        assert "members" in data
        assert second_user["user_id"] in data["members"]
        assert "created_by" in data
        assert "created_at" in data
    
    def test_get_user_groups(self, base_url, api_client, auth_headers, second_user):
        """Test GET /api/messages/groups returns user's groups"""
        # First create a group
        unique_id = str(uuid.uuid4())[:8]
        api_client.post(
            f"{base_url}/api/messages/groups",
            json={
                "name": f"TEST_GroupList_{unique_id}",
                "description": "Test group",
                "member_ids": [second_user["user_id"]]
            },
            headers=auth_headers
        )
        
        # Get groups
        response = api_client.get(
            f"{base_url}/api/messages/groups",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Check group structure
        group = data[0]
        assert "id" in group
        assert "name" in group
        assert "members" in group
    
    def test_send_group_message(self, base_url, api_client, auth_headers, second_user):
        """Test POST /api/messages/groups/{group_id} sends message to group"""
        # Create a group first
        unique_id = str(uuid.uuid4())[:8]
        group_response = api_client.post(
            f"{base_url}/api/messages/groups",
            json={
                "name": f"TEST_GroupMsg_{unique_id}",
                "description": "Test group for messaging",
                "member_ids": [second_user["user_id"]]
            },
            headers=auth_headers
        )
        group_id = group_response.json()["id"]
        
        # Send message to group
        response = api_client.post(
            f"{base_url}/api/messages/groups/{group_id}",
            json={"content": "Hello group!"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["content"] == "Hello group!"
        assert data["type"] == "group"
        assert data["group_id"] == group_id
    
    def test_send_message_to_nonmember_group_fails(self, base_url, api_client, auth_headers):
        """Test sending message to group you're not a member of fails"""
        response = api_client.post(
            f"{base_url}/api/messages/groups/nonexistent-group-id",
            json={"content": "Should fail"},
            headers=auth_headers
        )
        assert response.status_code == 404


class TestNotificationSettings:
    """Test notification settings functionality"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_get_notification_settings(self, base_url, api_client, auth_headers):
        """Test GET /api/notifications/settings returns settings"""
        response = api_client.get(
            f"{base_url}/api/notifications/settings",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check expected fields
        assert "daily_checkin_enabled" in data
        assert "daily_checkin_time" in data
        assert "deal_reminders_enabled" in data
        assert "community_notifications_enabled" in data
        assert "message_notifications_enabled" in data
    
    def test_update_notification_settings(self, base_url, api_client, auth_headers):
        """Test PUT /api/notifications/settings updates settings"""
        new_settings = {
            "daily_checkin_enabled": False,
            "daily_checkin_time": "10:00",
            "deal_reminders_enabled": True,
            "community_notifications_enabled": False,
            "message_notifications_enabled": True
        }
        
        response = api_client.put(
            f"{base_url}/api/notifications/settings",
            json=new_settings,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["daily_checkin_enabled"] == False
        assert data["daily_checkin_time"] == "10:00"
        assert data["community_notifications_enabled"] == False
        
        # Verify with GET
        get_response = api_client.get(
            f"{base_url}/api/notifications/settings",
            headers=auth_headers
        )
        verify_data = get_response.json()
        assert verify_data["daily_checkin_enabled"] == False
        assert verify_data["daily_checkin_time"] == "10:00"
    
    def test_partial_update_notification_settings(self, base_url, api_client, auth_headers):
        """Test updating only some notification settings"""
        # Update only daily_checkin_time
        response = api_client.put(
            f"{base_url}/api/notifications/settings",
            json={"daily_checkin_time": "08:30"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["daily_checkin_time"] == "08:30"


class TestProfilePhoto:
    """Test profile photo upload functionality"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    def test_save_profile_photo_base64(self, base_url, api_client, auth_headers):
        """Test PUT /api/profiles/photo with base64 data"""
        # Small test base64 image (1x1 pixel red PNG)
        test_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
        
        response = api_client.put(
            f"{base_url}/api/profiles/photo",
            json={"base64": test_base64},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert data["message"] == "Profile photo updated"
        # API returns 'path' not 'photo_url' - storage path
        assert "path" in data
    
    def test_save_profile_photo_url(self, base_url, api_client, auth_headers):
        """Test PUT /api/profiles/photo with photo_url - should fail (API only accepts base64)"""
        test_url = "https://example.com/profile.jpg"
        
        response = api_client.put(
            f"{base_url}/api/profiles/photo",
            json={"photo_url": test_url},
            headers=auth_headers
        )
        # API requires base64 data, not URL - expect 400
        assert response.status_code == 400
    
    def test_save_profile_photo_no_data_fails(self, base_url, api_client, auth_headers):
        """Test PUT /api/profiles/photo without data fails"""
        response = api_client.put(
            f"{base_url}/api/profiles/photo",
            json={},
            headers=auth_headers
        )
        assert response.status_code == 400
    
    def test_delete_profile_photo(self, base_url, api_client, auth_headers):
        """Test DELETE /api/profiles/photo removes photo"""
        response = api_client.delete(
            f"{base_url}/api/profiles/photo",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["message"] == "Profile photo removed"
    
    def test_get_profile_photo_info(self, base_url, api_client, auth_headers):
        """Test POST /api/profiles/photo requires file upload - 422 without file"""
        response = api_client.post(
            f"{base_url}/api/profiles/photo",
            headers=auth_headers
        )
        # POST requires multipart file upload, without file returns 422
        assert response.status_code == 422
