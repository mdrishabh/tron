"""
WebSocket endpoint for real-time events.
"""
import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from tron.core.events import event_bus

logger = logging.getLogger("tron.websocket")

ws_router = APIRouter()


@ws_router.websocket("/ws/tron")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket client connected")

    queue = await event_bus.subscribe()

    try:
        # Send a hello message
        await websocket.send_text('{"event":"connected","data":{"message":"Tron WebSocket connected"}}')

        while True:
            try:
                # Wait for events from the bus (with timeout to allow keepalive)
                message = await asyncio.wait_for(queue.get(), timeout=30.0)
                await websocket.send_text(message)
            except asyncio.TimeoutError:
                # Send keepalive ping
                try:
                    await websocket.send_text('{"event":"ping","data":{}}')
                except Exception:
                    break
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await event_bus.unsubscribe(queue)
