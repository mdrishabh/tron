"""
Settings API — platform configuration.
"""
import json
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from tron.core.database import SettingModel, get_db
from datetime import datetime

router = APIRouter()

DEFAULT_SETTINGS = {
    "telephony.twilio_account_sid": "",
    "telephony.twilio_auth_token": "",
    "telephony.from_number": "+18083204948",
    "telephony.sip_trunk_id": "ST_6txqcznvQ6Lk",
    "ai.sarvam_api_key": "",
    "ai.default_llm_provider": "ollama",
    "ai.default_llm_model": "qwen2.5:32b",
    "ai.ollama_endpoint": "http://localhost:11434",
    "ai.openai_api_key": "",
    "ai.gemini_api_key": "",
    "livekit.url": "wss://hawker-agent-yk6o5gvn.livekit.cloud",
    "livekit.api_key": "APIYY5L5qCWyuJZ",
    "livekit.api_secret": "",
    "livekit.outbound_trunk_id": "ST_6txqcznvQ6Lk",
    "general.default_voice": "shreya",
    "general.default_language": "hi-IN",
    "general.default_tone": "professional",
    "general.max_call_duration": 300,
    "general.calling_hours_start": "09:00",
    "general.calling_hours_end": "21:00",
    "general.timezone": "Asia/Kolkata",
}


async def _get_all_settings(db: AsyncSession) -> Dict[str, Any]:
    result = await db.execute(select(SettingModel))
    rows = result.scalars().all()
    settings_dict = dict(DEFAULT_SETTINGS)
    for row in rows:
        try:
            settings_dict[row.key] = json.loads(row.value) if row.value else None
        except (json.JSONDecodeError, TypeError):
            settings_dict[row.key] = row.value
    return settings_dict


@router.get("")
async def get_settings(db: AsyncSession = Depends(get_db)):
    settings = await _get_all_settings(db)
    # Mask sensitive values
    masked = {}
    for key, value in settings.items():
        if isinstance(value, str) and len(value) > 8 and any(
            k in key for k in ("token", "secret", "api_key", "auth")
        ):
            masked[key] = value[:4] + "****" + value[-4:] if len(value) > 8 else "****"
        else:
            masked[key] = value
    return {"settings": masked}


@router.get("/raw")
async def get_settings_raw(db: AsyncSession = Depends(get_db)):
    """Get unmasked settings (internal use)."""
    settings = await _get_all_settings(db)
    return {"settings": settings}


