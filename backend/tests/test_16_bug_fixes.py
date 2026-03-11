"""
Test suite for 4 bug fixes in 10x Unicorn app:
Bug 1: Wormhole contact selection - daily entry wormhole_contact_id
Bug 2: Signal date normalization - MM/DD/YY to YYYY-MM-DD
Bug 3: Profile photo URL - proper URL generation and retrieval
Bug 4: Dashboard heatmap - daily entries with limit=365
"""

import pytest
import requests
import os
from datetime import datetime, timezone

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test user credentials
TEST_EMAIL = "testbug@test.com"
TEST_PASSWORD = "test123456"


class TestBug1WormholeContactSelection:
    """Bug 1: Wormhole contact not getting added as focused relationship for the day"""
    
    @pytest.fixture(autouse=True)
    def setup(self, authenticated_client):
        self.client = authenticated_client
        self.today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    def test_create_wormhole_contact(self, authenticated_client):
        """Test POST /api/wormhole-contacts creates a contact"""
        response = authenticated_client.post(f"{BASE_URL}/api/wormhole-contacts", json={
            "name": "TEST_Bug1_Contact",
            "company": "Test Company",
            "label": "wormhole",
            "connection_level": "warm_local"
        })
        assert response.status_code == 200, f"Failed to create contact: {response.text}"
        data = response.json()
        assert "id" in data, "Contact should have an id"
        assert data["name"] == "TEST_Bug1_Contact"
        assert data["label"] == "wormhole"
        # Store for later cleanup
        self.contact_id = data["id"]
        print(f"Created wormhole contact: {data['id']}")
        return data["id"]
    
    def test_set_wormhole_contact_in_daily_entry(self, authenticated_client):
        """Test PUT /api/daily-entry/{date} with wormhole_contact_id correctly sets the focused contact"""
        # First create a contact
        contact_response = authenticated_client.post(f"{BASE_URL}/api/wormhole-contacts", json={
            "name": "TEST_Bug1_DailyEntry_Contact",
            "company": "Daily Test Co",
            "label": "wormhole"
        })
        assert contact_response.status_code == 200
        contact_id = contact_response.json()["id"]
        
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        # Update daily entry with wormhole_contact_id
        update_response = authenticated_client.put(f"{BASE_URL}/api/daily-entry/{today}", json={
            "wormhole_contact_id": contact_id,
            "wormhole_action_text": "Test wormhole action"
        })
        assert update_response.status_code == 200, f"Failed to update entry: {update_response.text}"
        data = update_response.json()
        
        # Verify wormhole_contact_id is set in response
        assert data.get("wormhole_contact_id") == contact_id, f"wormhole_contact_id not set correctly. Got: {data.get('wormhole_contact_id')}, Expected: {contact_id}"
        assert data.get("wormhole_action_text") == "Test wormhole action"
        print(f"Successfully set wormhole_contact_id: {contact_id} in daily entry for {today}")
    
    def test_get_daily_entry_returns_wormhole_contact(self, authenticated_client):
        """Test GET /api/daily-entry/{date} returns the correct wormhole_contact_id"""
        # Create contact first
        contact_response = authenticated_client.post(f"{BASE_URL}/api/wormhole-contacts", json={
            "name": "TEST_Bug1_GetEntry_Contact",
            "label": "wormhole"
        })
        contact_id = contact_response.json()["id"]
        
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        # Set wormhole contact in daily entry
        authenticated_client.put(f"{BASE_URL}/api/daily-entry/{today}", json={
            "wormhole_contact_id": contact_id
        })
        
        # Get daily entry and verify
        get_response = authenticated_client.get(f"{BASE_URL}/api/daily-entry/{today}")
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data.get("wormhole_contact_id") == contact_id, f"GET daily entry should return wormhole_contact_id={contact_id}, got: {data.get('wormhole_contact_id')}"
        print(f"Verified: GET daily entry correctly returns wormhole_contact_id: {contact_id}")


