"""
TRON Voice Agent - LiveKit Agents worker.

Runs as a separate process, connects to LiveKit rooms and handles voice calls.
Uses LiveKit Agents SDK with Sarvam AI for STT/TTS.
"""
from __future__ import annotations

import os
import json
import asyncio
import logging
from typing import Optional

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("tron.voice")


async def build_entrypoint(ctx):
    """LiveKit Agents entrypoint — called for each new room."""
    try:
        # lazy imports so the main API can import this module without livekit installed
        from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli
        from livekit.agents.voice import Agent, AgentSession
        from livekit import rtc

        # Read agent config from room metadata or participant attributes
        job_metadata: dict = {}
        try:
            job_metadata = json.loads(ctx.room.metadata or '{}')
        except Exception:
            pass

        agent_id = job_metadata.get('agent_id') or os.getenv('DEFAULT_AGENT_ID', '')
        call_id = job_metadata.get('call_id', '')

        # Load agent config from DB (if available)
        agent_config = await _load_agent_config(agent_id)

        # Build LLM / STT / TTS
        llm = _build_llm(agent_config)
        stt = _build_stt(agent_config)
        tts = _build_tts(agent_config)

        # Build system prompt
        system_prompt = _build_system_prompt(agent_config)

        class _TronAgent(Agent):
            def __init__(self):
                super().__init__(
                    instructions=system_prompt,
                    stt=stt,
                    llm=llm,
                    tts=tts,
                )

        session = AgentSession(
            turn_detection="stt",
            min_endpointing_delay=0.8,
        )
        await ctx.connect()
        await session.start(agent=_TronAgent(), room=ctx.room)

        # Greet
        greeting = agent_config.get('greeting_text') or "Namaste! Main aapki kaise sahayata kar sakta hoon?"
        await asyncio.sleep(1)
        await session.say(greeting)

        logger.info(f"[TRON] Voice agent started for call {call_id}, room {ctx.room.name}")

    except ImportError as e:
        logger.error(f"[TRON] LiveKit agents not installed: {e}")
    except Exception as e:
        logger.error(f"[TRON] Voice agent error: {e}", exc_info=True)


async def _load_agent_config(agent_id: str) -> dict:
    """Load agent config from TRON database."""
    if not agent_id:
        return {}
    try:
        from tron.core.database import get_engine, AgentModel
        from sqlalchemy.ext.asyncio import AsyncSession
        from sqlalchemy import select

        engine = get_engine()
        async with AsyncSession(engine) as session:
            result = await session.execute(select(AgentModel).where(AgentModel.id == agent_id))
            agent = result.scalar_one_or_none()
            if agent:
                return {
                    'persona': agent.persona,
                    'voice_id': agent.voice_id,
                    'voice_speed': agent.voice_speed,
                    'language': agent.language,
                    'llm_provider': agent.llm_provider,
                    'llm_model': agent.llm_model,
                    'llm_endpoint': agent.llm_endpoint,
                    'llm_api_key': agent.llm_api_key,
                    'llm_temperature': agent.llm_temperature,
                    'greeting_text': agent.greeting_text,
                    'max_call_duration': agent.max_call_duration,
                }
    except Exception as e:
        logger.warning(f"Could not load agent config: {e}")
    return {}


def _build_llm(config: dict):
    """Build LLM from agent config."""
    provider = config.get('llm_provider', 'ollama')
    model = config.get('llm_model', 'qwen2.5:32b')
    temp = config.get('llm_temperature', 0.7)

    if provider == 'ollama':
        from livekit.plugins import openai as lk_openai
        return lk_openai.LLM(
            model=model,
            base_url=os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434') + '/v1',
            api_key='ollama',
            temperature=temp,
        )
    elif provider == 'openai':
        from livekit.plugins import openai as lk_openai
        return lk_openai.LLM(
            model=model,
            api_key=config.get('llm_api_key') or os.getenv('OPENAI_API_KEY', ''),
            temperature=temp,
        )
    elif provider == 'custom':
        from livekit.plugins import openai as lk_openai
        return lk_openai.LLM(
            model=model,
            base_url=config.get('llm_endpoint', ''),
            api_key=config.get('llm_api_key', 'none'),
            temperature=temp,
        )
    else:
        # Default to Ollama
        from livekit.plugins import openai as lk_openai
        return lk_openai.LLM(
            model='qwen2.5:32b',
            base_url='http://localhost:11434/v1',
            api_key='ollama',
        )


def _build_stt(config: dict):
    """Build STT — Sarvam Saaras v3."""
    try:
        from livekit.plugins import sarvam
        return sarvam.STT(
            language=config.get('language', 'unknown'),
            model='saaras:v3',
            mode='transcribe',
            flush_signal=True,
        )
    except ImportError:
        # Fallback to Deepgram if sarvam plugin not available
        try:
            from livekit.plugins import deepgram
            return deepgram.STT()
        except Exception:
            pass
    return None


def _build_tts(config: dict):
    """Build TTS — Sarvam Bulbul v3-beta."""
    try:
        from livekit.plugins import sarvam
        return sarvam.TTS(
            target_language_code=config.get('language', 'hi-IN'),
            model='bulbul:v3-beta',
            speaker=config.get('voice_id', 'shreya'),
        )
    except ImportError:
        try:
            from livekit.plugins import elevenlabs
            return elevenlabs.TTS()
        except Exception:
            pass
    return None


def _build_vad():
    """Build Voice Activity Detection."""
    try:
        from livekit.plugins import silero
        return silero.VAD.load()
    except Exception:
        return None


def _build_system_prompt(config: dict) -> str:
    """Combine persona with guardrails and flow instructions."""
    parts = []
    persona = config.get('persona', '')
    if persona:
        parts.append(persona)
    else:
        parts.append("You are a helpful AI assistant making an outbound call. Be concise and natural. Speak in the same language the user prefers.")

    language = config.get('language', 'hi-IN')
    if language.startswith('hi'):
        parts.append("\nRespond in Hindi by default unless the user speaks in another language. Keep responses short (1-2 sentences max per turn).")
    else:
        parts.append("\nKeep responses short and conversational (1-2 sentences max per turn).")

    # Guardrails
    guardrails = config.get('guardrails', {})
    if isinstance(guardrails, dict):
        forbidden = guardrails.get('forbidden_topics', [])
        if forbidden:
            parts.append(f"\nNever discuss: {', '.join(forbidden)}.")
        disclosures = guardrails.get('required_disclosures', '')
        if disclosures:
            parts.append(f"\nRequired disclosure: {disclosures}")

    return '\n'.join(parts)


def run_worker():
    """Start the LiveKit Agents worker."""
    try:
        from livekit.agents import WorkerOptions, cli
        cli.run_app(WorkerOptions(entrypoint_fnc=build_entrypoint))
    except ImportError:
        logger.error("livekit-agents not installed. Run: pip install livekit-agents")


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    run_worker()
