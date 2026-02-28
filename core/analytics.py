"""
Analytics aggregation and reporting.
"""
import logging
from datetime import datetime, timedelta, date
from typing import List, Optional, Dict, Any
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("tron.analytics")


async def get_overview(db: AsyncSession, days: int = 1) -> Dict[str, Any]:
    """Get dashboard overview statistics."""
    from tron.core.database import CallModel, CampaignModel
    from sqlalchemy import cast, Date as SQLDate

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)

    # Calls today
    calls_today_result = await db.execute(
        select(func.count(CallModel.id)).where(
            CallModel.created_at >= today_start
        )
    )
    calls_today = calls_today_result.scalar() or 0

    # Calls this week
    calls_week_result = await db.execute(
        select(func.count(CallModel.id)).where(
            CallModel.created_at >= week_start
        )
    )
    calls_week = calls_week_result.scalar() or 0

    # Success rate (completed calls / total calls this week)
    completed_result = await db.execute(
        select(func.count(CallModel.id)).where(
            and_(
                CallModel.created_at >= week_start,
                CallModel.status == "completed"
            )
        )
    )
    completed = completed_result.scalar() or 0
    success_rate = (completed / calls_week * 100) if calls_week > 0 else 0.0

    # Active campaigns
    active_campaigns_result = await db.execute(
        select(func.count(CampaignModel.id)).where(
            CampaignModel.status == "running"
        )
    )
    active_campaigns = active_campaigns_result.scalar() or 0

    # Average duration
    avg_duration_result = await db.execute(
        select(func.avg(CallModel.duration_seconds)).where(
            and_(
                CallModel.created_at >= week_start,
                CallModel.duration_seconds.isnot(None)
            )
        )
    )
    avg_duration = avg_duration_result.scalar() or 0.0

    # Estimated cost ($0.02/min average)
    total_duration_result = await db.execute(
        select(func.sum(CallModel.duration_seconds)).where(
            CallModel.created_at >= week_start
        )
    )
    total_duration = total_duration_result.scalar() or 0
    estimated_cost = (total_duration / 60) * 0.02

    return {
        "total_calls_today": calls_today,
        "total_calls_week": calls_week,
        "success_rate": round(success_rate, 1),
        "active_campaigns": active_campaigns,
        "avg_duration_seconds": round(avg_duration, 1),
        "estimated_cost": round(estimated_cost, 2),
    }


async def get_call_volume(db: AsyncSession, days: int = 7) -> List[Dict[str, Any]]:
    """Get call volume per day for the last N days."""
    from tron.core.database import CallModel

    now = datetime.utcnow()
    start = now - timedelta(days=days)

    result = await db.execute(
        select(
            func.date(CallModel.created_at).label("date"),
            func.count(CallModel.id).label("count")
        ).where(
            CallModel.created_at >= start
        ).group_by(
            func.date(CallModel.created_at)
        ).order_by("date")
    )
    rows = result.all()

    # Fill in missing days with 0
    date_map = {str(row.date): row.count for row in rows}
    volume = []
    for i in range(days):
        d = (start + timedelta(days=i+1)).date()
        date_str = str(d)
        volume.append({"date": date_str, "count": date_map.get(date_str, 0)})

    return volume


async def get_outcome_distribution(db: AsyncSession, days: int = 7) -> List[Dict[str, Any]]:
    """Get distribution of call outcomes."""
    from tron.core.database import CallModel

    now = datetime.utcnow()
    start = now - timedelta(days=days)

    result = await db.execute(
        select(
            CallModel.outcome.label("outcome"),
            func.count(CallModel.id).label("count")
        ).where(
            and_(
                CallModel.created_at >= start,
                CallModel.outcome.isnot(None)
            )
        ).group_by(CallModel.outcome)
        .order_by(func.count(CallModel.id).desc())
    )
    rows = result.all()

    total = sum(r.count for r in rows)
    distribution = []
    for row in rows:
        distribution.append({
            "outcome": row.outcome or "unknown",
            "count": row.count,
            "percentage": round((row.count / total * 100) if total > 0 else 0, 1)
        })

    return distribution


async def get_agent_performance(db: AsyncSession, days: int = 7) -> List[Dict[str, Any]]:
    """Get per-agent performance metrics."""
    from tron.core.database import CallModel, AgentModel

    now = datetime.utcnow()
    start = now - timedelta(days=days)

    result = await db.execute(
        select(
            AgentModel.id.label("agent_id"),
            AgentModel.name.label("agent_name"),
            func.count(CallModel.id).label("total_calls"),
            func.sum(
                func.iif(CallModel.status == "completed", 1, 0)
            ).label("completed"),
            func.avg(CallModel.duration_seconds).label("avg_duration")
        ).join(
            CallModel, CallModel.agent_id == AgentModel.id, isouter=True
        ).where(
            CallModel.created_at >= start
        ).group_by(AgentModel.id, AgentModel.name)
        .order_by(func.count(CallModel.id).desc())
    )
    rows = result.all()

    performance = []
    for row in rows:
        total = row.total_calls or 0
        completed = row.completed or 0
        performance.append({
            "agent_id": row.agent_id,
            "agent_name": row.agent_name,
            "total_calls": total,
            "success_rate": round((completed / total * 100) if total > 0 else 0, 1),
            "avg_duration": round(row.avg_duration or 0, 1),
        })

    return performance
