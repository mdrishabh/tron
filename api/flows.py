"""
Flows API — CRUD for conversation flow canvas.
"""
import uuid
import json
import os
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from tron.core.database import FlowModel, get_db
from tron.core.models import FlowCreate, FlowUpdate, FlowResponse
from tron.core.flow_engine import validate_flow

router = APIRouter()

# Template directory
TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")


@router.get("", response_model=List[FlowResponse])
async def list_flows(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FlowModel).where(FlowModel.is_template == False).order_by(FlowModel.created_at.desc())
    )
    return result.scalars().all()


@router.get("/templates", response_model=List[FlowResponse])
async def list_templates(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FlowModel).where(FlowModel.is_template == True).order_by(FlowModel.name)
    )
    return result.scalars().all()


@router.post("", response_model=FlowResponse, status_code=status.HTTP_201_CREATED)
async def create_flow(payload: FlowCreate, db: AsyncSession = Depends(get_db)):
    flow = FlowModel(
        id=str(uuid.uuid4()),
        **payload.model_dump(),
        version=1,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(flow)
    await db.commit()
    await db.refresh(flow)
    return flow


@router.get("/{flow_id}", response_model=FlowResponse)
async def get_flow(flow_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FlowModel).where(FlowModel.id == flow_id))
    flow = result.scalar_one_or_none()
    if not flow:
        raise HTTPException(status_code=404, detail="Flow not found")
    return flow


@router.put("/{flow_id}", response_model=FlowResponse)
async def update_flow(flow_id: str, payload: FlowUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FlowModel).where(FlowModel.id == flow_id))
    flow = result.scalar_one_or_none()
    if not flow:
        raise HTTPException(status_code=404, detail="Flow not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(flow, key, value)
    flow.version += 1
    flow.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(flow)
    return flow


@router.delete("/{flow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flow(flow_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FlowModel).where(FlowModel.id == flow_id))
    flow = result.scalar_one_or_none()
    if not flow:
        raise HTTPException(status_code=404, detail="Flow not found")
    await db.delete(flow)
    await db.commit()


@router.post("/{flow_id}/duplicate", response_model=FlowResponse)
async def duplicate_flow(flow_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FlowModel).where(FlowModel.id == flow_id))
    original = result.scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=404, detail="Flow not found")

    new_flow = FlowModel(
        id=str(uuid.uuid4()),
        name=f"{original.name} (Copy)",
        description=original.description,
        canvas_data=original.canvas_data,
        version=1,
        is_template=False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(new_flow)
    await db.commit()
    await db.refresh(new_flow)
    return new_flow


@router.post("/{flow_id}/validate")
async def validate_flow_endpoint(flow_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FlowModel).where(FlowModel.id == flow_id))
    flow = result.scalar_one_or_none()
    if not flow:
        raise HTTPException(status_code=404, detail="Flow not found")
    return validate_flow(flow.canvas_data)


@router.post("/from-template", response_model=FlowResponse)
async def create_from_template(
    body: dict,
    db: AsyncSession = Depends(get_db)
):
    template_id = body.get("template_id")
    name = body.get("name", "New Flow")

    result = await db.execute(
        select(FlowModel).where(
            FlowModel.id == template_id,
            FlowModel.is_template == True
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    new_flow = FlowModel(
        id=str(uuid.uuid4()),
        name=name,
        description=f"Based on template: {template.name}",
        canvas_data=template.canvas_data,
        version=1,
        is_template=False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(new_flow)
    await db.commit()
    await db.refresh(new_flow)
    return new_flow