class TestBug2SignalDateNormalization:
    """Bug 2: Signals show 'Invalid Date' error - testing date normalization"""
    
    def test_signal_with_mmddyy_date_normalized(self, authenticated_client):
        """Test POST /api/signals with due_date in MM/DD/YY format stores it as YYYY-MM-DD"""
        response = authenticated_client.post(f"{BASE_URL}/api/signals", json={
            "name": "TEST_Bug2_MMDDYY_Signal",
            "description": "Test signal with MM/DD/YY date",
            "signal_type": "10x_action",
            "due_date": "01/15/26",  # MM/DD/YY format
            "is_public": True
        })
        assert response.status_code == 200, f"Failed to create signal: {response.text}"
        data = response.json()
        
        # Verify date is normalized to YYYY-MM-DD
        assert data.get("due_date") == "2026-01-15", f"Expected YYYY-MM-DD format, got: {data.get('due_date')}"
        print(f"Signal created with normalized date: {data.get('due_date')}")
        
        # Clean up
        signal_id = data["id"]
        authenticated_client.delete(f"{BASE_URL}/api/signals/{signal_id}")
    
    def test_signal_with_iso_date_preserved(self, authenticated_client):
        """Test POST /api/signals with due_date in ISO format preserves it correctly"""
        response = authenticated_client.post(f"{BASE_URL}/api/signals", json={
            "name": "TEST_Bug2_ISO_Signal",
            "description": "Test signal with ISO date",
            "signal_type": "10x_action",
            "due_date": "2026-02-20",  # ISO format
            "is_public": True
        })
        assert response.status_code == 200, f"Failed to create signal: {response.text}"
        data = response.json()
        
        # Verify date is preserved in YYYY-MM-DD
        assert data.get("due_date") == "2026-02-20", f"Expected 2026-02-20, got: {data.get('due_date')}"
        print(f"ISO date correctly preserved: {data.get('due_date')}")
        
        # Clean up
        signal_id = data["id"]
        authenticated_client.delete(f"{BASE_URL}/api/signals/{signal_id}")
    
    def test_get_signals_returns_properly_formatted_dates(self, authenticated_client):
        """Test GET /api/signals returns properly formatted dates"""
        # Create a signal with MM/DD/YY format
        create_response = authenticated_client.post(f"{BASE_URL}/api/signals", json={
            "name": "TEST_Bug2_GetSignals",
            "due_date": "03/10/26",
            "is_public": True
        })
        signal_id = create_response.json()["id"]
        
        # Fetch all signals
        get_response = authenticated_client.get(f"{BASE_URL}/api/signals")
        assert get_response.status_code == 200
        signals = get_response.json()
        
        # Find our test signal
        test_signal = next((s for s in signals if s["id"] == signal_id), None)
        assert test_signal is not None, "Test signal not found"
        
        # Verify normalized date format
        assert test_signal.get("due_date") == "2026-03-10", f"Signal date not normalized: {test_signal.get('due_date')}"
        print(f"GET signals returns normalized date: {test_signal.get('due_date')}")
        
        # Clean up
        authenticated_client.delete(f"{BASE_URL}/api/signals/{signal_id}")
    
    def test_complete_signal_with_normalized_dates(self, authenticated_client):
        """Test POST /api/signals/{signal_id}/complete works with normalized dates"""
        # Create signal with future date
        create_response = authenticated_client.post(f"{BASE_URL}/api/signals", json={
            "name": "TEST_Bug2_CompleteSignal",
            "due_date": "01/25/26",  # MM/DD/YY format
            "impact_rating": 5,
            "is_public": True
        })
        signal_id = create_response.json()["id"]
        
        # Complete the signal
        complete_response = authenticated_client.post(
            f"{BASE_URL}/api/signals/{signal_id}/complete", 
            json={"signal_id": signal_id, "notes": "Completed for testing"}
        )
        assert complete_response.status_code == 200, f"Failed to complete signal: {complete_response.text}"
        data = complete_response.json()
        
        # Verify completion was successful - response has nested structure
        assert "completion" in data or "total_points_earned" in data, f"Unexpected response: {data}"
        total_points = data.get("total_points_earned") or data.get("completion", {}).get("total_points")
        assert total_points is not None, "Points should be returned"
        print(f"Signal completed successfully with {total_points} points")
        
        # Clean up
        authenticated_client.delete(f"{BASE_URL}/api/signals/{signal_id}")
    
    def test_normalize_date_various_formats(self, authenticated_client):
        """Test various date format inputs"""
        test_cases = [
            ("12/31/25", "2025-12-31"),  # End of year
            ("01/01/26", "2026-01-01"),  # New year
            ("06/15/26", "2026-06-15"),  # Mid-year
            ("2026-07-04", "2026-07-04"),  # Already ISO
        ]
        
        for input_date, expected_output in test_cases:
            response = authenticated_client.post(f"{BASE_URL}/api/signals", json={
                "name": f"TEST_Bug2_DateFormat_{input_date.replace('/', '_')}",
                "due_date": input_date,
                "is_public": True
            })
            assert response.status_code == 200, f"Failed for date {input_date}: {response.text}"
            data = response.json()
            assert data.get("due_date") == expected_output, f"Input {input_date} should normalize to {expected_output}, got: {data.get('due_date')}"
            print(f"Date {input_date} correctly normalized to {expected_output}")
            
            # Clean up
            authenticated_client.delete(f"{BASE_URL}/api/signals/{data['id']}")


