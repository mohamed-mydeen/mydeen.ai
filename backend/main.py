"""
Mydeen AI – FastAPI backend
GET  /auth/google           →  redirect to Google OAuth consent
GET  /auth/google/callback  →  Google callback → mint JWT → redirect to frontend
GET  /auth/me               →  return current user info (JWT protected)
POST /register              →  create account with email + password
POST /login                 →  email/password login → returns JWT
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

from typing import Optional, List, Dict, Any

from groq import AsyncGroq, Groq
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from jose import JWTError, jwt
import httpx
from bs4 import BeautifulSoup
import sys
from pathlib import Path
from passlib.context import CryptContext
from authlib.integrations.httpx_client import AsyncOAuth2Client
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Vision Engine ─────────────────────────────────────────────────────
try:
    from vision_engine import analyze_vision_query
    logger.info("Vision Engine imported successfully")
except ImportError as e:
    logger.error(f"Vision engine import failed: {e}")
    analyze_vision_query = None

# ── Live Search Modules ────────────────────────────────────────────────
try:
    from search_router import route_and_search, needs_web_search, needs_wikipedia, needs_images
    from prompt_builder import build_search_aware_prompt, format_sources_for_response
    SEARCH_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Search modules not available: {e}")
    SEARCH_AVAILABLE = False


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

MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "llama-3.2-3b-preview"
]
MODEL_NAME = MODELS[0]

SYSTEM_PROMPT = (
    "You are Mydeen AI, a friendly, modern Tanglish AI assistant for Tamil-speaking students and developers. "
    "You were built by Mohamed Mydeen Shahabudeen, a Student Developer at Francis Xavier Engineering College, Tamil Nadu. "
    "His portfolio is at https://mydeen.vercel.app\n\n"

    "CORE PERSONALITY:\n"
    "- Sound like a smart Tamil tech friend who is helpful and conversational 🔥\n"
    "- Be student-friendly and use simple explanations for complex technical concepts.\n"
    "- If a user says 'hi' or 'hello', give a warm, brief greeting. No feature dumping.\n"
    "- Occasionally use natural emojis: 🔥 🚀 👍 ✨\n\n"

    "LANGUAGE & STYLE RULES (CRITICAL):\n"
    "1. Respond naturally in TANGLISH when the user speaks Tanglish or Tamil.\n"
    "2. Keep technical words in ENGLISH (e.g., frontend, backend, API, database, optimization, framework).\n"
    "3. Use natural conversational Tamil written in English letters (e.g., 'Machan idha optimize pannalaam').\n"
    "4. AVOID overly formal Tamil or robotic translations.\n"
    "5. If the user switches to pure English, respond in English.\n"
    "6. Keep responses concise and snappy unless a detailed explanation is requested.\n\n"

    "EXAMPLES OF STYLE:\n"
    "- User: 'enaku prompt kudu' -> Assistant: 'Machan indha prompt use pannalaam 🔥'\n"
    "- User: 'ithu free ah' -> Assistant: 'Ama machan, free tier la use pannalaam.'\n"
    "- User: 'limit reach aaguma' -> Assistant: 'Proper optimization pannina seekrama reach aagathu 👍'\n\n"

    "CRITICAL: Always remember previous conversation context and answer follow-up questions naturally."
)

MAX_RETRIES  = 3
RETRY_DELAY  = 0.5

# ── JWT Auth Config ─────────────────────────────────────────────────────

SECRET_KEY    = os.getenv("JWT_SECRET_KEY", "mydeen-super-secret-2025")
ALGORITHM    = "HS256"
TOKEN_EXPIRY = 120  # minutes

# ── Google OAuth Config ───────────────────────────────────────────────
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
FRONTEND_URL         = os.getenv("FRONTEND_URL", "http://localhost:5173")

GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO  = "https://www.googleapis.com/oauth2/v3/userinfo"

bearer_scheme = HTTPBearer(auto_error=False)

# ── Password Hashing ──────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ─── DATABASE (MongoDB) ───────────────────────────────────────────────
from db_service import DBService, UserService, ensure_indexes
try:
    ensure_indexes()
    logger.info("✅ Database Service initialized (MongoDB)")
except Exception as _db_err:
    logger.warning(f"⚠️  MongoDB index setup skipped: {_db_err}")




# ── Token helpers ──────────────────────────────────────────────────────

def create_token(user_id: str, email: str = "", name: str = "") -> str:
    """Mint a signed HS256 JWT containing user identity."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRY)
    payload = {"sub": user_id, "email": email, "name": name, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> str:
    """Verify our own HS256 JWT and return the user_id (sub)."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no sub")
        return user_id
    except JWTError as e:
        logger.error(f"❌ Token verification failed: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid or expired session")

# ── App ────────────────────────────────────────────────────────────────

app = FastAPI(title="Mydeen AI API", version="1.0.0")

# ── Global CORS (Standard Middleware) ──────────────────────────────────
_ALLOWED_ORIGINS = [
    "https://mydeenai.vercel.app",       # Production
    "http://localhost:5173",             # Vite dev server
    "http://localhost:3000",             # Alt dev port
    "http://127.0.0.1:5173",
    FRONTEND_URL,                        # From .env (overrides above if set)
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(_ALLOWED_ORIGINS)),
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

# ── PDF Upload ─────────────────────────────────────────────────────────
import PyPDF2
import io

@app.post("/upload-pdf", tags=["pdf"])
async def upload_pdf(file: UploadFile = File(...), user_email: str = Depends(verify_token)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    try:
        content = await file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        
        if len(text) > 20000:
            text = text[:20000] + "... (truncated)"
            
        return {"text": text, "filename": file.filename}
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse PDF")

# ── Helpers ────────────────────────────────────────────────────────────

def build_history(messages, username: str = None, users_dict: dict = None, limit: int = 10):
    """
    Convert custom history array into Groq format (OpenAI compatible) with custom memories.
    Optimized: Limits conversation context to the last `limit` messages to save tokens.
    """
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
        # OPTIMIZATION: Keep only the most recent history context
        recent_messages = messages[-limit:] if messages and len(messages) > limit else (messages or [])
        for m in recent_messages:
            # Convert user -> user, ai/assistant -> assistant
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


# ══════════════════════════════════════════════════════════════════════
# AUTH ENDPOINTS
# ══════════════════════════════════════════════════════════════════════

# ── Google OAuth ────────────────────────────────────────────────────────

@app.get("/auth/google", tags=["auth"])
async def google_login():
    """Redirect the user to Google's OAuth 2.0 consent screen."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(500, "GOOGLE_CLIENT_ID not configured in .env")
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }
    import urllib.parse
    url = GOOGLE_AUTH_URL + "?" + urllib.parse.urlencode(params)
    return RedirectResponse(url=url)