@router.put("")
async def update_settings(body: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    """Update one or more settings."""
    settings_data = body.get("settings", body)  # Accept both formats

    for key, value in settings_data.items():
        result = await db.execute(select(SettingModel).where(SettingModel.key == key))
        row = result.scalar_one_or_none()

        value_str = json.dumps(value) if not isinstance(value, str) else value

        if row:
            row.value = value_str
            row.updated_at = datetime.utcnow()
        else:
            category = key.split(".")[0] if "." in key else "general"
            row = SettingModel(
                key=key,
                value=value_str,
                category=category,
                updated_at=datetime.utcnow(),
            )
            db.add(row)

    await db.commit()

    # Update runtime config
    await _sync_to_runtime_config(settings_data)

    return {"success": True, "updated": list(settings_data.keys())}


async def _sync_to_runtime_config(settings: Dict[str, Any]):
    """Sync saved settings to the runtime config object."""
    from tron.core.config import settings as cfg
    mapping = {
        "livekit.url": "livekit_url",
        "livekit.api_key": "livekit_api_key",
        "livekit.api_secret": "livekit_api_secret",
        "livekit.outbound_trunk_id": "livekit_outbound_trunk_id",
        "telephony.from_number": "twilio_from_number",
        "telephony.twilio_account_sid": "twilio_account_sid",
        "telephony.twilio_auth_token": "twilio_auth_token",
        "ai.sarvam_api_key": "sarvam_api_key",
        "ai.ollama_endpoint": "ollama_endpoint",
        "ai.openai_api_key": "openai_api_key",
        "ai.gemini_api_key": "gemini_api_key",
        "ai.default_llm_provider": "default_llm_provider",
        "ai.default_llm_model": "default_llm_model",
        "general.default_voice": "default_voice",
        "general.default_language": "default_language",
    }
    for setting_key, attr in mapping.items():
        if setting_key in settings and hasattr(cfg, attr):
            setattr(cfg, attr, settings[setting_key])


@router.post("/test-twilio")
async def test_twilio(db: AsyncSession = Depends(get_db)):
    """Test Twilio credentials."""
    settings = await _get_all_settings(db)
    account_sid = settings.get("telephony.twilio_account_sid", "")
    auth_token = settings.get("telephony.twilio_auth_token", "")

    if not account_sid or not auth_token:
        return {"success": False, "message": "Twilio credentials not configured"}

    try:
        from twilio.rest import Client
        client = Client(account_sid, auth_token)
        account = client.api.accounts(account_sid).fetch()
        return {"success": True, "message": f"Connected to Twilio account: {account.friendly_name}"}
    except ImportError:
        return {"success": False, "message": "twilio package not installed. Run: pip install twilio"}
    except Exception as e:
        return {"success": False, "message": str(e)}


@router.post("/test-livekit")
async def test_livekit(db: AsyncSession = Depends(get_db)):
    """Test LiveKit connection."""
    settings = await _get_all_settings(db)
    url = settings.get("livekit.url", "")
    api_key = settings.get("livekit.api_key", "")
    api_secret = settings.get("livekit.api_secret", "")

    if not url or not api_key or not api_secret:
        return {"success": False, "message": "LiveKit credentials not fully configured"}

    try:
        from livekit import api
        from livekit.protocol.room import ListRoomsRequest
        lkapi = api.LiveKitAPI(url=url, api_key=api_key, api_secret=api_secret)
        rooms = await lkapi.room.list_rooms(ListRoomsRequest())
        await lkapi.aclose()
        return {"success": True, "message": f"Connected to LiveKit. Active rooms: {len(rooms.rooms)}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


@router.post("/test-sarvam")
async def test_sarvam(db: AsyncSession = Depends(get_db)):
    """Test Sarvam AI credentials."""
    settings = await _get_all_settings(db)
    api_key = settings.get("ai.sarvam_api_key", "")

    if not api_key:
        return {"success": False, "message": "Sarvam API key not configured"}

    try:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.sarvam.ai/text-to-speech",
                headers={"api-subscription-key": api_key, "Content-Type": "application/json"},
                json={"inputs": ["Hello"], "target_language_code": "hi-IN", "speaker": "shreya", "model": "bulbul:v3"},
                timeout=15.0,
            )
        if resp.status_code == 200:
            return {"success": True, "message": "Sarvam AI connected successfully"}
        else:
            return {"success": False, "message": f"Sarvam returned {resp.status_code}: {resp.text[:200]}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


@router.post("/test-llm")
async def test_llm(body: dict, db: AsyncSession = Depends(get_db)):
    """Test LLM endpoint."""
    provider = body.get("provider", "ollama")
    model = body.get("model", "qwen2.5:32b")
    endpoint = body.get("endpoint", "http://localhost:11434")
    api_key = body.get("api_key", "ollama")

    try:
        import httpx
        base_url = endpoint.rstrip("/")
        if not base_url.endswith("/v1"):
            base_url += "/v1"

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "Say 'OK' in one word."}],
                    "max_tokens": 10,
                    "stream": False,
                },
                timeout=30.0,
            )

        if resp.status_code == 200:
            data = resp.json()
            msg = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return {"success": True, "message": f"LLM connected. Response: {msg[:100]}"}
        else:
            return {"success": False, "message": f"LLM returned {resp.status_code}: {resp.text[:200]}"}
    except Exception as e:
        return {"success": False, "message": str(e)}
