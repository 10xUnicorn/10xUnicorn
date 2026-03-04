import pytest

class TestWormholeContacts:
    """Wormhole contacts CRUD operations"""

    def test_create_contact(self, base_url, api_client, test_user_token):
        """Test creating a wormhole contact"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        response = api_client.post(f"{base_url}/api/wormhole-contacts", json={
            "name": "John Doe",
            "company": "Tech Corp",
            "title": "CEO",
            "connection_level": "hot",
            "activation_next_step": "Schedule coffee meeting"
        }, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "John Doe"
        assert data["company"] == "Tech Corp"
        assert "id" in data
        assert data["engagement_score"] == 0
        print(f"✅ Contact created: {data['name']}")
        
        # Verify with GET
        contact_id = data["id"]
        get_response = api_client.get(f"{base_url}/api/wormhole-contacts/{contact_id}", headers=headers)
        assert get_response.status_code == 200
        assert get_response.json()["name"] == "John Doe"
        print(f"✅ Contact persisted correctly")

    def test_list_contacts(self, base_url, api_client, test_user_token):
        """Test listing wormhole contacts"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        response = api_client.get(f"{base_url}/api/wormhole-contacts", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0  # At least one from previous test
        print(f"✅ Listed {len(data)} contacts")

    def test_update_contact(self, base_url, api_client, test_user_token):
        """Test updating contact information"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        # Create contact first
        create_response = api_client.post(f"{base_url}/api/wormhole-contacts", json={
            "name": "Jane Smith",
            "company": "StartupXYZ"
        }, headers=headers)
        contact_id = create_response.json()["id"]
        
        # Update contact
        update_response = api_client.put(f"{base_url}/api/wormhole-contacts/{contact_id}", json={
            "activation_next_step": "Send product demo",
            "connection_level": "warm"
        }, headers=headers)
        
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["activation_next_step"] == "Send product demo"
        assert data["connection_level"] == "warm"
        print(f"✅ Contact updated successfully")

    def test_log_interaction(self, base_url, api_client, test_user_token):
        """Test logging interaction with contact (Phase 1 updated with action_type and impact_rating)"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        # Get first contact
        contacts_response = api_client.get(f"{base_url}/api/wormhole-contacts", headers=headers)
        contacts = contacts_response.json()
        if not contacts:
            pytest.skip("No contacts available for interaction test")
        
        contact_id = contacts[0]["id"]
        
        # Log interaction with required action_type and optional impact_rating
        response = api_client.post(f"{base_url}/api/wormhole-contacts/interaction", json={
            "contact_id": contact_id,
            "action_type": "scheduled_meeting",  # Required: sent_intro_email, followed_up, scheduled_meeting, commented_post, made_introduction, etc.
            "action_text": "Had coffee meeting, discussed partnership",
            "impact_rating": 8  # Optional: 1-10
        }, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["interaction_history"]) > 0
        assert data["engagement_score"] > 0
        assert data["last_contact_date"] is not None
        # Verify interaction has action_type
        latest_interaction = data["interaction_history"][-1]
        assert "action_type" in latest_interaction
        assert latest_interaction["action_type"] == "scheduled_meeting"
        print(f"✅ Interaction logged with action_type, engagement score: {data['engagement_score']}")

    def test_delete_contact(self, base_url, api_client, test_user_token):
        """Test deleting a contact"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        # Create contact to delete
        create_response = api_client.post(f"{base_url}/api/wormhole-contacts", json={
            "name": "Delete Me"
        }, headers=headers)
        contact_id = create_response.json()["id"]
        
        # Delete contact
        delete_response = api_client.delete(f"{base_url}/api/wormhole-contacts/{contact_id}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✅ Contact deleted")
        
        # Verify deletion
        get_response = api_client.get(f"{base_url}/api/wormhole-contacts/{contact_id}", headers=headers)
        assert get_response.status_code == 404
        print(f"✅ Contact deletion verified")

    def test_create_contact_with_expanded_fields(self, base_url, api_client, test_user_token):
        """Test creating contact with Phase 1 expanded fields (social media, leverage, relationship intelligence)"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        # Create contact with all expanded fields
        response = api_client.post(f"{base_url}/api/wormhole-contacts", json={
            # Identity
            "name": "Elon Musk",
            "company": "SpaceX/Tesla",
            "title": "CEO",
            "location": "Austin, TX",
            # Contact Info
            "website": "https://tesla.com",
            "email": "elon@example.com",
            "phone": "+1-555-0100",
            # Social Media Handles
            "linkedin": "elonmusk",
            "twitter": "elonmusk",
            "instagram": "elonmusk",
            "youtube": "@elonmusk",
            "tiktok": "elonmusk",
            "other_social": "Truth Social: @elonmusk",
            # Leverage Potential
            "leverage_categories": ["investor", "partner", "influencer"],
            "leverage_description": "Potential Series A investor with massive reach",
            # Best Contact Method
            "best_contact_method": "twitter",
            # Relationship Intelligence
            "connection_level": "cold",
            "tags": ["billionaire", "tech", "space"],
            "engagement_strength": 2,
            # Next Steps
            "activation_next_step": "Comment on recent Twitter post",
            "notes": "Met briefly at conference"
        }, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expanded fields saved correctly
        assert data["name"] == "Elon Musk"
        assert data["company"] == "SpaceX/Tesla"
        assert data["location"] == "Austin, TX"
        # Social media
        assert data["linkedin"] == "elonmusk"
        assert data["twitter"] == "elonmusk"
        assert data["instagram"] == "elonmusk"
        assert data["youtube"] == "@elonmusk"
        assert data["tiktok"] == "elonmusk"
        assert data["other_social"] == "Truth Social: @elonmusk"
        # Leverage
        assert "investor" in data["leverage_categories"]
        assert data["leverage_description"] == "Potential Series A investor with massive reach"
        assert data["best_contact_method"] == "twitter"
        # Relationship Intelligence
        assert data["connection_level"] == "cold"
        assert "billionaire" in data["tags"]
        assert data["engagement_strength"] == 2
        print(f"✅ Contact created with all Phase 1 expanded fields")
        
        # Cleanup
        api_client.delete(f"{base_url}/api/wormhole-contacts/{data['id']}", headers=headers)

    def test_update_contact_expanded_fields(self, base_url, api_client, test_user_token):
        """Test updating contact expanded fields"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        # Create contact
        create_response = api_client.post(f"{base_url}/api/wormhole-contacts", json={
            "name": "Update Test Contact",
            "connection_level": "cold"
        }, headers=headers)
        contact_id = create_response.json()["id"]
        
        # Update expanded fields
        update_response = api_client.put(f"{base_url}/api/wormhole-contacts/{contact_id}", json={
            "twitter": "testcontact",
            "linkedin": "testcontact",
            "leverage_categories": ["advisor", "mentor"],
            "best_contact_method": "linkedin_dm",
            "connection_level": "hot",
            "engagement_strength": 8
        }, headers=headers)
        
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["twitter"] == "testcontact"
        assert data["linkedin"] == "testcontact"
        assert "advisor" in data["leverage_categories"]
        assert data["best_contact_method"] == "linkedin_dm"
        assert data["connection_level"] == "hot"
        assert data["engagement_strength"] == 8
        print(f"✅ Contact expanded fields updated")
        
        # Cleanup
        api_client.delete(f"{base_url}/api/wormhole-contacts/{contact_id}", headers=headers)