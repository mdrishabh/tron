"""
Calls API — individual call management.
"""
import uuid
from typing import List, Optional, Any, Dict
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from tron.core.database import CallModel, AgentModel, get_db
from tron.core.models import CallResponse, DialRequest
from tron.core.call_engine import make_outbound_call, hangup_call, get_active_rooms

router = APIRouter()


def _enrich_call(call: CallModel) -> dict:
    """Convert CallModel to dict with agent_name and duration alias."""
    d = {
        "id": call.id,
        "phone_number": call.phone_number,
        "contact_name": call.contact_name,
        "contact_metadata": call.contact_metadata or {},
        "direction": call.direction,
        "agent_id": call.agent_id,
        "agent_name": call.agent.name if call.agent else None,
        "campaign_id": call.campaign_id,
        "status": call.status,
        "started_at": call.started_at.isoformat() if call.started_at else None,
        "answered_at": call.answered_at.isoformat() if call.answered_at else None,
        "ended_at": call.ended_at.isoformat() if call.ended_at else None,
        "duration": call.duration_seconds,
        "duration_seconds": call.duration_seconds,
        "talk_time_seconds": call.talk_time_seconds,
        "livekit_room": call.livekit_room,
        "recording_url": call.recording_url,
        "transcript": call.transcript or [],
        "summary": call.summary,
        "sentiment": call.sentiment,
        "outcome": call.outcome,
        "extracted_data": call.extracted_data or {},
        "retry_count": call.retry_count,
        "error_message": call.error_message,
        "cost_estimate": call.cost_estimate,
        "created_at": call.created_at.isoformat() if call.created_at else None,
    }
    return d


@router.get("")
async def list_calls(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    search: Optional[str] = None,
    agent_id: Optional[str] = None,
    direction: Optional[str] = None,
    outcome: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(CallModel).options(selectinload(CallModel.agent)).order_by(desc(CallModel.created_at))
    if status:
        query = query.where(CallModel.status == status)
    if agent_id:
        query = query.where(CallModel.agent_id == agent_id)
    if direction:
        query = query.where(CallModel.direction == direction)
    if outcome:
        query = query.where(CallModel.outcome == outcome)
    if search:
        query = query.where(CallModel.phone_number.contains(search))
    query = query.limit(limit).offset(offset)

    result = await db.execute(query)
    calls = result.scalars().all()
    return [_enrich_call(c) for c in calls]


@router.get("/active")
async def list_active_calls(db: AsyncSession = Depends(get_db)):
    """Get currently active calls."""
    result = await db.execute(
        select(CallModel).options(selectinload(CallModel.agent)).where(
            CallModel.status.in_(["ringing", "in_progress"])
        ).order_by(desc(CallModel.started_at))
    )
    calls = result.scalars().all()
    return [_enrich_call(c) for c in calls]


@router.get("/stats")
async def get_call_stats(db: AsyncSession = Depends(get_db)):
    """Get call statistics summary."""
    from sqlalchemy import func
    from datetime import timedelta

    now = datetime.utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    total_result = await db.execute(select(func.count(CallModel.id)))
    total = total_result.scalar() or 0

    today_result = await db.execute(
        select(func.count(CallModel.id)).where(CallModel.created_at >= today)
    )
    today_count = today_result.scalar() or 0

    active_result = await db.execute(
        select(func.count(CallModel.id)).where(
            CallModel.status.in_(["ringing", "in_progress"])
        )
    )
    active = active_result.scalar() or 0

    return {
        "total_calls": total,
        "calls_today": today_count,
        "active_calls": active,
    }


@router.get("/{call_id}")
async def get_call(call_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CallModel).options(selectinload(CallModel.agent)).where(CallModel.id == call_id)
    )
    call = result.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return _enrich_call(call)


class CallUpdate(BaseModel):
    transcript: Optional[List[Dict[str, Any]]] = None
    summary: Optional[str] = None
    outcome: Optional[str] = None
    status: Optional[str] = None
    sentiment: Optional[str] = None
    tags: Optional[List[str]] = None


@router.patch("/{call_id}")
async def update_call(call_id: str, payload: CallUpdate, db: AsyncSession = Depends(get_db)):
    """Update call record — transcript, summary, outcome, etc."""
    result = await db.execute(select(CallModel).where(CallModel.id == call_id))
    call = result.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    if payload.transcript is not None:
        call.transcript = payload.transcript
    if payload.summary is not None:
        call.summary = payload.summary
    if payload.outcome is not None:
        call.outcome = payload.outcome
    if payload.status is not None:
        call.status = payload.status
    if payload.sentiment is not None:
        call.sentiment = payload.sentiment

    await db.commit()
    await db.refresh(call)
    return {"success": True, "call_id": call_id}


@router.post("/dial")
async def dial(payload: DialRequest, db: AsyncSession = Depends(get_db)):
    """Make a single ad-hoc outbound call."""
    # Verify agent exists
    agent_result = await db.execute(select(AgentModel).where(AgentModel.id == payload.agent_id))
    agent = agent_result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Create call record
    call = CallModel(
        id=str(uuid.uuid4()),
        agent_id=payload.agent_id,
        phone_number=payload.phone_number,
        contact_name=payload.contact_name,
        contact_metadata=payload.contact_metadata or {},
        direction="outbound",
        status="queued",
        started_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    db.add(call)
    await db.commit()
    await db.refresh(call)

    # Initiate the call
    try:
        result = await make_outbound_call(
            phone_number=payload.phone_number,
            agent_id=payload.agent_id,
            call_id=call.id,
            contact_name=payload.contact_name,
            contact_metadata=payload.contact_metadata,
        )

        call.status = "ringing"
        call.livekit_room = result.get("room_name")
        await db.commit()
        await db.refresh(call)

        from tron.core.events import event_bus
        await event_bus.publish("call.started", {
            "call_id": call.id,
            "phone_number": payload.phone_number,
            "agent_id": payload.agent_id,
            "livekit_room": result.get("room_name"),
        })

    except Exception as e:
        call.status = "failed"
        call.error_message = str(e)
        call.ended_at = datetime.utcnow()
        await db.commit()
        await db.refresh(call)
        raise HTTPException(status_code=500, detail=f"Call failed: {str(e)}")

    return {
        "call_id": call.id,
        "status": call.status,
        "livekit_room": call.livekit_room,
        "phone_number": call.phone_number,
    }


@router.post("/{call_id}/hangup")
async def hangup(call_id: str, db: AsyncSession = Depends(get_db)):
    """End an active call."""
    result = await db.execute(select(CallModel).where(CallModel.id == call_id))
    call = result.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    if call.livekit_room:
        try:
            await hangup_call(call.livekit_room)
        except Exception as e:
            pass  # Best effort

    call.status = "completed"
    call.ended_at = datetime.utcnow()
    if call.started_at:
        call.duration_seconds = int((call.ended_at - call.started_at).total_seconds())
    await db.commit()

    return {"success": True, "call_id": call_id}
