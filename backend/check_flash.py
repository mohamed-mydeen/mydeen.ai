import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

print("Searching for flash models...")
for m in genai.list_models():
    if 'flash' in m.name.lower():
        print(f"{m.name} - {m.supported_generation_methods}")
