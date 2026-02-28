"""
Pydantic schemas for all Tron entities.
"""
from typing import Optional, List, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field


# ─────────────── Agent Schemas ───────────────

class AgentBase(BaseModel):
    name: str
    persona: Optional[str] = None
    voice_id: str = "shreya"
    voice_model: str = "bulbul:v3-beta"
    voice_speed: float = 1.0
    language: str = "hi-IN"
    llm_provider: str = "ollama"
    llm_model: str = "qwen2.5:32b"
    llm_endpoint: Optional[str] = None
    llm_api_key: Optional[str] = None
    llm_temperature: float = 0.7
    tone: str = "professional"
    max_call_duration: int = 300
    greeting_text: Optional[str] = None
    flow_id: Optional[str] = None
    tools_enabled: List[str] = []
    guardrails: Dict[str, Any] = {}
    is_active: bool = True


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    persona: Optional[str] = None
    voice_id: Optional[str] = None
    voice_model: Optional[str] = None
    voice_speed: Optional[float] = None
    language: Optional[str] = None
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    llm_endpoint: Optional[str] = None
    llm_api_key: Optional[str] = None
    llm_temperature: Optional[float] = None
    tone: Optional[str] = None
    max_call_duration: Optional[int] = None
    greeting_text: Optional[str] = None
    flow_id: Optional[str] = None
    tools_enabled: Optional[List[str]] = None
    guardrails: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class AgentResponse(AgentBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─────────────── Flow Schemas ───────────────

class FlowBase(BaseModel):
    name: str
    description: Optional[str] = None
    canvas_data: Optional[Dict[str, Any]] = None
    is_template: bool = False


class FlowCreate(FlowBase):
    pass


class FlowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    canvas_data: Optional[Dict[str, Any]] = None


class FlowResponse(FlowBase):
    id: str
    version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─────────────── Campaign Schemas ───────────────

class ContactSchema(BaseModel):
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}


class CampaignBase(BaseModel):
    name: str
    agent_id: str
    contacts: List[Dict[str, Any]] = []
    calling_hours_start: str = "09:00"
    calling_hours_end: str = "21:00"
    timezone: str = "Asia/Kolkata"
    concurrency: int = 1
    retry_enabled: bool = True
    retry_max_attempts: int = 3
    retry_delay_minutes: int = 30
    retry_on_no_answer: bool = True
    retry_on_busy: bool = True
    retry_on_failed: bool = True
    caller_id: Optional[str] = None
    schedule_start: Optional[datetime] = None
    schedule_end: Optional[datetime] = None


class CampaignCreate(CampaignBase):
    pass


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    agent_id: Optional[str] = None
    contacts: Optional[List[Dict[str, Any]]] = None
    calling_hours_start: Optional[str] = None
    calling_hours_end: Optional[str] = None
    timezone: Optional[str] = None
    concurrency: Optional[int] = None
    retry_enabled: Optional[bool] = None
    retry_max_attempts: Optional[int] = None
    retry_delay_minutes: Optional[int] = None
    retry_on_no_answer: Optional[bool] = None
    retry_on_busy: Optional[bool] = None
    retry_on_failed: Optional[bool] = None
    caller_id: Optional[str] = None


class CampaignResponse(CampaignBase):
    id: str
    status: str
    total_contacts: int
    completed_calls: int
    failed_calls: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─────────────── Call Schemas ───────────────

class CallBase(BaseModel):
    phone_number: str
    contact_name: Optional[str] = None
    contact_metadata: Optional[Dict[str, Any]] = {}
    direction: str = "outbound"


class CallCreate(CallBase):
    agent_id: str
    campaign_id: Optional[str] = None


class DialRequest(BaseModel):
    agent_id: str
    phone_number: str
    contact_name: Optional[str] = None
    contact_metadata: Optional[Dict[str, Any]] = {}


class CallResponse(CallBase):
    id: str
    agent_id: str
    campaign_id: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None
    answered_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    talk_time_seconds: Optional[int] = None
    livekit_room: Optional[str] = None
    recording_url: Optional[str] = None
    transcript: Optional[List[Dict[str, Any]]] = []
    summary: Optional[str] = None
    sentiment: Optional[str] = None
    outcome: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = {}
    retry_count: int = 0
    error_message: Optional[str] = None
    cost_estimate: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────── Settings Schemas ───────────────

class SettingItem(BaseModel):
    key: str
    value: Any
    category: str = "general"


class SettingsUpdate(BaseModel):
    settings: Dict[str, Any]


class SettingsResponse(BaseModel):
    settings: Dict[str, Any]


# ─────────────── Analytics Schemas ───────────────

class AnalyticsOverview(BaseModel):
    total_calls_today: int
    total_calls_week: int
    success_rate: float
    active_campaigns: int
    avg_duration_seconds: float
    estimated_cost: float


class CallVolumePoint(BaseModel):
    date: str
    count: int


class OutcomeDistribution(BaseModel):
    outcome: str
    count: int
    percentage: float


class AgentPerformance(BaseModel):
    agent_id: str
    agent_name: str
    total_calls: int
    success_rate: float
    avg_duration: float


# ─────────────── Voice Schemas ───────────────

class VoiceInfo(BaseModel):
    id: str
    name: str
    gender: str
    character: str
    best_for: str
    description: str = ""
    language: str = "hi-IN"


# ─────────────── WebSocket Events ───────────────

class WSEvent(BaseModel):
    event: str
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
