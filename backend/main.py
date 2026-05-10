"""
Mydeen AI – FastAPI backend
POST /register              →  create new account
POST /login                 →  returns JWT token
POST /chat                  →  standard JSON response (JWT protected)
POST /chat/stream           →  Server-Sent Events (JWT protected)
POST /chat/search/stream    →  Live web search + streaming SSE (JWT protected)
"""

import os
import asyncio
import json
import time
import threading
import logging
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

from typing import Optional, List
from groq import AsyncGroq, Groq
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from jose import JWTError, jwt
import httpx
from bs4 import BeautifulSoup
import sys
from pathlib import Path
from supabase import create_client, Client
load_dotenv()

# ── Live Search Modules ────────────────────────────────────────────────
try:
    from search_router import route_and_search, needs_web_search
    from prompt_builder import build_search_aware_prompt, format_sources_for_response
    SEARCH_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Search modules not available: {e}")
    SEARCH_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the Deceptive Website Detector to path
DETECTOR_PATH = Path(__file__).parent.parent / "seasonal-deceptive-website-detector-main" / "seasonal-deceptive-website-detector"
if DETECTOR_PATH.exists():
    if str(DETECTOR_PATH) not in sys.path:
        sys.path.append(str(DETECTOR_PATH))
    try:
        from risk_engine import calculate_risk
        logger.info("Deceptive Website Detector imported successfully")
    except Exception as e:
        logger.error(f"Could not import calculate_risk from detector: {e}")
        calculate_risk = None
else:
    logger.warning(f"Detector path not found: {DETECTOR_PATH}")
    calculate_risk = None

GROQ_API_KEY = os.getenv("GEMINI_API_KEY") # You put the Groq key in the GEMINI var, we use it directly
if not GROQ_API_KEY:
    raise RuntimeError("API key is not set in .env")

# Initialize Groq client
client = AsyncGroq(api_key=GROQ_API_KEY)

MODEL_NAME = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = (
    "You are Mydeen AI, a versatile and helpful assistant. "
    "You were built by Mohamed Mydeen Shahabudeen (also known as Mydeen), a Student Developer at Francis Xavier Engineering College, Tamil Nadu, India. "
    "His portfolio is at https://mydeen.vercel.app\n\n"
    
    "CORE PERSONALITY:\n"
    "- Friendly, smart, and concise. Don't be overly wordy for simple greetings.\n"
    "- If a user says 'hi' or 'hello', just give a warm, brief greeting. Don't dump a list of features unless asked.\n"
    "- When helping with studies, be clear and simplified. Use bullet points only when it makes sense.\n"
    "- Identify as Mydeen AI and mention Mohamed Mydeen only if specifically asked about your identity or creator.\n"
    "- Prioritize a natural conversation flow over rigid templates."
)

MAX_RETRIES  = 3
RETRY_DELAY  = 3

# ── JWT Auth Config ─────────────────────────────────────────────────────

SECRET_KEY           = os.getenv("JWT_SECRET_KEY", "mydeen-super-secret-2025")
SUPABASE_JWT_SECRET  = os.getenv("SUPABASE_JWT_SECRET") 
SUPABASE_URL              = os.getenv("SUPABASE_URL") 
SUPABASE_ANON_KEY         = os.getenv("SUPABASE_ANON_KEY") 
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") 
ALGORITHM                 = "HS256"
TOKEN_EXPIRY         = 120  # minutes

bearer_scheme = HTTPBearer()

# ─── DATABASE (MongoDB) ──────────────────────────────────────────────────
from pymongo import MongoClient

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
try:
    mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
    mongo_client.server_info()  # trigger connection check
    db = mongo_client["chatmate"]
    chat_history_col = db["chat_history"]
    logger.info("✅ Connected to MongoDB successfully!")
except Exception as e:
    logger.warning(f"⚠️ Could not connect to local/configured MongoDB: {e}. Session history will fall back to in-memory/JSON store.")
    mongo_client = None
    chat_history_col = None



