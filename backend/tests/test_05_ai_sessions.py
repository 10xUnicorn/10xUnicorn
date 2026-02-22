import pytest
from datetime import datetime
import time

class TestAISessions:
    """AI course correction session tests"""

    def test_start_ai_session(self, base_url, api_client, test_user_token):
        """Test starting AI session with GPT-5.2"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = api_client.post(f"{base_url}/api/ai-session/start", json={
            "message": "I didn't complete my top priority today and got distracted",
            "date": today
        }, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert "response" in data
        assert len(data["response"]) > 0
        print(f"✅ AI session started, session_id: {data['session_id']}")
        print(f"   AI response length: {len(data['response'])} chars")
        return data["session_id"]

    def test_continue_ai_session(self, base_url, api_client, test_user_token):
        """Test sending follow-up message in AI session"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Start session first
        start_response = api_client.post(f"{base_url}/api/ai-session/start", json={
            "message": "I got distracted by social media",
            "date": today
        }, headers=headers)
        session_id = start_response.json()["session_id"]
        
        time.sleep(2)  # AI needs time to process
        
        # Continue session
        continue_response = api_client.post(f"{base_url}/api/ai-session/{session_id}/message", json={
            "message": "The main blocker was lack of focus and too many notifications"
        }, headers=headers)
        
        assert continue_response.status_code == 200
        data = continue_response.json()
        assert "response" in data
        assert len(data["response"]) > 0
        print(f"✅ AI session continued, response received")

    def test_complete_ai_session(self, base_url, api_client, test_user_token):
        """Test marking AI session as complete"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Start session
        start_response = api_client.post(f"{base_url}/api/ai-session/start", json={
            "message": "Need help getting back on track",
            "date": today
        }, headers=headers)
        session_id = start_response.json()["session_id"]
        
        # Complete session
        complete_response = api_client.post(f"{base_url}/api/ai-session/{session_id}/complete", headers=headers)
        assert complete_response.status_code == 200
        data = complete_response.json()
        assert "message" in data
        print(f"✅ AI session completed")
        
        # Verify daily entry marked as course corrected
        entry_response = api_client.get(f"{base_url}/api/daily-entry/{today}", headers=headers)
        entry_data = entry_response.json()
        assert entry_data["ai_course_corrected"] == True
        assert entry_data["final_status"] == "course_corrected"
        print(f"✅ Daily entry status updated to course_corrected")

    def test_get_ai_sessions_by_date(self, base_url, api_client, test_user_token):
        """Test retrieving AI sessions for a date"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = api_client.get(f"{base_url}/api/ai-session/by-date/{today}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Retrieved {len(data)} AI sessions for {today}")