@app.get("/auth/google/callback", tags=["auth"])
async def google_callback(code: str = None, error: str = None):
    """Handle Google's redirect after user consent."""
    if error or not code:
        return RedirectResponse(url=f"{FRONTEND_URL}?auth_error={error or 'cancelled'}")

    try:
        # 1. Exchange authorization code for tokens
        async with httpx.AsyncClient() as hclient:
            token_resp = await hclient.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri": GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            token_data = token_resp.json()

        if "error" in token_data:
            logger.error(f"Google token error: {token_data}")
            return RedirectResponse(url=f"{FRONTEND_URL}?auth_error=token_exchange_failed")

        access_token = token_data["access_token"]

        # 2. Fetch user info from Google
        async with httpx.AsyncClient() as hclient:
            user_resp = await hclient.get(
                GOOGLE_USERINFO,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            google_user = user_resp.json()

        google_id = google_user.get("sub")
        email     = google_user.get("email", "")
        name      = google_user.get("name", email.split("@")[0])
        picture   = google_user.get("picture", "")

        # 3. Upsert user in MongoDB
        user = UserService.upsert_google_user(google_id, email, name, picture)

        # 4. Mint our own JWT
        jwt_token = create_token(user["id"], email=email, name=name)

        # 5. Redirect to frontend with token
        return RedirectResponse(
            url=f"{FRONTEND_URL}/auth/callback?token={jwt_token}&name={urllib.parse.quote(name)}&email={urllib.parse.quote(email)}&picture={urllib.parse.quote(picture)}"
        )

    except Exception as e:
        logger.error(f"Google OAuth callback error: {e}")
        return RedirectResponse(url=f"{FRONTEND_URL}?auth_error=server_error")


# ── Email / Password Auth ───────────────────────────────────────────────

class AuthRequest(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)

@app.post("/register", tags=["auth"])
async def register(body: AuthRequest):
    """Create a new account with email + password."""
    existing = UserService.get_by_email(body.email.strip().lower())
    if existing:
        raise HTTPException(400, "An account with this email already exists.")
    password_hash = pwd_context.hash(body.password)
    user = UserService.create_email_user(body.email.strip().lower(), password_hash)
    token = create_token(user["id"], email=user["email"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"]}}


@app.post("/login", tags=["auth"])
async def login(body: AuthRequest):
    """Sign in with email + password, returns a JWT."""
    user = UserService.get_by_email(body.email.strip().lower())
    if not user or not user.get("password_hash"):
        raise HTTPException(401, "Invalid email or password.")
    if not pwd_context.verify(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password.")
    token = create_token(user["id"], email=user["email"], name=user.get("name", ""))
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user.get("name", "")}}


@app.get("/auth/me", tags=["auth"])
async def get_me(user_id: str = Depends(verify_token)):
    """Return the current logged-in user's profile."""
    user = UserService.get_by_id(user_id)
    if not user:
        raise HTTPException(404, "User not found")
    # Never expose password_hash
    user.pop("password_hash", None)
    return user



# ── Chat History ───────────────────────────────────────────────────────

# ─── Chat Management (Supabase) ─────────────────────────────────────────

@app.get("/chats", tags=["chats"])
async def list_chats(user_id: str = Depends(verify_token)):
    """Fetch all active chat sessions for the user."""
    try:
        return DBService.get_recent_chats(user_id)
    except Exception as e:
        logger.error(f"Failed to list chats: {e}")
        return []

@app.post("/chats", tags=["chats"])
async def create_new_chat(user_id: str = Depends(verify_token)):
    """Create a fresh chat session."""
    try:
        return DBService.create_chat(user_id)
    except Exception as e:
        logger.error(f"Failed to create chat: {e}")
        raise HTTPException(500, "Could not create chat")

@app.get("/chats/{chat_id}/messages", tags=["chats"])
async def get_messages(chat_id: str, user_id: str = Depends(verify_token)):
    """Fetch all messages for a specific chat."""
    try:
        # Note: Security is handled via verify_token and potentially RLS in DB
        return DBService.get_chat_messages(chat_id)
    except Exception as e:
        logger.error(f"Failed to fetch messages: {e}")
        return []

@app.patch("/chats/{chat_id}", tags=["chats"])
async def update_chat(chat_id: str, body: Dict[str, Any], user_id: str = Depends(verify_token)):
    """Rename or Archive a chat."""
    try:
        if "title" in body:
            return DBService.rename_chat(chat_id, body["title"])
        if "is_archived" in body:
            return DBService.archive_chat(chat_id, body["is_archived"])
        return {"status": "no_changes"}
    except Exception as e:
        logger.error(f"Failed to update chat: {e}")
        raise HTTPException(500, "Update failed")

@app.delete("/chats/{chat_id}", tags=["chats"])
async def delete_chat(chat_id: str, user_id: str = Depends(verify_token)):
    """Permanently delete a chat."""
    try:
        DBService.delete_chat(chat_id)
        return {"status": "deleted"}
    except Exception as e:
        logger.error(f"Failed to delete chat: {e}")
        raise HTTPException(500, "Delete failed")

@app.delete("/chats/all/everything", tags=["chats"])
async def delete_all_history(user_id: str = Depends(verify_token)):
    """Permanently delete all chats for the current user."""
    try:
        DBService.delete_all_chats(user_id)
        return {"status": "all_cleared"}
    except Exception as e:
        logger.error(f"Failed to clear history: {e}")
        raise HTTPException(500, "Clear history failed")

# ─── User Settings ──────────────────────────────────────────────────────

@app.get("/user/settings", tags=["user"])
async def get_settings(user_id: str = Depends(verify_token)):
    try:
        return DBService.get_user_settings(user_id)
    except Exception as e:
        logger.error(f"Failed to fetch settings: {e}")
        return {}

@app.patch("/user/settings", tags=["user"])
async def update_settings(body: Dict[str, Any], user_id: str = Depends(verify_token)):
    try:
        return DBService.update_user_settings(user_id, body)
    except Exception as e:
        logger.error(f"Failed to update settings: {e}")
        raise HTTPException(500, "Update failed")

# ─── Optimized Context & Title Generation ────────────────────────────────

async def generate_chat_title(chat_id: str, first_message: str):
    """Automatically generate a short title for a new chat session."""
    try:
        prompt = f"Generate a very short, concise chat title (max 5 words) for this first message: '{first_message}'. Return ONLY the title, no quotes or extra text."
        completion = await client.chat.completions.create(
            messages=[{"role": "system", "content": "You are a title generator."},
                      {"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.3,
            max_tokens=20,
        )
        title = completion.choices[0].message.content.strip().strip('"')
        DBService.rename_chat(chat_id, title)
    except Exception as e:
        logger.warning(f"Failed to generate title: {e}")







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

def save_to_db(user_email: str, role: str, content: str, session_id: str = None, session_title: str = None, sources: list = None, images: list = None):
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
        if images: data["images"] = images
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
        current_model = MODELS[attempt % len(MODELS)]
        try:
            chat_completion = await client.chat.completions.create(
                messages=messages,
                model=current_model,
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
                current_model = MODELS[attempt % len(MODELS)]
                try:
                    logger.info(f"[stream] attempt {attempt + 1} using model: {current_model}")
                    stream = await client.chat.completions.create(
                        messages=messages,
                        model=current_model,
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
    user_id: str = Depends(verify_token)
):
    """
    Enhanced streaming endpoint with live web search and Supabase persistence.
    """
    # 1. Ensure Chat Session
    if not body.session_id:
        chat = DBService.create_chat(user_id, title=body.message[:50])
        session_id = chat["id"]
        # Generate title asynchronously
        background_tasks.add_task(generate_chat_title, session_id, body.message)
    else:
        session_id = body.session_id

    # 2. Save User Message
    background_tasks.add_task(DBService.save_message, session_id, user_id, "user", body.message)

    queue: asyncio.Queue = asyncio.Queue()

    async def worker():
        full_reply = []
        sources = []
        images = []
        try:
            # Step 1: Emit session ID
            await queue.put(json.dumps({"session_id": session_id}))

            # Step 2: Detect and run web search
            search_result = {"context": "", "sources": [], "images": [], "searched": False}
            if SEARCH_AVAILABLE:
                search_result = await route_and_search(body.message, force=body.force_search)
                sources = search_result.get("sources", [])
                images = search_result.get("images", [])
                context = search_result.get("context", "")
                do_search = search_result.get("searched", False)

                if do_search:
                    await queue.put(json.dumps({
                        "status": "sources_found",
                        "sources": sources,
                        "images": images,
                        "message": f"Found {len(sources)} sources"
                    }))
            else:
                do_search = False
                context = ""

            # Step 3: Build Context from DB (Short-term memory window)
            # This optimizes Groq usage by only sending the last 10 messages
            db_context = DBService.get_optimized_context(session_id, limit=10)
            
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            messages.extend(db_context)
            
            # If search context exists, inject it
            if do_search:
                search_aware = build_search_aware_prompt(SYSTEM_PROMPT, body.message, context, sources, images)
                messages[0] = search_aware[0]

            # Ensure the current message is at the end (if not already in db_context)
            if not db_context or db_context[-1]["content"] != body.message:
                messages.append({"role": "user", "content": body.message})

            # Step 4: Stream AI response
            await queue.put(json.dumps({"status": "generating", "message": "Generating response"}))

            for attempt in range(MAX_RETRIES):
                current_model = MODELS[attempt % len(MODELS)]
                try:
                    stream = await client.chat.completions.create(
                        messages=messages,
                        model=current_model,
                        temperature=0.7,
                        max_tokens=1536,
                        stream=True,
                    )

                    async for chunk in stream:
                        content = chunk.choices[0].delta.content
                        if content:
                            full_reply.append(content)
                            await queue.put(json.dumps({"text": content}))

                    # Save AI reply to DB
                    final_text = "".join(full_reply)
                    if final_text:
                        background_tasks.add_task(
                            DBService.save_message, session_id, user_id, "assistant", final_text, 
                            metadata={"sources": sources, "images": images}
                        )

                    # Step 5: Suggestions
                    try:
                        suggestion_prompt = f"Based on: '{body.message}', generate 3 short follow-up questions. Return ONLY questions, one per line."
                        sug_res = await client.chat.completions.create(
                            model="llama-3.1-8b-instant",
                            messages=[{"role": "user", "content": suggestion_prompt}],
                            max_tokens=100
                        )
                        suggestions = [s.strip() for s in sug_res.choices[0].message.content.split('\n') if s.strip()][:3]
                        if suggestions:
                            await queue.put(json.dumps({"suggestions": suggestions}))
                    except: pass

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
            logger.error(f"Worker error: {e}")
            await queue.put(json.dumps({"error": str(e)[:120]}))
            await queue.put("[DONE]")

    asyncio.create_task(worker())

    async def generate():
        while True:
            item = await queue.get()
            if item == "[DONE]":
                yield "data: [DONE]\n\n"
                break
            yield f"data: {item}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


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
            "module_details": results.get('module_details', {}),
            "recommendations": results['recommendations'],
            "ai_advice": ai_recommendation
        }


    except Exception as e:
        logger.error(f"Detection failed for {url}: {e}")
        raise HTTPException(status_code=400, detail=f"Detection failed: {str(e)[:100]}")

try:
    from vision_engine import analyze_vision_query
    VISION_AVAILABLE = True
except ImportError:
    VISION_AVAILABLE = False

@app.post("/vision/analyze", tags=["vision"])
async def vision_analyze(
    file: UploadFile = File(...), 
    prompt: Optional[str] = Form(None), 
    user: str = Depends(verify_token)
):
    if not VISION_AVAILABLE:
        return {"text": "⚠️ **Vision System Offline**: The backend failed to load required computer vision libraries. Please restart server or check console log."}

    try:
        import base64
        
        content = await file.read()
        user_query = prompt or "Please analyze this image and describe what you see in detail."
        
        # --- 🌐 FALLBACK / DIRECT ROUTE: Groq Cloud Vision ---
        # Triggers if local engines are explicitly disabled, OR missing, OR fail later.
        use_cloud_vision = (os.getenv("DISABLE_VISION_LOCAL", "false").lower() == "true") or not analyze_vision_query
        
        if use_cloud_vision:
            logger.info("📡 Forwarding image direct to Groq Cloud Vision (Zero local compute mode)")
            try:
                base64_image = base64.b64encode(content).decode('utf-8')
                # Use the specific multimodal vision endpoint
                vision_completion = await client.chat.completions.create(
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": user_query},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{base64_image}",
                                    },
                                },
                            ],
                        }
                    ],
                    model="llama-3.2-90b-vision-preview",
                    temperature=0.5,
                    max_tokens=1024,
                )
                reply = vision_completion.choices[0].message.content
                return {
                    "text": reply,
                    "type": "cloud_vision",
                    "objects": []
                }
            except Exception as cloud_err:
                logger.error(f"Cloud Vision API failure: {cloud_err}")
                # Continue to local as absolute last resort if not forced disabled
                if os.getenv("DISABLE_VISION_LOCAL", "false").lower() == "true":
                             raise cloud_err

        # --- 💻 LOCAL LEGACY PROCESSING ---
        if not analyze_vision_query:
             return {"text": "⚠️ **Vision Engine Missing**: Model handler function unavailable."}

        analysis = analyze_vision_query(content)
        
        if analysis.get("error"):
            if "Tesseract OCR not found" in analysis["error"]:
                # INSTEAD of just failing, TRY to automatically rescue it with cloud vision!
                logger.warning("Local OCR failed, attempting dynamic rescue via Groq Cloud Vision...")
                try:
                    base64_image = base64.b64encode(content).decode('utf-8')
                    rescue_completion = await client.chat.completions.create(
                        messages=[{"role": "user","content": [{"type": "text", "text": user_query},{"type": "image_url","image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}]}],
                        model="llama-3.2-90b-vision-preview"
                    )
                    return {"text": rescue_completion.choices[0].message.content, "type": "cloud_vision_rescue", "objects": []}
                except Exception: pass
                return {"text": "⚠️ **System Setup Required**: Tesseract OCR is not installed on the server."}
            return {"text": f"⚠️ {analysis['error']}"}

        if not analysis["has_content"]:
            # DYNAMIC RESCUE AGAIN
            logger.warning("Local vision returned empty, invoking Cloud Vision rescue...")
            try:
                base64_image = base64.b64encode(content).decode('utf-8')
                rescue_completion = await client.chat.completions.create(
                    messages=[{"role": "user","content": [{"type": "text", "text": user_query},{"type": "image_url","image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}]}],
                    model="llama-3.2-90b-vision-preview"
                )
                return {"text": rescue_completion.choices[0].message.content, "type": "cloud_vision_rescue", "objects": []}
            except Exception: pass
            return {"text": "I couldn't identify any clear content. Try taking a clearer picture."}

        # Combine user custom prompt with dynamic visual metadata
        user_query = prompt or "Please explain this content in a simple way."

        if analysis["type"] == "text":
            base_prompt = (
                f"The user has provided an image containing the following extracted text:\n"
                f"--- EXTRACTED TEXT ---\n{analysis['ocr_text']}\n--------------------\n\n"
                f"User's Instruction: {user_query}\n\n"
                f"Respond thoroughly based on the text provided."
            )
        else:
            obj_list = ", ".join(analysis["objects"]) if analysis.get("objects") else "Unknown objects"
            base_prompt = (
                f"The user has provided a photo where I detected these key elements: {obj_list}.\n\n"
                f"User's Question/Instruction: {user_query}\n\n"
                f"Address their instruction using the detected image contents as context."
            )

        # Get AI explanation from Groq (Llama-3.3-70b is great for reasoning)
        completion = await client.chat.completions.create(
            messages=[{"role": "system", "content": "You are an intelligent AI multimodal assistant. Assist the user based on their uploaded image context and custom instruction."},
                      {"role": "user", "content": base_prompt}],
            model=MODELS[0],
            temperature=0.7,
            max_tokens=1000,
        )
        
        return {
            "text": completion.choices[0].message.content,
            "type": analysis["type"],
            "objects": analysis["objects"]
        }

    except Exception as e:
        logger.error(f"Vision analysis failed: {e}")
        # RECOVERABLE: Return the diagnostic directly to chat bubble so user can read the actual traceback!
        return {"text": f"⚠️ **API Processing Failed**: {str(e)}"}
 
