"""
Campaigns API — batch calling campaign management.
"""
import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import csv
import io

from tron.core.database import CampaignModel, get_db, get_session_factory
from tron.core.models import CampaignCreate, CampaignUpdate, CampaignResponse
from tron.core import campaign_manager

router = APIRouter()


@router.get("", response_model=List[CampaignResponse])
async def list_campaigns(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CampaignModel).order_by(CampaignModel.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(payload: CampaignCreate, db: AsyncSession = Depends(get_db)):
    data = payload.model_dump()
    contacts = data.get("contacts", [])
    campaign = CampaignModel(
        id=str(uuid.uuid4()),
        **data,
        status="draft",
        total_contacts=len(contacts),
        completed_calls=0,
        failed_calls=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return campaign


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CampaignModel).where(CampaignModel.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.put("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(campaign_id: str, payload: CampaignUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CampaignModel).where(CampaignModel.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(campaign, key, value)
    if "contacts" in update_data:
        campaign.total_contacts = len(update_data["contacts"])
    campaign.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(campaign)
    return campaign


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CampaignModel).where(CampaignModel.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    await db.delete(campaign)
    await db.commit()


@router.post("/{campaign_id}/start", response_model=CampaignResponse)
async def start_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CampaignModel).where(CampaignModel.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status == "running":
        raise HTTPException(status_code=400, detail="Campaign is already running")

    campaign.status = "running"
    campaign.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(campaign)

    # Start campaign in background
    factory = await get_session_factory()
    import asyncio
    asyncio.create_task(campaign_manager.start_campaign(campaign_id, factory))

    return campaign


@router.post("/{campaign_id}/pause", response_model=CampaignResponse)
async def pause_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CampaignModel).where(CampaignModel.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    await campaign_manager.pause_campaign(campaign_id)
    campaign.status = "paused"
    campaign.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(campaign)
    return campaign


@router.post("/{campaign_id}/resume", response_model=CampaignResponse)
async def resume_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CampaignModel).where(CampaignModel.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.status = "running"
    campaign.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(campaign)

    factory = await get_session_factory()
    import asyncio
    asyncio.create_task(campaign_manager.resume_campaign(campaign_id, factory))
    return campaign


@router.post("/{campaign_id}/cancel", response_model=CampaignResponse)
async def cancel_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CampaignModel).where(CampaignModel.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    await campaign_manager.cancel_campaign(campaign_id)
    campaign.status = "cancelled"
    campaign.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(campaign)
    return campaign


@router.post("/{campaign_id}/import-csv")
async def import_csv(
    campaign_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Import contacts from a CSV file."""
    result = await db.execute(select(CampaignModel).where(CampaignModel.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    content = await file.read()
    text = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))

    contacts = []
    for row in reader:
        phone = row.get("phone") or row.get("Phone") or row.get("phone_number") or ""
        if phone:
            contacts.append({
                "phone": phone.strip(),
                "name": row.get("name") or row.get("Name") or "",
                "email": row.get("email") or row.get("Email") or "",
                "metadata": {k: v for k, v in row.items() if k.lower() not in ("phone", "name", "email")}
            })

    campaign.contacts = contacts
    campaign.total_contacts = len(contacts)
    campaign.updated_at = datetime.utcnow()
    await db.commit()

    return {"imported": len(contacts), "contacts": contacts[:5]}  # Preview first 5
