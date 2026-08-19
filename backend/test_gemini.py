import os
from dotenv import load_dotenv
load_dotenv()

from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

try:
    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents="Write one sentence about the importance of sleep",
        config=types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=2000,
        ),
    )
    print("SUCCESS:", response.text)
    print("FINISH REASON:", response.candidates[0].finish_reason)
    print("USAGE:", response.usage_metadata)
except Exception as e:
    print("FULL ERROR:")
    print(repr(e))