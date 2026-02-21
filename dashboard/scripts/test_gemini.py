
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("No API Key found")
    exit(1)

genai.configure(api_key=api_key)
model_name = 'gemini-2.0-flash'
print(f"Testing Gemini with model: [{model_name}]")

try:
    print("\n--- Available Models ---")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"Name: {m.name}, Display: {m.display_name}")
    
    print(f"\nTesting Gemini with model: [{model_name}]")
    model = genai.GenerativeModel(model_name)
    response = model.generate_content("Hello")
    print("Response:", response.text)
except Exception as e:
    print("Error:", e)
