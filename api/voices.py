"""
Voices API — list and preview Sarvam TTS voices with model-based grouping.
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel

from tron.core.models import VoiceInfo

router = APIRouter()


# ─────────── TTS Models ───────────

class TTSModelInfo(BaseModel):
    id: str
    name: str
    provider: str
    description: str
    is_default: bool = False


TTS_MODELS = [
    {
        "id": "bulbul:v3-beta",
        "name": "Bulbul v3 Beta",
        "provider": "sarvam",
        "description": "Latest Sarvam model — best quality, natural prosody. 25 speakers.",
        "is_default": True,
    },
    {
        "id": "bulbul:v2",
        "name": "Bulbul v2",
        "provider": "sarvam",
        "description": "Stable release — fast and reliable. 7 speakers.",
        "is_default": False,
    },
]


# ─────────── Voices grouped by model ───────────
# These MUST match the Sarvam SDK's MODEL_SPEAKER_COMPATIBILITY exactly.
# Only two models are supported: bulbul:v2 and bulbul:v3-beta.

VOICES_BY_MODEL = {
    "bulbul:v3-beta": [
        # Female — Customer Care
        {"id": "shreya",   "name": "Shreya",   "gender": "Female", "character": "Warm, friendly",     "best_for": "Sales, general purpose",  "description": "Warm and approachable — great all-rounder for sales and support calls"},
        {"id": "ritu",     "name": "Ritu",     "gender": "Female", "character": "Authoritative",      "best_for": "Announcements, IVR",      "description": "Confident and commanding — ideal for formal announcements and IVR menus"},
        {"id": "pooja",    "name": "Pooja",    "gender": "Female", "character": "Soft-spoken",        "best_for": "Therapy, counseling",      "description": "Gentle and soothing — perfect for healthcare, counseling, and sensitive calls"},
        {"id": "simran",   "name": "Simran",   "gender": "Female", "character": "Energetic",          "best_for": "Marketing, promos",        "description": "Upbeat and lively — drives excitement for marketing campaigns and promotions"},
        {"id": "kavya",    "name": "Kavya",    "gender": "Female", "character": "Cheerful",           "best_for": "Retail, hospitality",      "description": "Bright and cheerful — makes customers feel welcome in retail and hospitality"},
        {"id": "ishita",   "name": "Ishita",   "gender": "Female", "character": "Calm, professional", "best_for": "Support, healthcare",      "description": "Calm and composed — reassuring voice for customer support and medical calls"},
        {"id": "priya",    "name": "Priya",    "gender": "Female", "character": "Professional",       "best_for": "Corporate, B2B",           "description": "Polished and professional — trusted voice for B2B and corporate communications"},
        # Female — Content Creation
        {"id": "neha",     "name": "Neha",     "gender": "Female", "character": "Confident",          "best_for": "Collections, reminders",   "description": "Firm yet polite — effective for payment reminders and collections"},
        {"id": "roopa",    "name": "Roopa",    "gender": "Female", "character": "Conversational",     "best_for": "Surveys, feedback",        "description": "Natural and chatty — keeps survey conversations flowing smoothly"},
        # Female — International
        {"id": "amelia",   "name": "Amelia",   "gender": "Female", "character": "Western accent",     "best_for": "International calls",      "description": "Western-accented English — suitable for international and NRI audiences"},
        {"id": "sophia",   "name": "Sophia",   "gender": "Female", "character": "Western accent",     "best_for": "International calls",      "description": "Western-accented English — polished voice for global outreach"},
        # Male — Customer Care
        {"id": "shubh",    "name": "Shubh",    "gender": "Male",   "character": "Neutral, clear",     "best_for": "General purpose",          "description": "Clean and neutral male voice — versatile default for any use case"},
        {"id": "rahul",    "name": "Rahul",    "gender": "Male",   "character": "Friendly, warm",     "best_for": "Sales, retention",         "description": "Friendly and relatable — builds rapport in sales and retention calls"},
        {"id": "amit",     "name": "Amit",     "gender": "Male",   "character": "Direct, assertive",  "best_for": "Collections",              "description": "Straightforward and assertive — gets to the point in collection calls"},
        {"id": "ratan",    "name": "Ratan",    "gender": "Male",   "character": "Authoritative",      "best_for": "Government, formal",       "description": "Deep and authoritative — commands respect in formal and government contexts"},
        {"id": "rohan",    "name": "Rohan",    "gender": "Male",   "character": "Casual, youthful",   "best_for": "Young audience",           "description": "Relaxed and youthful — connects naturally with younger demographics"},
        {"id": "dev",      "name": "Dev",      "gender": "Male",   "character": "Confident",          "best_for": "Tech, SaaS",               "description": "Confident and articulate — speaks the language of tech and SaaS"},
        {"id": "manan",    "name": "Manan",    "gender": "Male",   "character": "Calm",               "best_for": "Healthcare",               "description": "Calm and empathetic — trusted voice for healthcare and wellness conversations"},
        {"id": "sumit",    "name": "Sumit",    "gender": "Male",   "character": "Conversational",     "best_for": "Surveys",                  "description": "Easy-going and talkative — keeps respondents engaged during surveys"},
        # Male — Content Creation
        {"id": "aditya",   "name": "Aditya",   "gender": "Male",   "character": "Deep, professional", "best_for": "B2B, enterprise",          "description": "Deep and authoritative — commands trust in enterprise and B2B calls"},
        {"id": "kabir",    "name": "Kabir",    "gender": "Male",   "character": "Young, intellectual","best_for": "Startup, EdTech",          "description": "Young and intellectual — connects with startup and education audiences"},
        {"id": "varun",    "name": "Varun",    "gender": "Male",   "character": "Energetic",          "best_for": "Events, promotions",       "description": "High-energy and persuasive — brings excitement to event and promo calls"},
        {"id": "aayan",    "name": "Aayan",    "gender": "Male",   "character": "Smooth",             "best_for": "Premium brands",           "description": "Smooth and refined — adds a premium feel to luxury brand communications"},
        {"id": "ashutosh", "name": "Ashutosh", "gender": "Male",   "character": "Mature",             "best_for": "Legal, compliance",        "description": "Mature and precise — instills trust in legal and compliance contexts"},
        {"id": "advait",   "name": "Advait",   "gender": "Male",   "character": "Articulate",         "best_for": "Training, education",      "description": "Clear and articulate — excellent for training modules and education"},
    ],
    "bulbul:v2": [
        # Female
        {"id": "anushka",  "name": "Anushka",  "gender": "Female", "character": "Expressive",        "best_for": "Marketing, engagement",    "description": "Expressive and dynamic — captivates listeners in marketing and engagement calls"},
        {"id": "manisha",  "name": "Manisha",  "gender": "Female", "character": "Professional",      "best_for": "Corporate, formal",        "description": "Crisp and professional — suited for corporate announcements and formal calls"},
        {"id": "vidya",    "name": "Vidya",    "gender": "Female", "character": "Warm",              "best_for": "Education, training",      "description": "Warm and articulate — excellent for educational content and training calls"},
        {"id": "arya",     "name": "Arya",     "gender": "Female", "character": "Modern, youthful",  "best_for": "Tech, startups",           "description": "Modern and fresh — resonates with tech-savvy and startup audiences"},
        # Male
        {"id": "abhilash", "name": "Abhilash", "gender": "Male",   "character": "Deep, mature",      "best_for": "B2B, enterprise",          "description": "Deep and mature — carries authority in enterprise and B2B conversations"},
        {"id": "karun",    "name": "Karun",    "gender": "Male",   "character": "Conversational",    "best_for": "General purpose",          "description": "Easy-going and natural — flexible voice for a wide range of use cases"},
        {"id": "hitesh",   "name": "Hitesh",   "gender": "Male",   "character": "Energetic",         "best_for": "Sales, promotions",        "description": "Energetic and persuasive — drives urgency in sales and promotional calls"},
    ],
}

# Flat list for backward compatibility
VOICES = []
_seen = set()
for _model_voices in VOICES_BY_MODEL.values():
    for _v in _model_voices:
        if _v["id"] not in _seen:
            VOICES.append(_v)
            _seen.add(_v["id"])


@router.get("/models", response_model=List[TTSModelInfo])
async def list_tts_models():
    """List available TTS models."""
    return [TTSModelInfo(**m) for m in TTS_MODELS]


@router.get("", response_model=List[VoiceInfo])
async def list_voices(model: Optional[str] = Query(None, description="Filter voices by TTS model")):
    """List voices, optionally filtered by TTS model."""
    if model and model in VOICES_BY_MODEL:
        return [VoiceInfo(**v) for v in VOICES_BY_MODEL[model]]
    return [VoiceInfo(**v) for v in VOICES]


@router.post("/preview")
async def preview_voice(body: dict):
    """Generate a voice preview using Sarvam TTS."""
    voice_id = body.get("voice_id", "shreya")
    text = body.get("text", "Namaste! Main aapki madad karne ke liye yahaan hoon.")
    language = body.get("language", "hi-IN")
    model = body.get("model", "bulbul:v3-beta")

    from tron.core.config import settings
    api_key = settings.sarvam_api_key
    if not api_key:
        raise HTTPException(status_code=400, detail="Sarvam API key not configured. Add it in Settings.")

    import httpx
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.sarvam.ai/text-to-speech",
                headers={
                    "api-subscription-key": api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "inputs": [text],
                    "target_language_code": language,
                    "speaker": voice_id,
                    "model": model,
                    "enable_preprocessing": True,
                },
                timeout=30.0,
            )

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Sarvam TTS error: {response.text}")

        data = response.json()
        audio_b64 = data.get("audios", [None])[0]
        if not audio_b64:
            raise HTTPException(status_code=500, detail="No audio returned from Sarvam")

        import base64
        audio_bytes = base64.b64decode(audio_b64)
        return Response(content=audio_bytes, media_type="audio/wav")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")
