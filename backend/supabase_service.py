import os
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import List, Dict, Optional, Any
from datetime import datetime
import uuid

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # Use service role for backend logic

if not SUPABASE_URL or not SUPABASE_KEY:
    print("WARNING: Supabase credentials missing from .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

class DBService:
    @staticmethod
    def get_user_profile(user_id: str) -> Optional[Dict]:
        response = supabase.table("profiles").select("*").eq("id", user_id).execute()
        return response.data[0] if response.data else None

    @staticmethod
    def create_chat(user_id: str, title: str = "New Chat") -> Dict:
        data = {
            "user_id": user_id,
            "title": title,
            "is_archived": False,
            "is_pinned": False
        }
        response = supabase.table("chats").insert(data).execute()
        return response.data[0]

    @staticmethod
    def get_recent_chats(user_id: str, limit: int = 50) -> List[Dict]:
        response = supabase.table("chats") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("is_archived", False) \
            .order("updated_at", desc=True) \
            .limit(limit) \
            .execute()
        return response.data

    @staticmethod
    def rename_chat(chat_id: str, title: str) -> Dict:
        response = supabase.table("chats").update({"title": title, "updated_at": "now()"}).eq("id", chat_id).execute()
        return response.data[0]

    @staticmethod
    def archive_chat(chat_id: str, is_archived: bool = True) -> Dict:
        response = supabase.table("chats").update({"is_archived": is_archived}).eq("id", chat_id).execute()
        return response.data[0]

    @staticmethod
    def delete_chat(chat_id: str):
        supabase.table("chats").delete().eq("id", chat_id).execute()

    @staticmethod
    def save_message(chat_id: str, user_id: str, role: str, content: str, message_type: str = "text", metadata: Dict = None) -> Dict:
        data = {
            "chat_id": chat_id,
            "user_id": user_id,
            "role": role,
            "content": content,
            "message_type": message_type,
            "metadata": metadata or {}
        }
        response = supabase.table("messages").insert(data).execute()
        
        # Update chat timestamp
        supabase.table("chats").update({"updated_at": "now()"}).eq("id", chat_id).execute()
        
        return response.data[0]

    @staticmethod
    def get_chat_messages(chat_id: str, limit: int = 50) -> List[Dict]:
        response = supabase.table("messages") \
            .select("*") \
            .eq("chat_id", chat_id) \
            .order("created_at", desc=True) \
            .limit(limit) \
            .execute()
        # Return in chronological order
        return sorted(response.data, key=lambda x: x['created_at'])

    @staticmethod
    def get_optimized_context(chat_id: str, limit: int = 10) -> List[Dict]:
        """Loads only the last N messages for Groq context to save tokens."""
        messages = DBService.get_chat_messages(chat_id, limit=limit)
        context = []
        for msg in messages:
            context.append({"role": msg["role"], "content": msg["content"]})
        return context

    @staticmethod
    def get_user_settings(user_id: str) -> Dict:
        response = supabase.table("user_settings").select("*").eq("user_id", user_id).execute()
        if not response.data:
            # Create default settings if none exist
            default_settings = {"user_id": user_id}
            response = supabase.table("user_settings").insert(default_settings).execute()
            return response.data[0]
        return response.data[0]

    @staticmethod
    def update_user_settings(user_id: str, settings: Dict) -> Dict:
        settings["updated_at"] = "now()"
        response = supabase.table("user_settings").update(settings).eq("user_id", user_id).execute()
        return response.data[0]

    @staticmethod
    def save_attachment(user_id: str, chat_id: str, file_name: str, file_type: str, storage_path: str, metadata: Dict = None) -> Dict:
        data = {
            "user_id": user_id,
            "chat_id": chat_id,
            "file_name": file_name,
            "file_type": file_type,
            "storage_path": storage_path,
            "metadata": metadata or {}
        }
        response = supabase.table("attachments").insert(data).execute()
        return response.data[0]
