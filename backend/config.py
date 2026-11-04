from pathlib import Path
import os
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env.local")
DATA = ROOT / "data"
ARTIFACTS = ROOT / "artifacts"


def setting(name):
    value = os.getenv(name, "").strip()
    return "" if value == "replace_me" or "YOUR_PROJECT_REF" in value else value


JAMENDO_CLIENT_ID = setting("JAMENDO_CLIENT_ID")
SUPABASE_URL = setting("SUPABASE_URL")
SUPABASE_PUBLISHABLE_KEY = setting("SUPABASE_PUBLISHABLE_KEY")
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173"
).split(",")
