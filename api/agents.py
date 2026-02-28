"""
Agents API — CRUD for agent configurations.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete

from tron.core.database import AgentModel, get_db
from tron.core.models import AgentCreate, AgentUpdate, AgentResponse
import uuid
from datetime import datetime

router = APIRouter()


@router.get("", response_model=List[AgentResponse])
async def list_agents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentModel).order_by(AgentModel.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(payload: AgentCreate, db: AsyncSession = Depends(get_db)):
    agent = AgentModel(
        id=str(uuid.uuid4()),
        **payload.model_dump(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return agent


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentModel).where(AgentModel.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(agent_id: str, payload: AgentUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentModel).where(AgentModel.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(agent, key, value)
    agent.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(agent)
    return agent


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentModel).where(AgentModel.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    await db.delete(agent)
    await db.commit()


@router.post("/{agent_id}/duplicate", response_model=AgentResponse)
async def duplicate_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentModel).where(AgentModel.id == agent_id))
    original = result.scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=404, detail="Agent not found")

    new_agent = AgentModel(
        id=str(uuid.uuid4()),
        name=f"{original.name} (Copy)",
        persona=original.persona,
        voice_id=original.voice_id,
        voice_model=original.voice_model,
        voice_speed=original.voice_speed,
        language=original.language,
        llm_provider=original.llm_provider,
        llm_model=original.llm_model,
        llm_endpoint=original.llm_endpoint,
        llm_temperature=original.llm_temperature,
        tone=original.tone,
        max_call_duration=original.max_call_duration,
        greeting_text=original.greeting_text,
        flow_id=original.flow_id,
        tools_enabled=original.tools_enabled,
        guardrails=original.guardrails,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(new_agent)
    await db.commit()
    await db.refresh(new_agent)
    return new_agent
