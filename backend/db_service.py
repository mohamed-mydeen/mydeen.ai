"""
db_service.py — MongoDB database service replacing Supabase.

Collections (all inside the 'mydeen' database):
  users         – registered user profiles
  chats         – chat sessions
  messages      – individual messages per chat
  user_settings – per-user preferences
"""

import os
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any

from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.collection import Collection
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME   = "mydeen"

# ── Connection ─────────────────────────────────────────────────────────
_client: Optional[MongoClient] = None

def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    return _client

def get_db():
    return get_client()[DB_NAME]

# ── Collection helpers ─────────────────────────────────────────────────

def users_col() -> Collection:
    return get_db()["users"]

def chats_col() -> Collection:
    return get_db()["chats"]

def messages_col() -> Collection:
    return get_db()["messages"]

def settings_col() -> Collection:
    return get_db()["user_settings"]

# ── Ensure indexes on startup ─────────────────────────────────────────

def ensure_indexes():
    try:
        chats_col().create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])
        messages_col().create_index([("chat_id", ASCENDING), ("created_at", ASCENDING)])
        users_col().create_index("email", unique=True, sparse=True)
        users_col().create_index("google_id", unique=True, sparse=True)
    except Exception as e:
        print(f"[DB] Index creation warning: {e}")


# ── Serialization helper ───────────────────────────────────────────────

def _serialize(doc: dict) -> dict:
    """Convert MongoDB _id to id string."""
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


# ══════════════════════════════════════════════════════════════════════
# User operations
# ══════════════════════════════════════════════════════════════════════

class UserService:

    @staticmethod
    def upsert_google_user(google_id: str, email: str, name: str, picture: str) -> Dict:
        """Create or update a user who logged in via Google OAuth."""
        now = datetime.now(timezone.utc).isoformat()
        col = users_col()
        existing = col.find_one({"google_id": google_id})
        if existing:
            col.update_one(
                {"google_id": google_id},
                {"$set": {"email": email, "name": name, "picture": picture, "last_login": now}}
            )
            return _serialize(col.find_one({"google_id": google_id}))
        else:
            user_id = str(uuid.uuid4())
            doc = {
                "_id": user_id,
                "google_id": google_id,
                "email": email,
                "name": name,
                "picture": picture,
                "provider": "google",
                "created_at": now,
                "last_login": now,
            }
            col.insert_one(doc)
            return _serialize(doc)

    @staticmethod
    def create_email_user(email: str, password_hash: str) -> Dict:
        """Create a new user with email/password."""
        now = datetime.now(timezone.utc).isoformat()
        user_id = str(uuid.uuid4())
        doc = {
            "_id": user_id,
            "email": email,
            "password_hash": password_hash,
            "provider": "email",
            "created_at": now,
            "last_login": now,
        }
        users_col().insert_one(doc)
        return _serialize(doc)

    @staticmethod
    def get_by_email(email: str) -> Optional[Dict]:
        doc = users_col().find_one({"email": email})
        return _serialize(doc) if doc else None

    @staticmethod
    def get_by_id(user_id: str) -> Optional[Dict]:
        doc = users_col().find_one({"_id": user_id})
        return _serialize(doc) if doc else None


# ══════════════════════════════════════════════════════════════════════
# Chat operations
# ══════════════════════════════════════════════════════════════════════

class DBService:

    # ── Chats ──────────────────────────────────────────────────────────

    @staticmethod
    def create_chat(user_id: str, title: str = "New Chat") -> Dict:
        now = datetime.now(timezone.utc).isoformat()
        chat_id = str(uuid.uuid4())
        doc = {
            "_id": chat_id,
            "user_id": user_id,
            "title": title,
            "is_archived": False,
            "is_pinned": False,
            "created_at": now,
            "updated_at": now,
        }
        chats_col().insert_one(doc)
        return _serialize(doc)

    @staticmethod
    def get_recent_chats(user_id: str, limit: int = 50) -> List[Dict]:
        cursor = chats_col().find(
            {"user_id": user_id, "is_archived": False},
            sort=[("updated_at", DESCENDING)],
            limit=limit
        )
        return [_serialize(d) for d in cursor]

    @staticmethod
    def rename_chat(chat_id: str, title: str) -> Dict:
        chats_col().update_one(
            {"_id": chat_id},
            {"$set": {"title": title, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return _serialize(chats_col().find_one({"_id": chat_id}))

    @staticmethod
    def archive_chat(chat_id: str, is_archived: bool = True) -> Dict:
        chats_col().update_one(
            {"_id": chat_id},
            {"$set": {"is_archived": is_archived}}
        )
        return _serialize(chats_col().find_one({"_id": chat_id}))

    @staticmethod
    def delete_chat(chat_id: str):
        chats_col().delete_one({"_id": chat_id})
        messages_col().delete_many({"chat_id": chat_id})

    @staticmethod
    def delete_all_chats(user_id: str):
        chat_ids = [c["_id"] for c in chats_col().find({"user_id": user_id}, {"_id": 1})]
        chats_col().delete_many({"user_id": user_id})
        if chat_ids:
            messages_col().delete_many({"chat_id": {"$in": chat_ids}})

    # ── Messages ────────────────────────────────────────────────────────

    @staticmethod
    def save_message(
        chat_id: str,
        user_id: str,
        role: str,
        content: str,
        message_type: str = "text",
        metadata: Dict = None
    ) -> Dict:
        now = datetime.now(timezone.utc).isoformat()
        msg_id = str(uuid.uuid4())
        doc = {
            "_id": msg_id,
            "chat_id": chat_id,
            "user_id": user_id,
            "role": role,
            "content": content,
            "message_type": message_type,
            "metadata": metadata or {},
            "created_at": now,
        }
        messages_col().insert_one(doc)
        # Update chat timestamp
        chats_col().update_one(
            {"_id": chat_id},
            {"$set": {"updated_at": now}}
        )
        return _serialize(doc)

    @staticmethod
    def get_chat_messages(chat_id: str, limit: int = 50) -> List[Dict]:
        cursor = messages_col().find(
            {"chat_id": chat_id},
            sort=[("created_at", ASCENDING)],
            limit=limit
        )
        return [_serialize(d) for d in cursor]

    @staticmethod
    def get_optimized_context(chat_id: str, limit: int = 10) -> List[Dict]:
        """Returns last N messages formatted for Groq (role + content only)."""
        msgs = DBService.get_chat_messages(chat_id, limit=limit)
        return [{"role": m["role"], "content": m["content"]} for m in msgs]

    # ── User Settings ────────────────────────────────────────────────────

    @staticmethod
    def get_user_settings(user_id: str) -> Dict:
        doc = settings_col().find_one({"user_id": user_id})
        if not doc:
            default = {"user_id": user_id}
            settings_col().insert_one({"_id": str(uuid.uuid4()), **default})
            return default
        return _serialize(doc)

    @staticmethod
    def update_user_settings(user_id: str, settings: Dict) -> Dict:
        settings["updated_at"] = datetime.now(timezone.utc).isoformat()
        settings_col().update_one(
            {"user_id": user_id},
            {"$set": settings},
            upsert=True
        )
        return _serialize(settings_col().find_one({"user_id": user_id}))
