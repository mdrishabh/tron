# TRON — Autonomous AI Telecaller Platform

## Vision

Tron is an India-first, self-hosted AI telecaller platform that turns any phone number into an intelligent agent capable of sales, support, therapy, surveys, reminders, and any conversational use case — at a fraction of the cost of Bland.ai, Retell.ai, or Vapi.ai.

**Cost advantage**: Self-hosted Ollama + Sarvam AI = ~$0.01-0.03/min vs competitors at $0.07-0.33/min.

**Why Tron wins**:
- 39 Indian voices (Sarvam Bulbul v3) with native Hindi/Hinglish code-switching
- Visual conversation flow builder (Pathways) — not just a prompt box
- Bring-your-own LLM: Ollama (free), OpenAI, Gemini, or any OpenAI-compatible endpoint
- Works as standalone localhost app AND as a Beast webapp module
- Full batch campaign management with retry logic, scheduling, and analytics
- Open architecture — no vendor lock-in on any component

---

## Competitive Landscape

| Platform | Cost/min | Indian Languages | Visual Builder | Self-hosted LLM | Open Source |
|----------|----------|-----------------|----------------|-----------------|-------------|
| Bland.ai | $0.07-0.09 | No | Yes (Pathways) | No | No |
| Retell.ai | $0.07-0.20 | No | Form-based | No | No |
| Vapi.ai | $0.05-0.10 | No | Form-based | No | No |
| Synthflow | $0.08-0.13 | No | Template-based | No | No |
| Bolna.ai | $0.03-0.08 | 10+ languages | No | No | Partial |
| **Tron** | **$0.01-0.03** | **39 voices, 10+ langs** | **Yes (Canvas)** | **Yes (Ollama)** | **Yes** |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         TRON PLATFORM                                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌────────────┐  │
│  │   Frontend   │   │   Backend   │   │ Voice Engine │   │  Telephony │  │
│  │   (React)    │◄─►│  (FastAPI)  │◄─►│  (LiveKit)   │◄─►│  (Twilio)  │  │
│  └─────────────┘   └──────┬──────┘   └──────┬──────┘   └────────────┘  │
│                           │                  │                           │
│                    ┌──────┴──────┐    ┌──────┴──────┐                   │
│                    │  Database   │    │  LLM Layer  │                   │
│                    │ (Postgres) │    │ Ollama/OAI/ │                   │
│                    │             │    │ Gemini/Any  │                   │
│                    └─────────────┘    └─────────────┘                   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                      STT / TTS Layer                                ││
│  │  Sarvam Saaras v3 (STT) + Bulbul v3 (TTS) — 39 Indian voices     ││
│  │  Auto language detection · Hindi/English/Hinglish code-switching   ││
│  └─────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘
```

### Dual-Mode Architecture

Tron runs in two modes from the same codebase:

**1. Standalone Mode** (`python -m tron`)
- Launches FastAPI server on localhost:8100
- Opens browser-based control panel
- Self-contained — no Beast installation needed
- All config stored in `tron/data/` (postgres DB, agent configs, call logs)

**2. Beast Module Mode** (integrated)
- Registers as a Beast module via `src/modules/tron/`
- Routes mounted at `/api/tron/*` on the existing Beast API server
- Uses Beast's existing database, auth, and middleware
- Accessible from Beast mobile app as a new tab

```
tron/                          # Standalone package root
├── __init__.py                 # Package init + version
├── __main__.py                 # Entry point: python -m tron
├── PLAN.md                     # This file
│
├── core/                       # Core business logic (shared between modes)
│   ├── __init__.py
│   ├── config.py               # Settings (Pydantic) — env vars + defaults
│   ├── database.py             # SQLAlchemy models + DB init (postgres or Postgres)
│   ├── models.py               # Pydantic schemas for all entities
│   ├── agent_registry.py       # CRUD for agent configurations
│   ├── campaign_manager.py     # Batch call campaigns, scheduling, retry logic
│   ├── call_engine.py          # LiveKit SIP + Twilio call orchestration
│   ├── flow_engine.py          # Conversation flow interpreter (reads canvas JSON)
│   ├── analytics.py            # Call analytics, aggregation, reporting
│   └── events.py               # Event bus for real-time updates (SSE/WebSocket)
│
├── voice/                      # Voice agent runtime
│   ├── __init__.py
│   ├── agent.py                # LiveKit Agent (TronVoiceAgent) — the brain
│   ├── prompts.py              # System prompt builder from flow + persona config
│   ├── tools.py                # Callable tools agent can use mid-conversation
│   ├── hooks.py                # Lifecycle hooks: on_call_start, on_call_end, etc.
│   └── worker.py               # LiveKit worker entrypoint (registers with cloud)
│
├── api/                        # FastAPI routes (works standalone or mounted in Beast)
│   ├── __init__.py
│   ├── router.py               # Main router aggregator
│   ├── agents.py               # CRUD: /api/tron/agents
│   ├── campaigns.py            # CRUD + actions: /api/tron/campaigns
│   ├── calls.py                # Call control: /api/tron/calls
│   ├── flows.py                # Flow canvas CRUD: /api/tron/flows
│   ├── voices.py               # Voice listing + preview: /api/tron/voices
│   ├── settings.py             # Platform settings: /api/tron/settings
│   ├── analytics.py            # Analytics data: /api/tron/analytics
│   └── websocket.py            # Real-time events: /ws/tron
│
├── web/                        # Frontend (React SPA served by FastAPI)
│   ├── index.html              # Entry point
│   ├── package.json            # React + dependencies
│   ├── vite.config.ts          # Vite config
│   ├── tsconfig.json
│   ├── tailwind.config.js      # Tailwind CSS config
│   ├── src/
│   │   ├── main.tsx            # React entry
│   │   ├── App.tsx             # Root app with router
│   │   ├── index.css           # Global styles + Tailwind
│   │   │
│   │   ├── components/         # Reusable UI components
│   │   │   ├── Layout.tsx          # Full-width shell: sidebar + main content
│   │   │   ├── Sidebar.tsx         # Navigation sidebar with icon links
│   │   │   ├── Header.tsx          # Top bar with breadcrumb + actions
│   │   │   ├── Card.tsx            # Info card component
│   │   │   ├── Badge.tsx           # Status badges
│   │   │   ├── Modal.tsx           # Modal dialogs
│   │   │   ├── Table.tsx           # Data tables with sorting/filtering
│   │   │   ├── EmptyState.tsx      # Empty state with icon + instructions
│   │   │   ├── Tooltip.tsx         # Contextual help tooltips
│   │   │   ├── InstructionBanner.tsx  # Blue info banners with icon + text
│   │   │   └── VoicePreview.tsx    # Audio preview player for voices
│   │   │
│   │   ├── pages/              # Route pages
│   │   │   ├── Dashboard.tsx       # Overview: active calls, campaigns, stats
│   │   │   ├── AgentBuilder.tsx    # Create/edit agent configuration
│   │   │   ├── FlowCanvas.tsx      # Drag-and-drop conversation flow builder
│   │   │   ├── VoiceLab.tsx        # Voice selection, preview, configuration
│   │   │   ├── Campaigns.tsx       # Campaign list + management
│   │   │   ├── CampaignDetail.tsx  # Single campaign: contacts, progress, logs
│   │   │   ├── CallHistory.tsx     # All calls with filters, recordings, transcripts
│   │   │   ├── CallDetail.tsx      # Single call: timeline, transcript, sentiment
│   │   │   ├── LiveMonitor.tsx     # Real-time: active calls, live transcripts
│   │   │   ├── Analytics.tsx       # Charts: call volume, duration, outcomes
│   │   │   ├── Settings.tsx        # API keys, SIP config, defaults
│   │   │   └── TestCall.tsx        # Quick test: pick agent + enter number + call
│   │   │
│   │   ├── canvas/             # Flow canvas specific components
│   │   │   ├── Canvas.tsx          # Main canvas with pan/zoom
│   │   │   ├── Node.tsx            # Base node component
│   │   │   ├── Edge.tsx            # Connection lines between nodes
│   │   │   ├── NodePalette.tsx     # Left sidebar: draggable node types
│   │   │   ├── NodeInspector.tsx   # Right sidebar: selected node config
│   │   │   ├── nodes/             # Node type implementations
│   │   │   │   ├── StartNode.tsx       # Entry point (trigger: inbound/outbound)
│   │   │   │   ├── GreetingNode.tsx    # Initial greeting message
│   │   │   │   ├── ListenNode.tsx      # Wait for user speech
│   │   │   │   ├── SpeakNode.tsx       # TTS output with template variables
│   │   │   │   ├── BranchNode.tsx      # Conditional: route by intent/keyword/sentiment
│   │   │   │   ├── LLMNode.tsx         # Free-form LLM response with instructions
│   │   │   │   ├── TransferNode.tsx    # Transfer call to human/other number
│   │   │   │   ├── WebhookNode.tsx     # HTTP call to external API mid-conversation
│   │   │   │   ├── WaitNode.tsx        # Pause for N seconds
│   │   │   │   ├── RecordNode.tsx      # Start/stop recording
│   │   │   │   ├── DTMFNode.tsx        # Listen for keypad input
│   │   │   │   ├── SetVariableNode.tsx # Store data extracted from conversation
│   │   │   │   ├── EndCallNode.tsx     # Hang up with optional closing message
│   │   │   │   └── RetryNode.tsx       # Retry logic for failed responses
│   │   │   └── types.ts           # TypeScript types for canvas data model
│   │   │
│   │   ├── hooks/              # React hooks
│   │   │   ├── useApi.ts          # API client with auth
│   │   │   ├── useWebSocket.ts    # Real-time event subscription
│   │   │   ├── useCanvas.ts       # Canvas state management (zustand)
│   │   │   └── useCalls.ts        # Call state + polling
│   │   │
│   │   ├── stores/             # Zustand state stores
│   │   │   ├── agentStore.ts      # Agent configurations
│   │   │   ├── canvasStore.ts     # Flow canvas state (nodes, edges, selection)
│   │   │   ├── callStore.ts       # Active calls + history
│   │   │   └── settingsStore.ts   # User preferences + API keys
│   │   │
│   │   └── lib/                # Utilities
│   │       ├── api.ts             # Fetch wrapper
│   │       ├── constants.ts       # Voice lists, node types, etc.
│   │       └── utils.ts           # Formatting, validation helpers
│   │
│   └── public/
│       └── icons/              # SVG icons for node types
│
├── data/                       # Runtime data (gitignored)
│   ├── tron.db                 # Postgres database
│   ├── recordings/             # Call recordings (WAV/MP3)
│   └── exports/                # Exported campaign reports
│
├── templates/                  # Pre-built agent templates
│   ├── sales_agent.json
│   ├── support_agent.json
│   ├── appointment_setter.json
│   ├── survey_bot.json
│   ├── payment_reminder.json
│   ├── therapist.json
│   ├── lead_qualifier.json
│   └── cod_confirmation.json
│
└── tests/
    ├── test_flow_engine.py
    ├── test_call_engine.py
    ├── test_campaign.py
    └── test_api.py
```

---

## Database Schema

### agents
Stores agent configurations — the "who" of the telecaller.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(100) | Display name ("Sales Closer", "Ananya Support") |
| persona | TEXT | System prompt defining personality, role, knowledge |
| voice_id | VARCHAR(50) | Sarvam voice: shreya, ritu, aditya, rahul, etc. |
| voice_speed | FLOAT | Speech rate multiplier (0.5x - 2.0x) |
| language | VARCHAR(10) | Primary language: hi-IN, en-IN, ta-IN, etc. |
| llm_provider | VARCHAR(20) | "ollama", "openai", "gemini", "custom" |
| llm_model | VARCHAR(100) | Model name: "qwen2.5:32b", "gpt-4o-mini", etc. |
| llm_endpoint | VARCHAR(255) | Custom endpoint URL (for "custom" provider) |
| llm_api_key | VARCHAR(255) | API key (encrypted at rest, nullable for Ollama) |
| llm_temperature | FLOAT | Temperature (0.0 - 2.0, default 0.7) |
| tone | VARCHAR(20) | "professional", "friendly", "casual", "formal", "empathetic" |
| max_call_duration | INT | Max seconds per call (default 300 = 5 min) |
| greeting_text | TEXT | What to say when call connects (overridable by flow) |
| flow_id | UUID FK | Linked conversation flow (nullable — freeform if none) |
| tools_enabled | JSON | List of enabled tool names ["check_order", "book_slot"] |
| guardrails | JSON | {"forbidden_topics": [...], "required_disclosures": [...]} |
| is_active | BOOL | Enabled/disabled |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### flows
Conversation flow definitions (canvas JSON).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(100) | Flow name ("Cold Call Sales v2") |
| description | TEXT | What this flow does |
| canvas_data | JSON | Full canvas state: nodes, edges, positions |
| version | INT | Auto-incrementing version for change tracking |
| is_template | BOOL | Whether this is a built-in template |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### campaigns
Batch calling campaigns.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(100) | Campaign name ("Feb 2026 Renewal Drive") |
| agent_id | UUID FK | Which agent to use |
| status | ENUM | "draft", "scheduled", "running", "paused", "completed", "cancelled" |
| contacts | JSON | Array of {phone, name, metadata} objects |
| total_contacts | INT | Count of contacts |
| completed_calls | INT | Successfully completed calls |
| failed_calls | INT | Failed calls |
| schedule_start | DATETIME | When to start calling (nullable = immediately) |
| schedule_end | DATETIME | Stop calling after this time |
| calling_hours_start | TIME | Earliest time to call (e.g., 09:00) |
| calling_hours_end | TIME | Latest time to call (e.g., 21:00) |
| timezone | VARCHAR(50) | Contact timezone ("Asia/Kolkata") |
| concurrency | INT | Max simultaneous calls (default 1) |
| retry_enabled | BOOL | Retry failed/unanswered calls |
| retry_max_attempts | INT | Max retry attempts (default 3) |
| retry_delay_minutes | INT | Wait between retries (default 30) |
| retry_on_no_answer | BOOL | Retry if no answer |
| retry_on_busy | BOOL | Retry if busy |
| retry_on_failed | BOOL | Retry if SIP failure |
| caller_id | VARCHAR(20) | From number |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### calls
Individual call records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campaign_id | UUID FK | Parent campaign (nullable for ad-hoc calls) |
| agent_id | UUID FK | Agent used |
| phone_number | VARCHAR(20) | Called number |
| contact_name | VARCHAR(100) | Contact name if known |
| contact_metadata | JSON | Custom fields passed to the agent |
| status | ENUM | "queued", "ringing", "in_progress", "completed", "failed", "no_answer", "busy", "cancelled" |
| direction | ENUM | "outbound", "inbound" |
| started_at | DATETIME | Call start time |
| answered_at | DATETIME | When callee picked up |
| ended_at | DATETIME | Call end time |
| duration_seconds | INT | Total call duration |
| talk_time_seconds | INT | Actual conversation time (excluding ring) |
| sip_call_id | VARCHAR(100) | LiveKit SIP participant ID |
| livekit_room | VARCHAR(100) | LiveKit room name |
| twilio_call_sid | VARCHAR(50) | Twilio call SID |
| recording_url | VARCHAR(500) | Path to call recording |
| transcript | JSON | Full conversation transcript [{role, text, timestamp}] |
| summary | TEXT | LLM-generated call summary |
| sentiment | VARCHAR(20) | Overall sentiment: positive, neutral, negative |
| outcome | VARCHAR(50) | Call outcome: "interested", "not_interested", "callback", "wrong_number", etc. |
| extracted_data | JSON | Data extracted during call (name, email, order_id, etc.) |
| retry_count | INT | How many times this number was retried |
| error_message | TEXT | Error details if failed |
| cost_estimate | FLOAT | Estimated cost in USD |
| created_at | DATETIME | |

### settings
Platform-wide settings (key-value).

| Column | Type | Description |
|--------|------|-------------|
| key | VARCHAR(100) PK | Setting name |
| value | TEXT | JSON-encoded value |
| category | VARCHAR(50) | "telephony", "ai", "general" |
| updated_at | DATETIME | |

Default settings:
- `telephony.twilio_account_sid`
- `telephony.twilio_auth_token`
- `telephony.from_number`
- `telephony.sip_trunk_id`
- `ai.sarvam_api_key`
- `ai.default_llm_provider`
- `ai.default_llm_model`
- `ai.ollama_endpoint`
- `ai.openai_api_key`
- `ai.gemini_api_key`
- `livekit.url`
- `livekit.api_key`
- `livekit.api_secret`
- `livekit.outbound_trunk_id`

---

## API Design

All endpoints prefixed with `/api/tron/`. RESTful design with consistent patterns.

### Agents

```
GET    /api/tron/agents                  List all agents
POST   /api/tron/agents                  Create agent
GET    /api/tron/agents/:id              Get agent details
PUT    /api/tron/agents/:id              Update agent
DELETE /api/tron/agents/:id              Delete agent
POST   /api/tron/agents/:id/duplicate    Clone an agent
POST   /api/tron/agents/:id/test-call    Quick test call with this agent
```

### Flows (Canvas)

```
GET    /api/tron/flows                   List all flows
POST   /api/tron/flows                   Create flow
GET    /api/tron/flows/:id               Get flow with canvas data
PUT    /api/tron/flows/:id               Update flow (save canvas)
DELETE /api/tron/flows/:id               Delete flow
POST   /api/tron/flows/:id/duplicate     Clone a flow
GET    /api/tron/flows/templates          List built-in templates
POST   /api/tron/flows/from-template     Create flow from template
POST   /api/tron/flows/:id/validate      Validate flow (check for dead ends, loops)
```

### Campaigns

```
GET    /api/tron/campaigns               List campaigns
POST   /api/tron/campaigns               Create campaign
GET    /api/tron/campaigns/:id           Get campaign details
PUT    /api/tron/campaigns/:id           Update campaign
DELETE /api/tron/campaigns/:id           Delete campaign
POST   /api/tron/campaigns/:id/start     Start campaign
POST   /api/tron/campaigns/:id/pause     Pause campaign
POST   /api/tron/campaigns/:id/resume    Resume campaign
POST   /api/tron/campaigns/:id/cancel    Cancel campaign
GET    /api/tron/campaigns/:id/progress   Real-time progress (SSE)
POST   /api/tron/campaigns/:id/export     Export results (CSV/JSON)
```

### Calls

```
GET    /api/tron/calls                   List calls (filterable)
GET    /api/tron/calls/:id               Get call details + transcript
POST   /api/tron/calls/dial              Make a single ad-hoc call
POST   /api/tron/calls/:id/hangup        End an active call
GET    /api/tron/calls/:id/recording     Get call recording audio
GET    /api/tron/calls/active             List currently active calls
GET    /api/tron/calls/stats              Call statistics summary
```

### Voices

```
GET    /api/tron/voices                  List available voices
GET    /api/tron/voices/:id/preview      Generate preview audio for a voice
POST   /api/tron/voices/preview          Preview custom text with a voice
```

### Settings

```
GET    /api/tron/settings                Get all settings
PUT    /api/tron/settings                Update settings (partial)
POST   /api/tron/settings/test-twilio    Test Twilio credentials
POST   /api/tron/settings/test-livekit   Test LiveKit connection
POST   /api/tron/settings/test-sarvam    Test Sarvam AI credentials
POST   /api/tron/settings/test-llm       Test LLM endpoint
```

### Analytics

```
GET    /api/tron/analytics/overview      Dashboard summary stats
GET    /api/tron/analytics/calls         Call volume over time
GET    /api/tron/analytics/outcomes      Outcome distribution
GET    /api/tron/analytics/agents        Per-agent performance
GET    /api/tron/analytics/campaigns     Per-campaign performance
GET    /api/tron/analytics/sentiment     Sentiment trends
```

### WebSocket

```
WS     /ws/tron                          Real-time events stream
```

Events pushed:
- `call.started` — new call initiated
- `call.answered` — callee picked up
- `call.transcript` — live transcript chunk
- `call.ended` — call completed
- `call.failed` — call failed
- `campaign.progress` — campaign status update
- `agent.status` — voice agent worker status

---

## Conversation Flow Canvas — Node Types

The canvas is the heart of Tron. Users build conversation flows by dragging nodes from a palette and connecting them with edges. The flow engine interprets this at runtime.

### Node Categories

**Triggers** (entry points — exactly one per flow):
| Node | Icon | Description |
|------|------|-------------|
| Start (Outbound) | `phone-outgoing` | Agent initiates the call |
| Start (Inbound) | `phone-incoming` | Agent receives a call |

**Speech** (agent speaks or listens):
| Node | Icon | Description |
|------|------|-------------|
| Greeting | `message-circle` | First message after connection. Configurable text with variables: `Hello {{contact_name}}` |
| Speak | `volume-2` | Agent says a scripted message. Supports template variables. |
| Listen | `mic` | Wait for user to speak. Configurable timeout + silence handling. |
| LLM Response | `brain` | Free-form LLM response. Provide instructions and the LLM generates naturally. |

**Logic** (routing and decisions):
| Node | Icon | Description |
|------|------|-------------|
| Branch (Intent) | `git-branch` | Route based on detected intent: "interested", "not interested", "question", "objection" |
| Branch (Keyword) | `search` | Route based on keywords in user speech |
| Branch (Sentiment) | `heart` | Route based on positive/negative/neutral sentiment |
| Branch (DTMF) | `hash` | Route based on keypad input: "Press 1 for sales, 2 for support" |
| Branch (Custom) | `code` | Route based on LLM evaluation of a custom condition |

**Actions** (mid-call operations):
| Node | Icon | Description |
|------|------|-------------|
| Set Variable | `tag` | Extract and store data: `{{order_id}} = <extracted from speech>` |
| Webhook | `globe` | Call external API. Send/receive data. Use response in conversation. |
| Transfer | `phone-forwarded` | Transfer call to human agent or another number |
| Record | `circle` | Start/stop call recording at specific points |
| Wait | `clock` | Pause for N seconds (useful for "let me check that for you" moments) |
| Send SMS | `message-square` | Send an SMS to the caller mid-conversation |

**Endings** (call termination):
| Node | Icon | Description |
|------|------|-------------|
| End Call | `phone-off` | Hang up with optional closing message and outcome tag |
| Schedule Callback | `calendar` | End call but schedule a follow-up call |

### Canvas Data Model

```typescript
interface FlowCanvas {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: { x: number; y: number; zoom: number };
}

interface FlowNode {
  id: string;                    // Unique node ID
  type: NodeType;                // "start_outbound" | "greeting" | "speak" | "listen" | etc.
  position: { x: number; y: number };
  data: NodeData;                // Type-specific configuration
  label?: string;                // Custom label (optional, overrides default)
}

interface FlowEdge {
  id: string;
  source: string;                // Source node ID
  target: string;                // Target node ID
  sourceHandle?: string;         // For branch nodes: "interested" | "not_interested" | etc.
  label?: string;                // Edge label shown on canvas
  animated?: boolean;            // Animate edge (for active path during live monitoring)
}

// Example: GreetingNode data
interface GreetingNodeData {
  text: string;                  // "Hello {{contact_name}}, this is {{agent_name}} calling from..."
  wait_for_response: boolean;    // Whether to wait for callee to respond after greeting
  timeout_seconds: number;       // How long to wait (default 5)
  on_silence: "repeat" | "continue" | "end_call";
}

// Example: BranchIntentNode data
interface BranchIntentNodeData {
  prompt: string;                // Instructions for LLM to classify intent
  intents: {
    id: string;                  // Handle ID (matches edge sourceHandle)
    label: string;               // "Interested", "Not Interested", "Has Question"
    description: string;         // Description for LLM classification
  }[];
  fallback_handle: string;       // Which handle if no intent matches
}

// Example: LLMResponseNode data
interface LLMResponseNodeData {
  instructions: string;          // "Answer the customer's question about our product..."
  context_variables: string[];   // Variables available: ["product_name", "price", "contact_name"]
  max_tokens: number;            // Limit response length
  temperature?: number;          // Override agent temperature for this node
}

// Example: WebhookNode data
interface WebhookNodeData {
  url: string;                   // "https://api.example.com/check-order"
  method: "GET" | "POST";
  headers: Record<string, string>;
  body_template: string;         // JSON template with {{variables}}
  response_variable: string;     // Store response in this variable name
  timeout_seconds: number;
  on_error: "continue" | "end_call" | "retry";
}
```

### Flow Engine Runtime

The flow engine is a state machine that walks the canvas graph:

```
1. Call connects → find Start node
2. Execute current node (speak, listen, branch, etc.)
3. Evaluate outgoing edges to determine next node
4. Move to next node
5. Repeat until EndCall node or max duration
```

For LLM Response nodes, the engine:
1. Builds a context prompt from: agent persona + flow context + conversation history + node instructions
2. Sends to the configured LLM
3. Pipes LLM output through Sarvam TTS
4. Waits for user response (STT)
5. Evaluates next edge

For Branch nodes, the engine:
1. Takes the last user utterance
2. Sends to LLM with classification prompt
3. Selects the matching output handle
4. Follows that edge to the next node

---

## Voice Lab — Sarvam Bulbul v3 Voices

39 available voices organized by gender and personality:

### Female Voices (20)
| Voice ID | Name | Character | Best For |
|----------|------|-----------|----------|
| shreya | Shreya | Warm, friendly | Sales, general purpose |
| priya | Priya | Professional | Corporate, B2B |
| simran | Simran | Energetic | Marketing, promos |
| ishita | Ishita | Calm | Support, healthcare |
| kavya | Kavya | Cheerful | Retail, hospitality |
| neha | Neha | Confident | Collections, reminders |
| pooja | Pooja | Soft-spoken | Therapy, counseling |
| ritu | Ritu | Authoritative | Announcements, IVR |
| roopa | Roopa | Conversational | Surveys, feedback |
| tanya | Tanya | Young | Startups, tech |
| shruti | Shruti | Melodic | Entertainment |
| suhani | Suhani | Gentle | Elderly care, insurance |
| kavitha | Kavitha | South Indian | Regional targeting |
| rupali | Rupali | Mature | Financial services |
| amelia | Amelia | Western accent | International calls |
| sophia | Sophia | Western accent | International calls |

### Male Voices (19)
| Voice ID | Name | Character | Best For |
|----------|------|-----------|----------|
| shubh | Shubh | Neutral (default) | General purpose |
| aditya | Aditya | Deep, professional | B2B, enterprise |
| rahul | Rahul | Friendly | Sales, retention |
| rohan | Rohan | Casual | Young audience |
| anand | Anand | Warm | Insurance, banking |
| amit | Amit | Direct | Collections |
| dev | Dev | Confident | Tech, SaaS |
| ratan | Ratan | Authoritative | Government, formal |
| varun | Varun | Energetic | Events, promotions |
| manan | Manan | Calm | Healthcare |
| sumit | Sumit | Conversational | Surveys |
| kabir | Kabir | Young | Startup, EdTech |
| aayan | Aayan | Smooth | Premium brands |
| ashutosh | Ashutosh | Mature | Legal, compliance |
| advait | Advait | Articulate | Training, education |
| tarun | Tarun | Upbeat | Telecom, offers |
| sunny | Sunny | Enthusiastic | Real estate |
| mani | Mani | South Indian | Regional |
| gokul | Gokul | South Indian | Regional |
| vijay | Vijay | Versatile | Multi-purpose |
| mohit | Mohit | Steady | Finance |
| rehan | Rehan | Soft | Mental health |
| soham | Soham | Clear | Education |

### Voice Lab Features
- **Preview**: Type any text, select voice, hear it instantly
- **Speed control**: 0.5x to 2.0x speech rate
- **A/B test**: Compare two voices side-by-side with same text
- **Language**: Primary language selection (Hindi, English, Tamil, Telugu, etc.)
- **Custom pronunciation**: Add word-level pronunciation overrides

---

## LLM Configuration

### Provider Options

| Provider | Models | Latency | Cost | Setup |
|----------|--------|---------|------|-------|
| **Ollama (local)** | qwen2.5:32b, llama3.3:70b, sarvam-m, deepseek-r1:32b | 0ms network | Free | Pre-installed |
| **OpenAI** | gpt-4o-mini, gpt-4o, gpt-4.1 | ~200ms | $0.15-5/1M tokens | API key |
| **Google Gemini** | gemini-2.0-flash, gemini-2.5-pro | ~150ms | $0.10-2.50/1M tokens | API key |
| **Custom** | Any OpenAI-compatible endpoint | Variable | Variable | URL + key |

### LLM Integration Points
1. **Agent persona** — system prompt with personality, rules, knowledge base
2. **Flow nodes** — per-node instructions override agent defaults
3. **Intent classification** — branch nodes classify user intent
4. **Data extraction** — pull structured data from free-form speech
5. **Call summarization** — post-call summary generation
6. **Sentiment analysis** — real-time sentiment scoring

---

## Campaign Management

### Campaign Lifecycle

```
Draft → Scheduled → Running → Completed
                  ↕ Paused     ↓ Cancelled
```

### Contact Import
- **CSV upload**: Columns: phone, name, email, custom_field_1, ...
- **JSON array**: Direct API input
- **Manual entry**: Add individual contacts in UI
- **CRM webhook**: Auto-import from external CRM

### Calling Strategy
- **Sequential**: Call contacts one by one, in order
- **Priority**: Sort by custom priority field, call highest first
- **Round-robin**: Distribute across time slots evenly

### Retry Logic
Configured per-campaign:
```
retry_enabled: true
retry_max_attempts: 3
retry_delay_minutes: 30
retry_on_no_answer: true      # Phone rang but nobody picked up
retry_on_busy: true            # Line was busy
retry_on_failed: true          # SIP/network error
retry_on_voicemail: false      # Don't retry if went to voicemail
```

Retry scheduling:
- Attempt 1: Immediate (during campaign window)
- Attempt 2: +30 minutes (configurable)
- Attempt 3: +60 minutes from attempt 2
- Respects calling hours — won't call outside 9am-9pm window

### Calling Hours & Compliance
- Per-campaign calling window: start time, end time, timezone
- DND (Do Not Disturb) list support: upload numbers to exclude
- Automatic TRAI compliance: respect Indian telecom regulations
- Call gap enforcement: minimum N seconds between calls to same number
- Max calls per day per number: configurable (default 3)

---

## Frontend Pages — Detailed Specifications

### 1. Dashboard

Full-width layout. No emojis. All icons from Lucide.

```
┌─────────────────────────────────────────────────────────────────────┐
│  TRON                                           [Settings] [?Help] │
├──────────┬──────────────────────────────────────────────────────────┤
│          │                                                          │
│  (icon)  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  Dashboard│  │  Calls   │ │ Success  │ │ Active   │ │  Avg     │  │
│          │  │  Today   │ │ Rate     │ │ Campaigns│ │ Duration │  │
│  (icon)  │  │  247     │ │ 73.2%    │ │  3       │ │ 2m 34s   │  │
│  Agents  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│          │                                                          │
│  (icon)  │  ┌───────────────────────┐ ┌────────────────────────┐  │
│  Flows   │  │   Call Volume Chart   │ │   Outcome Distribution │  │
│          │  │   (last 7 days)       │ │   (pie/donut chart)    │  │
│  (icon)  │  │                       │ │                        │  │
│  Campaigns│  │                       │ │                        │  │
│          │  └───────────────────────┘ └────────────────────────┘  │
│  (icon)  │                                                          │
│  Calls   │  ┌──────────────────────────────────────────────────┐  │
│          │  │   Active Calls                                    │  │
│  (icon)  │  │   ┌─────────────────────────────────────────────┐│  │
│  Live    │  │   │ +91 81930... │ Sales Agent │ 01:23 │ [View] ││  │
│  Monitor │  │   │ +91 98450... │ Support     │ 00:45 │ [View] ││  │
│          │  │   └─────────────────────────────────────────────┘│  │
│  (icon)  │  └──────────────────────────────────────────────────┘  │
│  Analytics│                                                         │
│          │  ┌──────────────────────────────────────────────────┐  │
│  (icon)  │  │   Recent Calls                                    │  │
│  Voice   │  │   (table: phone, agent, duration, outcome, time) │  │
│  Lab     │  └──────────────────────────────────────────────────┘  │
│          │                                                          │
│  (icon)  │  ┌──────────────────────────────────────────────────┐  │
│  Settings│  │ INSTRUCTION BANNER                                │  │
│          │  │ (i) To get started, create an Agent in the Agents │  │
│          │  │     tab, then make a test call from the Test Call  │  │
│          │  │     page. Need help? Check the docs. [Learn more] │  │
│          │  └──────────────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────────────────┘
```

### 2. Agent Builder

Two-column layout: form on left, live preview on right.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Agents > New Agent                              [Cancel] [Save]    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  INSTRUCTION BANNER                                                  │
│  (i) An agent defines WHO Tron becomes on a call. Set the persona,  │
│      voice, AI model, and conversation rules. You can test your      │
│      agent immediately after saving by clicking "Test Call".         │
│                                                                      │
│  ┌─────────────────────────────┐  ┌────────────────────────────┐   │
│  │  IDENTITY                   │  │  PREVIEW                   │   │
│  │                             │  │                            │   │
│  │  Name ___________________   │  │  Agent Card Preview        │   │
│  │                             │  │  ┌──────────────────────┐  │   │
│  │  Template [Select v]        │  │  │  (icon) Sales Closer │  │   │
│  │  (Sales / Support / Survey  │  │  │  Voice: Shreya       │  │   │
│  │   / Therapy / Reminder /    │  │  │  Model: GPT-4o-mini  │  │   │
│  │   COD Confirm / Custom)     │  │  │  Tone: Professional  │  │   │
│  │                             │  │  │  Language: Hindi      │  │   │
│  │  Persona                    │  │  │  Flow: Cold Call v2   │  │   │
│  │  ┌───────────────────────┐  │  │  └──────────────────────┘  │   │
│  │  │ You are a sales agent │  │  │                            │   │
│  │  │ for XYZ company.      │  │  │  ┌──────────────────────┐  │   │
│  │  │ Your goal is to...    │  │  │  │  TEST CALL            │  │   │
│  │  └───────────────────────┘  │  │  │                      │  │   │
│  │                             │  │  │  Phone: +91 ________  │  │   │
│  │  VOICE                      │  │  │  [Call Now]           │  │   │
│  │  Voice: [Shreya v]          │  │  │                      │  │   │
│  │  [Play Preview]             │  │  │  Status: Ready       │  │   │
│  │  Speed: [====O====] 1.0x   │  │  └──────────────────────┘  │   │
│  │  Language: [Hindi v]        │  │                            │   │
│  │                             │  │  CONVERSATION SIMULATOR   │   │
│  │  AI MODEL                   │  │  ┌──────────────────────┐  │   │
│  │  Provider: [Ollama v]       │  │  │ Shreya: Namaste! ... │  │   │
│  │  Model: [qwen2.5:32b v]    │  │  │ You: I'm interested  │  │   │
│  │  Temperature: [===O===] 0.7│  │  │ Shreya: Great! Let...│  │   │
│  │  (i) Ollama runs locally   │  │  └──────────────────────┘  │   │
│  │      — zero cost per call. │  │  [Type a message...]      │   │
│  │                             │  │                            │   │
│  │  CONVERSATION               │  │                            │   │
│  │  Tone: [Professional v]     │  │                            │   │
│  │  Greeting: ______________   │  │                            │   │
│  │  Max Duration: [300] sec    │  │                            │   │
│  │  Flow: [Select Flow v]     │  │                            │   │
│  │  [+ Create New Flow]       │  │                            │   │
│  │                             │  │                            │   │
│  │  GUARDRAILS                 │  │                            │   │
│  │  (i) Set boundaries for    │  │                            │   │
│  │      safe conversations.   │  │                            │   │
│  │  Forbidden topics: ______  │  │                            │   │
│  │  Required disclosures: ___ │  │                            │   │
│  └─────────────────────────────┘  └────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### 3. Flow Canvas

Full-screen canvas with left palette and right inspector panels.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Flows > Cold Call Sales v2                [Validate] [Save] [Test] │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  INSTRUCTION BANNER                                                  │
│  (i) Drag nodes from the left panel onto the canvas. Connect them   │
│      by dragging from a node's output handle to another node's      │
│      input. The conversation follows the path you create.            │
│                                                                      │
│ ┌────────┐ ┌──────────────────────────────────────────┐ ┌─────────┐│
│ │PALETTE │ │                                          │ │INSPECTOR││
│ │        │ │                                          │ │         ││
│ │Triggers│ │     ┌─────────────┐                     │ │ Greeting││
│ │(icon)  │ │     │   START     │                     │ │ Node    ││
│ │ Start  │ │     │  Outbound   │                     │ │         ││
│ │        │ │     └──────┬──────┘                     │ │ Text:   ││
│ │Speech  │ │            │                            │ │ [Hello  ││
│ │(icon)  │ │     ┌──────┴──────┐                     │ │  {{name}││
│ │ Greet  │ │     │  GREETING   │                     │ │  ...]   ││
│ │(icon)  │ │     │ "Hello..."  │                     │ │         ││
│ │ Speak  │ │     └──────┬──────┘                     │ │ Wait for││
│ │(icon)  │ │            │                            │ │ response││
│ │ Listen │ │     ┌──────┴──────┐                     │ │ [x] Yes ││
│ │(icon)  │ │     │   BRANCH    │──── Not Interested  │ │         ││
│ │ LLM    │ │     │  (Intent)   │──── Has Question ─┐ │ │ Timeout:││
│ │        │ │     └──────┬──────┘                   │ │ │ [5] sec ││
│ │Logic   │ │  Interested│              ┌───────────┘ │ │         ││
│ │(icon)  │ │     ┌──────┴──────┐┌──────┴──────┐     │ │ On      ││
│ │ Branch │ │     │  LLM RESP   ││  LLM RESP   │     │ │ silence:││
│ │(icon)  │ │     │ "Great!..." ││ "Let me..." │     │ │ [Repeat]││
│ │ DTMF   │ │     └──────┬──────┘└──────┬──────┘     │ │         ││
│ │        │ │            │              │            │ │         ││
│ │Actions │ │     ┌──────┴──────┐       │            │ │         ││
│ │(icon)  │ │     │  END CALL   │◄──────┘            │ │         ││
│ │ Webhook│ │     │ "Thank you" │                     │ │         ││
│ │(icon)  │ │     └─────────────┘                     │ │         ││
│ │ Variable│ │                                         │ │         ││
│ │(icon)  │ │                                          │ │         ││
│ │ Transfer│ │           [Zoom: 100%] [Fit] [Grid]     │ │         ││
│ │        │ │                                          │ │         ││
│ │Endings │ │                                          │ │         ││
│ │(icon)  │ │                                          │ │         ││
│ │ End    │ │                                          │ │         ││
│ │ Callback│ │                                          │ │         ││
│ └────────┘ └──────────────────────────────────────────┘ └─────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

### 4. Campaign Manager

```
┌──────────────────────────────────────────────────────────────────────┐
│  Campaigns                                         [+ New Campaign] │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  INSTRUCTION BANNER                                                  │
│  (i) Campaigns let you call a list of contacts automatically.       │
│      Upload contacts as CSV, pick an agent, set calling hours,      │
│      and Tron handles the rest — including retries for missed calls.│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ FILTERS: [All v] [Running v] [This Week v]   Search: _______  ││
│  ├─────────────────────────────────────────────────────────────────┤│
│  │ Name              │ Agent    │ Progress      │ Status │ Actions ││
│  ├───────────────────┼──────────┼───────────────┼────────┼─────────┤│
│  │ Feb Renewal Drive │ Ananya   │ ████░░ 67%    │ Running│ [Pause] ││
│  │                   │          │ 134/200 calls │        │ [View]  ││
│  ├───────────────────┼──────────┼───────────────┼────────┼─────────┤│
│  │ Survey Q1 2026    │ Rohan    │ ██████ 100%   │ Done   │ [Export]││
│  │                   │          │ 500/500 calls │        │ [View]  ││
│  ├───────────────────┼──────────┼───────────────┼────────┼─────────┤│
│  │ Payment Reminder  │ Neha     │ ██░░░░ 23%    │ Paused │[Resume] ││
│  │                   │          │ 46/200 calls  │        │ [View]  ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  CREATE CAMPAIGN (expanded when [+ New Campaign] clicked):          │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Step 1 of 4: SELECT AGENT                                     ││
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐                 ││
│  │  │ (icon)     │ │ (icon)     │ │ (icon)     │                 ││
│  │  │ Ananya     │ │ Rohan      │ │ Neha       │                 ││
│  │  │ Sales      │ │ Survey     │ │ Reminders  │                 ││
│  │  │ [Selected] │ │            │ │            │                 ││
│  │  └────────────┘ └────────────┘ └────────────┘                 ││
│  │                                                                 ││
│  │  Step 2 of 4: UPLOAD CONTACTS                                  ││
│  │  [Upload CSV] or [Paste Numbers] or [Connect CRM]             ││
│  │  (i) CSV must have a "phone" column. Optional: name, email.   ││
│  │                                                                 ││
│  │  Step 3 of 4: SCHEDULE                                         ││
│  │  Start: [Today v] at [09:00]    End: [Today v] at [21:00]     ││
│  │  Timezone: [Asia/Kolkata v]     Concurrency: [1] simultaneous ││
│  │                                                                 ││
│  │  Step 4 of 4: RETRY SETTINGS                                  ││
│  │  [x] Retry unanswered calls      Max attempts: [3]            ││
│  │  [x] Retry busy signals          Delay: [30] minutes          ││
│  │  [ ] Retry failed connections     Between retries              ││
│  │  (i) Retries respect calling hours. A 9pm retry will wait     ││
│  │      until 9am the next day.                                   ││
│  │                                                   [Launch]     ││
│  └─────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

### 5. Live Monitor

Real-time view of active calls.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Live Monitor                                    [x] Auto-refresh   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ACTIVE CALLS (2)                                                    │
│                                                                      │
│  ┌─────────────────────────────────┐ ┌─────────────────────────────┐│
│  │ +91 81930 39130                 │ │ +91 98450 12345             ││
│  │ Contact: Rajesh Kumar           │ │ Contact: Priya Singh        ││
│  │ Agent: Ananya (Sales)           │ │ Agent: Rohan (Survey)       ││
│  │ Duration: 01:43                 │ │ Duration: 00:32             ││
│  │ Campaign: Feb Renewal Drive     │ │ Campaign: Q1 Survey         ││
│  │ Flow Node: [Branch: Intent]     │ │ Flow Node: [Question 3]     ││
│  │                                 │ │                             ││
│  │ LIVE TRANSCRIPT                 │ │ LIVE TRANSCRIPT             ││
│  │ ┌─────────────────────────────┐ │ │ ┌─────────────────────────┐ ││
│  │ │ Agent: Namaste Rajesh ji,  │ │ │ │ Agent: Aapko humare    │ ││
│  │ │ main Ananya bol rahi hoon  │ │ │ │ service se kitni       │ ││
│  │ │ XYZ company se...          │ │ │ │ satisfaction hai?       │ ││
│  │ │                            │ │ │ │                        │ ││
│  │ │ Rajesh: Ha ha, boliye...   │ │ │ │ Priya: Bahut acchi hai │ ││
│  │ │                            │ │ │ │ service.               │ ││
│  │ │ Agent: Ji, aapka renewal   │ │ │ │                        │ ││
│  │ │ date aa raha hai aur...    │ │ │ │ Agent: Dhanyavaad!     │ ││
│  │ └─────────────────────────────┘ │ │ └─────────────────────────┘ ││
│  │ Sentiment: [Positive]  [Hangup] │ │ Sentiment: [Positive] [End]││
│  └─────────────────────────────────┘ └─────────────────────────────┘│
│                                                                      │
│  CALL QUEUE (next 5)                                                │
│  +91 99887 76654 │ Amit Sharma   │ Scheduled: 11:30 AM │ Attempt 1 │
│  +91 88776 65543 │ Sunita Devi   │ Scheduled: 11:32 AM │ Retry #2  │
│  +91 77665 54432 │ Vikram Patel  │ Scheduled: 11:34 AM │ Attempt 1 │
└──────────────────────────────────────────────────────────────────────┘
```

### 6. Call History

```
┌──────────────────────────────────────────────────────────────────────┐
│  Call History                              [Export CSV] [Export JSON]│
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  FILTERS                                                             │
│  Agent: [All v]  Status: [All v]  Outcome: [All v]  Date: [Today v]│
│  Campaign: [All v]  Direction: [All v]    Search: _______________   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Phone          │ Contact    │ Agent  │ Duration│Outcome  │ Time ││
│  ├────────────────┼────────────┼────────┼─────────┼─────────┼──────┤│
│  │ +91 81930...   │ Rajesh K.  │ Ananya │ 2:34    │Interested│10:23││
│  │ +91 98450...   │ Priya S.   │ Rohan  │ 1:12    │Completed │10:18││
│  │ +91 77665...   │ Vikram P.  │ Ananya │ 0:00    │No Answer │10:15││
│  │ +91 88776...   │ Sunita D.  │ Neha   │ 0:45    │Callback  │10:10││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  CALL DETAIL (expanded on row click):                               │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Call to +91 81930... (Rajesh Kumar) — 2 min 34 sec              ││
│  │                                                                  ││
│  │ ┌─────────────────────┐  ┌──────────────────────────────────┐  ││
│  │ │ SUMMARY             │  │ TRANSCRIPT                        │  ││
│  │ │ Rajesh was interested│  │ 00:00 Agent: Namaste Rajesh ji  │  ││
│  │ │ in renewing his plan│  │ 00:05 Rajesh: Ha boliye          │  ││
│  │ │ at the discounted   │  │ 00:08 Agent: Aapka plan next    │  ││
│  │ │ rate. Agreed to     │  │       week expire ho raha...     │  ││
│  │ │ callback on Friday. │  │ 00:15 Rajesh: Kitna hoga?       │  ││
│  │ │                     │  │ ...                              │  ││
│  │ │ Outcome: Interested │  │                                  │  ││
│  │ │ Sentiment: Positive │  │ [Play Recording]                 │  ││
│  │ │ Extracted:          │  │                                  │  ││
│  │ │  - callback: Friday │  │                                  │  ││
│  │ │  - interest: renewal│  │                                  │  ││
│  │ └─────────────────────┘  └──────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

### 7. Analytics

```
┌──────────────────────────────────────────────────────────────────────┐
│  Analytics                                    Period: [Last 7 Days v]│
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │Total Calls│ │Connected │ │ Avg Talk │ │ Success  │ │  Est.    │ │
│  │  1,247   │ │  891     │ │  2m 18s  │ │  71.4%   │ │  Cost    │ │
│  │ +12% (w) │ │ +8% (w)  │ │ -5s (w)  │ │ +3.2%(w) │ │  $14.20  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  CALL VOLUME — daily breakdown (bar chart)                    │  │
│  │  ████                                                         │  │
│  │  ████  ████                              ████                 │  │
│  │  ████  ████  ████        ████  ████      ████  ████          │  │
│  │  Mon   Tue   Wed   Thu   Fri   Sat  Sun                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────┐ ┌────────────────────────────────────┐  │
│  │  OUTCOMES              │ │  AGENT PERFORMANCE                 │  │
│  │  (donut chart)         │ │  ┌─────────┬────────┬──────────┐  │  │
│  │                        │ │  │ Agent   │ Calls  │ Success  │  │  │
│  │  Interested:   34%     │ │  │ Ananya  │ 423    │ 78.2%    │  │  │
│  │  Not Interest: 28%     │ │  │ Rohan   │ 312    │ 68.1%    │  │  │
│  │  Callback:     18%     │ │  │ Neha    │ 198    │ 72.3%    │  │  │
│  │  No Answer:    12%     │ │  └─────────┴────────┴──────────┘  │  │
│  │  Failed:        8%     │ │                                    │  │
│  └────────────────────────┘ └────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  SENTIMENT TREND (line chart over time)                       │  │
│  │  Positive ───  Neutral ─ ─ ─  Negative · · ·                │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 8. Settings

```
┌──────────────────────────────────────────────────────────────────────┐
│  Settings                                                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  INSTRUCTION BANNER                                                  │
│  (i) Configure your telephony provider, AI services, and platform   │
│      defaults. All credentials are stored securely and never         │
│      leave your machine.                                             │
│                                                                      │
│  TELEPHONY (Twilio)                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  (i) Tron uses Twilio to make and receive phone calls.          ││
│  │      You need a Twilio account with an Elastic SIP Trunk.       ││
│  │                                                                  ││
│  │  Account SID:  [ACdd1b10d557ff****] [Test Connection]           ││
│  │  Auth Token:   [*************]                                   ││
│  │  From Number:  [+18083204948]                                   ││
│  │  SIP Trunk ID: [TK3491d254****]                                 ││
│  │  Status: Connected (icon: check-circle, green)                  ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  VOICE ENGINE (LiveKit + Sarvam)                                    │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  (i) LiveKit handles real-time audio streaming. Sarvam AI       ││
│  │      provides Indian-language speech-to-text and text-to-speech.││
│  │                                                                  ││
│  │  LiveKit URL:     [wss://hawker-agent-yk6o****]                 ││
│  │  LiveKit API Key: [APIYY5L5q****]                               ││
│  │  LiveKit Secret:  [*************]     [Test Connection]         ││
│  │  Outbound Trunk:  [ST_6txqcznvQ6Lk]                            ││
│  │  Status: Connected, 1 worker registered (icon: check-circle)    ││
│  │                                                                  ││
│  │  Sarvam API Key:  [sk_70yy5sji_****]  [Test Connection]        ││
│  │  STT Model:       [saaras:v3 v]                                 ││
│  │  TTS Model:       [bulbul:v3 v]                                 ││
│  │  Status: Connected (icon: check-circle, green)                  ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  AI MODELS                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  (i) Configure which AI models are available for agents.        ││
│  │      Ollama models run locally at zero cost. Cloud models       ││
│  │      require API keys and incur per-token charges.              ││
│  │                                                                  ││
│  │  Ollama Endpoint: [http://localhost:11434]  [Test]              ││
│  │  Available Models: qwen2.5:32b, sarvam-m, llama3.3:70b         ││
│  │                                                                  ││
│  │  OpenAI API Key:  [sk-proj-ZwLX****]        [Test]              ││
│  │  Available: gpt-4o-mini, gpt-4o, gpt-4.1                       ││
│  │                                                                  ││
│  │  Gemini API Key:  [Not configured]          [Add Key]           ││
│  │                                                                  ││
│  │  Custom Endpoint: [Add custom OpenAI-compatible endpoint]       ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  DEFAULTS                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Default LLM:        [Ollama / qwen2.5:32b v]                  ││
│  │  Default Voice:      [Shreya v]                                 ││
│  │  Default Language:   [Hindi (hi-IN) v]                          ││
│  │  Default Tone:       [Professional v]                           ││
│  │  Max Call Duration:  [300] seconds                              ││
│  │  Calling Hours:      [09:00] to [21:00] [Asia/Kolkata v]       ││
│  └─────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

### 9. Test Call Page

```
┌──────────────────────────────────────────────────────────────────────┐
│  Test Call                                                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  INSTRUCTION BANNER                                                  │
│  (i) Test your agent setup by making a real call to any phone       │
│      number. The agent will use its configured persona, voice,      │
│      and conversation flow. You can monitor the call live.          │
│                                                                      │
│  ┌──────────────────────────────────────┐                           │
│  │  SELECT AGENT                        │                           │
│  │  ┌────────┐ ┌────────┐ ┌────────┐  │                           │
│  │  │ Ananya │ │ Rohan  │ │ Neha   │  │                           │
│  │  │ Sales  │ │ Survey │ │ Remind │  │                           │
│  │  │[Select]│ │        │ │        │  │                           │
│  │  └────────┘ └────────┘ └────────┘  │                           │
│  │                                      │                           │
│  │  PHONE NUMBER                        │                           │
│  │  Country: [+91 (India) v]            │                           │
│  │  Number:  [8193039130          ]     │                           │
│  │                                      │                           │
│  │              [Call Now]              │                           │
│  └──────────────────────────────────────┘                           │
│                                                                      │
│  CALL STATUS: (shown after calling)                                  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Status: In Progress   Duration: 01:23                       │   │
│  │  Agent: Ananya (Sales) Phone: +91 81930 39130                │   │
│  │                                                              │   │
│  │  LIVE TRANSCRIPT                                             │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │ 00:00  Agent: Namaste! Main Ananya bol rahi hoon.   │   │   │
│  │  │ 00:04  Caller: Hello, kaun bol raha hai?            │   │   │
│  │  │ 00:07  Agent: Ji main Ananya, XYZ company se...     │   │   │
│  │  │ 00:12  Caller: Accha boliye...                      │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  [Hang Up]  [Mute Agent]                                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  RETRY OPTIONS (if call fails):                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Call did not connect (SIP 480: Temporarily Unavailable)     │   │
│  │  [Retry Now]  [Retry in 1 min]  [Retry in 5 min]           │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend
| Component | Technology | Rationale |
|-----------|-----------|-----------|
| API Framework | FastAPI | Already used by Beast, async, fast, OpenAPI docs |
| Database | postgres (standalone) / PostgreSQL (Beast mode) | postgres for zero-config local, PG for scale |
| ORM | SQLAlchemy 2.0 (async) | Already in Beast stack |
| Validation | Pydantic v2 | Already in Beast stack |
| Task Queue | asyncio + background tasks | Simple, no Redis dependency needed |
| WebSocket | FastAPI WebSocket | Real-time events |
| Voice Agent | livekit-agents 1.4.x | Already proven in voice_agent.py |
| STT | Sarvam Saaras v3 | Best Indian language STT |
| TTS | Sarvam Bulbul v3 | 39 Indian voices |
| LLM | OpenAI-compatible (Ollama/OpenAI/Gemini/Custom) | Flexibility |
| Telephony | Twilio Elastic SIP Trunk + LiveKit SIP | Already configured |

### Frontend
| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Framework | React 18 + TypeScript | Industry standard, large ecosystem |
| Build | Vite | Fast dev + build |
| Styling | Tailwind CSS | Full-width layouts, utility-first |
| Icons | Lucide React | Clean, consistent, no emojis |
| State | Zustand | Lightweight, already in Beast mobile |
| Canvas | React Flow | Production-grade drag-and-drop flow builder |
| Charts | Recharts | Simple, composable chart library |
| HTTP | fetch + SWR | Data fetching with caching |
| WebSocket | Native WebSocket | Real-time events |
| UI Components | Headless UI + custom | Full control over design |

### Key Dependencies
```json
{
  "react": "^18.3.0",
  "react-dom": "^18.3.0",
  "react-router-dom": "^6.28.0",
  "@xyflow/react": "^12.0.0",
  "zustand": "^5.0.0",
  "recharts": "^2.15.0",
  "lucide-react": "^0.460.0",
  "tailwindcss": "^3.4.0",
  "swr": "^2.2.0",
  "@headlessui/react": "^2.2.0",
  "clsx": "^2.1.0"
}
```

---

## Implementation Phases

### Phase 1 — Foundation (Week 1-2)
**Goal**: Core backend + minimal working UI

- [ ] Project scaffolding: `tron/` folder structure, `__init__.py`, `__main__.py`
- [ ] Database models + migrations (SQLAlchemy + Alembic)
- [ ] Core config system (Pydantic settings from .env)
- [ ] Agent CRUD API + storage
- [ ] Voice agent runtime (refactor voice_agent.py → tron/voice/agent.py)
- [ ] Call engine (refactor call_agent.py → tron/core/call_engine.py)
- [ ] Basic React app with Vite + Tailwind
- [ ] Settings page (credential input + test buttons)
- [ ] Agent builder page (form only, no canvas yet)
- [ ] Test call page (pick agent, enter number, call)

**Milestone**: Can create an agent via UI and make a test call that works.

### Phase 2 — Flow Canvas (Week 3-4)
**Goal**: Visual conversation builder

- [ ] React Flow canvas integration
- [ ] All node types implemented (Start, Greeting, Speak, Listen, LLM, Branch, End)
- [ ] Node palette (drag from sidebar)
- [ ] Node inspector (configure selected node in right panel)
- [ ] Flow save/load API
- [ ] Flow engine runtime (interprets canvas JSON during calls)
- [ ] Flow validation (detect dead ends, unreachable nodes, missing connections)
- [ ] Pre-built templates (sales, support, survey, reminder, COD)
- [ ] Agent-flow linking (agent selects a flow)

**Milestone**: Can build a complete conversation flow visually and test it via phone.

### Phase 3 — Campaigns (Week 5-6)
**Goal**: Batch calling with management

- [ ] Campaign CRUD API
- [ ] Contact import (CSV, JSON, manual)
- [ ] Campaign execution engine (sequential calling with concurrency)
- [ ] Retry logic (configurable: no-answer, busy, failed)
- [ ] Calling hours enforcement
- [ ] Campaign progress tracking (SSE/WebSocket)
- [ ] Campaign list page with progress bars
- [ ] Campaign detail page (contacts, status per contact)
- [ ] DND list support

**Milestone**: Can upload 200 contacts and have Tron call them all with retries.

### Phase 4 — Intelligence (Week 7-8)
**Goal**: Call analytics, transcripts, insights

- [ ] Call recording (LiveKit recording API or Twilio recording)
- [ ] Full conversation transcript storage (from LiveKit STT events)
- [ ] Post-call LLM summarization
- [ ] Sentiment analysis per call
- [ ] Outcome classification
- [ ] Data extraction (structured data from free-form conversation)
- [ ] Call history page with transcript viewer
- [ ] Analytics dashboard with charts
- [ ] Live monitor page (active calls + live transcripts)
- [ ] Export functionality (CSV, JSON)

**Milestone**: Full visibility into every call — transcript, summary, sentiment, outcome.

### Phase 5 — Polish & Beast Integration (Week 9-10)
**Goal**: Production-ready, integrated with Beast

- [ ] Beast module adapter (`src/modules/tron/`)
- [ ] Beast API route mounting (`/api/tron/*`)
- [ ] Beast mobile app integration (new "Tron" tab)
- [ ] Voice Lab page (preview all 39 voices, A/B test)
- [ ] Webhook/API tool nodes (call external APIs during conversation)
- [ ] Transfer node (hand off to human)
- [ ] SMS sending node
- [ ] DTMF input handling
- [ ] Error handling + graceful degradation
- [ ] Performance optimization (connection pooling, caching)
- [ ] Documentation + tooltips everywhere

**Milestone**: Tron is a polished, integrated module in Beast with all features working.

---

## Design Principles

1. **Instructions everywhere** — Every page, every section has a subtle instruction banner explaining what it does and how to use it. Users should never feel lost.

2. **Icons, not emojis** — All visual indicators use Lucide icons. Clean, professional, consistent.

3. **Full-width containers** — No max-width constrained content. Tables, canvases, and forms stretch to fill available space.

4. **Progressive disclosure** — Start simple, reveal complexity on demand. Agent builder shows basic fields first; advanced settings are collapsed.

5. **Instant feedback** — Every action (save, test, call) shows immediate visual feedback. Loading states, success badges, error messages.

6. **Dark theme first** — Matches Beast's existing dark UI (#0A0A0F background, accent colors for interactive elements).

7. **Self-hosted by default** — Everything runs on the user's machine. No data leaves unless they explicitly configure cloud services.

8. **Zero-config start** — Works with just Ollama (free, local) + Sarvam (free tier). Twilio only needed for actual phone calls.

---

## Sarvam AI Integration Notes

### STT: Saaras v3
- Set `language="unknown"` for auto-detection (Hindi, English, 20+ Indian languages)
- Use `flush_signal=True` for proper turn-taking in conversations
- Mode: `"transcribe"` for conversation, `"translate"` if English transcript needed
- Latency: ~70ms per chunk

### TTS: Bulbul v3
- Set `target_language_code` based on agent language setting
- Available languages: hi-IN, en-IN, bn-IN, kn-IN, ml-IN, mr-IN, od-IN, pa-IN, ta-IN, te-IN, gu-IN
- Speaker selection from 39 voices (see Voice Lab section)
- Avoid very long text chunks — split at sentence boundaries for natural delivery

### Known Gotchas
- Sarvam STT may misinterpret silence as speech in noisy environments — enable Krisp noise cancellation on LiveKit
- Bulbul v3 speaker names are case-sensitive and lowercase ("shreya" not "Shreya")
- For Hinglish (mixed Hindi-English), keep `target_language_code="hi-IN"` — Bulbul handles code-switching automatically

---

## LiveKit Integration Notes

### Agent Registration
- Agent MUST have `agent_name` matching the dispatch rule
- Only ONE agent process per `agent_name` should be running
- Dev mode (`voice_agent.py dev`) auto-restarts on file changes but can accumulate zombie processes

### SIP Calling
- Outbound: Use `CreateSIPParticipant` API (not Twilio API)
- Room name MUST start with "call-" to match dispatch rules
- Include timestamp in room name to avoid collisions: `call-outbound-{phone}-{timestamp}`
- Enable `krisp_enabled=True` for noise cancellation
- Set `wait_until_answered=True` for outbound calls
- Indian carriers may return SIP 480 if calls are too frequent — implement backoff

### Critical: `await ctx.connect()`
- MUST call `await ctx.connect()` in entrypoint before accessing room participants
- Without this, the agent joins but cannot send/receive audio

---

## File Naming Conventions

- Python: `snake_case.py`
- TypeScript: `PascalCase.tsx` for components, `camelCase.ts` for utilities
- JSON configs: `snake_case.json`
- CSS: Tailwind utility classes (no separate CSS files except globals)

---

## Next Steps

1. Review this plan
2. Approve or request changes
3. Begin Phase 1 implementation
