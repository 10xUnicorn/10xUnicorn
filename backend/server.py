from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Response, Query, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import jwt
import bcrypt
import requests
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', '')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_HOURS = 720

# LLM
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# ─── Emergent Object Storage ───
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "10x-unicorn"
storage_key = None

def init_storage():
    """Initialize storage and get session key. Call ONCE at startup."""
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload file to Emergent Object Storage"""
    key = init_storage()
    if not key:
        raise Exception("Storage not initialized")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    """Download file from Emergent Object Storage"""
    key = init_storage()
    if not key:
        raise Exception("Storage not initialized")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "heic": "image/heic"
}

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Auth Utilities ───

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ─── Pydantic Models ───

class RegisterInput(BaseModel):
    email: str
    password: str

class LoginInput(BaseModel):
    email: str
    password: str

class OnboardingInput(BaseModel):
    display_name: str
    timezone_str: str = "UTC"
    goal_title: str
    goal_description: Optional[str] = ""
    goal_end_date: Optional[str] = None
    compound_habit: str

class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    first_name: Optional[str] = None
    profile_emoji: Optional[str] = None
    timezone_str: Optional[str] = None

class DailyEntryUpdate(BaseModel):
    determination_level: Optional[int] = None
    intention: Optional[str] = None
    ten_x_focus: Optional[str] = None
    top_10x_action_text: Optional[str] = None
    top_priority_completed: Optional[bool] = None
    five_item_statuses: Optional[Dict[str, bool]] = None
    wormhole_contact_id: Optional[str] = None
    wormhole_action_text: Optional[str] = None
    wormhole_action_type: Optional[str] = None
    wormhole_impact_rating: Optional[int] = None
    distraction_notes: Optional[str] = None
    immediate_course_correction: Optional[bool] = None
    meditation_reflection: Optional[str] = None
    compound_done: Optional[bool] = None
    compound_count: Optional[int] = None  # How many times action done today
    compound_notes: Optional[str] = None
    manual_override_status: Optional[str] = None

class WormholeContactInput(BaseModel):
    # Identity
    name: str
    company: Optional[str] = ""
    title: Optional[str] = ""
    location: Optional[str] = ""
    
    # Contact Label - required classification
    label: str = "prospect"  # prospect, referral_partner, strategic_partner, client, wormhole, resource
    
    # Connection Level (colored pill in UI)
    connection_level: str = "warm_local"  # active_professional, building, warm_local, warm_intl, close_personal, mid_aspirational, new_connection
    
    # Tags (multi-select)
    tags: Optional[List[str]] = []  # business_owner, influencer, speaker, access, mindset, future_self, community_partner, motivation, thought_leader, investor, mentor, connector
    
    # Contact Info
    website: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    
    # Social Media Handles
    linkedin: Optional[str] = ""
    twitter: Optional[str] = ""
    instagram: Optional[str] = ""
    youtube: Optional[str] = ""
    tiktok: Optional[str] = ""
    other_social: Optional[str] = ""
    
    # Workflow & Tracking
    activation_next_step: Optional[str] = ""
    last_contact_date: Optional[str] = None  # MM/DD/YY
    set_meeting: Optional[bool] = False
    preferred_platform: Optional[str] = ""  # text, phone, email, in_person, dm_instagram, dm_linkedin, video_call
    
    # Power Leverage & Business
    power_leverage: Optional[str] = ""  # Description of their influence/reach
    leverage_categories: Optional[List[str]] = []  # capital, marketing, network, expertise, audience, speaking, partnerships
    leverage_description: Optional[str] = ""  # Detailed leverage description
    
    # Best Contact Method
    best_contact_method: Optional[str] = ""  # Preferred contact method
    
    # Engagement Tracking
    engagement_level: Optional[str] = "moderate"  # none, low, moderate, high, very_high
    engagement_strength: Optional[int] = 5  # 1-10 scale
    engagement_types: Optional[List[str]] = []  # dms, replies_to_comments, shares_posts, collaborates_on_posts, tags_in_posts, tags_in_comments
    tagging_in_posts: Optional[bool] = False
    tagging_in_comments: Optional[bool] = False
    
    # Relationship Notes
    reciprocity_notes: Optional[str] = ""  # What value exchange exists
    notes: Optional[str] = ""

# Connection level options with colors for frontend
CONNECTION_LEVELS = [
    {"key": "active_professional", "label": "Active / Professional", "color": "#8B5CF6"},
    {"key": "warm_local", "label": "Warm / Local", "color": "#10B981"},
    {"key": "building", "label": "Building", "color": "#F59E0B"},
    {"key": "mid_aspirational", "label": "Mid-Aspirational", "color": "#F97316"},
    {"key": "close_personal", "label": "Close / Personal", "color": "#EC4899"},
]

# Contact tags - matching screenshot
CONTACT_TAGS = [
    "influencer", "speaker", "business_owner", "access", "mindset", 
    "future_self", "community_partner", "motivation"
]

# Platform options
PLATFORM_OPTIONS = [
    "text", "phone", "email", "in_person", "dm_instagram", "dm_linkedin", 
    "dm_twitter", "video_call", "voice_call", "meetings_app"
]

# Engagement types
ENGAGEMENT_TYPES = [
    "dms", "replies_to_comments", "shares_posts", "collaborates_on_posts",
    "tags_in_posts", "tags_in_comments", "mentions_in_stories"
]

# Leverage categories
LEVERAGE_CATEGORIES = [
    "capital", "marketing", "network", "expertise", "audience", 
    "speaking", "partnerships", "media", "technology", "operations"
]


class WormholeContactUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    location: Optional[str] = None
    label: Optional[str] = None  # Contact label
    connection_level: Optional[str] = None
    tags: Optional[List[str]] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    twitter: Optional[str] = None
    instagram: Optional[str] = None
    youtube: Optional[str] = None
    tiktok: Optional[str] = None
    other_social: Optional[str] = None
    activation_next_step: Optional[str] = None
    last_contact_date: Optional[str] = None
    set_meeting: Optional[bool] = None
    preferred_platform: Optional[str] = None
    best_contact_method: Optional[str] = None  # Preferred contact method
    power_leverage: Optional[str] = None
    leverage_categories: Optional[List[str]] = None
    engagement_level: Optional[str] = None
    engagement_types: Optional[List[str]] = None
    tagging_in_posts: Optional[bool] = None
    tagging_in_comments: Optional[bool] = None
    reciprocity_notes: Optional[str] = None
    notes: Optional[str] = None

class WormholeLogInput(BaseModel):
    contact_id: str
    action_type: str  # call, meeting, dm, email, collaboration, coffee_chat, intro_made, follow_up, tagged_in_post, scheduled_meeting
    notes: str
    date: Optional[str] = None  # MM/DD/YY

class MessageInput(BaseModel):
    content: str
    recipient_id: Optional[str] = None  # For direct messages
    group_id: Optional[str] = None  # For group messages

class GroupChatInput(BaseModel):
    name: str
    description: Optional[str] = ""
    member_ids: List[str]

class NotificationSettingsInput(BaseModel):
    daily_checkin_enabled: Optional[bool] = True
    daily_checkin_time: Optional[str] = "09:00"  # HH:MM format
    deal_reminders_enabled: Optional[bool] = True
    community_notifications_enabled: Optional[bool] = True
    message_notifications_enabled: Optional[bool] = True

class PushTokenInput(BaseModel):
    token: str
    device_type: Optional[str] = "unknown"  # ios, android, web

class InteractionInput(BaseModel):
    contact_id: str
    action_type: str  # sent_intro_email, followed_up, scheduled_meeting, commented_post, made_introduction, etc.
    action_text: str
    impact_rating: Optional[int] = None  # 1-10
    date: Optional[str] = None

class AIChatMessage(BaseModel):
    message: str
    date: Optional[str] = None

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    end_date: Optional[str] = None
    deadline: Optional[str] = None  # Goal deadline (MM/DD/YY format)
    target_number: Optional[float] = None  # Target number to track against
    active: Optional[bool] = None

class GoalProgressInput(BaseModel):
    current_value: float
    notes: Optional[str] = ""

class HabitUpdate(BaseModel):
    habit_title: Optional[str] = None

class MoveEntryInput(BaseModel):
    from_date: str
    to_date: str

class PasswordResetInput(BaseModel):
    current_password: str
    new_password: str

# ─── Signal & Points System Models ───

class SignalInput(BaseModel):
    name: str
    description: Optional[str] = ""
    impact_rating: Optional[int] = None  # 1-10, determines points (None = not set)
    due_date: Optional[str] = None  # MM/DD/YY format
    deal_id: Optional[str] = None  # Associated deal
    is_public: bool = True
    is_top_10x_action: bool = False  # True if this is the daily top 10x action

class SignalUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    impact_rating: Optional[int] = None
    due_date: Optional[str] = None
    deal_id: Optional[str] = None
    is_public: Optional[bool] = None

class SignalCompletionInput(BaseModel):
    signal_id: str
    notes: Optional[str] = ""

# Contact Labels
CONTACT_LABELS = [
    "prospect", "referral_partner", "strategic_partner", "client", "wormhole", "resource"
]

# Points configuration
POINTS_CONFIG = {
    "base_signal": 10,
    "top_10x_action_points": 10,  # Fixed 10 points for top 10x action
    "planned_ahead_bonus": 5,
    "before_6pm_bonus": 10,
    "all_signals_bonus": 20,
    "streak_bonus_per_day": 2,
    "top_action_bonus": 15,
    "wormhole_action_bonus": 10,
    "wormhole_impact_multiplier": 0.5,
    "unicorn_win_bonus": 50,
    "daily_goal_update_points": 1,  # 1 point for daily goal progress update
    "on_track_bonus": 5,  # Daily bonus for being on track
}

# ─── Member Profile Models ───

INDUSTRIES = [
    "technology", "saas", "fintech", "healthcare", "ecommerce", "media", 
    "consulting", "real_estate", "education", "marketing", "manufacturing", "other"
]

SERVICES_OFFERED = [
    "capital", "marketing", "social_media", "community_management", "operations",
    "tech_development", "podcast_booking", "speaking", "sponsorships", "events",
    "communities", "financial_services", "coaching", "design", "sales", "legal", "hr"
]

FINANCIAL_SERVICES = [
    "accounting", "bookkeeping", "tax_planning", "financial_planning", "wealth_management",
    "venture_capital", "private_equity", "angel_investment", "debt_financing",
    "revenue_based_financing", "fractional_cfo", "ma_advisory", "fundraising_strategy"
]

class MemberProfileUpdate(BaseModel):
    # Company Info
    company_name: Optional[str] = None
    company_description: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    booking_link: Optional[str] = None
    
    # Social Media Handles
    linkedin: Optional[str] = None
    twitter: Optional[str] = None
    instagram: Optional[str] = None
    youtube: Optional[str] = None
    tiktok: Optional[str] = None
    
    # Bio & About
    bio: Optional[str] = None
    working_on: Optional[str] = None  # What they're currently working on
    
    # Services & Business
    services_offered: Optional[List[str]] = None
    target_customer: Optional[str] = None  # Description of target customer
    industries: Optional[List[str]] = None
    
    # Connection Fields
    good_connection_for: Optional[str] = None  # Who they are a good connection for
    warm_connection: Optional[str] = None  # Who a warm connection is for them
    golden_connection: Optional[str] = None  # Who a golden/ideal connection is for them
    seeking_partnerships: Optional[str] = None  # Strategic partnerships they seek
    
    # Needs
    needs: Optional[List[str]] = None
    financial_services_needed: Optional[List[str]] = None
    
    # Settings
    show_status_ring: Optional[bool] = None  # Show/hide goal status ring in community
    profile_photo_url: Optional[str] = None  # Profile photo URL

class HelpRequestInput(BaseModel):
    description: str
    goal_id: Optional[str] = None

# ─── Deals CRM Models ───

DEAL_STAGES = [
    "lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"
]

DEAL_NEEDS = [
    "capital", "marketing", "social_media", "community_management", "operations",
    "tech_development", "podcast_booking", "speaking", "sponsorships", "events",
    "communities", "financial_services", "coaching", "design", "sales", "legal", "hr"
]

class DealInput(BaseModel):
    name: str
    contact_id: Optional[str] = None  # Associated wormhole contact
    company: Optional[str] = ""
    value: Optional[float] = None
    stage: str = "lead"
    close_date: Optional[str] = None  # MM/DD/YY format - expected close date
    notes: Optional[str] = ""
    needs: Optional[List[str]] = []
    financial_services: Optional[List[str]] = []
    other_needs: Optional[str] = ""
    notifications_enabled: bool = True  # Enable/disable close date notifications

class DealUpdate(BaseModel):
    name: Optional[str] = None
    contact_id: Optional[str] = None
    company: Optional[str] = None
    value: Optional[float] = None
    stage: Optional[str] = None
    close_date: Optional[str] = None
    notes: Optional[str] = None
    needs: Optional[List[str]] = None
    financial_services: Optional[List[str]] = None
    other_needs: Optional[str] = None
    notifications_enabled: Optional[bool] = None

# ─── Win Logic ───
# Updated Five Core Actions:
# 1. top_action - Top 10x Action Item
# 2. meditation - 7-Minute Future Self Meditation  
# 3. wormhole - Wormhole Relationship
# 4. distractions - Avoid Distractions
# 5. plan_tomorrow - Plan the Next Day Ahead of Time

# Win Logic:
# - If Top 10x Action Item is completed → Priority Win
# - If all five actions are completed → 10x Unicorn Win

def compute_status(entry: dict) -> str:
    five = entry.get('five_item_statuses', {})
    all_five = all([
        five.get('top_action', False),
        five.get('meditation', False),
        five.get('wormhole', False),
        five.get('distractions', False),
        five.get('plan_tomorrow', False)
    ])
    if all_five:
        return 'unicorn_win'
    if five.get('top_action', False) or entry.get('top_priority_completed', False):
        return 'priority_win'
    # Check if AI session was completed for this day
    if entry.get('ai_course_corrected', False):
        return 'course_corrected'
    any_action = any(five.values()) if five else False
    if any_action or entry.get('determination_level', 0) > 0:
        return 'loss'
    return 'ready'

def get_final_status(entry: dict) -> str:
    manual = entry.get('manual_override_status')
    if manual and manual in ['ready', 'priority_win', 'unicorn_win', 'loss', 'lesson', 'course_corrected']:
        return manual
    return entry.get('computed_status', 'ready')

# ─── Auth Routes ───

@api_router.post("/auth/register")
async def register(input_data: RegisterInput):
    existing = await db.users.find_one({"email": input_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": input_data.email.lower(),
        "password_hash": hash_password(input_data.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "onboarded": False
    }
    await db.users.insert_one(user)
    token = create_token(user_id)
    return {"token": token, "user_id": user_id, "onboarded": False}

@api_router.post("/auth/login")
async def login(input_data: LoginInput):
    user = await db.users.find_one({"email": input_data.email.lower()}, {"_id": 0})
    if not user or not verify_password(input_data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user['id'])
    return {"token": token, "user_id": user['id'], "onboarded": user.get('onboarded', False)}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user['id'],
        "email": user['email'],
        "onboarded": user.get('onboarded', False),
        "created_at": user.get('created_at')
    }

@api_router.post("/auth/change-password")
async def change_password(input_data: PasswordResetInput, user: dict = Depends(get_current_user)):
    if not verify_password(input_data.current_password, user['password_hash']):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    new_hash = hash_password(input_data.new_password)
    await db.users.update_one({"id": user['id']}, {"$set": {"password_hash": new_hash}})
    return {"message": "Password updated"}

@api_router.delete("/auth/account")
async def delete_account(user: dict = Depends(get_current_user)):
    uid = user['id']
    await db.users.delete_one({"id": uid})
    await db.profiles.delete_one({"user_id": uid})
    await db.daily_entries.delete_many({"user_id": uid})
    await db.wormhole_contacts.delete_many({"user_id": uid})
    await db.ai_sessions.delete_many({"user_id": uid})
    await db.compound_habits.delete_one({"user_id": uid})
    await db.goals.delete_many({"user_id": uid})
    return {"message": "Account deleted"}

# ─── Onboarding ───

@api_router.post("/onboarding")
async def complete_onboarding(input_data: OnboardingInput, user: dict = Depends(get_current_user)):
    uid = user['id']
    profile = {
        "user_id": uid,
        "display_name": input_data.display_name,
        "timezone_str": input_data.timezone_str,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.profiles.update_one({"user_id": uid}, {"$set": profile}, upsert=True)

    goal = {
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "title": input_data.goal_title,
        "description": input_data.goal_description or "",
        "start_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "end_date": input_data.goal_end_date,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.goals.insert_one(goal)

    habit = {
        "user_id": uid,
        "habit_title": input_data.compound_habit,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.compound_habits.update_one({"user_id": uid}, {"$set": habit}, upsert=True)

    await db.users.update_one({"id": uid}, {"$set": {"onboarded": True}})
    return {"message": "Onboarding complete", "onboarded": True}

# ─── Profile ───

@api_router.get("/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": user['id']}, {"_id": 0})
    goal = await db.goals.find_one({"user_id": user['id'], "active": True}, {"_id": 0})
    habit = await db.compound_habits.find_one({"user_id": user['id']}, {"_id": 0})
    return {
        "profile": profile,
        "goal": goal,
        "habit": habit
    }

@api_router.put("/profile")
async def update_profile(input_data: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in input_data.dict().items() if v is not None}
    if updates:
        await db.profiles.update_one({"user_id": user['id']}, {"$set": updates})
    profile = await db.profiles.find_one({"user_id": user['id']}, {"_id": 0})
    return profile

@api_router.put("/goal")
async def update_goal(input_data: GoalUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in input_data.dict().items() if v is not None}
    if updates:
        await db.goals.update_one(
            {"user_id": user['id'], "active": True},
            {"$set": updates}
        )
    goal = await db.goals.find_one({"user_id": user['id'], "active": True}, {"_id": 0})
    return goal

@api_router.put("/habit")
async def update_habit(input_data: HabitUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in input_data.dict().items() if v is not None}
    if updates:
        await db.compound_habits.update_one({"user_id": user['id']}, {"$set": updates})
    habit = await db.compound_habits.find_one({"user_id": user['id']}, {"_id": 0})
    return habit

# ─── Goal Progress Tracking ───

def calculate_goal_status(goal: dict) -> dict:
    """Calculate goal progress status: on_track, ahead, off_track, crushing_it, needs_support"""
    if not goal:
        return {"status": "no_goal", "progress_pct": 0, "ring_color": "gray"}
    
    target = goal.get('target_number', 0)
    deadline = goal.get('deadline') or goal.get('end_date')
    progress_history = goal.get('progress_history', [])
    
    if not target or target == 0 or not deadline:
        return {"status": "incomplete", "progress_pct": 0, "ring_color": "gray"}
    
    # Get current progress (latest entry)
    current_value = progress_history[-1]['value'] if progress_history else 0
    progress_pct = min(100, (current_value / target) * 100)
    
    # Parse deadline
    try:
        # Support MM/DD/YY or YYYY-MM-DD formats
        if '/' in deadline:
            from datetime import datetime
            deadline_date = datetime.strptime(deadline, "%m/%d/%y").date()
        else:
            deadline_date = datetime.fromisoformat(deadline.replace('Z', '+00:00')).date() if 'T' in deadline else datetime.strptime(deadline, "%Y-%m-%d").date()
    except Exception:
        return {"status": "incomplete", "progress_pct": progress_pct, "ring_color": "gray"}
    
    today = datetime.now(timezone.utc).date()
    total_days = (deadline_date - datetime.strptime(goal.get('start_date', today.isoformat()), "%Y-%m-%d").date()).days
    days_elapsed = (today - datetime.strptime(goal.get('start_date', today.isoformat()), "%Y-%m-%d").date()).days
    
    if total_days <= 0:
        total_days = 1
    
    expected_progress_pct = min(100, (days_elapsed / total_days) * 100)
    
    # Calculate streak
    streak = 0
    for entry in reversed(progress_history):
        if entry.get('value', 0) > 0:
            streak += 1
        else:
            break
    
    # Determine status and ring color
    # green = on track/crushing it, maroon-blue = showing up, orange = leaning off, red-white = needs support
    if progress_pct >= expected_progress_pct + 20:
        status = "crushing_it"
        ring_color = "green_fire"  # Green with fire effect for streaks
    elif progress_pct >= expected_progress_pct:
        status = "on_track"
        ring_color = "green"
    elif progress_pct >= expected_progress_pct - 10:
        status = "showing_up"
        ring_color = "maroon_blue"  # Maroon with blue hue
    elif progress_pct >= expected_progress_pct - 25:
        status = "leaning_off"
        ring_color = "orange"
    else:
        status = "needs_support"
        ring_color = "red_pulse"  # Red with white heartbeat
    
    return {
        "status": status,
        "progress_pct": round(progress_pct, 1),
        "expected_pct": round(expected_progress_pct, 1),
        "current_value": current_value,
        "target_number": target,
        "streak": streak,
        "ring_color": ring_color,
        "days_remaining": (deadline_date - today).days
    }

@api_router.post("/goals/progress")
async def update_goal_progress(input_data: GoalProgressInput, user: dict = Depends(get_current_user)):
    """Update daily goal progress and award points"""
    goal = await db.goals.find_one({"user_id": user['id'], "active": True})
    if not goal:
        raise HTTPException(status_code=404, detail="No active goal found")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Check if already updated today
    progress_history = goal.get('progress_history', [])
    already_updated_today = any(p.get('date') == today for p in progress_history)
    
    # Add progress entry
    progress_entry = {
        "date": today,
        "value": input_data.current_value,
        "notes": input_data.notes or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.goals.update_one(
        {"user_id": user['id'], "active": True},
        {"$push": {"progress_history": progress_entry}}
    )
    
    # Award points only if first update of the day
    points_awarded = 0
    if not already_updated_today:
        points_awarded = POINTS_CONFIG['daily_goal_update_points']
        
        # Check if on track for bonus
        updated_goal = await db.goals.find_one({"user_id": user['id'], "active": True}, {"_id": 0})
        status = calculate_goal_status(updated_goal)
        
        if status['status'] in ['on_track', 'crushing_it']:
            points_awarded += POINTS_CONFIG['on_track_bonus']
        
        if points_awarded > 0:
            await db.user_points.update_one(
                {"user_id": user['id']},
                {
                    "$inc": {"total_points": points_awarded, "weekly_points": points_awarded},
                    "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}
                },
                upsert=True
            )
    
    # Get updated goal
    updated_goal = await db.goals.find_one({"user_id": user['id'], "active": True}, {"_id": 0})
    status = calculate_goal_status(updated_goal)
    
    # If needs support, check if should prompt for help
    should_prompt_help = status['status'] == 'needs_support' and status['progress_pct'] < status['expected_pct'] - 30
    
    return {
        "goal": updated_goal,
        "status": status,
        "points_awarded": points_awarded,
        "already_updated_today": already_updated_today,
        "should_prompt_help": should_prompt_help
    }

@api_router.get("/goals/status")
async def get_goal_status(user: dict = Depends(get_current_user)):
    """Get current goal progress status"""
    goal = await db.goals.find_one({"user_id": user['id'], "active": True}, {"_id": 0})
    goal_status = calculate_goal_status(goal)
    return {"goal": goal, "status": goal_status}

@api_router.get("/goals/user/{user_id}/status")
async def get_user_goal_status(user_id: str):
    """Get a user's goal status (for community ring display)"""
    goal = await db.goals.find_one({"user_id": user_id, "active": True}, {"_id": 0})
    user_goal_status = calculate_goal_status(goal)
    profile = await db.profiles.find_one({"user_id": user_id}, {"_id": 0})
    
    # Check if user has disabled status ring
    member_profile = await db.member_profiles.find_one({"user_id": user_id}, {"_id": 0})
    show_status_ring = member_profile.get('show_status_ring', True) if member_profile else True
    
    return {
        "user_id": user_id,
        "display_name": profile.get('display_name', '') if profile else '',
        "status": user_goal_status if show_status_ring else None,
        "show_status_ring": show_status_ring
    }