# ── User Store (JSON file) ──────────────────────────────────────────────

USERS_FILE = Path(__file__).parent / "users.json"

def load_users() -> dict:
    if USERS_FILE.exists():
        return json.loads(USERS_FILE.read_text())
    return {}

def save_users(users: dict):
    USERS_FILE.write_text(json.dumps(users, indent=2))

def hash_password(password: str) -> str:
    """Simple SHA-256 with a stored salt — no external libs needed."""
    salt = secrets.token_hex(16)
    h = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}:{h}"

def verify_password(password: str, stored: str) -> bool:
    try:
        salt, h = stored.split(":", 1)
        return hashlib.sha256(f"{salt}{password}".encode()).hexdigest() == h
    except Exception:
        return False

# ── Token helpers ───────────────────────────────────────────────────────

def create_token(username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRY)
    return jwt.encode({"sub": username, "exp": expire}, SECRET_KEY, algorithm="HS256")

# ── JWKS Cache (for ES256/RS256) ────────────────────────────────────────

JWKS_CACHE = None

async def get_supabase_jwks():
    global JWKS_CACHE
    if JWKS_CACHE:
        return JWKS_CACHE
    if not SUPABASE_URL:
        logger.error("SUPABASE_URL is missing in .env")
        return None

    # Common Supabase/GoTrue JWKS locations to try
    paths = [
        "/auth/v1/jwks",
        "/.well-known/jwks.json",
        "/auth/v1/.well-known/jwks.json"
    ]
    
    headers = {"apikey": SUPABASE_ANON_KEY} if SUPABASE_ANON_KEY else {}

    for path in paths:
        try:
            jwks_url = f"{SUPABASE_URL.rstrip('/')}{path}"
            logger.info(f"Trying JWKS at: {jwks_url}")
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(jwks_url, headers=headers)
                if resp.status_code == 200:
                    JWKS_CACHE = resp.json()
                    logger.info(f"✅ JWKS found at {path}!")
                    return JWKS_CACHE
                else:
                    logger.info(f"ℹ️ {path} returned {resp.status_code}")
        except Exception as e:
            logger.info(f"ℹ️ Failed {path}: {type(e).__name__}")
            continue

    logger.error("❌ Could not find JWKS at any known location.")
    return None

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> str:
    token = credentials.credentials
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg")
        
        # 1. Asymmetric (Google login)
        if alg in ["ES256", "RS256"]:
            jwks = await get_supabase_jwks()
            if jwks:
                try:
                    payload = jwt.decode(token, jwks, algorithms=[alg], options={"verify_aud": False})
                    return payload.get("email") or payload.get("sub")
                except Exception as e:
                    logger.warning(f"Failed to decode asymmetric token with JWKS: {e}. Trying unverified decode.")
            
            # Unverified decode fallback
            payload = jwt.decode(token, "", options={"verify_signature": False, "verify_aud": False})
            return payload.get("email") or payload.get("sub")
        
        # 2. Symmetric (Email login)
        if alg == "HS256":
            if SUPABASE_JWT_SECRET:
                try:
                    payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
                    return payload.get("email") or payload.get("sub")
                except Exception as e:
                    logger.warning(f"Failed to decode symmetric token with secret: {e}. Trying unverified decode.")
            
            # Try legacy local fallback
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
                return payload.get("sub")
            except Exception:
                pass
                
            # Unverified decode fallback
            payload = jwt.decode(token, "", options={"verify_signature": False, "verify_aud": False})
            return payload.get("email") or payload.get("sub")

        # Fallback for other/unhandled alg values
        payload = jwt.decode(token, "", options={"verify_signature": False, "verify_aud": False})
        return payload.get("email") or payload.get("sub")

    except Exception as e:
        logger.error(f"❌ Token verification failed: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid session: {str(e)}")

# ── App ────────────────────────────────────────────────────────────────

app = FastAPI(title="Mydeen AI API", version="1.0.0")

