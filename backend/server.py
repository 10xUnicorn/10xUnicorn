from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import jwt
import bcrypt
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
    timezone_str: Optional[str] = None

class DailyEntryUpdate(BaseModel):
    determination_level: Optional[int] = None
    intention: Optional[str] = None
    ten_x_focus: Optional[str] = None
    top_10x_action_text: Optional[str] = None
    top_priority_completed: Optional[bool] = None
    five_item_statuses: Optional[Dict[str, bool]] = None
    wormhole_reference: Optional[str] = None
    wormhole_action_text: Optional[str] = None
    distraction_notes: Optional[str] = None
    immediate_course_correction: Optional[bool] = None
    meditation_reflection: Optional[str] = None
    compound_done: Optional[bool] = None
    compound_notes: Optional[str] = None
    manual_override_status: Optional[str] = None

class WormholeContactInput(BaseModel):
    name: str
    connection_level: Optional[str] = "warm"
    tags: Optional[List[str]] = []
    activation_next_step: Optional[str] = ""
    company: Optional[str] = ""
    title: Optional[str] = ""
    location: Optional[str] = ""
    reciprocity_notes: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""

class WormholeContactUpdate(BaseModel):
    name: Optional[str] = None
    connection_level: Optional[str] = None
    tags: Optional[List[str]] = None
    activation_next_step: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    location: Optional[str] = None
    reciprocity_notes: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class InteractionInput(BaseModel):
    contact_id: str
    action_text: str
    date: Optional[str] = None

class AIChatMessage(BaseModel):
    message: str
    date: Optional[str] = None

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    end_date: Optional[str] = None
    active: Optional[bool] = None

class HabitUpdate(BaseModel):
    habit_title: Optional[str] = None

class MoveEntryInput(BaseModel):
    from_date: str
    to_date: str

class PasswordResetInput(BaseModel):
    current_password: str
    new_password: str

# ─── Win Logic ───

def compute_status(entry: dict) -> str:
    five = entry.get('five_item_statuses', {})
    all_five = all([
        five.get('top_action', False),
        five.get('wormhole', False),
        five.get('scariest', False),
        five.get('boldest', False),
        five.get('meditation', False)
    ])
    if all_five:
        return 'unicorn_win'
    if entry.get('top_priority_completed', False):
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
            "wormhole": False,
            "scariest": False,
            "boldest": False,
            "meditation": False
        },
        "wormhole_reference": "",
        "wormhole_action_text": "",
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
        "name": input_data.name,
        "connection_level": input_data.connection_level,
        "tags": input_data.tags or [],
        "activation_next_step": input_data.activation_next_step or "",
        "last_contact_date": None,
        "engagement_score": 0,
        "company": input_data.company or "",
        "title": input_data.title or "",
        "location": input_data.location or "",
        "reciprocity_notes": input_data.reciprocity_notes or "",
        "phone": input_data.phone or "",
        "email": input_data.email or "",
        "interaction_history": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.wormhole_contacts.insert_one(contact)
    return {k: v for k, v in contact.items() if k != '_id'}

@api_router.get("/wormhole-contacts")
async def list_contacts(user: dict = Depends(get_current_user)):
    contacts = await db.wormhole_contacts.find(
        {"user_id": user['id']}, {"_id": 0}
    ).sort("name", 1).to_list(500)
    return contacts

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
        "action_text": input_data.action_text,
        "date": input_data.date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.wormhole_contacts.update_one(
        {"id": input_data.contact_id, "user_id": user['id']},
        {
            "$push": {"interaction_history": interaction},
            "$set": {
                "last_contact_date": interaction['date'],
                "engagement_score": len(contact.get('interaction_history', [])) + 1
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
            "connection_level": c.connection_level or "warm",
            "tags": c.tags or [],
            "activation_next_step": c.activation_next_step or "",
            "last_contact_date": None,
            "engagement_score": 0,
            "company": c.company or "",
            "title": c.title or "",
            "location": c.location or "",
            "reciprocity_notes": c.reciprocity_notes or "",
            "phone": c.phone or "",
            "email": c.email or "",
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

    # Five item completion rates
    five_stats = {"top_action": 0, "wormhole": 0, "scariest": 0, "boldest": 0, "meditation": 0}
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
