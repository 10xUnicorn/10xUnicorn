"""
Test suite for 3 bug fixes:
Bug 1: Signal completion returns 'Error Object' - Fixed by removing signal_id from request body (it comes from URL path)
Bug 2: Calendar date picker doesn't pop open inside modal - Fixed by using CalendarContent (no Modal wrapper) instead of CalendarPicker
Bug 3: Ghost modal blocking after calendar interaction - Fixed by using inline CalendarContent overlay

This file tests Bug 1 (backend). Bugs 2 & 3 are frontend-only (tested via Playwright).
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://unicorn-dashboard.preview.emergentagent.com').rstrip('/')


class TestSignalCompletionBugFix:
    """Bug 1: Test that signal completion works with only {notes: ''} in body (no signal_id)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testbug@test.com",
            "password": "test123456"
        })
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        return resp.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_signal_completion_with_empty_notes(self, headers):
        """Bug Fix 1: POST /api/signals/{id}/complete with just {notes: ''} should return 200"""
        # Step 1: Create a new signal for today
        today = datetime.now().strftime("%Y-%m-%d")
        signal_name = f"TEST_BugFix_{uuid.uuid4().hex[:8]}"
        
        create_resp = requests.post(f"{BASE_URL}/api/signals", headers=headers, json={
            "name": signal_name,
            "description": "Test signal for bug fix verification",
            "impact_rating": 5,
            "due_date": today,
            "is_public": True,
            "is_top_10x_action": False
        })
        assert create_resp.status_code == 200, f"Failed to create signal: {create_resp.text}"
        signal = create_resp.json()
        signal_id = signal["id"]
        print(f"Created signal: {signal_id}")
        
        # Step 2: Complete the signal with just {notes: ''} in body - THIS WAS THE BUG
        # Previously sent {signal_id: ..., notes: ''} which caused 422 validation error
        complete_resp = requests.post(
            f"{BASE_URL}/api/signals/{signal_id}/complete",
            headers=headers,
            json={"notes": ""}  # Just notes, NO signal_id in body
        )
        
        assert complete_resp.status_code == 200, f"Signal completion failed: {complete_resp.status_code} - {complete_resp.text}"
        
        completion_data = complete_resp.json()
        assert "completion" in completion_data, "Response should have completion object"
        assert "total_points_earned" in completion_data, "Response should have total_points_earned"
        assert completion_data["completion"]["signal_id"] == signal_id, "Completion should reference correct signal"
        print(f"Signal completed successfully. Points earned: {completion_data['total_points_earned']}")
        
        # Step 3: Verify signal appears in completions list
        completions_resp = requests.get(
            f"{BASE_URL}/api/signal-completions?date={today}",
            headers=headers
        )
        assert completions_resp.status_code == 200
        completions = completions_resp.json()
        completed_ids = [c["signal_id"] for c in completions]
        assert signal_id in completed_ids, "Signal should appear in today's completions"
        print(f"Signal verified in completions list")
        
        # Cleanup: Delete the test signal
        requests.delete(f"{BASE_URL}/api/signals/{signal_id}", headers=headers)
    
    def test_signal_completion_with_notes(self, headers):
        """Test completion with actual notes content"""
        today = datetime.now().strftime("%Y-%m-%d")
        signal_name = f"TEST_WithNotes_{uuid.uuid4().hex[:8]}"
        
        # Create signal
        create_resp = requests.post(f"{BASE_URL}/api/signals", headers=headers, json={
            "name": signal_name,
            "description": "Signal with notes",
            "impact_rating": 7,
            "due_date": today,
            "is_public": True,
            "is_top_10x_action": False
        })
        assert create_resp.status_code == 200
        signal_id = create_resp.json()["id"]
        
        # Complete with notes
        complete_resp = requests.post(
            f"{BASE_URL}/api/signals/{signal_id}/complete",
            headers=headers,
            json={"notes": "Completed this task successfully!"}
        )
        
        assert complete_resp.status_code == 200
        completion_data = complete_resp.json()
        assert completion_data["completion"]["notes"] == "Completed this task successfully!"
        print(f"Signal completed with notes. Base points: {completion_data['completion']['base_points']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/signals/{signal_id}", headers=headers)
    
    def test_signal_completion_top_10x_action(self, headers):
        """Test completing the top 10x action (is_top_10x_action=True)"""
        today = datetime.now().strftime("%Y-%m-%d")
        signal_name = f"TEST_Top10x_{uuid.uuid4().hex[:8]}"
        
        # Create top 10x action signal
        create_resp = requests.post(f"{BASE_URL}/api/signals", headers=headers, json={
            "name": signal_name,
            "description": "Top 10x action for today",
            "impact_rating": 10,  # Max impact
            "due_date": today,
            "is_public": True,
            "is_top_10x_action": True
        })
        assert create_resp.status_code == 200
        signal = create_resp.json()
        signal_id = signal["id"]
        assert signal["is_top_10x_action"] == True
        
        # Complete the top 10x action
        complete_resp = requests.post(
            f"{BASE_URL}/api/signals/{signal_id}/complete",
            headers=headers,
            json={"notes": ""}
        )
        
        assert complete_resp.status_code == 200
        completion_data = complete_resp.json()
        
        # Impact rating 10 = 10 base points
        assert completion_data["completion"]["base_points"] == 10
        print(f"Top 10x action completed. Total points: {completion_data['total_points_earned']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/signals/{signal_id}", headers=headers)
    
    def test_invalid_signal_id_returns_404(self, headers):
        """Test that completing non-existent signal returns 404"""
        fake_id = f"fake-{uuid.uuid4()}"
        
        complete_resp = requests.post(
            f"{BASE_URL}/api/signals/{fake_id}/complete",
            headers=headers,
            json={"notes": ""}
        )
        
        assert complete_resp.status_code == 404
        print(f"Correctly returned 404 for non-existent signal")
    
    def test_uncomplete_signal_flow(self, headers):
        """Test the full complete -> uncomplete flow"""
        today = datetime.now().strftime("%Y-%m-%d")
        signal_name = f"TEST_Uncomplete_{uuid.uuid4().hex[:8]}"
        
        # Create and complete signal
        create_resp = requests.post(f"{BASE_URL}/api/signals", headers=headers, json={
            "name": signal_name,
            "impact_rating": 5,
            "due_date": today,
            "is_public": True
        })
        assert create_resp.status_code == 200
        signal_id = create_resp.json()["id"]
        
        # Complete it
        complete_resp = requests.post(
            f"{BASE_URL}/api/signals/{signal_id}/complete",
            headers=headers,
            json={"notes": ""}
        )
        assert complete_resp.status_code == 200
        
        # Uncomplete it
        uncomplete_resp = requests.post(
            f"{BASE_URL}/api/signals/{signal_id}/uncomplete",
            headers=headers,
            json={}
        )
        assert uncomplete_resp.status_code == 200
        assert "points_deducted" in uncomplete_resp.json()
        print(f"Signal uncompleted successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/signals/{signal_id}", headers=headers)


