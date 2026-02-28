"""
Campaign manager — handles batch calling execution, scheduling, and retries.
"""
import asyncio
import logging
import time
from typing import Optional, Dict, Any
from datetime import datetime, time as dt_time

logger = logging.getLogger("tron.campaign_manager")

# Track running campaign tasks
_running_campaigns: Dict[str, asyncio.Task] = {}


async def start_campaign(campaign_id: str, db_session_factory):
    """Start executing a campaign."""
    if campaign_id in _running_campaigns:
        logger.warning(f"Campaign {campaign_id} is already running")
        return

    task = asyncio.create_task(_run_campaign(campaign_id, db_session_factory))
    _running_campaigns[campaign_id] = task
    logger.info(f"Campaign {campaign_id} started")


async def pause_campaign(campaign_id: str):
    """Pause a running campaign."""
    task = _running_campaigns.get(campaign_id)
    if task and not task.done():
        task.cancel()
        del _running_campaigns[campaign_id]
    logger.info(f"Campaign {campaign_id} paused")


async def resume_campaign(campaign_id: str, db_session_factory):
    """Resume a paused campaign."""
    await start_campaign(campaign_id, db_session_factory)


async def cancel_campaign(campaign_id: str):
    """Cancel a campaign permanently."""
    await pause_campaign(campaign_id)
    logger.info(f"Campaign {campaign_id} cancelled")


def is_within_calling_hours(start_str: str, end_str: str, timezone: str = "Asia/Kolkata") -> bool:
    """Check if current time is within calling hours."""
    try:
        now = datetime.utcnow()
        # Simple UTC+5:30 offset for Asia/Kolkata
        if timezone == "Asia/Kolkata":
            from datetime import timedelta
            now = now + timedelta(hours=5, minutes=30)

        start_h, start_m = map(int, start_str.split(":"))
        end_h, end_m = map(int, end_str.split(":"))
        start_time = dt_time(start_h, start_m)
        end_time = dt_time(end_h, end_m)
        current_time = now.time().replace(second=0, microsecond=0)

        return start_time <= current_time <= end_time
    except Exception as e:
        logger.error(f"Error checking calling hours: {e}")
        return True  # Default to allowing calls if check fails


async def _run_campaign(campaign_id: str, db_session_factory):
    """Execute all calls in a campaign."""
    from tron.core.database import CampaignModel, CallModel, AgentModel
    from tron.core.call_engine import make_outbound_call
    from tron.core.events import event_bus
    from sqlalchemy import select

    logger.info(f"Campaign {campaign_id}: execution starting")

    try:
        async with db_session_factory() as db:
            # Get campaign
            result = await db.execute(select(CampaignModel).where(CampaignModel.id == campaign_id))
            campaign = result.scalar_one_or_none()
            if not campaign:
                logger.error(f"Campaign {campaign_id} not found")
                return

            # Set status to running
            campaign.status = "running"
            await db.commit()
            await db.refresh(campaign)

        contacts = campaign.contacts or []
        concurrency = campaign.concurrency or 1

        # Process contacts in batches
        semaphore = asyncio.Semaphore(concurrency)

        async def call_one(contact: Dict[str, Any]):
            async with semaphore:
                phone = contact.get("phone", "")
                if not phone:
                    return

                # Check calling hours
                if not is_within_calling_hours(
                    campaign.calling_hours_start or "09:00",
                    campaign.calling_hours_end or "21:00",
                    campaign.timezone or "Asia/Kolkata"
                ):
                    logger.info(f"Outside calling hours, waiting...")
                    await asyncio.sleep(300)  # Wait 5 min and try again

                # Create call record
                async with db_session_factory() as db:
                    call = CallModel(
                        campaign_id=campaign_id,
                        agent_id=campaign.agent_id,
                        phone_number=phone,
                        contact_name=contact.get("name"),
                        contact_metadata=contact.get("metadata", {}),
                        direction="outbound",
                        status="queued",
                        started_at=datetime.utcnow(),
                    )
                    db.add(call)
                    await db.commit()
                    await db.refresh(call)
                    call_id = call.id

                # Make the call
                try:
                    result = await make_outbound_call(
                        phone_number=phone,
                        agent_id=campaign.agent_id,
                        call_id=call_id,
                        contact_name=contact.get("name"),
                        contact_metadata=contact.get("metadata", {}),
                    )

                    async with db_session_factory() as db2:
                        result2 = await db2.execute(select(CallModel).where(CallModel.id == call_id))
                        call2 = result2.scalar_one_or_none()
                        if call2:
                            call2.status = "ringing"
                            call2.livekit_room = result.get("room_name")
                            await db2.commit()

                    await event_bus.publish("call.started", {
                        "call_id": call_id,
                        "campaign_id": campaign_id,
                        "phone_number": phone,
                    })

                except Exception as e:
                    logger.error(f"Call to {phone} failed: {e}")
                    async with db_session_factory() as db2:
                        result2 = await db2.execute(select(CallModel).where(CallModel.id == call_id))
                        call2 = result2.scalar_one_or_none()
                        if call2:
                            call2.status = "failed"
                            call2.error_message = str(e)
                            call2.ended_at = datetime.utcnow()
                            await db2.commit()

                    # Update campaign failed count
                    async with db_session_factory() as db3:
                        result3 = await db3.execute(select(CampaignModel).where(CampaignModel.id == campaign_id))
                        camp3 = result3.scalar_one_or_none()
                        if camp3:
                            camp3.failed_calls += 1
                            await db3.commit()

                # Delay between calls
                await asyncio.sleep(2)

        # Run all contacts concurrently (respecting semaphore)
        tasks = [call_one(contact) for contact in contacts]
        await asyncio.gather(*tasks, return_exceptions=True)

        # Mark campaign completed
        async with db_session_factory() as db:
            result = await db.execute(select(CampaignModel).where(CampaignModel.id == campaign_id))
            campaign = result.scalar_one_or_none()
            if campaign and campaign.status == "running":
                campaign.status = "completed"
                await db.commit()

        logger.info(f"Campaign {campaign_id} completed")

    except asyncio.CancelledError:
        logger.info(f"Campaign {campaign_id} was cancelled/paused")
        async with db_session_factory() as db:
            result = await db.execute(
                __import__("sqlalchemy", fromlist=["select"]).select(
                    __import__("tron.core.database", fromlist=["CampaignModel"]).CampaignModel
                ).where(
                    __import__("tron.core.database", fromlist=["CampaignModel"]).CampaignModel.id == campaign_id
                )
            )
        raise

    except Exception as e:
        logger.error(f"Campaign {campaign_id} error: {e}", exc_info=True)

    finally:
        _running_campaigns.pop(campaign_id, None)
