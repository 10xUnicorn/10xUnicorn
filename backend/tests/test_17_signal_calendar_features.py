"""
Test Suite: Signal Calendar Features - Iteration 13
Features tested:
1. Signal Due Date Editing: POST/PUT /api/signals with due_date
2. Backend date normalization: normalize_date_to_iso helper
3. Smart default date logic via signal creation
4. Signal update flow with due_date changes
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL', '')).rstrip('/')

# Test credentials
TEST_EMAIL = "testbug@test.com"
TEST_PASSWORD = "test123456"


class TestSignalDueDateEditing:
    """Test Feature 1: Signal Due Date Editing - POST/PUT /api/signals with due_date"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        yield
    
    def test_create_signal_with_due_date_iso_format(self):
        """Test: POST /api/signals with YYYY-MM-DD due_date preserves format"""
        due_date = "2026-03-15"
        response = requests.post(f"{BASE_URL}/api/signals", headers=self.headers, json={
            "name": "TEST_ISO_date_signal",
            "description": "Signal with ISO date format",
            "impact_rating": 7,
            "due_date": due_date,
            "is_public": True
        })
        assert response.status_code == 200 or response.status_code == 201
        data = response.json()
        assert data["due_date"] == due_date, f"Expected {due_date}, got {data['due_date']}"
        print(f"PASS: Created signal with ISO date {due_date}")
        
        # Cleanup
        if data.get("id"):
            requests.delete(f"{BASE_URL}/api/signals/{data['id']}", headers=self.headers)
    
    def test_create_signal_with_due_date_mmddyy_format(self):
        """Test: POST /api/signals with MM/DD/YY due_date normalizes to YYYY-MM-DD"""
        due_date_input = "03/15/26"
        expected_output = "2026-03-15"
        
        response = requests.post(f"{BASE_URL}/api/signals", headers=self.headers, json={
            "name": "TEST_MMDDYY_date_signal",
            "description": "Signal with MM/DD/YY date format",
            "impact_rating": 6,
            "due_date": due_date_input,
            "is_public": True
        })
        assert response.status_code == 200 or response.status_code == 201
        data = response.json()
        assert data["due_date"] == expected_output, f"Expected {expected_output}, got {data['due_date']}"
        print(f"PASS: Created signal with MM/DD/YY date normalized to {expected_output}")
        
        # Cleanup
        if data.get("id"):
            requests.delete(f"{BASE_URL}/api/signals/{data['id']}", headers=self.headers)
    
    def test_update_signal_due_date(self):
        """Test: PUT /api/signals/{id} with new due_date updates correctly"""
        # Create signal
        create_response = requests.post(f"{BASE_URL}/api/signals", headers=self.headers, json={
            "name": "TEST_update_date_signal",
            "description": "Signal to test date update",
            "impact_rating": 5,
            "due_date": "2026-01-15",
            "is_public": True
        })
        assert create_response.status_code in [200, 201]
        signal_id = create_response.json()["id"]
        
        # Update with new date
        new_due_date = "2026-04-01"
        update_response = requests.put(f"{BASE_URL}/api/signals/{signal_id}", headers=self.headers, json={
            "due_date": new_due_date
        })
        assert update_response.status_code == 200
        updated_data = update_response.json()
        assert updated_data["due_date"] == new_due_date, f"Expected {new_due_date}, got {updated_data['due_date']}"
        print(f"PASS: Updated signal due_date to {new_due_date}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/signals/{signal_id}", headers=self.headers)
    
    def test_update_signal_due_date_mmddyy_format(self):
        """Test: PUT /api/signals/{id} with MM/DD/YY format normalizes properly"""
        # Create signal
        create_response = requests.post(f"{BASE_URL}/api/signals", headers=self.headers, json={
            "name": "TEST_update_mmddyy_signal",
            "description": "Signal to test MM/DD/YY update",
            "impact_rating": 5,
            "due_date": "2026-01-15",
            "is_public": True
        })
        assert create_response.status_code in [200, 201]
        signal_id = create_response.json()["id"]
        
        # Update with MM/DD/YY format
        new_due_date_input = "04/01/26"
        expected_output = "2026-04-01"
        update_response = requests.put(f"{BASE_URL}/api/signals/{signal_id}", headers=self.headers, json={
            "due_date": new_due_date_input
        })
        assert update_response.status_code == 200
        updated_data = update_response.json()
        assert updated_data["due_date"] == expected_output, f"Expected {expected_output}, got {updated_data['due_date']}"
        print(f"PASS: Updated signal due_date from MM/DD/YY to {expected_output}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/signals/{signal_id}", headers=self.headers)