class TestBug3ProfilePhotoURL:
    """Bug 3: Profile photo doesn't update after saving"""
    
    def test_get_member_profile_returns_photo_url(self, authenticated_client):
        """Test GET /api/member/profile returns profile_photo_url field when profile_photo_path exists"""
        # First get member profile
        response = authenticated_client.get(f"{BASE_URL}/api/member/profile")
        assert response.status_code == 200
        data = response.json()
        
        # Check structure - should have profile_photo_url field if photo was uploaded
        if data.get("profile_photo_path"):
            assert "profile_photo_url" in data, "profile_photo_url should be present when profile_photo_path exists"
            assert data["profile_photo_url"].startswith("/api/photos/"), f"profile_photo_url should start with /api/photos/, got: {data.get('profile_photo_url')}"
            print(f"Member profile returns photo_url: {data['profile_photo_url']}")
        else:
            print("No profile photo uploaded yet - profile_photo_path is None")
        
        # Verify response structure
        assert "user_id" in data, "Response should contain user_id"
        print(f"Member profile response structure verified for user: {data.get('user_id')}")
    
    def test_profile_photo_url_construction(self, authenticated_client):
        """Test that profile_photo_url is correctly constructed from user_id"""
        # Get current user first
        me_response = authenticated_client.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        user_id = me_response.json()["id"]
        
        # Get member profile
        profile_response = authenticated_client.get(f"{BASE_URL}/api/member/profile")
        assert profile_response.status_code == 200
        profile = profile_response.json()
        
        # If photo exists, verify URL format
        if profile.get("profile_photo_url"):
            expected_url = f"/api/photos/{user_id}"
            assert profile["profile_photo_url"] == expected_url, f"Expected {expected_url}, got {profile['profile_photo_url']}"
            print(f"Profile photo URL correctly constructed: {expected_url}")
        else:
            print(f"No profile photo URL - photo not uploaded. User ID: {user_id}")
    
    def test_photos_endpoint_returns_404_when_no_photo(self, api_client):
        """Test GET /api/photos/{user_id} returns 404 when no photo exists"""
        # Use a non-existent user ID
        response = api_client.get(f"{BASE_URL}/api/photos/nonexistent-user-id")
        assert response.status_code == 404, f"Should return 404 for non-existent user, got: {response.status_code}"
        print("Photos endpoint correctly returns 404 for non-existent user")
    
    def test_member_profile_structure(self, authenticated_client):
        """Test member profile has correct structure including photo fields"""
        response = authenticated_client.get(f"{BASE_URL}/api/member/profile")
        assert response.status_code == 200
        data = response.json()
        
        # Check for expected fields in member profile
        expected_fields = ["user_id", "display_name"]
        for field in expected_fields:
            assert field in data, f"Missing expected field: {field}"
        
        print(f"Member profile structure verified. Fields present: {list(data.keys())}")