class TestSignalCRUD:
    """Additional tests for signal CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testbug@test.com",
            "password": "test123456"
        })
        assert resp.status_code == 200
        return resp.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_create_signal_with_due_date(self, headers):
        """Test creating signal with due date"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        resp = requests.post(f"{BASE_URL}/api/signals", headers=headers, json={
            "name": f"TEST_DueDate_{uuid.uuid4().hex[:8]}",
            "due_date": tomorrow,
            "impact_rating": 5
        })
        
        assert resp.status_code == 200
        signal = resp.json()
        assert signal["due_date"] == tomorrow
        print(f"Created signal with due_date: {signal['due_date']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/signals/{signal['id']}", headers=headers)
    
    def test_update_signal_due_date(self, headers):
        """Test updating signal due date"""
        today = datetime.now().strftime("%Y-%m-%d")
        next_week = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        # Create signal for today
        create_resp = requests.post(f"{BASE_URL}/api/signals", headers=headers, json={
            "name": f"TEST_Update_{uuid.uuid4().hex[:8]}",
            "due_date": today,
            "impact_rating": 5
        })
        assert create_resp.status_code == 200
        signal_id = create_resp.json()["id"]
        
        # Update to next week
        update_resp = requests.put(
            f"{BASE_URL}/api/signals/{signal_id}",
            headers=headers,
            json={"due_date": next_week}
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["due_date"] == next_week
        print(f"Updated due_date from {today} to {next_week}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/signals/{signal_id}", headers=headers)
    
    def test_get_signals_filters_by_date(self, headers):
        """Test that GET /api/signals returns all signals"""
        resp = requests.get(f"{BASE_URL}/api/signals", headers=headers)
        assert resp.status_code == 200
        signals = resp.json()
        assert isinstance(signals, list)
        print(f"Retrieved {len(signals)} signals")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
