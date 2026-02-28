"""
Call engine — makes outbound SIP calls via LiveKit + Twilio.
"""
import asyncio
import logging
import os
import time
from typing import Optional, Dict, Any

logger = logging.getLogger("tron.call_engine")


async def make_outbound_call(
    phone_number: str,
    agent_id: str,
    call_id: str,
    contact_name: Optional[str] = None,
    contact_metadata: Optional[Dict[str, Any]] = None,
    from_number: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Initiate an outbound call via LiveKit SIP → Twilio Elastic SIP Trunk.
    Returns room_name and participant info.
    """
    from tron.core.config import settings
    from livekit import api
    from livekit.protocol.sip import CreateSIPParticipantRequest

    livekit_url = settings.livekit_url
    livekit_api_key = settings.livekit_api_key
    livekit_api_secret = settings.livekit_api_secret
    outbound_trunk_id = settings.livekit_outbound_trunk_id
    caller_id = from_number or settings.twilio_from_number

    # Room name must start with "call-" to match dispatch rule
    timestamp = int(time.time())
    phone_safe = phone_number.replace("+", "").replace(" ", "")
    room_name = f"call-outbound-{phone_safe}-{timestamp}"

    logger.info(f"Making outbound call to {phone_number} via room {room_name}")

    lkapi = api.LiveKitAPI(
        url=livekit_url,
        api_key=livekit_api_key,
        api_secret=livekit_api_secret,
    )

    # Build participant name
    participant_name = contact_name or phone_number

    # Encode agent_id and call_id in participant attributes for the agent to pick up
    attributes = {
        "tron_agent_id": agent_id,
        "tron_call_id": call_id,
        "tron_contact_name": contact_name or "",
        "tron_contact_metadata": str(contact_metadata or {}),
    }

    request = CreateSIPParticipantRequest(
        sip_trunk_id=outbound_trunk_id,
        sip_call_to=phone_number,
        sip_number=caller_id,
        room_name=room_name,
        participant_identity=f"phone-{phone_safe}",
        participant_name=participant_name,
        krisp_enabled=True,
        play_dialtone=True,
        wait_until_answered=False,  # Don't block; let call proceed async
        participant_attributes=attributes,
    )

    try:
        participant = await lkapi.sip.create_sip_participant(request)
        logger.info(f"SIP participant created: {participant.participant_id}")

        # Dispatch the voice agent worker to this room so it can speak
        try:
            from livekit.protocol.agent_dispatch import CreateAgentDispatchRequest
            import json as _json
            dispatch_req = CreateAgentDispatchRequest(
                room=room_name,
                agent_name="hindi-voice-agent",
                metadata=_json.dumps({
                    "agent_id": agent_id,
                    "call_id": call_id,
                    "contact_name": contact_name or "",
                }),
            )
            dispatch = await lkapi.agent_dispatch.create_dispatch(dispatch_req)
            logger.info(f"Agent dispatched: {dispatch.dispatch_id if hasattr(dispatch, 'dispatch_id') else 'ok'}")
        except Exception as dispatch_err:
            logger.warning(f"Agent dispatch failed (worker may auto-pick up): {dispatch_err}")

        await lkapi.aclose()

        return {
            "room_name": room_name,
            "participant_id": participant.participant_id,
            "success": True,
        }
    except Exception as e:
        logger.error(f"Failed to create SIP participant: {e}")
        await lkapi.aclose()
        raise


async def hangup_call(room_name: str):
    """End a call by deleting the LiveKit room."""
    from tron.core.config import settings
    from livekit import api

    lkapi = api.LiveKitAPI(
        url=settings.livekit_url,
        api_key=settings.livekit_api_key,
        api_secret=settings.livekit_api_secret,
    )

    try:
        await lkapi.room.delete_room(api.DeleteRoomRequest(room=room_name))
        logger.info(f"Room {room_name} deleted")
    except Exception as e:
        logger.error(f"Error deleting room {room_name}: {e}")
    finally:
        await lkapi.aclose()


async def get_active_rooms() -> list:
    """Get list of active call rooms from LiveKit."""
    from tron.core.config import settings
    from livekit import api
    from livekit.protocol.room import ListRoomsRequest

    lkapi = api.LiveKitAPI(
        url=settings.livekit_url,
        api_key=settings.livekit_api_key,
        api_secret=settings.livekit_api_secret,
    )

    try:
        result = await lkapi.room.list_rooms(ListRoomsRequest())
        rooms = [r for r in result.rooms if r.name.startswith("call-")]
        await lkapi.aclose()
        return rooms
    except Exception as e:
        logger.error(f"Error listing rooms: {e}")
        await lkapi.aclose()
        return []