class TestBug4DashboardHeatmap:
    """Bug 4: Dashboard heatmap cut off - verify daily entries and dashboard stats"""
    
    def test_get_daily_entries_with_limit_365(self, authenticated_client):
        """Test GET /api/daily-entries?limit=365 returns entries correctly"""
        response = authenticated_client.get(f"{BASE_URL}/api/daily-entries?limit=365")
        assert response.status_code == 200, f"Failed to get daily entries: {response.text}"
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list), "Response should be a list of entries"
        
        # Each entry should have required fields
        if len(data) > 0:
            entry = data[0]
            required_fields = ["date", "user_id", "five_item_statuses"]
            for field in required_fields:
                assert field in entry, f"Entry missing required field: {field}"
        
        print(f"Daily entries endpoint returned {len(data)} entries for limit=365")
    
    def test_dashboard_stats_structure(self, authenticated_client):
        """Test GET /api/dashboard/stats returns expected data structure"""
        response = authenticated_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200, f"Failed to get dashboard stats: {response.text}"
        data = response.json()
        
        # Check for expected fields in dashboard stats
        expected_fields = [
            "total_entries",
            "unicorn_wins",
            "priority_wins",
            "compound_streak",
            "win_streak"
        ]
        
        for field in expected_fields:
            assert field in data, f"Dashboard stats missing field: {field}"
        
        print(f"Dashboard stats structure verified: {list(data.keys())[:10]}...")
        print(f"Total entries: {data.get('total_entries')}, Unicorn wins: {data.get('unicorn_wins')}, Win streak: {data.get('win_streak')}")
    
    def test_dashboard_stats_data_types(self, authenticated_client):
        """Test dashboard stats have correct data types"""
        response = authenticated_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Verify numeric fields are integers
        numeric_fields = ["total_entries", "unicorn_wins", "priority_wins", "losses", "compound_streak", "win_streak", "longest_streak"]
        for field in numeric_fields:
            if field in data:
                assert isinstance(data[field], int), f"{field} should be an integer, got: {type(data[field])}"
        
        print("Dashboard stats data types verified")
    
    def test_daily_entries_sorted_by_date(self, authenticated_client):
        """Test daily entries are sorted by date descending"""
        response = authenticated_client.get(f"{BASE_URL}/api/daily-entries?limit=30")
        assert response.status_code == 200
        entries = response.json()
        
        if len(entries) > 1:
            dates = [e.get("date") for e in entries]
            # Check descending order
            assert dates == sorted(dates, reverse=True), "Entries should be sorted by date descending"
            print(f"Daily entries correctly sorted. First: {dates[0]}, Last: {dates[-1]}")
        else:
            print(f"Only {len(entries)} entry found - skipping sort verification")


# ─── Fixtures ───

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session without auth"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token for test user"""
    # Try to login with existing user
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if response.status_code == 200:
        token = response.json().get("token")
        print(f"Logged in as existing user: {TEST_EMAIL}")
        return token
    
    # If login fails, try to register
    register_response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if register_response.status_code == 200:
        token = register_response.json().get("token")
        user_id = register_response.json().get("user_id")
        print(f"Registered new test user: {TEST_EMAIL}")
        
        # Complete onboarding for the new user
        api_client.headers.update({"Authorization": f"Bearer {token}"})
        api_client.post(f"{BASE_URL}/api/onboarding", json={
            "display_name": "Bug Test User",
            "timezone_str": "UTC",
            "goal_title": "Test 10x Goal",
            "goal_description": "Testing bug fixes",
            "compound_habit": "Daily testing"
        })
        
        return token
    
    # If both fail, user exists with different password or other error
    pytest.skip(f"Could not authenticate test user: {response.text}")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


# ─── Cleanup ───

@pytest.fixture(autouse=True, scope="module")
def cleanup_test_data(api_client, auth_token):
    """Cleanup TEST_ prefixed data after tests complete"""
    yield
    
    # Cleanup test contacts
    try:
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        contacts_response = api_client.get(f"{BASE_URL}/api/wormhole-contacts")
        if contacts_response.status_code == 200:
            contacts = contacts_response.json()
            for contact in contacts:
                if contact.get("name", "").startswith("TEST_"):
                    api_client.delete(f"{BASE_URL}/api/wormhole-contacts/{contact['id']}")
                    print(f"Cleaned up test contact: {contact['name']}")
    except Exception as e:
        print(f"Cleanup error: {e}")
    
    # Cleanup test signals
    try:
        signals_response = api_client.get(f"{BASE_URL}/api/signals")
        if signals_response.status_code == 200:
            signals = signals_response.json()
            for signal in signals:
                if signal.get("name", "").startswith("TEST_"):
                    api_client.delete(f"{BASE_URL}/api/signals/{signal['id']}")
                    print(f"Cleaned up test signal: {signal['name']}")
    except Exception as e:
        print(f"Cleanup error: {e}")
