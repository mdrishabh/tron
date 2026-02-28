"""
Main API router — aggregates all sub-routers.
"""
from fastapi import APIRouter

api_router = APIRouter()

from tron.api import agents, flows, campaigns, calls, voices, settings, analytics

api_router.include_router(agents.router, prefix="/agents", tags=["Agents"])
api_router.include_router(flows.router, prefix="/flows", tags=["Flows"])
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["Campaigns"])
api_router.include_router(calls.router, prefix="/calls", tags=["Calls"])
api_router.include_router(voices.router, prefix="/voices", tags=["Voices"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