# ─── Daily Entries ───

def empty_entry(user_id: str, date: str) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "date": date,
        "determination_level": 5,
        "intention": "",
        "ten_x_focus": "",
        "top_10x_action_text": "",
        "top_priority_completed": False,
        "five_item_statuses": {
            "top_action": False,
            "meditation": False,
            "wormhole": False,
            "distractions": False,
            "plan_tomorrow": False
        },
        "wormhole_contact_id": None,
        "wormhole_action_text": "",
        "wormhole_action_type": None,
        "wormhole_impact_rating": None,
        "distraction_notes": "",
        "immediate_course_correction": False,
        "meditation_reflection": "",
        "compound_done": False,
        "compound_notes": "",
        "computed_status": "ready",
        "manual_override_status": None,
        "final_status": "ready",
        "ai_course_corrected": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/daily-entry/{date}")
async def get_daily_entry(date: str, user: dict = Depends(get_current_user)):
    entry = await db.daily_entries.find_one(
        {"user_id": user['id'], "date": date}, {"_id": 0}
    )
    if not entry:
        entry = empty_entry(user['id'], date)
        await db.daily_entries.insert_one(entry)
        entry = await db.daily_entries.find_one(
            {"user_id": user['id'], "date": date}, {"_id": 0}
        )
    return entry