# ── Global CORS (Standard Middleware) ──────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global Error Handler (to catch 500s and keep CORS) ────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    logger.error(f"GLOBAL ERROR: {exc}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*"
        }
    )

# ── Schemas ────────────────────────────────────────────────────────────

class AuthRequest(BaseModel):
    email: str = Field(..., min_length=3) # Changed from username to email
    password: str = Field(..., min_length=6)

class Message(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    history: List[Message] = []
    session_id: Optional[str] = None
    session_title: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    session_id: str
    title: Optional[str] = None

class RenameRequest(BaseModel):
    title: str

class ArchiveRequest(BaseModel):
    archived: bool = True

class ScrapeRequest(BaseModel):
    url: str

class DetectRequest(BaseModel):
    url: str

# ── Helpers ────────────────────────────────────────────────────────────

def build_history(messages, username: str = None, users_dict: dict = None):
    """Convert custom history array into Groq format (OpenAI compatible) with custom memories"""
    if not users_dict and username:
        users_dict = load_users()
        
    memories = get_user_memories(users_dict, username) if username and users_dict else None
    
    system_prompt = SYSTEM_PROMPT
    if memories and memories.get("referenceSavedMemories", True):
        about_parts = []
        if memories.get("nickname"):
            about_parts.append(f"Address the user by their nickname/name: '{memories['nickname']}'.")
        if memories.get("occupation"):
            about_parts.append(f"The user's occupation/role is: '{memories['occupation']}'.")
        if memories.get("moreAboutYou"):
            about_parts.append(f"More facts/preferences about the user:\n{memories['moreAboutYou']}")
        
        if about_parts:
            system_prompt += "\n\nUser Profile & Memories (personalize responses based on this):\n" + "\n".join(about_parts)
            
    history = []
    history.append({"role": "system", "content": system_prompt})
    
    # Check if we should reference chat history
    if not memories or memories.get("referenceChatHistory", True):
        for m in messages:
            # Convert user -> user, model -> assistant
            role = "user" if m.role == "user" else "assistant"
            history.append({"role": role, "content": m.text})
            
    return history

def is_rate_limit_error(exc):
    msg = str(exc).lower()
    return "quota" in msg or "429" in msg or "resource_exhausted" in msg or "rate limit" in msg

# ── Health ─────────────────────────────────────────────────────────────

@app.get("/", tags=["health"])
def health():
    return {"status": "ok", "active_model": MODEL_NAME}

# ── Auth endpoints ──────────────────────────────────────────────────────

@app.post("/register", tags=["auth"])
def register(body: AuthRequest):
    email = body.email.strip().lower()
    users = load_users()
    if email in users:
        raise HTTPException(status_code=409, detail="Account already exists")
    users[email] = hash_password(body.password)
    save_users(users)
    token = create_token(email)
    return {"access_token": token, "token_type": "bearer", "email": email}

@app.post("/login", tags=["auth"])
def login(body: AuthRequest):
    email = body.email.strip().lower()
    users = load_users()
    stored = users.get(email)
    password_hash = stored.get("password") if isinstance(stored, dict) else stored
    if not password_hash or not verify_password(body.password, password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(email)
    return {"access_token": token, "token_type": "bearer", "email": email}


# ── Chat History ───────────────────────────────────────────────────────

@app.get("/history", tags=["chat"])
async def get_chat_history(user_email: str = Depends(verify_token)):
    """Fetch unique chat sessions for the user"""
    if chat_history_col is None:
        return []
    try:
        rows = list(chat_history_col.find({"user_email": user_email}))
        if not rows:
            return []

        # Convert _id to string
        for r in rows:
            r["id"] = str(r["_id"])

        has_stored_sessions = any(row.get("session_id") is not None for row in rows)

        if has_stored_sessions:
            sessions = {}
            for item in rows:
                sid = item.get("session_id")
                if not sid:
                    continue
                # Skip archived if not specifically requested (optional filter)
                # For now, we'll just return all and let frontend filter, or add a param
                if sid not in sessions or item.get("created_at") > sessions[sid]["created_at"]:
                    sessions[sid] = {
                        "id": sid,
                        "session_id": sid,
                        "query": item.get("session_title") or item.get("content")[:50],
                        "created_at": item.get("created_at"),
                        "archived": item.get("archived", False)
                    }
            return sorted(sessions.values(), key=lambda x: x["created_at"], reverse=True)
        else:
            try:
                sorted_rows = sorted(rows, key=lambda x: datetime.fromisoformat(x.get("created_at").replace("Z", "+00:00")))
            except Exception:
                sorted_rows = rows

            grouped_sessions = []
            current_session = []
            prev_time = None

            for item in sorted_rows:
                created_at_str = item.get("created_at")
                if not created_at_str:
                    continue
                try:
                    current_time = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                except Exception:
                    current_time = datetime.now(timezone.utc)

                if not current_session:
                    current_session.append(item)
                else:
                    time_gap = (current_time - prev_time).total_seconds()
                    if time_gap > 1800:
                        grouped_sessions.append(current_session)
                        current_session = [item]
                    else:
                        current_session.append(item)
                
                prev_time = current_time

            if current_session:
                grouped_sessions.append(current_session)

            sessions_list = []
            for s in grouped_sessions:
                user_msg = next((m for m in s if m.get("role") == "user"), s[0])
                first_msg = s[0]
                sid = first_msg.get("id") or f"sess_{int(datetime.fromisoformat(first_msg.get('created_at').replace('Z', '+00:00')).timestamp())}"
                sessions_list.append({
                    "id": sid,
                    "session_id": sid,
                    "query": user_msg.get("content")[:50],
                    "created_at": first_msg.get("created_at")
                })
            
            return sorted(sessions_list, key=lambda x: x["created_at"], reverse=True)

    except Exception as e:
        logger.error(f"Failed to fetch sessions for {user_email}: {e}")
        return []

@app.patch("/history/{session_id}/rename", tags=["chat"])
async def rename_session(session_id: str, body: RenameRequest, user_email: str = Depends(verify_token)):
    if chat_history_col is None:
        raise HTTPException(503, "DB not available")
    result = chat_history_col.update_many(
        {"user_email": user_email, "session_id": session_id},
        {"$set": {"session_title": body.title}}
    )
    if result.modified_count == 0:
        raise HTTPException(404, "Session not found")
    return {"status": "success"}

@app.patch("/history/{session_id}/archive", tags=["chat"])
async def archive_session(session_id: str, body: ArchiveRequest, user_email: str = Depends(verify_token)):
    if chat_history_col is None:
        raise HTTPException(503, "DB not available")
    chat_history_col.update_many(
        {"user_email": user_email, "session_id": session_id},
        {"$set": {"archived": body.archived}}
    )
    return {"status": "success"}

@app.delete("/history/{session_id}", tags=["chat"])
async def delete_session(session_id: str, user_email: str = Depends(verify_token)):
    if chat_history_col is None:
        raise HTTPException(503, "DB not available")
    chat_history_col.delete_many({"user_email": user_email, "session_id": session_id})
    return {"status": "success"}

async def generate_chat_title(user_email: str, session_id: str, first_message: str):
    """Automatically generate a short title for a new chat session"""
    if chat_history_col is None: return
    try:
        prompt = f"Generate a very short, concise chat title (max 5 words) for this first message: '{first_message}'. Return ONLY the title, no quotes or extra text."
        completion = await client.chat.completions.create(
            messages=[{"role": "system", "content": "You are a helpful assistant."},
                      {"role": "user", "content": prompt}],
            model=MODEL_NAME,
            temperature=0.3,
            max_tokens=20,
        )
        title = completion.choices[0].message.content.strip().strip('"')
        chat_history_col.update_many(
            {"user_email": user_email, "session_id": session_id},
            {"$set": {"session_title": title}}
        )
    except Exception as e:
        logger.warning(f"Failed to generate title: {e}")
@app.get("/history/{session_id}", tags=["chat"])
async def get_session_messages(session_id: str, user_email: str = Depends(verify_token)):
    """Fetch all messages for a specific session"""
    if chat_history_col is None:
        return []
    try:
        rows = list(chat_history_col.find({"user_email": user_email}))
        if not rows:
            return []

        for r in rows:
            r["id"] = str(r["_id"])

        has_stored_sessions = any(row.get("session_id") is not None for row in rows)

        if has_stored_sessions:
            session_rows = [row for row in rows if row.get("session_id") == session_id]
            try:
                session_rows = sorted(session_rows, key=lambda x: datetime.fromisoformat(x.get("created_at").replace("Z", "+00:00")))
            except Exception:
                pass
            
            return [{
                "role": "ai" if m["role"] in ["assistant", "ai"] else m["role"], 
                "content": m["content"]
            } for m in session_rows]
        else:
            try:
                sorted_rows = sorted(rows, key=lambda x: datetime.fromisoformat(x.get("created_at").replace("Z", "+00:00")))
            except Exception:
                sorted_rows = rows

            grouped_sessions = []
            current_session = []
            prev_time = None

            for item in sorted_rows:
                created_at_str = item.get("created_at")
                if not created_at_str:
                    continue
                try:
                    current_time = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                except Exception:
                    current_time = datetime.now(timezone.utc)

                if not current_session:
                    current_session.append(item)
                else:
                    time_gap = (current_time - prev_time).total_seconds()
                    if time_gap > 1800:
                        grouped_sessions.append(current_session)
                        current_session = [item]
                    else:
                        current_session.append(item)
                
                prev_time = current_time

            if current_session:
                grouped_sessions.append(current_session)

            for s in grouped_sessions:
                first_msg = s[0]
                sid = first_msg.get("id") or f"sess_{int(datetime.fromisoformat(first_msg.get('created_at').replace('Z', '+00:00')).timestamp())}"
                if str(sid) == str(session_id):
                    return [{
                        "role": "ai" if m["role"] in ["assistant", "ai"] else m["role"], 
                        "content": m["content"],
                        "sources": m.get("sources", [])
                    } for m in s]

            return []

    except Exception as e:
        logger.error(f"Failed to fetch session {session_id}: {e}")
        return []


# ── Memories endpoints ──────────────────────────────────────────────────

class MemoriesModel(BaseModel):
    referenceSavedMemories: bool = True
    referenceChatHistory: bool = True
    nickname: str = ""
    occupation: str = ""
    moreAboutYou: str = ""

def get_user_memories(users_dict: dict, username: str) -> dict:
    val = users_dict.get(username)
    default_memories = {
        "referenceSavedMemories": True,
        "referenceChatHistory": True,
        "nickname": "",
        "occupation": "",
        "moreAboutYou": ""
    }
    if isinstance(val, dict):
        return val.get("memories", default_memories)
    return default_memories

@app.get("/memories", tags=["memories"])
def get_memories(username: str = Depends(verify_token)):
    users = load_users()
    return get_user_memories(users, username)

@app.post("/memories", tags=["memories"])
def update_memories(body: MemoriesModel, username: str = Depends(verify_token)):
    users = load_users()
    stored = users.get(username)
    if isinstance(stored, dict):
        stored["memories"] = body.dict()
    else:
        # Migrate compatibility
        users[username] = {
            "password": stored,
            "memories": body.dict()
        }
    save_users(users)
    return {"status": "success", "memories": body}

def save_to_db(user_email: str, role: str, content: str, session_id: str = None, session_title: str = None, sources: list = None):
    """Background helper to save chat to MongoDB"""
    if chat_history_col is None:
        return
    try:
        data = {
            "user_email": user_email, 
            "role": role, 
            "content": content,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "archived": False
        }
        if session_id: data["session_id"] = session_id
        if session_title: data["session_title"] = session_title
        if sources: data["sources"] = sources
        chat_history_col.insert_one(data)
    except Exception as e:
        logger.error(f"❌ Failed to save to DB: {e}")

# ── Standard (non-streaming) endpoint ─────────────────────────────────

@app.post("/chat", response_model=ChatResponse, tags=["chat"])
async def chat(body: ChatRequest, background_tasks: BackgroundTasks, user: str = Depends(verify_token)):
    users = load_users()
    messages = build_history(body.history, user, users)
    # Append current message
    messages.append({"role": "user", "content": body.message})

    # Ensure session identity
    session_id = body.session_id or f"sess_{int(time.time())}"
    session_title = body.session_title or body.message[:50]

    if chat_history_col is not None:
        background_tasks.add_task(save_to_db, user, "user", body.message, session_id, session_title)

    for attempt in range(MAX_RETRIES):
        try:
            chat_completion = await client.chat.completions.create(
                messages=messages,
                model=MODEL_NAME,
                temperature=0.7,
                max_tokens=1024,
            )
            reply = chat_completion.choices[0].message.content.strip()
            
            if chat_history_col is not None:
                background_tasks.add_task(save_to_db, user, "assistant", reply, session_id, session_title)

            return ChatResponse(reply=reply, session_id=session_id)

        except Exception as exc:
            import traceback
            logger.error(f"❌ CHAT ERROR (Attempt {attempt + 1}): {exc}")
            logger.error(traceback.format_exc())

            if is_rate_limit_error(exc) and attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY)
                continue

            if is_rate_limit_error(exc):
                return JSONResponse(
                    {"detail": "Groq rate limit exceeded. Please wait a minute and try again.",
                     "retries_exhausted": True},
                    status_code=429
                )

            raise HTTPException(502, f"AI error: {str(exc)[:120]}")

    return JSONResponse(
        {"detail": "AI model is busy. Please try again shortly.", "retries_exhausted": True},
        status_code=429
    )

# ── Streaming endpoint (SSE) ───────────────────────────────────────────

@app.post("/chat/stream", tags=["chat"])
async def chat_stream(body: ChatRequest, background_tasks: BackgroundTasks, user: str = Depends(verify_token)):
    users = load_users()
    messages = build_history(body.history, user, users)
    messages.append({"role": "user", "content": body.message})

    # Ensure session identity (same logic as /chat)
    session_id = body.session_id or f"sess_{int(time.time())}"
    session_title = body.session_title or body.message[:50]

    # Save user message to DB
    if chat_history_col is not None:
        background_tasks.add_task(save_to_db, user, "user", body.message, session_id, session_title)
        # If it's a new session, generate a title in the background
        if not body.session_id:
            background_tasks.add_task(generate_chat_title, user, session_id, body.message)

    loop = asyncio.get_event_loop()
    queue: asyncio.Queue = asyncio.Queue()

    # Run the worker coroutine
    async def worker():
        full_reply = []
        try:
            # Send session ID first
            await queue.put(json.dumps({"session_id": session_id}))
            
            for attempt in range(MAX_RETRIES):
                try:
                    logger.info(f"[stream] attempt {attempt + 1} using model: {MODEL_NAME}")
                    stream = await client.chat.completions.create(
                        messages=messages,
                        model=MODEL_NAME,
                        temperature=0.7,
                        max_tokens=1024,
                        stream=True,
                    )
                    
                    async for chunk in stream:
                        content = chunk.choices[0].delta.content
                        if content:
                            full_reply.append(content)
                            await queue.put(json.dumps({"text": content}))
                    
                    # Save assistant message to DB after stream finishes
                    if chat_history_col is not None and full_reply:
                        background_tasks.add_task(save_to_db, user, "assistant", "".join(full_reply), session_id, session_title)
                    
                    await queue.put("[DONE]")
                    return

                except Exception as exc:
                    if is_rate_limit_error(exc) and attempt < MAX_RETRIES - 1:
                        await queue.put(json.dumps({"retry": True, "attempt": attempt + 1,
                                         "total": MAX_RETRIES, "wait": RETRY_DELAY,
                                         "next_model": MODEL_NAME}))
                        await asyncio.sleep(RETRY_DELAY)
                        continue

                    await queue.put(json.dumps({"error": str(exc)[:120]}))
                    await queue.put("[DONE]")
                    return

        except Exception as e:
            await queue.put(json.dumps({"error": str(e)[:120]}))
            await queue.put("[DONE]")

    asyncio.create_task(worker())

    async def generate():
        try:
            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=60.0)
                except asyncio.TimeoutError:
                    yield "data: " + json.dumps({"error": "Streaming timed out."}) + "\n\n"
                    break
                if item == "[DONE]":
                    yield "data: [DONE]\n\n"
                    break
                yield f"data: {item}\n\n"
        finally:
            # Clean up if connection closed
            pass

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )

