import requests
import os
from dotenv import load_dotenv

load_dotenv()
model = os.getenv("OLLAMA_MODEL", "deepseek-r1:8b")

print(f"Sending request to Ollama (Model: {model})...")
try:
    payload = {
        "model": model,
        "prompt": "Say hello in 5 words",
        "stream": False
    }
    r = requests.post("http://localhost:11434/api/generate", json=payload, timeout=60)
    print("Status code:", r.status_code)
    if r.status_code == 200:
        print("Response:", r.json().get("response"))
    else:
        print("Error:", r.text)
except Exception as e:
    print("Exception:", e)
print("Done")