class TestDateNormalization:
    """Test Feature 2: Backend date normalization via normalize_date_to_iso helper"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        yield
    
    def test_normalize_various_date_formats(self):
        """Test normalization of various date formats"""
        test_cases = [
            ("03/15/26", "2026-03-15"),  # MM/DD/YY
            ("12/31/25", "2025-12-31"),  # Year boundary
            ("01/01/26", "2026-01-01"),  # New year
            ("2026-07-04", "2026-07-04"),  # Already ISO format
        ]
        
        signal_ids = []
        for input_date, expected_output in test_cases:
            response = requests.post(f"{BASE_URL}/api/signals", headers=self.headers, json={
                "name": f"TEST_normalize_{input_date.replace('/', '_')}",
                "description": f"Testing normalization of {input_date}",
                "impact_rating": 5,
                "due_date": input_date,
                "is_public": True
            })
            assert response.status_code in [200, 201]
            data = response.json()
            assert data["due_date"] == expected_output, f"Input {input_date}: Expected {expected_output}, got {data['due_date']}"
            signal_ids.append(data["id"])
            print(f"PASS: {input_date} -> {expected_output}")
        
        # Cleanup
        for sid in signal_ids:
            requests.delete(f"{BASE_URL}/api/signals/{sid}", headers=self.headers)
    
    def test_normalize_iso_datetime_strips_time(self):
        """Test that ISO datetime format strips time portion"""
        # This tests internally via POST - the due_date field should handle datetime strings
        iso_datetime = "2026-05-20T15:30:00Z"  
        expected = "2026-05-20"  # Time portion stripped
        
        response = requests.post(f"{BASE_URL}/api/signals", headers=self.headers, json={
            "name": "TEST_datetime_strip_signal",
            "description": "Testing datetime to date conversion",
            "impact_rating": 5,
            "due_date": iso_datetime,
            "is_public": True
        })
        assert response.status_code in [200, 201]
        data = response.json()
        # Note: The normalize_date_to_iso function strips 'T' portion if present
        assert data["due_date"] == expected, f"Expected {expected}, got {data['due_date']}"
        print(f"PASS: ISO datetime {iso_datetime} -> {expected}")
        
        # Cleanup
        if data.get("id"):
            requests.delete(f"{BASE_URL}/api/signals/{data['id']}", headers=self.headers)


class TestSmartDefaultDateLogic:
    """Test Feature 3: Smart default date logic (today if before 3 PM, tomorrow if after)
    This is primarily a frontend feature in getSmartDefaultDate() but we test backend accepts any date"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        yield
    
    def test_create_signal_without_due_date(self):
        """Test: Creating signal without due_date should work (frontend will set smart default)"""
        response = requests.post(f"{BASE_URL}/api/signals", headers=self.headers, json={
            "name": "TEST_no_due_date_signal",
            "description": "Signal without explicit due_date",
            "impact_rating": 5,
            "is_public": True
            # No due_date provided
        })
        assert response.status_code in [200, 201]
        data = response.json()
        # due_date should be None or empty when not provided
        assert data.get("due_date") is None or data.get("due_date") == "", f"Expected None/empty, got {data.get('due_date')}"
        print(f"PASS: Signal created without due_date, backend accepted")
        
        # Cleanup
        if data.get("id"):
            requests.delete(f"{BASE_URL}/api/signals/{data['id']}", headers=self.headers)
    
    def test_create_signal_with_today_date(self):
        """Test: Creating signal with today's date works"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.post(f"{BASE_URL}/api/signals", headers=self.headers, json={
            "name": "TEST_today_due_date_signal",
            "description": "Signal with today's date",
            "impact_rating": 5,
            "due_date": today,
            "is_public": True
        })
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["due_date"] == today
        print(f"PASS: Signal created with today's date {today}")
        
        # Cleanup
        if data.get("id"):
            requests.delete(f"{BASE_URL}/api/signals/{data['id']}", headers=self.headers)
    
    def test_create_signal_with_tomorrow_date(self):
        """Test: Creating signal with tomorrow's date works"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        response = requests.post(f"{BASE_URL}/api/signals", headers=self.headers, json={
            "name": "TEST_tomorrow_due_date_signal",
            "description": "Signal with tomorrow's date",
            "impact_rating": 5,
            "due_date": tomorrow,
            "is_public": True
        })
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["due_date"] == tomorrow
        print(f"PASS: Signal created with tomorrow's date {tomorrow}")
        
        # Cleanup
        if data.get("id"):
            requests.delete(f"{BASE_URL}/api/signals/{data['id']}", headers=self.headers)