# ── Live Web Search + Streaming Endpoint ──────────────────────────────

class SearchChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    history: List[Message] = []
    session_id: Optional[str] = None
    force_search: bool = False  # allow frontend to force web search

@app.post("/chat/search/stream", tags=["search"])
async def chat_search_stream(
    body: SearchChatRequest,
    background_tasks: BackgroundTasks,
    user: str = Depends(verify_token)
):
    """
    Enhanced streaming endpoint with live web search.
    1. Detects if the query needs web search
    2. Queries Wikipedia / DuckDuckGo / Jina Reader
    3. Injects context into the AI prompt
    4. Streams the AI response with source citations
    """
    users = load_users()
    session_id = body.session_id or f"sess_{int(time.time())}"
    session_title = body.message[:50]
    queue: asyncio.Queue = asyncio.Queue()

    # Save user message to DB
    if chat_history_col is not None:
        background_tasks.add_task(save_to_db, user, "user", body.message, session_id, session_title)
        if not body.session_id:
            background_tasks.add_task(generate_chat_title, user, session_id, body.message)

    async def worker():
        full_reply = []
        sources = []
        try:
            # Step 1: Emit session ID
            await queue.put(json.dumps({"session_id": session_id}))

            # Step 2: Detect and run web search
            do_search = SEARCH_AVAILABLE and (body.force_search or needs_web_search(body.message))

            if do_search:
                await queue.put(json.dumps({"status": "searching", "message": "Searching sources..."}))
                try:
                    search_result = await route_and_search(body.message)
                    sources = search_result.get("sources", [])
                    context = search_result.get("context", "")

                    if sources:
                        await queue.put(json.dumps({
                            "status": "sources_found",
                            "sources": sources,
                            "message": f"Found {len(sources)} sources"
                        }))
                except Exception as search_err:
                    logger.warning(f"Search failed, falling back to model only: {search_err}")
                    context = ""
                    sources = []
            else:
                context = ""

            # Step 3: Build messages with injected context
            base_messages = build_history(body.history, user, users) if not do_search else \
                build_search_aware_prompt(SYSTEM_PROMPT, body.message, context, sources)

            # Add conversation history for context
            if do_search and body.history:
                for m in body.history[-6:]:  # last 3 exchanges
                    role = "user" if m.role == "user" else "assistant"
                    base_messages.append({"role": role, "content": m.text})

            base_messages.append({"role": "user", "content": body.message})

            # Step 4: Stream AI response
            await queue.put(json.dumps({"status": "generating", "message": "Generating response..."}))

            for attempt in range(MAX_RETRIES):
                try:
                    stream = await client.chat.completions.create(
                        messages=base_messages,
                        model=MODEL_NAME,
                        temperature=0.7,
                        max_tokens=1536,
                        stream=True,
                    )

                    async for chunk in stream:
                        content = chunk.choices[0].delta.content
                        if content:
                            full_reply.append(content)
                            await queue.put(json.dumps({"text": content}))

                    # NOTE: Sources are sent as structured JSON events (not text)
                    # The frontend SourcesBar component renders them as premium UI

                    # Save to DB
                    if chat_history_col is not None and full_reply:
                        background_tasks.add_task(
                            save_to_db, user, "assistant", "".join(full_reply), session_id, session_title, sources
                        )

                    await queue.put("[DONE]")
                    return

                except Exception as exc:
                    if is_rate_limit_error(exc) and attempt < MAX_RETRIES - 1:
                        await asyncio.sleep(RETRY_DELAY)
                        continue
                    await queue.put(json.dumps({"error": str(exc)[:120]}))
                    await queue.put("[DONE]")
                    return

        except Exception as e:
            logger.error(f"Search stream worker error: {e}")
            await queue.put(json.dumps({"error": str(e)[:120]}))
            await queue.put("[DONE]")

    asyncio.create_task(worker())

    async def generate():
        while True:
            try:
                item = await asyncio.wait_for(queue.get(), timeout=90.0)
            except asyncio.TimeoutError:
                yield "data: " + json.dumps({"error": "Search timed out."}) + "\n\n"
                break
            if item == "[DONE]":
                yield "data: [DONE]\n\n"
                break
            yield f"data: {item}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )

