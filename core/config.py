"""
Core configuration — reads from environment variables with sensible defaults.
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

load_dotenv()


class TronSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="TRON_", extra="ignore")

    # Server
    host: str = "0.0.0.0"
    port: int = 8100
    debug: bool = False

    # Database
    database_url: str = "sqlite+aiosqlite:///./tron/data/tron.db"

    # LiveKit
    livekit_url: str = os.getenv("LIVEKIT_URL", "")
    livekit_api_key: str = os.getenv("LIVEKIT_API_KEY", "")
    livekit_api_secret: str = os.getenv("LIVEKIT_API_SECRET", "")
    livekit_outbound_trunk_id: str = os.getenv("LIVEKIT_OUTBOUND_TRUNK_ID", "")

    # Twilio
    twilio_account_sid: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_auth_token: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    twilio_from_number: str = os.getenv("TWILIO_FROM_NUMBER", "")

    # Sarvam
    sarvam_api_key: str = os.getenv("SARVAM_API_KEY", "")

    # Ollama
    ollama_endpoint: str = os.getenv("OLLAMA_ENDPOINT", "http://localhost:11434")

    # OpenAI
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")

    # Gemini
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")

    # Defaults
    default_llm_provider: str = "ollama"
    default_llm_model: str = "qwen2.5:32b"
    default_voice: str = "shreya"
    default_language: str = "hi-IN"
    default_tone: str = "professional"
    max_call_duration: int = 300


settings = TronSettings()
