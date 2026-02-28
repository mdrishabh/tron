"""
Event bus for real-time updates via WebSocket.
"""
import asyncio
import json
from typing import Set, Dict, Any
from datetime import datetime


class EventBus:
    """
    Simple in-memory event bus that broadcasts to all connected WebSocket clients.
    """

    def __init__(self):
        self._connections: Set[asyncio.Queue] = set()
        self._lock = asyncio.Lock()

    async def subscribe(self) -> asyncio.Queue:
        """Subscribe to events. Returns a queue to receive events from."""
        queue = asyncio.Queue(maxsize=100)
        async with self._lock:
            self._connections.add(queue)
        return queue

    async def unsubscribe(self, queue: asyncio.Queue):
        async with self._lock:
            self._connections.discard(queue)

    async def publish(self, event: str, data: Dict[str, Any]):
        """Publish an event to all subscribed clients."""
        message = json.dumps({
            "event": event,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        })
        async with self._lock:
            dead = set()
            for q in self._connections:
                try:
                    q.put_nowait(message)
                except asyncio.QueueFull:
                    dead.add(q)
            for q in dead:
                self._connections.discard(q)

    @property
    def subscriber_count(self) -> int:
        return len(self._connections)


# Global event bus instance
event_bus = EventBus()