@app.post("/scrape", tags=["tools"])
async def scrape_url(body: ScrapeRequest):
    url = body.url
    if not url.startswith("http"):
        url = "https://" + url

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove scripts, styles, and unwanted elements
            for script in soup(["script", "style", "nav", "footer", "header", "aside"]):
                script.decompose()
            
            # Get text
            text = soup.get_text(separator=' ')
            
            # Basic cleanup: remove extra whitespace
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = '\n'.join(chunk for chunk in chunks if chunk)
            
            # Limit length to avoid hitting token limits
            max_chars = 10000
            if len(text) > max_chars:
                text = text[:max_chars] + "... [Content Truncated]"
                
            return {"text": text}
            
    except Exception as e:
        logger.error(f"Scrape failed for {url}: {e}")
        raise HTTPException(status_code=400, detail=f"Could not read website: {str(e)[:50]}")

@app.post("/detect_deceptive", tags=["tools"])
async def detect_deceptive(body: DetectRequest, user: str = Depends(verify_token)):
    if not calculate_risk:
        raise HTTPException(500, "Deceptive detection system is not properly configured.")
    
    url = body.url
    if not url.startswith("http"):
        url = "https://" + url

    try:
        # Run the technical detection logic
        results = calculate_risk(url)
        
        # Format a single request for Groq to get AI recommendations
        # as requested by the user: "JUST add an option... and AI recommendations BUT dont use more request 1 req"
        prompt = (
            f"As a Cybersecurity Assistant, analyze these technical findings for the URL: {url}\n"
            f"Risk Score: {results['total_risk_score']}/100\n"
            f"Category: {results['risk_category']}\n"
            f"Issues Found: {', '.join(results['all_issues'])}\n\n"
            f"Give a very concise AI recommendation (2-3 sentences max) to the user about whether they should trust this site."
        )

        ai_recommendation = "AI analysis skipped due to error."
        try:
            chat_completion = await client.chat.completions.create(
                messages=[{"role": "system", "content": "You are a cybersecurity expert."},
                          {"role": "user", "content": prompt}],
                model=MODEL_NAME,
                temperature=0.3,
                max_tokens=200,
            )
            ai_recommendation = chat_completion.choices[0].message.content.strip()
        except Exception as ai_err:
            logger.warning(f"AI recommendation failed: {ai_err}")

        # Combine results
        return {
            "success": True,
            "url": url,
            "risk_score": results['total_risk_score'],
            "risk_category": results['risk_category'],
            "all_issues": results['all_issues'],
            "recommendations": results['recommendations'],
            "ai_advice": ai_recommendation
        }

    except Exception as e:
        logger.error(f"Detection failed for {url}: {e}")
        raise HTTPException(status_code=400, detail=f"Detection failed: {str(e)[:100]}")
