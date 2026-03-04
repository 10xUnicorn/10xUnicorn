"""
Test Wormhole Contact expanded schema and Interaction Logging (Phase 3)
"""
import pytest
import requests
import uuid

class TestWormholeContactExpandedSchema:
    """Test wormhole contact creation with all new Phase 3 fields"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    @pytest.fixture
    def full_contact_data(self):
        unique_id = str(uuid.uuid4())[:8]
        return {
            # Identity
            "name": f"TEST_Contact_{unique_id}",
            "company": "Test Corp",
            "title": "CEO",
            "location": "San Francisco, CA",
            # Contact Info
            "website": "https://testcorp.com",
            "email": f"test_{unique_id}@testcorp.com",
            "phone": "+1-555-123-4567",
            # Social Media Handles
            "linkedin": "https://linkedin.com/in/testcontact",
            "twitter": "@testcontact",
            "instagram": "@testcontact_ig",
            "youtube": "TestContactChannel",
            "tiktok": "@testcontact_tt",
            "other_social": "discord:testcontact#1234",
            # Leverage Potential
            "leverage_categories": ["investor", "strategic_partner"],
            "leverage_description": "Can help with Series A funding",
            # Best Contact Method
            "best_contact_method": "email",
            # Relationship Intelligence
            "connection_level": "warm",
            "tags": ["startup", "tech", "funding"],
            "engagement_strength": 7,
            # Next Steps
            "activation_next_step": "Schedule intro call",
            "notes": "Met at tech conference"
        }
    
    def test_create_contact_with_all_fields(self, base_url, api_client, auth_headers, full_contact_data):
        """Test creating a contact with all expanded schema fields"""
        response = api_client.post(
            f"{base_url}/api/wormhole-contacts",
            json=full_contact_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify all fields
        assert data["name"] == full_contact_data["name"]
        assert data["company"] == full_contact_data["company"]
        assert data["title"] == full_contact_data["title"]
        assert data["location"] == full_contact_data["location"]
        assert data["website"] == full_contact_data["website"]
        assert data["email"] == full_contact_data["email"]
        assert data["phone"] == full_contact_data["phone"]
        assert data["linkedin"] == full_contact_data["linkedin"]
        assert data["twitter"] == full_contact_data["twitter"]
        assert data["instagram"] == full_contact_data["instagram"]
        assert data["youtube"] == full_contact_data["youtube"]
        assert data["tiktok"] == full_contact_data["tiktok"]
        assert data["other_social"] == full_contact_data["other_social"]
        assert data["leverage_categories"] == full_contact_data["leverage_categories"]
        assert data["leverage_description"] == full_contact_data["leverage_description"]
        assert data["best_contact_method"] == full_contact_data["best_contact_method"]
        assert data["connection_level"] == full_contact_data["connection_level"]
        assert data["engagement_strength"] == full_contact_data["engagement_strength"]
        assert data["activation_next_step"] == full_contact_data["activation_next_step"]
        assert data["notes"] == full_contact_data["notes"]
        assert "id" in data
        assert data["engagement_score"] == 0  # Initial score
        assert data["interaction_history"] == []  # Empty initially
    
    def test_create_contact_minimal_fields(self, base_url, api_client, auth_headers):
        """Test creating a contact with only required name field"""
        unique_id = str(uuid.uuid4())[:8]
        response = api_client.post(
            f"{base_url}/api/wormhole-contacts",
            json={"name": f"TEST_MinContact_{unique_id}"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have defaults for optional fields
        assert data["company"] == ""
        assert data["connection_level"] == "warm"
        assert data["engagement_strength"] == 5
        assert data["leverage_categories"] == []
    
    def test_update_contact_social_fields(self, base_url, api_client, auth_headers, full_contact_data):
        """Test updating social media handles"""
        # Create contact
        create_response = api_client.post(
            f"{base_url}/api/wormhole-contacts",
            json=full_contact_data,
            headers=auth_headers
        )
        contact_id = create_response.json()["id"]
        
        # Update social fields
        update_data = {
            "linkedin": "https://linkedin.com/in/updated",
            "twitter": "@updated_handle",
            "connection_level": "hot"
        }
        response = api_client.put(
            f"{base_url}/api/wormhole-contacts/{contact_id}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["linkedin"] == update_data["linkedin"]
        assert data["twitter"] == update_data["twitter"]
        assert data["connection_level"] == "hot"
        
        # Original fields should be preserved
        assert data["name"] == full_contact_data["name"]


class TestInteractionLogging:
    """Test interaction logging with action_type and impact_rating"""
    
    @pytest.fixture
    def auth_headers(self, base_url, test_user_token):
        return {"Authorization": f"Bearer {test_user_token}"}
    
    @pytest.fixture
    def test_contact(self, base_url, api_client, auth_headers):
        """Create a test contact for interaction testing"""
        unique_id = str(uuid.uuid4())[:8]
        response = api_client.post(
            f"{base_url}/api/wormhole-contacts",
            json={"name": f"TEST_InteractionContact_{unique_id}"},
            headers=auth_headers
        )
        return response.json()
    
    def test_log_interaction_basic(self, base_url, api_client, auth_headers, test_contact):
        """Test logging a basic interaction"""
        interaction_data = {
            "contact_id": test_contact["id"],
            "action_type": "sent_intro_email",
            "action_text": "Sent initial outreach email about partnership",
            "impact_rating": 5
        }
        
        response = api_client.post(
            f"{base_url}/api/wormhole-contacts/interaction",
            json=interaction_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check interaction was logged
        assert len(data["interaction_history"]) > 0
        last_interaction = data["interaction_history"][-1]
        assert last_interaction["action_type"] == "sent_intro_email"
        assert last_interaction["action_text"] == interaction_data["action_text"]
        assert last_interaction["impact_rating"] == 5
        assert "date" in last_interaction
        assert "id" in last_interaction
    
    def test_log_interaction_all_action_types(self, base_url, api_client, auth_headers, test_contact):
        """Test logging interactions with different action types"""
        action_types = [
            "sent_intro_email",
            "followed_up",
            "scheduled_meeting",
            "commented_post",
            "made_introduction",
            "had_call",
            "sent_proposal",
            "met_in_person",
            "other"
        ]
        
        for action_type in action_types:
            response = api_client.post(
                f"{base_url}/api/wormhole-contacts/interaction",
                json={
                    "contact_id": test_contact["id"],
                    "action_type": action_type,
                    "action_text": f"Testing {action_type} action",
                    "impact_rating": 7
                },
                headers=auth_headers
            )
            assert response.status_code == 200
    
    def test_log_interaction_impact_rating_range(self, base_url, api_client, auth_headers, test_contact):
        """Test logging interactions with various impact ratings 1-10"""
        for rating in [1, 5, 10]:
            response = api_client.post(
                f"{base_url}/api/wormhole-contacts/interaction",
                json={
                    "contact_id": test_contact["id"],
                    "action_type": "followed_up",
                    "action_text": f"Testing impact rating {rating}",
                    "impact_rating": rating
                },
                headers=auth_headers
            )
            assert response.status_code == 200
    
    def test_log_interaction_updates_engagement_score(self, base_url, api_client, auth_headers, test_contact):
        """Test that logging interactions increases engagement score"""
        initial_score = test_contact["engagement_score"]
        
        # Log an interaction with high impact
        response = api_client.post(
            f"{base_url}/api/wormhole-contacts/interaction",
            json={
                "contact_id": test_contact["id"],
                "action_type": "had_call",
                "action_text": "Had a great strategy call",
                "impact_rating": 10
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Score should increase
        assert data["engagement_score"] > initial_score
    
    def test_log_interaction_updates_last_contact_date(self, base_url, api_client, auth_headers, test_contact):
        """Test that logging interaction updates last_contact_date"""
        response = api_client.post(
            f"{base_url}/api/wormhole-contacts/interaction",
            json={
                "contact_id": test_contact["id"],
                "action_type": "met_in_person",
                "action_text": "Met at conference",
                "impact_rating": 8
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # last_contact_date should be set
        assert data["last_contact_date"] is not None
    
    def test_log_interaction_invalid_contact(self, base_url, api_client, auth_headers):
        """Test logging interaction for non-existent contact"""
        response = api_client.post(
            f"{base_url}/api/wormhole-contacts/interaction",
            json={
                "contact_id": "nonexistent-contact-id",
                "action_type": "sent_intro_email",
                "action_text": "Testing",
                "impact_rating": 5
            },
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_log_interaction_without_impact_rating(self, base_url, api_client, auth_headers, test_contact):
        """Test logging interaction without impact rating (optional field)"""
        response = api_client.post(
            f"{base_url}/api/wormhole-contacts/interaction",
            json={
                "contact_id": test_contact["id"],
                "action_type": "followed_up",
                "action_text": "Quick follow-up message"
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        last_interaction = data["interaction_history"][-1]
        assert last_interaction["impact_rating"] is None
