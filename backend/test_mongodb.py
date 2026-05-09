import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

def test_connection():
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    print(f"Connecting to MongoDB at: {mongo_uri}")
    
    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
        # Trigger server check
        info = client.server_info()
        print("\n[SUCCESS] Successfully connected to MongoDB!")
        print(f"Server version: {info.get('version')}")
        
        db = client["chatmate"]
        col = db["chat_history"]
        
        # Count existing messages
        count = col.count_documents({})
        print(f"Current document count in 'chat_history': {count}")
        
        # Optional: insert test record
        test_doc = {
            "user_email": "test@example.com",
            "role": "user",
            "content": "Hello MongoDB!",
            "created_at": "2026-05-08T15:00:00Z"
        }
        col.insert_one(test_doc)
        print("[SUCCESS] Successfully inserted a test document!")
        
        # Retrieve the test record
        found = col.find_one({"user_email": "test@example.com"})
        print(f"[SUCCESS] Successfully retrieved test document: {found}")
        
        # Clean up test record
        col.delete_one({"user_email": "test@example.com"})
        print("[SUCCESS] Successfully cleaned up the test document!")
        
    except Exception as e:
        print(f"\n[ERROR] Failed to connect to MongoDB: {e}")
        print("\nPlease make sure that:")
        print("1. Your MongoDB server is running (e.g., local MongoDB Community Server or MongoDB Atlas).")
        print("2. MONGO_URI in your .env is correctly configured.")

if __name__ == "__main__":
    test_connection()