@api_router.put("/daily-entry/{date}")
async def update_daily_entry(date: str, input_data: DailyEntryUpdate, user: dict = Depends(get_current_user)):
    existing = await db.daily_entries.find_one({"user_id": user['id'], "date": date})
    if not existing:
        entry = empty_entry(user['id'], date)
        await db.daily_entries.insert_one(entry)

    updates = {}
    for k, v in input_data.dict().items():
        if v is not None:
            updates[k] = v

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Sync top_action with top_priority_completed
    if 'five_item_statuses' in updates:
        five = updates['five_item_statuses']
        if 'top_action' in five:
            updates['top_priority_completed'] = five['top_action']
    if 'top_priority_completed' in updates:
        if 'five_item_statuses' not in updates:
            updates['five_item_statuses'] = {}
        updates.setdefault('five_item_statuses', {})['top_action'] = updates['top_priority_completed']

    await db.daily_entries.update_one(
        {"user_id": user['id'], "date": date},
        {"$set": updates}
    )

    entry = await db.daily_entries.find_one(
        {"user_id": user['id'], "date": date}, {"_id": 0}
    )

    computed = compute_status(entry)
    final = get_final_status({**entry, "computed_status": computed})

    await db.daily_entries.update_one(
        {"user_id": user['id'], "date": date},
        {"$set": {"computed_status": computed, "final_status": final}}
    )

    entry['computed_status'] = computed
    entry['final_status'] = final
    return entry

@api_router.get("/daily-entries")
async def list_daily_entries(
    limit: int = 30,
    offset: int = 0,
    user: dict = Depends(get_current_user)
):
    entries = await db.daily_entries.find(
        {"user_id": user['id']}, {"_id": 0}
    ).sort("date", -1).skip(offset).limit(limit).to_list(limit)
    return entries

