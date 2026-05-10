import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("GEMINI_API_KEY")
print(f"Testing key: {key[:10]}...")

client = Groq(api_key=key)

try:
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": "Hi",
            }
        ],
        model="llama-3.3-70b-versatile",
    )
    print("Success!")
    print(chat_completion.choices[0].message.content)
except Exception as e:
    print(f"Failed: {e}")
