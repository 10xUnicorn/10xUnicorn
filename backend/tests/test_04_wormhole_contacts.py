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
        """Test logging interaction with contact"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        # Get first contact
        contacts_response = api_client.get(f"{base_url}/api/wormhole-contacts", headers=headers)
        contacts = contacts_response.json()
        if not contacts:
            pytest.skip("No contacts available for interaction test")
        
        contact_id = contacts[0]["id"]
        
        # Log interaction
        response = api_client.post(f"{base_url}/api/wormhole-contacts/interaction", json={
            "contact_id": contact_id,
            "action_text": "Had coffee meeting, discussed partnership"
        }, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["interaction_history"]) > 0
        assert data["engagement_score"] > 0
        assert data["last_contact_date"] is not None
        print(f"✅ Interaction logged, engagement score: {data['engagement_score']}")

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