class TestSignalUpdateFlow:
    """Test Feature 4: Complete signal update flow with due_date changes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        yield
    
    def test_full_signal_crud_with_due_date(self):
        """Test complete Create -> Read -> Update -> Delete flow with due_date"""
        # CREATE
        create_response = requests.post(f"{BASE_URL}/api/signals", headers=self.headers, json={
            "name": "TEST_CRUD_signal",
            "description": "Test full CRUD flow",
            "impact_rating": 8,
            "due_date": "2026-02-15",
            "is_public": True
        })
        assert create_response.status_code in [200, 201]
        signal = create_response.json()
        signal_id = signal["id"]
        assert signal["due_date"] == "2026-02-15"
        print(f"CREATE: Signal created with due_date 2026-02-15")
        
        # READ (via GET /signals)
        read_response = requests.get(f"{BASE_URL}/api/signals", headers=self.headers)
        assert read_response.status_code == 200
        signals = read_response.json()
        found_signal = next((s for s in signals if s["id"] == signal_id), None)
        assert found_signal is not None
        assert found_signal["due_date"] == "2026-02-15"
        print(f"READ: Signal found with correct due_date")
        
        # UPDATE due_date
        update_response = requests.put(f"{BASE_URL}/api/signals/{signal_id}", headers=self.headers, json={
            "due_date": "2026-03-20"
        })
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["due_date"] == "2026-03-20"
        print(f"UPDATE: Signal due_date changed to 2026-03-20")
        
        # VERIFY update persisted
        verify_response = requests.get(f"{BASE_URL}/api/signals", headers=self.headers)
        assert verify_response.status_code == 200
        signals = verify_response.json()
        verified_signal = next((s for s in signals if s["id"] == signal_id), None)
        assert verified_signal["due_date"] == "2026-03-20"
        print(f"VERIFY: Update persisted correctly")
        
        # DELETE
        delete_response = requests.delete(f"{BASE_URL}/api/signals/{signal_id}", headers=self.headers)
        assert delete_response.status_code == 200
        print(f"DELETE: Signal removed successfully")
        
        # VERIFY deletion
        final_response = requests.get(f"{BASE_URL}/api/signals", headers=self.headers)
        signals = final_response.json()
        deleted_signal = next((s for s in signals if s["id"] == signal_id), None)
        assert deleted_signal is None
        print(f"PASS: Full CRUD flow with due_date completed successfully")
    
    def test_update_signal_multiple_fields_including_due_date(self):
        """Test updating multiple fields including due_date in one request"""
        # Create
        create_response = requests.post(f"{BASE_URL}/api/signals", headers=self.headers, json={
            "name": "TEST_multi_update_signal",
            "description": "Original description",
            "impact_rating": 5,
            "due_date": "2026-01-15",
            "is_public": True
        })
        assert create_response.status_code in [200, 201]
        signal_id = create_response.json()["id"]
        
        # Update multiple fields
        update_response = requests.put(f"{BASE_URL}/api/signals/{signal_id}", headers=self.headers, json={
            "name": "TEST_multi_update_signal_UPDATED",
            "description": "Updated description",
            "impact_rating": 9,
            "due_date": "06/15/26"  # MM/DD/YY format to test normalization
        })
        assert update_response.status_code == 200
        updated = update_response.json()
        
        assert updated["name"] == "TEST_multi_update_signal_UPDATED"
        assert updated["description"] == "Updated description"
        assert updated["impact_rating"] == 9
        assert updated["due_date"] == "2026-06-15"  # Normalized
        print(f"PASS: Multiple fields updated including due_date normalization")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/signals/{signal_id}", headers=self.headers)


class TestDashboardHeatmapAutoScroll:
    """Test Feature: Dashboard heatmap data (auto-scroll is frontend, we test data availability)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        yield
    
    def test_dashboard_stats_endpoint(self):
        """Test dashboard stats endpoint returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check expected fields for heatmap
        assert "unicorn_wins" in data or "win_streak" in data
        assert "total_contacts" in data or "goal" in data
        print(f"PASS: Dashboard stats endpoint returns correct structure")
    
    def test_daily_entries_for_heatmap(self):
        """Test daily entries endpoint for heatmap data"""
        response = requests.get(f"{BASE_URL}/api/daily-entries?limit=365", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        # Check entry structure if any exist
        if len(data) > 0:
            entry = data[0]
            assert "date" in entry
            assert "final_status" in entry or "computed_status" in entry
        print(f"PASS: Daily entries endpoint returns data for heatmap (count: {len(data)})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
