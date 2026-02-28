"""
Analytics API — call statistics and reporting.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from tron.core.database import get_db
from tron.core import analytics

router = APIRouter()


@router.get("/overview")
async def get_overview(days: int = Query(7, ge=1, le=90), db: AsyncSession = Depends(get_db)):
    return await analytics.get_overview(db, days)


@router.get("/calls")
async def get_call_volume(days: int = Query(7, ge=1, le=90), db: AsyncSession = Depends(get_db)):
    return await analytics.get_call_volume(db, days)


@router.get("/outcomes")
async def get_outcome_distribution(days: int = Query(7, ge=1, le=90), db: AsyncSession = Depends(get_db)):
    return await analytics.get_outcome_distribution(db, days)


@router.get("/agents")
async def get_agent_performance(days: int = Query(7, ge=1, le=90), db: AsyncSession = Depends(get_db)):
    return await analytics.get_agent_performance(db, days)
