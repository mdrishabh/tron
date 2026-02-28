"""
Database models and initialization using SQLAlchemy async.
"""
import uuid
from collections.abc import AsyncGenerator
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Text, Integer, Float, Boolean, DateTime,
    JSON, Enum as SAEnum, ForeignKey, event
)
from sqlalchemy.orm import DeclarativeBase, relationship, Mapped, mapped_column
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.dialects.sqlite import JSON as SQLiteJSON
import enum


class Base(DeclarativeBase):
    pass


def generate_uuid():
    return str(uuid.uuid4())


class AgentModel(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(100))
    persona: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    voice_id: Mapped[str] = mapped_column(String(50), default="shreya")
    voice_model: Mapped[str] = mapped_column(String(50), default="bulbul:v3-beta")
    voice_speed: Mapped[float] = mapped_column(Float, default=1.0)
    language: Mapped[str] = mapped_column(String(10), default="hi-IN")
    llm_provider: Mapped[str] = mapped_column(String(20), default="ollama")
    llm_model: Mapped[str] = mapped_column(String(100), default="qwen2.5:32b")
    llm_endpoint: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    llm_api_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    llm_temperature: Mapped[float] = mapped_column(Float, default=0.7)
    tone: Mapped[str] = mapped_column(String(20), default="professional")
    max_call_duration: Mapped[int] = mapped_column(Integer, default=300)
    greeting_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    flow_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("flows.id"), nullable=True)
    tools_enabled: Mapped[Optional[dict]] = mapped_column(JSON, default=list)
    guardrails: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    flow = relationship("FlowModel", foreign_keys=[flow_id])
    calls = relationship("CallModel", back_populates="agent", foreign_keys="CallModel.agent_id")
    campaigns = relationship("CampaignModel", back_populates="agent")


class FlowModel(Base):
    __tablename__ = "flows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    canvas_data: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_template: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CampaignStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    running = "running"
    paused = "paused"
    completed = "completed"
    cancelled = "cancelled"


class CampaignModel(Base):
    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(100))
    agent_id: Mapped[str] = mapped_column(String(36), ForeignKey("agents.id"))
    status: Mapped[str] = mapped_column(String(20), default="draft")
    contacts: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    total_contacts: Mapped[int] = mapped_column(Integer, default=0)
    completed_calls: Mapped[int] = mapped_column(Integer, default=0)
    failed_calls: Mapped[int] = mapped_column(Integer, default=0)
    schedule_start: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    schedule_end: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    calling_hours_start: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, default="09:00")
    calling_hours_end: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, default="21:00")
    timezone: Mapped[str] = mapped_column(String(50), default="Asia/Kolkata")
    concurrency: Mapped[int] = mapped_column(Integer, default=1)
    retry_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    retry_max_attempts: Mapped[int] = mapped_column(Integer, default=3)
    retry_delay_minutes: Mapped[int] = mapped_column(Integer, default=30)
    retry_on_no_answer: Mapped[bool] = mapped_column(Boolean, default=True)
    retry_on_busy: Mapped[bool] = mapped_column(Boolean, default=True)
    retry_on_failed: Mapped[bool] = mapped_column(Boolean, default=True)
    caller_id: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    agent = relationship("AgentModel", back_populates="campaigns")
    calls = relationship("CallModel", back_populates="campaign", foreign_keys="CallModel.campaign_id")


class CallStatus(str, enum.Enum):
    queued = "queued"
    ringing = "ringing"
    in_progress = "in_progress"
    completed = "completed"
    failed = "failed"
    no_answer = "no_answer"
    busy = "busy"
    cancelled = "cancelled"


class CallModel(Base):
    __tablename__ = "calls"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    campaign_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("campaigns.id"), nullable=True)
    agent_id: Mapped[str] = mapped_column(String(36), ForeignKey("agents.id"))
    phone_number: Mapped[str] = mapped_column(String(20))
    contact_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    contact_metadata: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="queued")
    direction: Mapped[str] = mapped_column(String(10), default="outbound")
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    answered_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    talk_time_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    sip_call_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    livekit_room: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    twilio_call_sid: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    recording_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    transcript: Mapped[Optional[list]] = mapped_column(JSON, default=list)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sentiment: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    outcome: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    extracted_data: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cost_estimate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    agent = relationship("AgentModel", back_populates="calls", foreign_keys=[agent_id])
    campaign = relationship("CampaignModel", back_populates="calls", foreign_keys=[campaign_id])


class SettingModel(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(50), default="general")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Database engine and session
_engine = None
_session_factory = None


def get_database_url():
    from tron.core.config import settings
    return settings.database_url


async def get_engine():
    global _engine
    if _engine is None:
        db_url = get_database_url()
        # Ensure directory exists for SQLite
        if "sqlite" in db_url:
            import os
            db_path = db_url.replace("sqlite+aiosqlite:///", "").replace("./", "")
            os.makedirs(os.path.dirname(db_path), exist_ok=True)
        _engine = create_async_engine(db_url, echo=False)
    return _engine


async def get_session_factory():
    global _session_factory
    if _session_factory is None:
        engine = await get_engine()
        _session_factory = async_sessionmaker(engine, expire_on_commit=False)
    return _session_factory


async def init_db():
    """Create all tables."""
    engine = await get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncGenerator[AsyncSession]:
    """Dependency for FastAPI routes."""
    factory = await get_session_factory()
    async with factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
