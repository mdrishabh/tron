# TRON — Autonomous AI Telecaller Platform

Tron is an India-first, self-hosted AI telecaller platform that turns any phone number into an intelligent voice agent capable of sales, support, surveys, reminders, and any conversational use case.

**Cost**: ~$0.01–0.03/min vs competitors at $0.07–0.33/min.

## Key Features

- **39 Indian Voices** — Sarvam Bulbul v3 with native Hindi/Hinglish code-switching across 10+ languages
- **Visual Flow Builder** — Drag-and-drop conversation canvas (not just a prompt box)
- **Bring Your Own LLM** — Ollama (free, local), OpenAI, Gemini, or any OpenAI-compatible endpoint
- **Campaign Management** — Batch calling with retry logic, scheduling, and analytics
- **Live Monitoring** — Real-time call dashboard via WebSocket
- **Self-Hosted** — No vendor lock-in on any component

## Architecture

```
Frontend (React + Vite)  ←→  Backend (FastAPI)  ←→  Voice Engine (LiveKit)  ←→  Telephony (Twilio)
                                    │                        │
                               Database (SQLite)        LLM Layer (Ollama / OpenAI / Gemini)
                                                             │
                                                   STT/TTS (Sarvam AI)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, SQLAlchemy, Pydantic |
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| Voice | LiveKit Agents, Sarvam Saaras v3 (STT) + Bulbul v3 (TTS) |
| Telephony | Twilio SIP, LiveKit SIP Trunking |
| LLM | Ollama, OpenAI, Google Gemini |
| Database | SQLite (default), PostgreSQL (production) |

## Prerequisites

- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.ai) (for local LLM inference)

## Quick Start

### 1. Clone & install backend

```bash
git clone https://github.com/mdrishabh/tron.git
cd tron
pip install -r requirements.txt
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
# Required
SARVAM_API_KEY=your_sarvam_key
LIVEKIT_URL=wss://your-livekit-instance.livekit.cloud
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret

# Telephony
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_FROM_NUMBER=+1xxxxxxxxxx

# LLM (pick one or more)
OLLAMA_ENDPOINT=http://localhost:11434
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
```

### 3. Install & build frontend

```bash
cd web
npm install
npm run build
cd ..
```

### 4. Run

```bash
python -m tron
```

The platform launches at **http://localhost:8100** and opens in your browser automatically.

### Frontend dev mode

For hot-reloading during frontend development:

```bash
cd web
npm run dev
```

This starts the Vite dev server at `http://localhost:5173`.

## Project Structure

```
tron/
├── __main__.py          # Entry point (python -m tron)
├── api/                 # FastAPI routes
│   ├── app.py           # App factory & middleware
│   ├── router.py        # API router aggregation
│   ├── agents.py        # Agent CRUD endpoints
│   ├── calls.py         # Call management endpoints
│   ├── campaigns.py     # Campaign endpoints
│   ├── flows.py         # Flow builder endpoints
│   ├── analytics.py     # Analytics endpoints
│   ├── voices.py        # Voice listing endpoints
│   ├── settings.py      # Settings endpoints
│   └── websocket.py     # WebSocket for live updates
├── core/                # Business logic
│   ├── config.py        # Pydantic settings (env vars)
│   ├── database.py      # SQLAlchemy models & DB init
│   ├── models.py        # Pydantic schemas
│   ├── call_engine.py   # LiveKit + Twilio orchestration
│   ├── campaign_manager.py
│   ├── flow_engine.py   # Conversation flow interpreter
│   ├── analytics.py     # Aggregation & reporting
│   └── events.py        # Event bus (WebSocket)
├── voice/               # Voice agent runtime
│   └── agent.py         # LiveKit voice agent
├── web/                 # React frontend
│   ├── src/
│   │   ├── pages/       # Dashboard, Agents, Flows, Campaigns, etc.
│   │   ├── components/  # Shared UI components
│   │   └── lib/         # API client, utilities
│   └── package.json
├── templates/           # Default flow templates
└── data/                # Runtime data (DB, configs)
```

## Competitive Comparison

| Platform | Cost/min | Indian Languages | Visual Builder | Self-hosted LLM | Open Source |
|----------|----------|-----------------|----------------|-----------------|-------------|
| Bland.ai | $0.07–0.09 | No | Yes | No | No |
| Retell.ai | $0.07–0.20 | No | No | No | No |
| Vapi.ai | $0.05–0.10 | No | No | No | No |
| Bolna.ai | $0.03–0.08 | Yes | No | No | Partial |
| **Tron** | **$0.01–0.03** | **39 voices, 10+ langs** | **Yes** | **Yes** | **Yes** |

## License

MIT
