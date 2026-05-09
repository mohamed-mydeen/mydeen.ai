import os
import asyncio
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

async def test_groq():
    api_key = os.getenv("GEMINI_API_KEY")
    print(f"API Key: {api_key[:10]}...")
    client = AsyncGroq(api_key=api_key)
    try:
        chat_completion = await client.chat.completions.create(
            messages=[{"role": "user", "content": "hi"}],
            model="llama-3.3-70b-versatile",
        )
        print("Success!")
        print(chat_completion.choices[0].message.content)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_groq())