@api_router.post("/daily-entry/move")
async def move_entry(input_data: MoveEntryInput, user: dict = Depends(get_current_user)):
    source = await db.daily_entries.find_one(
        {"user_id": user['id'], "date": input_data.from_date}, {"_id": 0}
    )
    if not source:
        raise HTTPException(status_code=404, detail="Source entry not found")

    target = await db.daily_entries.find_one(
        {"user_id": user['id'], "date": input_data.to_date}
    )
    if target:
        raise HTTPException(status_code=400, detail="Target date already has an entry. Merge not supported yet.")

    await db.daily_entries.update_one(
        {"user_id": user['id'], "date": input_data.from_date},
        {"$set": {"date": input_data.to_date, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    entry = await db.daily_entries.find_one(
        {"user_id": user['id'], "date": input_data.to_date}, {"_id": 0}
    )
    return entry

# ─── Wormhole Contacts ───

@api_router.post("/wormhole-contacts")
async def create_contact(input_data: WormholeContactInput, user: dict = Depends(get_current_user)):
    contact = {
        "id": str(uuid.uuid4()),
        "user_id": user['id'],
        # Identity
        "name": input_data.name,
        "company": input_data.company or "",
        "title": input_data.title or "",
        "location": input_data.location or "",
        # Contact Label (classification)
        "label": input_data.label or "prospect",  # prospect, referral_partner, strategic_partner, client, wormhole, resource
        # Contact Info
        "website": input_data.website or "",
        "email": input_data.email or "",
        "phone": input_data.phone or "",
        # Social Media
        "linkedin": input_data.linkedin or "",
        "twitter": input_data.twitter or "",
        "instagram": input_data.instagram or "",
        "youtube": input_data.youtube or "",
        "tiktok": input_data.tiktok or "",
        "other_social": input_data.other_social or "",
        # Leverage Potential
        "leverage_categories": input_data.leverage_categories or [],
        "leverage_description": input_data.leverage_description or "",
        # Best Contact Method
        "best_contact_method": input_data.best_contact_method or "",
        # Relationship Intelligence
        "connection_level": input_data.connection_level or "warm",
        "tags": input_data.tags or [],
        "engagement_strength": input_data.engagement_strength or 5,
        "engagement_score": 0,
        # Next Steps & Notes
        "activation_next_step": input_data.activation_next_step or "",
        "notes": input_data.notes or "",
        # Metadata
        "last_contact_date": None,
        "interaction_history": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.wormhole_contacts.insert_one(contact)
    return {k: v for k, v in contact.items() if k != '_id'}

@api_router.get("/wormhole-contacts")
async def list_contacts(label: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"user_id": user['id']}
    if label:
        query["label"] = label
    contacts = await db.wormhole_contacts.find(
        query, {"_id": 0}
    ).sort("name", 1).to_list(500)
    return contacts

@api_router.get("/wormhole-contacts/labels")
async def get_contact_labels():
    """Get available contact labels"""
    return CONTACT_LABELS

@api_router.get("/wormhole-contacts/options")
async def get_contact_options():
    """Get all available options for contact fields"""
    return {
        "labels": CONTACT_LABELS,
        "connection_levels": CONNECTION_LEVELS,
        "tags": CONTACT_TAGS,
        "platforms": PLATFORM_OPTIONS,
        "engagement_types": ENGAGEMENT_TYPES,
        "leverage_categories": LEVERAGE_CATEGORIES
    }

# ─── Wormhole Logs ───

@api_router.post("/wormhole-contacts/{contact_id}/logs")
async def add_wormhole_log(contact_id: str, input_data: WormholeLogInput, user: dict = Depends(get_current_user)):
    """Add a log entry to a wormhole contact"""
    contact = await db.wormhole_contacts.find_one(
        {"id": contact_id, "user_id": user['id']}
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    log_entry = {
        "id": str(uuid.uuid4()),
        "contact_id": contact_id,
        "user_id": user['id'],
        "action_type": input_data.action_type,
        "notes": input_data.notes,
        "date": input_data.date or datetime.now(timezone.utc).strftime("%m/%d/%y"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.wormhole_logs.insert_one(log_entry)
    
    # Update last_contact_date on the contact
    await db.wormhole_contacts.update_one(
        {"id": contact_id, "user_id": user['id']},
        {"$set": {"last_contact_date": log_entry['date']}}
    )
    
    # Update engagement score
    await db.wormhole_contacts.update_one(
        {"id": contact_id, "user_id": user['id']},
        {"$inc": {"engagement_score": 1}}
    )
    
    return {k: v for k, v in log_entry.items() if k != '_id'}

@api_router.get("/wormhole-contacts/{contact_id}/logs")
async def get_wormhole_logs(contact_id: str, user: dict = Depends(get_current_user)):
    """Get all logs for a wormhole contact"""
    contact = await db.wormhole_contacts.find_one(
        {"id": contact_id, "user_id": user['id']}
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    logs = await db.wormhole_logs.find(
        {"contact_id": contact_id, "user_id": user['id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    
    # Get days where this contact was selected in daily checklist
    daily_selections = await db.daily_entries.find(
        {"user_id": user['id'], "wormhole_contact_id": contact_id},
        {"_id": 0, "date": 1, "wormhole_notes": 1}
    ).to_list(100)
    
    return {
        "logs": logs,
        "daily_selections": daily_selections,
        "total_logs": len(logs),
        "total_selections": len(daily_selections)
    }

@api_router.get("/wormhole-contacts/{contact_id}/timeline")
async def get_wormhole_timeline(contact_id: str, user: dict = Depends(get_current_user)):
    """Get complete timeline for a wormhole contact (logs + daily selections combined)"""
    contact = await db.wormhole_contacts.find_one(
        {"id": contact_id, "user_id": user['id']}
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    logs = await db.wormhole_logs.find(
        {"contact_id": contact_id, "user_id": user['id']},
        {"_id": 0}
    ).to_list(200)
    
    daily_selections = await db.daily_entries.find(
        {"user_id": user['id'], "wormhole_contact_id": contact_id},
        {"_id": 0, "date": 1, "wormhole_notes": 1}
    ).to_list(100)
    
    # Combine into timeline
    timeline = []
    for log in logs:
        timeline.append({
            "type": "log",
            "date": log.get('date'),
            "created_at": log.get('created_at'),
            "action_type": log.get('action_type'),
            "notes": log.get('notes'),
            "id": log.get('id')
        })
    
    for selection in daily_selections:
        timeline.append({
            "type": "daily_selection",
            "date": selection.get('date'),
            "created_at": selection.get('date'),
            "notes": selection.get('wormhole_notes', '')
        })
    
    # Sort by date descending
    timeline.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    
    return {
        "contact": {k: v for k, v in contact.items() if k != '_id'},
        "timeline": timeline
    }

@api_router.get("/wormhole-contacts/{contact_id}")
async def get_contact(contact_id: str, user: dict = Depends(get_current_user)):
    contact = await db.wormhole_contacts.find_one(
        {"id": contact_id, "user_id": user['id']}, {"_id": 0}
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact

@api_router.put("/wormhole-contacts/{contact_id}")
async def update_contact(contact_id: str, input_data: WormholeContactUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in input_data.dict().items() if v is not None}
    if updates:
        await db.wormhole_contacts.update_one(
            {"id": contact_id, "user_id": user['id']},
            {"$set": updates}
        )
    contact = await db.wormhole_contacts.find_one(
        {"id": contact_id, "user_id": user['id']}, {"_id": 0}
    )
    return contact

@api_router.delete("/wormhole-contacts/{contact_id}")
async def delete_contact(contact_id: str, user: dict = Depends(get_current_user)):
    result = await db.wormhole_contacts.delete_one(
        {"id": contact_id, "user_id": user['id']}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted"}

@api_router.post("/wormhole-contacts/interaction")
async def log_interaction(input_data: InteractionInput, user: dict = Depends(get_current_user)):
    contact = await db.wormhole_contacts.find_one(
        {"id": input_data.contact_id, "user_id": user['id']}
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    interaction = {
        "id": str(uuid.uuid4()),
        "action_type": input_data.action_type,
        "action_text": input_data.action_text,
        "impact_rating": input_data.impact_rating,
        "date": input_data.date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    # Calculate new engagement score based on interactions and impact
    current_history = contact.get('interaction_history', [])
    new_score = len(current_history) + 1
    if input_data.impact_rating:
        new_score += input_data.impact_rating // 2  # Bonus for high-impact interactions

    await db.wormhole_contacts.update_one(
        {"id": input_data.contact_id, "user_id": user['id']},
        {
            "$push": {"interaction_history": interaction},
            "$set": {
                "last_contact_date": interaction['date'],
                "engagement_score": new_score
            }
        }
    )
    updated = await db.wormhole_contacts.find_one(
        {"id": input_data.contact_id, "user_id": user['id']}, {"_id": 0}
    )
    return updated

@api_router.post("/wormhole-contacts/import-bulk")
async def import_contacts_bulk(contacts: List[WormholeContactInput], user: dict = Depends(get_current_user)):
    created = []
    for c in contacts:
        contact = {
            "id": str(uuid.uuid4()),
            "user_id": user['id'],
            "name": c.name,
            "company": c.company or "",
            "title": c.title or "",
            "location": c.location or "",
            "website": c.website or "",
            "email": c.email or "",
            "phone": c.phone or "",
            "linkedin": c.linkedin or "",
            "twitter": c.twitter or "",
            "instagram": c.instagram or "",
            "youtube": c.youtube or "",
            "tiktok": c.tiktok or "",
            "other_social": c.other_social or "",
            "leverage_categories": c.leverage_categories or [],
            "leverage_description": c.leverage_description or "",
            "best_contact_method": c.best_contact_method or "",
            "connection_level": c.connection_level or "warm",
            "tags": c.tags or [],
            "engagement_strength": c.engagement_strength or 5,
            "engagement_score": 0,
            "activation_next_step": c.activation_next_step or "",
            "notes": c.notes or "",
            "last_contact_date": None,
            "interaction_history": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.wormhole_contacts.insert_one(contact)
        created.append({k: v for k, v in contact.items() if k != '_id'})
    return {"imported": len(created), "contacts": created}

# ─── AI Course Correction ───

ai_sessions_cache: Dict[str, LlmChat] = {}

def get_ai_system_prompt(entry: dict, profile: dict, goal: dict, habit: dict) -> str:
    return f"""You are the 10x Unicorn AI Course Correction Coach. Your role is to help the user course-correct their day when they haven't completed their top priority.

CONTEXT ABOUT THE USER:
- Name: {profile.get('display_name', 'User')}
- 10x Goal: {goal.get('title', 'Not set')} - {goal.get('description', '')}
- Daily Compound Habit: {habit.get('habit_title', 'Not set')}

TODAY'S ENTRY:
- Determination Level: {entry.get('determination_level', 'Not set')}/10
- Intention: {entry.get('intention', 'Not set')}
- 10x Focus: {entry.get('ten_x_focus', 'Not set')}
- Top Action: {entry.get('top_10x_action_text', 'Not set')}
- Top Priority Completed: {entry.get('top_priority_completed', False)}
- Core Actions Status: {entry.get('five_item_statuses', {})}
- Distraction Notes: {entry.get('distraction_notes', 'None')}
- Course Corrected Immediately: {entry.get('immediate_course_correction', False)}
- Compound Habit Done: {entry.get('compound_done', False)}

YOUR COACHING PROTOCOL:
1. Start by re-anchoring their goal and identity (who they said they're being today).
2. Ask what specifically blocked their execution today.
3. Identify the root blocker from their response.
4. Ask EXACTLY: "What do you feel is the biggest, boldest action you could still do today to create a course-corrected win?"
5. Generate a structured execution plan:
   - Clear action
   - First 2-minute step
   - Timebox (≤45 min default)
   - Definition of done
   - One obstacle + mitigation
6. Ask for their start time.
7. Get their commitment statement.

RULES:
- Never give generic advice. Reference their ACTUAL inputs.
- Be direct, bold, and encouraging.
- Keep responses concise but powerful.
- Use their name.
- Reference their 10x goal to maintain context."""

@api_router.post("/ai-session/start")
async def start_ai_session(input_data: AIChatMessage, user: dict = Depends(get_current_user)):
    uid = user['id']
    date = input_data.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    entry = await db.daily_entries.find_one({"user_id": uid, "date": date}, {"_id": 0})
    if not entry:
        entry = empty_entry(uid, date)

    profile = await db.profiles.find_one({"user_id": uid}, {"_id": 0}) or {}
    goal = await db.goals.find_one({"user_id": uid, "active": True}, {"_id": 0}) or {}
    habit = await db.compound_habits.find_one({"user_id": uid}, {"_id": 0}) or {}

    session_id = str(uuid.uuid4())
    system_prompt = get_ai_system_prompt(entry, profile, goal, habit)

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_prompt
    )
    chat.with_model("openai", "gpt-5.2")

    ai_sessions_cache[session_id] = chat

    user_msg = UserMessage(text=input_data.message)
    try:
        response = await chat.send_message(user_msg)
    except Exception as e:
        logger.error(f"AI error in start: {e}")
        response = "I'm having trouble connecting right now. Please check your Emergent LLM key balance at Profile > Universal Key > Add Balance."

    session_doc = {
        "id": session_id,
        "user_id": uid,
        "date_reference": date,
        "conversation_log": [
            {"role": "user", "text": input_data.message, "timestamp": datetime.now(timezone.utc).isoformat()},
            {"role": "assistant", "text": response, "timestamp": datetime.now(timezone.utc).isoformat()}
        ],
        "generated_plan": None,
        "user_commitment": None,
        "marked_complete": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.ai_sessions.insert_one(session_doc)

    return {"session_id": session_id, "response": response}

@api_router.post("/ai-session/{session_id}/message")
async def ai_session_message(session_id: str, input_data: AIChatMessage, user: dict = Depends(get_current_user)):
    session = await db.ai_sessions.find_one({"id": session_id, "user_id": user['id']})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    chat = ai_sessions_cache.get(session_id)
    if not chat:
        # Rebuild chat from history
        entry = await db.daily_entries.find_one(
            {"user_id": user['id'], "date": session['date_reference']}, {"_id": 0}
        ) or empty_entry(user['id'], session['date_reference'])
        profile = await db.profiles.find_one({"user_id": user['id']}, {"_id": 0}) or {}
        goal = await db.goals.find_one({"user_id": user['id'], "active": True}, {"_id": 0}) or {}
        habit = await db.compound_habits.find_one({"user_id": user['id']}, {"_id": 0}) or {}

        system_prompt = get_ai_system_prompt(entry, profile, goal, habit)
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_prompt
        )
        chat.with_model("openai", "gpt-5.2")

        # Replay conversation
        for msg in session.get('conversation_log', []):
            if msg['role'] == 'user':
                await chat.send_message(UserMessage(text=msg['text']))

        ai_sessions_cache[session_id] = chat

    user_msg = UserMessage(text=input_data.message)
    try:
        response = await chat.send_message(user_msg)
    except Exception as e:
        logger.error(f"AI error in message: {e}")
        response = "I'm having trouble connecting right now. Please check your Emergent LLM key balance."

    await db.ai_sessions.update_one(
        {"id": session_id},
        {"$push": {"conversation_log": {
            "$each": [
                {"role": "user", "text": input_data.message, "timestamp": datetime.now(timezone.utc).isoformat()},
                {"role": "assistant", "text": response, "timestamp": datetime.now(timezone.utc).isoformat()}
            ]
        }}}
    )

    return {"response": response}

@api_router.post("/ai-session/{session_id}/complete")
async def complete_ai_session(session_id: str, user: dict = Depends(get_current_user)):
    session = await db.ai_sessions.find_one({"id": session_id, "user_id": user['id']})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await db.ai_sessions.update_one(
        {"id": session_id},
        {"$set": {"marked_complete": True}}
    )

    await db.daily_entries.update_one(
        {"user_id": user['id'], "date": session['date_reference']},
        {"$set": {
            "ai_course_corrected": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    entry = await db.daily_entries.find_one(
        {"user_id": user['id'], "date": session['date_reference']}, {"_id": 0}
    )
    if entry:
        computed = compute_status(entry)
        final = get_final_status({**entry, "computed_status": computed})
        await db.daily_entries.update_one(
            {"user_id": user['id'], "date": session['date_reference']},
            {"$set": {"computed_status": computed, "final_status": final}}
        )

    return {"message": "Session completed, day marked as course corrected"}

@api_router.get("/ai-session/by-date/{date}")
async def get_ai_sessions_by_date(date: str, user: dict = Depends(get_current_user)):
    sessions = await db.ai_sessions.find(
        {"user_id": user['id'], "date_reference": date},
        {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    return sessions

# ─── Dashboard / Analytics ───

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    uid = user['id']

    goal = await db.goals.find_one({"user_id": uid, "active": True}, {"_id": 0})
    habit = await db.compound_habits.find_one({"user_id": uid}, {"_id": 0})

    entries = await db.daily_entries.find(
        {"user_id": uid}, {"_id": 0}
    ).sort("date", -1).to_list(365)

    total = len(entries)
    unicorn_wins = sum(1 for e in entries if e.get('final_status') == 'unicorn_win')
    priority_wins = sum(1 for e in entries if e.get('final_status') == 'priority_win')
    course_corrected = sum(1 for e in entries if e.get('final_status') == 'course_corrected')
    losses = sum(1 for e in entries if e.get('final_status') == 'loss')

    # Compound streak
    compound_streak = 0
    for e in entries:
        if e.get('compound_done', False):
            compound_streak += 1
        else:
            break

    # Win streak (priority_win or unicorn_win or course_corrected)
    win_streak = 0
    for e in entries:
        if e.get('final_status') in ['unicorn_win', 'priority_win', 'course_corrected']:
            win_streak += 1
        else:
            break

    # Longest win streak
    longest_streak = 0
    current = 0
    for e in sorted(entries, key=lambda x: x.get('date', '')):
        if e.get('final_status') in ['unicorn_win', 'priority_win', 'course_corrected']:
            current += 1
            longest_streak = max(longest_streak, current)
        else:
            current = 0

    # 7/30/90 day compound %
    def compound_pct(days):
        recent = entries[:days] if len(entries) >= days else entries
        if not recent:
            return 0
        done = sum(1 for e in recent if e.get('compound_done', False))
        return round((done / len(recent)) * 100)

    # Determination trend (last 7 days)
    determination_trend = [
        {"date": e.get('date'), "value": e.get('determination_level', 0)}
        for e in entries[:7]
    ][::-1]

    # Win rate trend (last 30 days)
    win_rate_trend = []
    for e in entries[:30]:
        is_win = e.get('final_status') in ['unicorn_win', 'priority_win', 'course_corrected']
        win_rate_trend.append({"date": e.get('date'), "win": is_win})
    win_rate_trend.reverse()

    # Five item completion rates (updated keys)
    five_stats = {"top_action": 0, "meditation": 0, "wormhole": 0, "distractions": 0, "plan_tomorrow": 0}
    for e in entries:
        five = e.get('five_item_statuses', {})
        for k in five_stats:
            if five.get(k, False):
                five_stats[k] += 1
    if total > 0:
        five_rates = {k: round((v / total) * 100) for k, v in five_stats.items()}
    else:
        five_rates = five_stats

    # Wormhole metrics
    contacts = await db.wormhole_contacts.find(
        {"user_id": uid}, {"_id": 0}
    ).to_list(500)
    most_activated = sorted(contacts, key=lambda c: c.get('engagement_score', 0), reverse=True)[:5]

    return {
        "goal": goal,
        "habit": habit,
        "total_entries": total,
        "unicorn_wins": unicorn_wins,
        "priority_wins": priority_wins,
        "course_corrected": course_corrected,
        "losses": losses,
        "compound_streak": compound_streak,
        "compound_7d": compound_pct(7),
        "compound_30d": compound_pct(30),
        "compound_90d": compound_pct(90),
        "win_streak": win_streak,
        "longest_win_streak": longest_streak,
        "win_rate": round(((unicorn_wins + priority_wins + course_corrected) / total * 100) if total > 0 else 0),
        "unicorn_rate": round((unicorn_wins / total * 100) if total > 0 else 0),
        "determination_trend": determination_trend,
        "win_rate_trend": win_rate_trend,
        "five_completion_rates": five_rates,
        "most_activated_contacts": [
            {"name": c.get('name'), "score": c.get('engagement_score', 0)}
            for c in most_activated
        ],
        "total_contacts": len(contacts)
    }

@api_router.get("/compound-streak")
async def get_compound_streak(user: dict = Depends(get_current_user)):
    entries = await db.daily_entries.find(
        {"user_id": user['id']}, {"_id": 0}
    ).sort("date", -1).to_list(365)

    streak = 0
    for e in entries:
        if e.get('compound_done', False):
            streak += 1
        else:
            break

    habit = await db.compound_habits.find_one({"user_id": user['id']}, {"_id": 0})
    return {
        "streak": streak,
        "habit": habit
    }

# ─── Signals & Points System ───

@api_router.post("/signals")
async def create_signal(input_data: SignalInput, user: dict = Depends(get_current_user)):
    """Create a new signal (measurable action) tied to the user's 10x goal"""
    goal = await db.goals.find_one({"user_id": user['id'], "active": True}, {"_id": 0})
    
    # For top 10x action, check if one already exists for today
    today_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d")  # ISO format
    today_mmddyy = datetime.now(timezone.utc).strftime("%m/%d/%y")  # MM/DD/YY format
    if input_data.is_top_10x_action:
        # Check both date formats for existing top 10x action
        existing_top = await db.signals.find_one({
            "user_id": user['id'],
            "is_top_10x_action": True,
            "$or": [
                {"due_date": today_mmddyy},
                {"due_date": today_iso},
                {"due_date": {"$regex": f"^{today_iso}"}}  # Also check ISO datetime strings
            ]
        })
        if existing_top:
            raise HTTPException(status_code=400, detail="You already have a Top 10x Action for today")
    
    signal = {
        "id": str(uuid.uuid4()),
        "user_id": user['id'],
        "goal_id": goal['id'] if goal else None,
        "name": input_data.name,
        "description": input_data.description or "",
        "impact_rating": 10 if input_data.is_top_10x_action else input_data.impact_rating,  # Top 10x = 10 pts
        "due_date": input_data.due_date,  # MM/DD/YY format
        "deal_id": input_data.deal_id,  # Associated deal
        "is_public": input_data.is_public,
        "is_top_10x_action": input_data.is_top_10x_action,  # Mark as top 10x action
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.signals.insert_one(signal)
    
    # If linked to a deal, add signal to deal's signals array
    if input_data.deal_id:
        await db.deals.update_one(
            {"id": input_data.deal_id, "user_id": user['id']},
            {"$addToSet": {"signals": signal['id']}}
        )
    
    return {k: v for k, v in signal.items() if k != '_id'}

@api_router.get("/signals")
async def list_signals(user: dict = Depends(get_current_user)):
    """Get all signals for the current user"""
    signals = await db.signals.find(
        {"user_id": user['id']}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return signals

@api_router.get("/signals/{signal_id}")
async def get_signal(signal_id: str, user: dict = Depends(get_current_user)):
    signal = await db.signals.find_one(
        {"id": signal_id, "user_id": user['id']}, {"_id": 0}
    )
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    return signal

@api_router.put("/signals/{signal_id}")
async def update_signal(signal_id: str, input_data: SignalUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in input_data.dict().items() if v is not None}
    if updates:
        await db.signals.update_one(
            {"id": signal_id, "user_id": user['id']},
            {"$set": updates}
        )
    signal = await db.signals.find_one(
        {"id": signal_id, "user_id": user['id']}, {"_id": 0}
    )
    return signal

@api_router.delete("/signals/{signal_id}")
async def delete_signal(signal_id: str, user: dict = Depends(get_current_user)):
    result = await db.signals.delete_one({"id": signal_id, "user_id": user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Signal not found")
    return {"message": "Signal deleted"}

@api_router.post("/signals/{signal_id}/complete")
async def complete_signal(signal_id: str, input_data: SignalCompletionInput, user: dict = Depends(get_current_user)):
    """Complete a signal and award points with bonuses"""
    signal = await db.signals.find_one({"id": signal_id, "user_id": user['id']})
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    current_hour = now.hour
    
    # Calculate base points from impact_rating (1-10 = 1-10 points)
    impact_rating = signal.get('impact_rating') or 5
    base_points = impact_rating
    
    bonus_points = 0
    bonuses = []
    
    # Auto-calculate planned_yesterday based on due_date
    # If due_date >= 1 day after created_at, it was planned ahead
    planned_yesterday = False
    due_date = signal.get('due_date')
    created_at = signal.get('created_at', '')
    
    if due_date and created_at:
        try:
            due = datetime.fromisoformat(due_date.replace('Z', '+00:00')) if 'T' in due_date else datetime.strptime(due_date, '%Y-%m-%d').replace(tzinfo=timezone.utc)
            created = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            # If due date is at least 1 day after creation, it was planned ahead
            if (due.date() - created.date()).days >= 1:
                planned_yesterday = True
        except Exception:
            pass
    
    if planned_yesterday:
        bonus_points += POINTS_CONFIG['planned_ahead_bonus']
        bonuses.append({"type": "planned_ahead", "points": POINTS_CONFIG['planned_ahead_bonus']})
    
    # Before 6 PM bonus
    if current_hour < 18:
        bonus_points += POINTS_CONFIG['before_6pm_bonus']
        bonuses.append({"type": "before_6pm", "points": POINTS_CONFIG['before_6pm_bonus']})
    
    total_points = base_points + bonus_points
    
    # Create completion record
    completion = {
        "id": str(uuid.uuid4()),
        "user_id": user['id'],
        "signal_id": signal_id,
        "signal_name": signal.get('name'),
        "date": today,
        "due_date": due_date,
        "impact_rating": impact_rating,
        "base_points": base_points,
        "bonus_points": bonus_points,
        "total_points": total_points,
        "bonuses": bonuses,
        "notes": input_data.notes or "",
        "is_public": signal.get('is_public', True),
        "created_at": now.isoformat()
    }
    await db.signal_completions.insert_one(completion)
    
    # Update user's total points
    await db.user_points.update_one(
        {"user_id": user['id']},
        {
            "$inc": {"total_points": total_points, "weekly_points": total_points},
            "$setOnInsert": {"created_at": now.isoformat()}
        },
        upsert=True
    )
    
    # Check for all signals completed bonus
    user_signals = await db.signals.find({"user_id": user['id']}).to_list(100)
    if len(user_signals) >= 3:
        today_completions = await db.signal_completions.find({
            "user_id": user['id'],
            "date": today
        }).to_list(100)
        completed_signal_ids = {c['signal_id'] for c in today_completions}
        
        if all(s['id'] in completed_signal_ids for s in user_signals):
            # Award all signals bonus
            all_bonus = POINTS_CONFIG['all_signals_bonus']
            await db.user_points.update_one(
                {"user_id": user['id']},
                {"$inc": {"total_points": all_bonus, "weekly_points": all_bonus}}
            )
            completion['all_signals_bonus'] = all_bonus
            total_points += all_bonus
    
    return {
        "completion": {k: v for k, v in completion.items() if k != '_id'},
        "total_points_earned": total_points
    }

@api_router.post("/signals/{signal_id}/uncomplete")
async def uncomplete_signal(signal_id: str, user: dict = Depends(get_current_user)):
    """Uncomplete a signal - remove completion and deduct points"""
    signal = await db.signals.find_one({"id": signal_id, "user_id": user['id']})
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Find today's completion for this signal
    completion = await db.signal_completions.find_one({
        "signal_id": signal_id,
        "user_id": user['id'],
        "date": today
    })
    
    if not completion:
        raise HTTPException(status_code=400, detail="Signal not completed today")
    
    # Calculate total points to deduct
    points_to_deduct = completion.get('points_earned', 0)
    
    # Delete the completion
    await db.signal_completions.delete_one({"id": completion['id']})
    
    # Deduct points
    await db.user_points.update_one(
        {"user_id": user['id']},
        {"$inc": {"total_points": -points_to_deduct, "weekly_points": -points_to_deduct}}
    )
    
    return {
        "message": "Signal uncompleted",
        "points_deducted": points_to_deduct
    }

@api_router.get("/signal-completions")
async def list_signal_completions(
    date: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(get_current_user)
):
    """Get signal completions, optionally filtered by date"""
    query = {"user_id": user['id']}
    if date:
        query["date"] = date
    
    completions = await db.signal_completions.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return completions

@api_router.get("/points/summary")
async def get_points_summary(user: dict = Depends(get_current_user)):
    """Get user's points summary including streaks"""
    points = await db.user_points.find_one({"user_id": user['id']}, {"_id": 0})
    
    if not points:
        points = {"total_points": 0, "weekly_points": 0}
    
    # Calculate signal streak
    completions = await db.signal_completions.find(
        {"user_id": user['id']}, {"_id": 0}
    ).sort("date", -1).to_list(365)
    
    # Group by date
    dates_with_completions = set(c['date'] for c in completions)
    
    # Calculate streak
    signal_streak = 0
    check_date = datetime.now(timezone.utc).date()
    while True:
        date_str = check_date.strftime("%Y-%m-%d")
        if date_str in dates_with_completions:
            signal_streak += 1
            check_date -= timedelta(days=1)
        else:
            break
    
    # Get leaderboard rank
    all_points = await db.user_points.find({}, {"_id": 0}).sort("total_points", -1).to_list(1000)
    rank = 1
    for i, p in enumerate(all_points):
        if p.get('user_id') == user['id']:
            rank = i + 1
            break
    
    return {
        "total_points": points.get('total_points', 0),
        "weekly_points": points.get('weekly_points', 0),
        "signal_streak": signal_streak,
        "rank": rank,
        "total_users": len(all_points)
    }

@api_router.get("/points/leaderboard")
async def get_leaderboard(limit: int = 20):
    """Get community leaderboard"""
    # Get all user points sorted by total
    all_points = await db.user_points.find({}, {"_id": 0}).sort("total_points", -1).limit(limit).to_list(limit)
    
    leaderboard = []
    for i, p in enumerate(all_points):
        # Get user profile
        profile = await db.profiles.find_one({"user_id": p['user_id']}, {"_id": 0})
        goal = await db.goals.find_one({"user_id": p['user_id'], "active": True}, {"_id": 0})
        
        # Calculate signal streak for this user
        completions = await db.signal_completions.find(
            {"user_id": p['user_id']}, {"date": 1}
        ).sort("date", -1).to_list(365)
        dates_with_completions = set(c['date'] for c in completions)
        
        signal_streak = 0
        check_date = datetime.now(timezone.utc).date()
        while True:
            date_str = check_date.strftime("%Y-%m-%d")
            if date_str in dates_with_completions:
                signal_streak += 1
                check_date -= timedelta(days=1)
            else:
                break
        
        leaderboard.append({
            "rank": i + 1,
            "user_id": p['user_id'],
            "display_name": profile.get('display_name', 'Anonymous') if profile else 'Anonymous',
            "goal_title": goal.get('title', '') if goal else '',
            "total_points": p.get('total_points', 0),
            "weekly_points": p.get('weekly_points', 0),
            "signal_streak": signal_streak
        })
    
    return leaderboard

@api_router.get("/community/feed")
async def get_community_feed(limit: int = 50):
    """Get public signal completions and help requests feed"""
    # Get signal completions
    completions = await db.signal_completions.find(
        {"is_public": True}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Get help requests
    help_requests = await db.help_requests.find(
        {"is_public": True}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    feed = []
    
    # Add signal completions
    for c in completions:
        profile = await db.profiles.find_one({"user_id": c['user_id']}, {"_id": 0})
        goal = await db.goals.find_one({"user_id": c['user_id'], "active": True}, {"_id": 0})
        member_profile = await db.member_profiles.find_one({"user_id": c['user_id']}, {"_id": 0})
        
        # Get goal status for ring color
        goal_status = calculate_goal_status(goal)
        show_ring = member_profile.get('show_status_ring', True) if member_profile else True
        
        feed.append({
            "id": c['id'],
            "type": "signal_completion",
            "user_id": c['user_id'],
            "display_name": profile.get('display_name', 'Anonymous') if profile else 'Anonymous',
            "profile_photo_url": member_profile.get('profile_photo_url') if member_profile else None,
            "goal_title": goal.get('title', '') if goal else '',
            "signal_name": c.get('signal_name', ''),
            "total_points": c.get('total_points', 0),
            "notes": c.get('notes', ''),
            "ring_color": goal_status.get('ring_color') if show_ring else None,
            "goal_status": goal_status.get('status') if show_ring else None,
            "created_at": c.get('created_at')
        })
    
    # Add help requests
    for hr in help_requests:
        profile = await db.profiles.find_one({"user_id": hr['user_id']}, {"_id": 0})
        member_profile = await db.member_profiles.find_one({"user_id": hr['user_id']}, {"_id": 0})
        
        feed.append({
            "id": hr['id'],
            "type": "help_request",
            "user_id": hr['user_id'],
            "display_name": profile.get('display_name', 'Anonymous') if profile else 'Anonymous',
            "profile_photo_url": member_profile.get('profile_photo_url') if member_profile else None,
            "description": hr.get('description', ''),
            "ring_color": "red_pulse",  # Help requests always show red ring
            "created_at": hr.get('created_at')
        })
    
    # Sort combined feed by created_at
    feed.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    
    return feed[:limit]

@api_router.post("/community/help-request")
async def create_help_request(input_data: HelpRequestInput, user: dict = Depends(get_current_user)):
    """Create a help request when user is off-track and needs support"""
    profile = await db.profiles.find_one({"user_id": user['id']}, {"_id": 0})
    goal = await db.goals.find_one({"user_id": user['id'], "active": True}, {"_id": 0})
    
    help_request = {
        "id": str(uuid.uuid4()),
        "user_id": user['id'],
        "goal_id": input_data.goal_id or (goal['id'] if goal else None),
        "description": input_data.description,
        "is_public": True,
        "status": "open",  # open, resolved
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.help_requests.insert_one(help_request)
    
    # Find potential helpers based on services_offered matching user's needs
    member_profile = await db.member_profiles.find_one({"user_id": user['id']}, {"_id": 0})
    user_needs = member_profile.get('needs', []) if member_profile else []
    
    # Get members who offer relevant services
    potential_helpers = []
    if user_needs:
        all_members = await db.member_profiles.find({}, {"_id": 0}).to_list(500)
        for mp in all_members:
            if mp.get('user_id') == user['id']:
                continue
            services = mp.get('services_offered', [])
            if any(s in user_needs for s in services):
                potential_helpers.append(mp.get('user_id'))
    
    return {
        "help_request": {k: v for k, v in help_request.items() if k != '_id'},
        "potential_helpers_count": len(potential_helpers),
        "display_name": profile.get('display_name', 'Anonymous') if profile else 'Anonymous'
    }

@api_router.get("/community/help-requests")
async def get_help_requests():
    """Get all open help requests"""
    requests = await db.help_requests.find(
        {"status": "open"}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    enriched = []
    for hr in requests:
        profile = await db.profiles.find_one({"user_id": hr['user_id']}, {"_id": 0})
        goal = await db.goals.find_one({"id": hr.get('goal_id')}, {"_id": 0})
        
        enriched.append({
            **hr,
            "display_name": profile.get('display_name', 'Anonymous') if profile else 'Anonymous',
            "goal_title": goal.get('title', '') if goal else ''
        })
    
    return enriched

@api_router.post("/daily-entry/{date}/award-bonuses")
async def award_daily_bonuses(date: str, user: dict = Depends(get_current_user)):
    """Award bonus points for daily achievements (top action, wormhole, unicorn win)"""
    entry = await db.daily_entries.find_one(
        {"user_id": user['id'], "date": date}, {"_id": 0}
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    bonuses = []
    total_bonus = 0
    
    # Top 10x Action bonus
    if entry.get('top_priority_completed', False):
        bonus = POINTS_CONFIG['top_action_bonus']
        bonuses.append({"type": "top_action", "points": bonus})
        total_bonus += bonus
    
    # Wormhole action bonus
    five = entry.get('five_item_statuses', {})
    if five.get('wormhole', False):
        bonus = POINTS_CONFIG['wormhole_action_bonus']
        bonuses.append({"type": "wormhole_action", "points": bonus})
        total_bonus += bonus
        
        # Impact rating bonus
        impact = entry.get('wormhole_impact_rating')
        if impact:
            impact_bonus = int(impact * POINTS_CONFIG['wormhole_impact_multiplier'])
            bonuses.append({"type": "wormhole_impact", "points": impact_bonus})
            total_bonus += impact_bonus
    
    # Unicorn win bonus
    if entry.get('final_status') == 'unicorn_win':
        bonus = POINTS_CONFIG['unicorn_win_bonus']
        bonuses.append({"type": "unicorn_win", "points": bonus})
        total_bonus += bonus
    
    if total_bonus > 0:
        # Check if bonuses already awarded for this date
        existing = await db.daily_bonuses.find_one({
            "user_id": user['id'],
            "date": date
        })
        
        if not existing:
            await db.daily_bonuses.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user['id'],
                "date": date,
                "bonuses": bonuses,
                "total_points": total_bonus,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            await db.user_points.update_one(
                {"user_id": user['id']},
                {
                    "$inc": {"total_points": total_bonus, "weekly_points": total_bonus},
                    "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}
                },
                upsert=True
            )
    
    return {
        "bonuses": bonuses,
        "total_bonus": total_bonus,
        "already_awarded": existing is not None if total_bonus > 0 else False
    }

# ─── Member Profile & Directory ───

@api_router.get("/member/profile")
async def get_member_profile(user: dict = Depends(get_current_user)):
    """Get current user's full member profile"""
    profile = await db.profiles.find_one({"user_id": user['id']}, {"_id": 0})
    goal = await db.goals.find_one({"user_id": user['id'], "active": True}, {"_id": 0})
    member_profile = await db.member_profiles.find_one({"user_id": user['id']}, {"_id": 0})
    points = await db.user_points.find_one({"user_id": user['id']}, {"_id": 0})
    
    return {
        "user_id": user['id'],
        "display_name": profile.get('display_name', '') if profile else '',
        "company": profile.get('company', '') if profile else '',
        "title": profile.get('title', '') if profile else '',
        "location": profile.get('location', '') if profile else '',
        "timezone": profile.get('timezone_str', '') if profile else '',
        "goal_title": goal.get('title', '') if goal else '',
        "goal_description": goal.get('description', '') if goal else '',
        "total_points": points.get('total_points', 0) if points else 0,
        **(member_profile or {})
    }

@api_router.put("/member/profile")
async def update_member_profile(input_data: MemberProfileUpdate, user: dict = Depends(get_current_user)):
    """Update member's extended profile fields"""
    updates = {k: v for k, v in input_data.dict().items() if v is not None}
    
    if updates:
        updates['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.member_profiles.update_one(
            {"user_id": user['id']},
            {"$set": updates, "$setOnInsert": {"user_id": user['id'], "created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
    
    return await get_member_profile(user)

@api_router.get("/member/{user_id}")
async def get_member_by_id(user_id: str):
    """Get a specific member's public profile"""
    profile = await db.profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Member not found")
    
    goal = await db.goals.find_one({"user_id": user_id, "active": True}, {"_id": 0})
    member_profile = await db.member_profiles.find_one({"user_id": user_id}, {"_id": 0})
    points = await db.user_points.find_one({"user_id": user_id}, {"_id": 0})
    
    # Calculate signal streak
    completions = await db.signal_completions.find(
        {"user_id": user_id}, {"date": 1}
    ).sort("date", -1).to_list(365)
    dates_with_completions = set(c['date'] for c in completions)
    
    signal_streak = 0
    check_date = datetime.now(timezone.utc).date()
    while True:
        date_str = check_date.strftime("%Y-%m-%d")
        if date_str in dates_with_completions:
            signal_streak += 1
            check_date -= timedelta(days=1)
        else:
            break
    
    return {
        "user_id": user_id,
        "display_name": profile.get('display_name', ''),
        "company": profile.get('company', ''),
        "title": profile.get('title', ''),
        "location": profile.get('location', ''),
        "goal_title": goal.get('title', '') if goal else '',
        "goal_description": goal.get('description', '') if goal else '',
        "total_points": points.get('total_points', 0) if points else 0,
        "weekly_points": points.get('weekly_points', 0) if points else 0,
        "signal_streak": signal_streak,
        **(member_profile or {})
    }

@api_router.get("/community/members")
async def get_member_directory(
    industry: Optional[str] = None,
    location: Optional[str] = None,
    service: Optional[str] = None,
    need: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50
):
    """Get searchable member directory"""
    # Get all users with profiles
    profiles = await db.profiles.find({}, {"_id": 0}).to_list(1000)
    
    members = []
    for profile in profiles:
        user_id = profile.get('user_id')
        member_profile = await db.member_profiles.find_one({"user_id": user_id}, {"_id": 0})
        goal = await db.goals.find_one({"user_id": user_id, "active": True}, {"_id": 0})
        points = await db.user_points.find_one({"user_id": user_id}, {"_id": 0})
        
        mp = member_profile or {}
        
        # Apply filters
        if industry and industry not in (mp.get('industries') or []):
            continue
        if service and service not in (mp.get('services_offered') or []):
            continue
        if need and need not in (mp.get('needs') or []):
            continue
        if location:
            member_location = profile.get('location', '').lower()
            if location.lower() not in member_location:
                continue
        if search:
            search_lower = search.lower()
            searchable = f"{profile.get('display_name', '')} {profile.get('company', '')} {mp.get('bio', '')} {goal.get('title', '') if goal else ''}".lower()
            if search_lower not in searchable:
                continue
        
        members.append({
            "user_id": user_id,
            "display_name": profile.get('display_name', ''),
            "company": profile.get('company', ''),
            "title": profile.get('title', ''),
            "location": profile.get('location', ''),
            "goal_title": goal.get('title', '') if goal else '',
            "total_points": points.get('total_points', 0) if points else 0,
            "bio": mp.get('bio', ''),
            "industries": mp.get('industries', []),
            "services_offered": mp.get('services_offered', []),
            "needs": mp.get('needs', []),
        })
    
    # Sort by points
    members.sort(key=lambda x: x['total_points'], reverse=True)
    return members[:limit]

@api_router.get("/community/industries")
async def get_industries():
    """Get list of available industries"""
    return INDUSTRIES

@api_router.get("/community/services")
async def get_services():
    """Get list of available services"""
    return SERVICES_OFFERED

@api_router.get("/community/financial-services")
async def get_financial_services():
    """Get list of financial services options"""
    return FINANCIAL_SERVICES

# ─── Deals CRM ───

@api_router.post("/deals")
async def create_deal(input_data: DealInput, user: dict = Depends(get_current_user)):
    """Create a new deal"""
    deal = {
        "id": str(uuid.uuid4()),
        "user_id": user['id'],
        "name": input_data.name,
        "contact_id": input_data.contact_id,
        "company": input_data.company or "",
        "value": input_data.value,
        "stage": input_data.stage,
        "close_date": input_data.close_date,  # Expected close date (MM/DD/YY)
        "notes": input_data.notes or "",
        "needs": input_data.needs or [],
        "financial_services": input_data.financial_services or [],
        "other_needs": input_data.other_needs or "",
        "notifications_enabled": input_data.notifications_enabled,  # Enable/disable close date notifications
        "signals": [],  # Associated signal IDs
        "priority": calculate_deal_priority(input_data.value, input_data.stage, input_data.close_date),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.deals.insert_one(deal)
    return {k: v for k, v in deal.items() if k != '_id'}

def calculate_deal_priority(value: float, stage: str, close_date: str) -> str:
    """Calculate deal priority based on value, stage, and close date for smart notifications"""
    priority_score = 0
    
    # Value-based priority
    if value:
        if value >= 100000:
            priority_score += 50
        elif value >= 50000:
            priority_score += 35
        elif value >= 10000:
            priority_score += 20
        else:
            priority_score += 10
    
    # Stage-based priority
    stage_scores = {
        'negotiation': 40,
        'proposal': 30,
        'qualified': 20,
        'lead': 10,
        'closed_won': 0,
        'closed_lost': 0
    }
    priority_score += stage_scores.get(stage, 10)
    
    # Close date urgency
    if close_date:
        try:
            if '/' in close_date:
                close = datetime.strptime(close_date, "%m/%d/%y").date()
            else:
                close = datetime.strptime(close_date, "%Y-%m-%d").date()
            days_until = (close - datetime.now(timezone.utc).date()).days
            if days_until <= 3:
                priority_score += 30
            elif days_until <= 7:
                priority_score += 20
            elif days_until <= 14:
                priority_score += 10
        except Exception:
            pass
    
    if priority_score >= 80:
        return "critical"
    elif priority_score >= 50:
        return "high"
    elif priority_score >= 30:
        return "medium"
    return "low"

@api_router.get("/deals/notifications")
async def get_deal_notifications(user: dict = Depends(get_current_user)):
    """Get smart notifications for deals based on priority, stage, and close date"""
    deals = await db.deals.find(
        {"user_id": user['id'], "stage": {"$nin": ["closed_won", "closed_lost"]}},
        {"_id": 0}
    ).to_list(100)
    
    notifications = []
    today = datetime.now(timezone.utc).date()
    
    for deal in deals:
        if not deal.get('notifications_enabled', True):
            continue
        
        close_date = deal.get('close_date')
        if close_date:
            try:
                if '/' in close_date:
                    close = datetime.strptime(close_date, "%m/%d/%y").date()
                else:
                    close = datetime.strptime(close_date, "%Y-%m-%d").date()
                days_until = (close - today).days
                
                # Smart notification logic based on priority and timing
                priority = calculate_deal_priority(deal.get('value'), deal.get('stage'), close_date)
                
                notification = None
                if days_until < 0:
                    notification = {
                        "type": "overdue",
                        "message": f"Deal '{deal['name']}' is {abs(days_until)} days past close date!",
                        "urgency": "critical"
                    }
                elif days_until == 0:
                    notification = {
                        "type": "due_today",
                        "message": f"Deal '{deal['name']}' closes TODAY!",
                        "urgency": "critical"
                    }
                elif priority == "critical" and days_until <= 3:
                    notification = {
                        "type": "closing_soon",
                        "message": f"High-value deal '{deal['name']}' closes in {days_until} days",
                        "urgency": "high"
                    }
                elif priority in ["critical", "high"] and days_until <= 7:
                    notification = {
                        "type": "action_needed",
                        "message": f"Take action on '{deal['name']}' - closes in {days_until} days",
                        "urgency": "medium"
                    }
                elif days_until <= 14 and deal.get('stage') in ['proposal', 'negotiation']:
                    notification = {
                        "type": "follow_up",
                        "message": f"Follow up on '{deal['name']}' ({deal.get('stage')}) - {days_until} days left",
                        "urgency": "low"
                    }
                
                if notification:
                    notifications.append({
                        **notification,
                        "deal_id": deal['id'],
                        "deal_name": deal['name'],
                        "value": deal.get('value'),
                        "stage": deal.get('stage'),
                        "close_date": close_date,
                        "days_until_close": days_until,
                        "priority": priority
                    })
            except Exception:
                pass
    
    # Sort by urgency (critical first)
    urgency_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    notifications.sort(key=lambda x: urgency_order.get(x.get('urgency', 'low'), 4))
    
    return notifications

@api_router.get("/deals")
async def list_deals(stage: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Get all deals for current user, optionally filtered by stage"""
    query = {"user_id": user['id']}
    if stage:
        query["stage"] = stage
    
    deals = await db.deals.find(query, {"_id": 0}).sort("updated_at", -1).to_list(100)
    
    # Enrich with contact info
    enriched = []
    for deal in deals:
        contact = None
        if deal.get('contact_id'):
            contact = await db.wormhole_contacts.find_one(
                {"id": deal['contact_id'], "user_id": user['id']}, {"_id": 0, "name": 1, "company": 1}
            )
        enriched.append({
            **deal,
            "contact_name": contact.get('name') if contact else None
        })
    
    return enriched

@api_router.get("/deals/{deal_id}")
async def get_deal(deal_id: str, user: dict = Depends(get_current_user)):
    deal = await db.deals.find_one({"id": deal_id, "user_id": user['id']}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    # Enrich with contact info
    contact = None
    if deal.get('contact_id'):
        contact = await db.wormhole_contacts.find_one(
            {"id": deal['contact_id'], "user_id": user['id']}, {"_id": 0}
        )
    
    return {**deal, "contact": contact}

@api_router.put("/deals/{deal_id}")
async def update_deal(deal_id: str, input_data: DealUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in input_data.dict().items() if v is not None}
    if updates:
        updates['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.deals.update_one(
            {"id": deal_id, "user_id": user['id']},
            {"$set": updates}
        )
    
    deal = await db.deals.find_one({"id": deal_id, "user_id": user['id']}, {"_id": 0})
    return deal

@api_router.delete("/deals/{deal_id}")
async def delete_deal(deal_id: str, user: dict = Depends(get_current_user)):
    result = await db.deals.delete_one({"id": deal_id, "user_id": user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Deal not found")
    return {"message": "Deal deleted"}

@api_router.post("/deals/{deal_id}/link-signal/{signal_id}")
async def link_signal_to_deal(deal_id: str, signal_id: str, user: dict = Depends(get_current_user)):
    """Link a signal to a deal"""
    deal = await db.deals.find_one({"id": deal_id, "user_id": user['id']})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    signal = await db.signals.find_one({"id": signal_id, "user_id": user['id']})
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    
    signals = deal.get('signals', [])
    if signal_id not in signals:
        signals.append(signal_id)
        await db.deals.update_one(
            {"id": deal_id, "user_id": user['id']},
            {"$set": {"signals": signals, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return await get_deal(deal_id, user)

@api_router.get("/deals/stages/list")
async def get_deal_stages():
    """Get list of deal stages"""
    return DEAL_STAGES

@api_router.get("/deals/needs/list")
async def get_deal_needs():
    """Get list of deal needs categories"""
    return DEAL_NEEDS

# ─── Service Matching ───

@api_router.get("/matching/providers")
async def find_service_providers(
    service: Optional[str] = None,
    industry: Optional[str] = None,
    need: Optional[str] = None,
    limit: int = 20,
    user: dict = Depends(get_current_user)
):
    """Find community members who offer services matching your needs"""
    # Get all member profiles
    profiles = await db.profiles.find({}, {"_id": 0}).to_list(1000)
    
    matches = []
    for profile in profiles:
        user_id = profile.get('user_id')
        if user_id == user['id']:  # Skip self
            continue
        
        member_profile = await db.member_profiles.find_one({"user_id": user_id}, {"_id": 0})
        if not member_profile:
            continue
        
        mp = member_profile
        services = mp.get('services_offered') or []
        industries = mp.get('industries') or []
        
        # Score based on matches
        score = 0
        matched_services = []
        
        if service and service in services:
            score += 10
            matched_services.append(service)
        
        if industry and industry in industries:
            score += 5
        
        # Match on any service if no specific filter
        if not service and services:
            score += len(services)
            matched_services = services[:3]
        
        if score == 0:
            continue
        
        goal = await db.goals.find_one({"user_id": user_id, "active": True}, {"_id": 0})
        points = await db.user_points.find_one({"user_id": user_id}, {"_id": 0})
        
        matches.append({
            "user_id": user_id,
            "display_name": profile.get('display_name', ''),
            "company_name": mp.get('company_name', ''),
            "website": mp.get('website', ''),
            "email": mp.get('email', ''),
            "booking_link": mp.get('booking_link', ''),
            "bio": mp.get('bio', ''),
            "services_offered": services,
            "matched_services": matched_services,
            "target_customer": mp.get('target_customer', ''),
            "industries": industries,
            "goal_title": goal.get('title', '') if goal else '',
            "total_points": points.get('total_points', 0) if points else 0,
            "match_score": score
        })
    
    # Sort by match score then points
    matches.sort(key=lambda x: (x['match_score'], x['total_points']), reverse=True)
    return matches[:limit]

@api_router.get("/matching/for-deal/{deal_id}")
async def find_providers_for_deal(deal_id: str, user: dict = Depends(get_current_user)):
    """Find service providers matching a specific deal's needs"""
    deal = await db.deals.find_one({"id": deal_id, "user_id": user['id']}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    deal_needs = (deal.get('needs') or []) + (deal.get('financial_services') or [])
    other_needs = deal.get('other_needs', '')
    
    if not deal_needs and not other_needs:
        return []
    
    # Get all member profiles
    profiles = await db.profiles.find({}, {"_id": 0}).to_list(1000)
    
    matches = []
    for profile in profiles:
        user_id = profile.get('user_id')
        if user_id == user['id']:
            continue
        
        member_profile = await db.member_profiles.find_one({"user_id": user_id}, {"_id": 0})
        if not member_profile:
            continue
        
        mp = member_profile
        services = mp.get('services_offered') or []
        
        # Find matching services
        matched = [s for s in services if s in deal_needs]
        
        # Check other_needs against bio/target_customer
        if other_needs:
            searchable = f"{mp.get('bio', '')} {mp.get('target_customer', '')} {' '.join(services)}".lower()
            if other_needs.lower() in searchable:
                matched.append('other_match')
        
        if not matched:
            continue
        
        goal = await db.goals.find_one({"user_id": user_id, "active": True}, {"_id": 0})
        points = await db.user_points.find_one({"user_id": user_id}, {"_id": 0})
        
        matches.append({
            "user_id": user_id,
            "display_name": profile.get('display_name', ''),
            "company_name": mp.get('company_name', ''),
            "website": mp.get('website', ''),
            "email": mp.get('email', ''),
            "phone": mp.get('phone', ''),
            "booking_link": mp.get('booking_link', ''),
            "bio": mp.get('bio', ''),
            "services_offered": services,
            "matched_services": matched,
            "target_customer": mp.get('target_customer', ''),
            "goal_title": goal.get('title', '') if goal else '',
            "total_points": points.get('total_points', 0) if points else 0,
            "match_score": len(matched) * 10
        })
    
    matches.sort(key=lambda x: (x['match_score'], x['total_points']), reverse=True)
    return matches[:20]

# ─── Direct & Group Messaging ───

@api_router.post("/messages/direct")
async def send_direct_message(input_data: MessageInput, user: dict = Depends(get_current_user)):
    """Send a direct message to another user"""
    if not input_data.recipient_id:
        raise HTTPException(status_code=400, detail="recipient_id is required")
    
    recipient = await db.users.find_one({"id": input_data.recipient_id})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    message = {
        "id": str(uuid.uuid4()),
        "type": "direct",
        "sender_id": user['id'],
        "recipient_id": input_data.recipient_id,
        "content": input_data.content,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(message)
    
    # Send push notification to recipient
    await send_message_notification(input_data.recipient_id, user['id'], input_data.content[:50])
    
    return {k: v for k, v in message.items() if k != '_id'}

@api_router.get("/messages/direct/{user_id}")
async def get_direct_messages(user_id: str, user: dict = Depends(get_current_user)):
    """Get direct message thread with another user"""
    messages = await db.messages.find(
        {
            "type": "direct",
            "$or": [
                {"sender_id": user['id'], "recipient_id": user_id},
                {"sender_id": user_id, "recipient_id": user['id']}
            ]
        },
        {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    
    # Mark messages as read
    await db.messages.update_many(
        {"type": "direct", "sender_id": user_id, "recipient_id": user['id'], "read": False},
        {"$set": {"read": True}}
    )
    
    return messages

@api_router.get("/messages/conversations")
async def get_conversations(user: dict = Depends(get_current_user)):
    """Get list of all conversations"""
    # Get all unique users this user has messaged with
    messages = await db.messages.find(
        {
            "type": "direct",
            "$or": [
                {"sender_id": user['id']},
                {"recipient_id": user['id']}
            ]
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    conversations = {}
    for msg in messages:
        other_id = msg['recipient_id'] if msg['sender_id'] == user['id'] else msg['sender_id']
        if other_id not in conversations:
            profile = await db.profiles.find_one({"user_id": other_id}, {"_id": 0})
            unread_count = await db.messages.count_documents({
                "type": "direct",
                "sender_id": other_id,
                "recipient_id": user['id'],
                "read": False
            })
            conversations[other_id] = {
                "user_id": other_id,
                "display_name": profile.get('display_name', 'Unknown') if profile else 'Unknown',
                "last_message": msg['content'][:50],
                "last_message_at": msg['created_at'],
                "unread_count": unread_count
            }
    
    return list(conversations.values())

# Group Chat
@api_router.post("/messages/groups")
async def create_group_chat(input_data: GroupChatInput, user: dict = Depends(get_current_user)):
    """Create a new group chat"""
    group = {
        "id": str(uuid.uuid4()),
        "name": input_data.name,
        "description": input_data.description or "",
        "created_by": user['id'],
        "members": [user['id']] + input_data.member_ids,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.group_chats.insert_one(group)
    return {k: v for k, v in group.items() if k != '_id'}

@api_router.get("/messages/groups")
async def get_user_groups(user: dict = Depends(get_current_user)):
    """Get all groups user is a member of"""
    groups = await db.group_chats.find(
        {"members": user['id']},
        {"_id": 0}
    ).to_list(50)
    
    # Add last message and unread count for each group
    for group in groups:
        last_msg = await db.messages.find_one(
            {"type": "group", "group_id": group['id']},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
        if last_msg:
            group['last_message'] = last_msg['content'][:50]
            group['last_message_at'] = last_msg['created_at']
    
    return groups

@api_router.post("/messages/groups/{group_id}")
async def send_group_message(group_id: str, input_data: MessageInput, user: dict = Depends(get_current_user)):
    """Send a message to a group"""
    group = await db.group_chats.find_one({"id": group_id, "members": user['id']})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found or you are not a member")
    
    message = {
        "id": str(uuid.uuid4()),
        "type": "group",
        "group_id": group_id,
        "sender_id": user['id'],
        "content": input_data.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(message)
    
    # Notify all other members
    sender_profile = await db.profiles.find_one({"user_id": user['id']}, {"_id": 0})
    sender_name = sender_profile.get('display_name', 'Someone') if sender_profile else 'Someone'
    for member_id in group['members']:
        if member_id != user['id']:
            await send_message_notification(member_id, user['id'], f"[{group['name']}] {sender_name}: {input_data.content[:30]}")
    
    return {k: v for k, v in message.items() if k != '_id'}

@api_router.get("/messages/groups/{group_id}")
async def get_group_messages(group_id: str, user: dict = Depends(get_current_user)):
    """Get messages from a group"""
    group = await db.group_chats.find_one({"id": group_id, "members": user['id']})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found or you are not a member")
    
    messages = await db.messages.find(
        {"type": "group", "group_id": group_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    
    # Enrich with sender names
    for msg in messages:
        profile = await db.profiles.find_one({"user_id": msg['sender_id']}, {"_id": 0})
        msg['sender_name'] = profile.get('display_name', 'Unknown') if profile else 'Unknown'
    
    return {"group": {k: v for k, v in group.items() if k != '_id'}, "messages": messages}

# ─── Push Notifications ───

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

async def send_expo_push_notification(push_tokens: List[str], title: str, body: str, data: Dict = None):
    """Send push notification using Expo Push API (free, no signup required)"""
    if not push_tokens:
        return
    
    messages = []
    for token in push_tokens:
        if token.startswith("ExponentPushToken["):
            messages.append({
                "to": token,
                "title": title,
                "body": body,
                "sound": "default",
                "data": data or {},
            })
    
    if not messages:
        return
    
    try:
        response = requests.post(
            EXPO_PUSH_URL,
            json=messages,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            timeout=30
        )
        result = response.json()
        logger.info(f"Expo Push result: {result}")
        return result
    except Exception as e:
        logger.error(f"Expo Push failed: {e}")

async def send_message_notification(recipient_id: str, sender_id: str, preview: str):
    """Send push notification for new message"""
    settings = await db.notification_settings.find_one({"user_id": recipient_id})
    if settings and not settings.get('message_notifications_enabled', True):
        return
    
    tokens = await db.push_tokens.find({"user_id": recipient_id}, {"_id": 0}).to_list(10)
    if not tokens:
        return
    
    sender_profile = await db.profiles.find_one({"user_id": sender_id}, {"_id": 0})
    sender_name = sender_profile.get('display_name', 'Someone') if sender_profile else 'Someone'
    
    push_tokens = [t['token'] for t in tokens if t.get('token')]
    await send_expo_push_notification(
        push_tokens,
        f"Message from {sender_name}",
        preview[:100],
        {"type": "message", "sender_id": sender_id}
    )
    
    # Also store in notifications collection for history
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": recipient_id,
        "type": "message",
        "title": f"Message from {sender_name}",
        "body": preview,
        "data": {"sender_id": sender_id},
        "sent": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)

async def send_deal_reminder_notification(user_id: str, deal: dict):
    """Send push notification for deal close date reminder"""
    settings = await db.notification_settings.find_one({"user_id": user_id})
    if settings and not settings.get('deal_reminders_enabled', True):
        return
    
    tokens = await db.push_tokens.find({"user_id": user_id}, {"_id": 0}).to_list(10)
    if not tokens:
        return
    
    push_tokens = [t['token'] for t in tokens if t.get('token')]
    deal_name = deal.get('name', 'Deal')
    close_date = deal.get('close_date', '')
    
    await send_expo_push_notification(
        push_tokens,
        f"Deal Reminder: {deal_name}",
        f"Close date is {close_date}. Time to follow up!",
        {"type": "deal_reminder", "deal_id": deal.get('id')}
    )

async def send_daily_checkin_notification(user_id: str):
    """Send daily check-in reminder"""
    settings = await db.notification_settings.find_one({"user_id": user_id})
    if settings and not settings.get('daily_checkin_enabled', True):
        return
    
    tokens = await db.push_tokens.find({"user_id": user_id}, {"_id": 0}).to_list(10)
    if not tokens:
        return
    
    push_tokens = [t['token'] for t in tokens if t.get('token')]
    await send_expo_push_notification(
        push_tokens,
        "Daily Check-in Reminder",
        "Time to complete your 10x Unicorn checklist! 🦄",
        {"type": "daily_checkin"}
    )

@api_router.post("/notifications/push-token")
async def register_push_token(input_data: PushTokenInput, user: dict = Depends(get_current_user)):
    """Register a push notification token"""
    await db.push_tokens.update_one(
        {"user_id": user['id'], "token": input_data.token},
        {
            "$set": {
                "user_id": user['id'],
                "token": input_data.token,
                "device_type": input_data.device_type,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    return {"message": "Push token registered"}

@api_router.get("/notifications/settings")
async def get_notification_settings(user: dict = Depends(get_current_user)):
    """Get user's notification settings"""
    settings = await db.notification_settings.find_one({"user_id": user['id']}, {"_id": 0})
    if not settings:
        # Default settings
        settings = {
            "user_id": user['id'],
            "daily_checkin_enabled": True,
            "daily_checkin_time": "09:00",
            "deal_reminders_enabled": True,
            "community_notifications_enabled": True,
            "message_notifications_enabled": True
        }
        await db.notification_settings.insert_one(settings)
    return {k: v for k, v in settings.items() if k != '_id'}

@api_router.put("/notifications/settings")
async def update_notification_settings(input_data: NotificationSettingsInput, user: dict = Depends(get_current_user)):
    """Update notification settings"""
    updates = {k: v for k, v in input_data.dict().items() if v is not None}
    if updates:
        await db.notification_settings.update_one(
            {"user_id": user['id']},
            {"$set": updates},
            upsert=True
        )
    settings = await db.notification_settings.find_one({"user_id": user['id']}, {"_id": 0})
    return {k: v for k, v in settings.items() if k != '_id'}

@api_router.get("/notifications/pending")
async def get_pending_notifications(user: dict = Depends(get_current_user)):
    """Get pending notifications for user"""
    notifications = await db.notifications.find(
        {"user_id": user['id'], "sent": False},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    return notifications

# ─── Profile Photo Upload ───

@api_router.post("/profiles/photo")
async def upload_profile_photo(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload profile photo to cloud storage"""
    try:
        # Validate file type
        ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
        if ext not in MIME_TYPES:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
        
        content_type = MIME_TYPES.get(ext, "image/jpeg")
        file_data = await file.read()
        
        # Upload to cloud storage
        path = f"{APP_NAME}/profiles/{user['id']}/{uuid.uuid4()}.{ext}"
        result = put_object(path, file_data, content_type)
        
        # Store reference in database
        await db.files.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user['id'],
            "storage_path": result["path"],
            "original_filename": file.filename,
            "content_type": content_type,
            "size": result.get("size", len(file_data)),
            "file_type": "profile_photo",
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Update member profile with storage path
        await db.member_profiles.update_one(
            {"user_id": user['id']},
            {"$set": {"profile_photo_path": result["path"]}},
            upsert=True
        )
        
        return {"message": "Profile photo uploaded", "path": result["path"]}
    except Exception as e:
        logger.error(f"Photo upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/profiles/photo")
async def save_profile_photo(photo_data: dict, user: dict = Depends(get_current_user)):
    """Save profile photo from base64 data"""
    import base64
    
    base64_data = photo_data.get('base64')
    if not base64_data:
        raise HTTPException(status_code=400, detail="base64 data is required")
    
    try:
        # Extract base64 content
        if ',' in base64_data:
            base64_data = base64_data.split(',')[1]
        
        file_data = base64.b64decode(base64_data)
        ext = "jpg"
        content_type = "image/jpeg"
        
        # Upload to cloud storage
        path = f"{APP_NAME}/profiles/{user['id']}/{uuid.uuid4()}.{ext}"
        result = put_object(path, file_data, content_type)
        
        # Store reference in database
        await db.files.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user['id'],
            "storage_path": result["path"],
            "content_type": content_type,
            "size": result.get("size", len(file_data)),
            "file_type": "profile_photo",
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Update member profile with storage path
        await db.member_profiles.update_one(
            {"user_id": user['id']},
            {"$set": {"profile_photo_path": result["path"]}},
            upsert=True
        )
        
        return {"message": "Profile photo updated", "path": result["path"]}
    except Exception as e:
        logger.error(f"Photo save failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/files/{path:path}")
async def download_file(path: str, authorization: str = Header(None), auth: str = Query(None), user: dict = Depends(get_current_user)):
    """Download file from cloud storage"""
    try:
        record = await db.files.find_one({"storage_path": path, "is_deleted": False})
        if not record:
            raise HTTPException(status_code=404, detail="File not found")
        
        data, content_type = get_object(path)
        return Response(content=data, media_type=record.get("content_type", content_type))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File download failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/profiles/photo")
async def delete_profile_photo(user: dict = Depends(get_current_user)):
    """Remove profile photo (soft delete)"""
    # Mark files as deleted (no actual delete API in storage)
    await db.files.update_many(
        {"user_id": user['id'], "file_type": "profile_photo"},
        {"$set": {"is_deleted": True}}
    )
    await db.member_profiles.update_one(
        {"user_id": user['id']},
        {"$unset": {"profile_photo_path": ""}}
    )
    return {"message": "Profile photo removed"}

# ─── Health Check ───

@api_router.get("/health")
async def health():
    return {"status": "ok", "service": "10x-unicorn"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    try:
        init_storage()
        logger.info("Storage initialized successfully")
    except Exception as e:
        logger.error(f"Storage initialization failed: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
