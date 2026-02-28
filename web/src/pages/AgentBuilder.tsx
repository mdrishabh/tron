import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import useSWR from 'swr'
import { Save, ArrowLeft, Play, Phone, Brain, Volume2, Shield, ChevronDown } from 'lucide-react'
import api from '../lib/api'
import { LANGUAGES, TONES, LLM_PROVIDERS, LLM_MODELS, TTS_MODELS } from '../lib/constants'
import InstructionBanner from '../components/InstructionBanner'

const fetcher = (url: string) => api.get(url)

const TEMPLATES = [
  { id: 'sales', name: 'Sales Agent', persona: 'You are an enthusiastic sales agent. Your goal is to introduce our product, highlight its benefits, and schedule a demo or close a sale. Be persistent but respectful. Never be pushy.' },
  { id: 'support', name: 'Support Agent', persona: 'You are a helpful customer support agent. Listen carefully to customer issues and provide clear, step-by-step solutions. Be patient and empathetic.' },
  { id: 'survey', name: 'Survey Bot', persona: 'You are conducting a brief customer satisfaction survey. Ask each question clearly, one at a time. Confirm answers and move to the next question. Keep it under 3 minutes.' },
  { id: 'reminder', name: 'Reminder', persona: 'You are a friendly reminder assistant. Inform the contact about their upcoming appointment/due date. If they want to reschedule, collect their preferred time and confirm.' },
  { id: 'cod', name: 'COD Confirmation', persona: 'You are calling to confirm a Cash on Delivery order. Confirm the order details, delivery address, and ask if the customer will be available to receive it.' },
  { id: 'therapist', name: 'Wellness Check', persona: 'You are a compassionate wellness assistant. Check in on the person\'s emotional state with warmth. Listen actively, validate their feelings, and offer encouragement.' },
]

const PREVIEW_TEXTS = [
  { id: 'hinglish', label: 'Hinglish Greeting', text: 'Namaste! Main aapka AI assistant hoon. Aap mujhse kuch bhi pooch sakte hain.' },
  { id: 'sales', label: 'Sales Pitch', text: 'Hello! Humara naya product launch hua hai jo aapke business ko 3x grow kar sakta hai. Kya aap interested hain?' },
  { id: 'support', label: 'Support', text: 'Aapka call important hai humare liye. Main aapki problem solve karne mein help karungi. Bataiye kya issue hai?' },
  { id: 'reminder', label: 'Reminder', text: 'Aapka appointment kal subah 10 baje hai Dr. Sharma ke saath. Kya aap confirm karna chahenge?' },
  { id: 'english', label: 'English', text: 'Hello! I am your AI assistant. I can help you with any questions or concerns you may have.' },
  { id: 'formal_hindi', label: 'Formal Hindi', text: 'Namaskar! Main aapki seva mein hazir hoon. Kripya apna sawaal poochein, main aapki sahayata karunga.' },
]

const defaultAgent = {
  name: '',
  persona: '',
  voice_id: 'shreya',
  voice_model: 'bulbul:v3-beta',
  voice_speed: 1.0,
  language: 'hi-IN',
  llm_provider: 'ollama',
  llm_model: 'qwen2.5:32b',
  llm_endpoint: '',
  llm_api_key: '',
  llm_temperature: 0.7,
  tone: 'professional',
  max_call_duration: 300,
  greeting_text: '',
  flow_id: '',
  tools_enabled: [],
  guardrails: {},
  is_active: true,
}

export default function AgentBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const { data: existing } = useSWR(id ? `/agents/${id}` : null, fetcher)
  const { data: flows } = useSWR('/flows', fetcher)

  const [form, setForm] = useState(defaultAgent)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [testPhone, setTestPhone] = useState('')
  const [calling, setCalling] = useState(false)
  const [callStatus, setCallStatus] = useState('')
  const [previewText, setPreviewText] = useState('Namaste! Main Tron ke agent hoon.')
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [showGuardrails, setShowGuardrails] = useState(false)

  // Fetch voices filtered by the currently selected TTS model
  const { data: voices } = useSWR(`/voices?model=${form.voice_model}`, fetcher)

  useEffect(() => {
    if (existing) {
      setForm({ ...defaultAgent, ...(existing as any) })
    }
  }, [existing])

  // Auto-correct voice_id if it's not valid for the selected model
  useEffect(() => {
    const vList = (voices as any[]) || []
    if (vList.length > 0) {
      const validIds = vList.map((v: any) => v.id)
      if (!validIds.includes(form.voice_id)) {
        // Try to pick same gender default
        const maleVoices = ['shubh', 'rahul', 'amit', 'ratan', 'rohan', 'deep', 'abhilash', 'karun', 'hitesh', 'sunny', 'aditya', 'anand', 'dev', 'varun', 'manan', 'sumit', 'kabir', 'aayan', 'ashutosh', 'advait', 'tarun', 'mani', 'gokul', 'vijay', 'mohit', 'rehan', 'soham']
        const currentGender = form.voice_id && maleVoices.includes(form.voice_id) ? 'Male' : 'Female'
        const sameGender = vList.find((v: any) => v.gender === currentGender)
        set('voice_id', sameGender?.id || vList[0].id)
      }
    }
  }, [voices, form.voice_model])

  function set(key: string, value: any) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function applyTemplate(templateId: string) {
    const tpl = TEMPLATES.find(t => t.id === templateId)
    if (tpl) {
      set('persona', tpl.persona)
      set('name', tpl.name)
    }
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Agent name is required'); return }
    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        await api.put(`/agents/${id}`, form)
      } else {
        await api.post('/agents', form)
      }
      navigate('/agents')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleTestCall() {
    if (!testPhone) return
    if (!id) { setError('Save agent first before testing'); return }
    setCalling(true)
    setCallStatus('Initiating call...')
    try {
      const result = await api.post('/calls/dial', {
        agent_id: id,
        phone_number: testPhone,
      }) as any
      setCallStatus(`Call initiated! Status: ${result.status}. Room: ${result.livekit_room}`)
    } catch (e: any) {
      setCallStatus(`Error: ${e.message}`)
    } finally {
      setCalling(false)
    }
  }

  async function handlePreviewVoice() {
    setPreviewPlaying(true)
    try {
      const response = await fetch('/api/tron/voices/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: form.voice_id, text: previewText, language: form.language, model: form.voice_model }),
      })
      if (!response.ok) throw new Error('Preview failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => { setPreviewPlaying(false); URL.revokeObjectURL(url) }
      audio.play()
    } catch (e: any) {
      setPreviewPlaying(false)
      alert(`Preview failed: ${e.message}`)
    }
  }

  const flowsList = flows as any[] || []
  const voicesList = voices as any[] || []

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link to="/agents" className="btn-ghost p-1.5">
            <ArrowLeft size={14} />
          </Link>
          <div>
            <h1 className="text-base font-semibold">{isEdit ? 'Edit Agent' : 'New Agent'}</h1>
            <p className="text-xs text-[#555568]">{isEdit ? form.name : 'Configure a new AI agent'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/agents" className="btn-secondary">Cancel</Link>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={13} /> {saving ? 'Saving...' : 'Save Agent'}
          </button>
        </div>
      </div>

      <div className="page-content">
        <InstructionBanner>
          An agent defines who Tron becomes on a call. Set the persona, voice, AI model, and conversation rules.
          You can test immediately after saving by entering a phone number in the Preview panel.
        </InstructionBanner>

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-5 gap-6">
          {/* Left: Form */}
          <div className="col-span-3 space-y-5">
            {/* Identity */}
            <div className="card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#555568] mb-4">Identity</h2>

              <div className="form-group">
                <label className="label">Agent Name *</label>
                <input
                  className="input"
                  placeholder="e.g. Sales Closer, Ananya Support"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="label">Template (optional)</label>
                <select className="select" onChange={e => applyTemplate(e.target.value)} value="">
                  <option value="">Select a template to pre-fill...</option>
                  {TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Persona / System Prompt</label>
                <textarea
                  className="input min-h-[120px] resize-y"
                  placeholder="You are Ananya, a friendly sales agent for XYZ company. Your goal is to..."
                  value={form.persona}
                  onChange={e => set('persona', e.target.value)}
                />
                <p className="text-xs text-[#555568] mt-1">
                  Describe who this agent is, their goal, knowledge, and rules.
                </p>
              </div>

              <div className="form-group">
                <label className="label">Greeting Text (optional)</label>
                <input
                  className="input"
                  placeholder="Namaste! Main {{agent_name}} bol rahi hoon {{company_name}} se..."
                  value={form.greeting_text}
                  onChange={e => set('greeting_text', e.target.value)}
                />
              </div>
            </div>

            {/* Voice */}
            <div className="card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#555568] mb-4 flex items-center gap-2">
                <Volume2 size={13} /> Voice
              </h2>

              <div className="grid grid-cols-3 gap-4">
                <div className="form-group mb-0">
                  <label className="label">TTS Model</label>
                  <select className="select" value={form.voice_model} onChange={e => {
                    set('voice_model', e.target.value)
                    // Reset voice to first available when model changes
                    const modelDefault: Record<string, string> = {
                      'bulbul:v3-beta': 'shreya',
                      'bulbul:v2': 'anushka',
                    }
                    set('voice_id', modelDefault[e.target.value] || 'shreya')
                  }}>
                    {TTS_MODELS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-[#555568] mt-1">
                    {TTS_MODELS.find(m => m.value === form.voice_model)?.description || ''}
                  </p>
                </div>

                <div className="form-group mb-0">
                  <label className="label">Voice</label>
                  <select className="select" value={form.voice_id} onChange={e => set('voice_id', e.target.value)}>
                    {voicesList.length > 0 ? voicesList.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.name} — {v.character} ({v.gender})</option>
                    )) : (
                      <option value="shreya">Shreya — Warm, friendly (Female)</option>
                    )}
                  </select>
                </div>

                <div className="form-group mb-0">
                  <label className="label">Language</label>
                  <select className="select" value={form.language} onChange={e => set('language', e.target.value)}>
                    {LANGUAGES.map(l => (
                      <option key={l.code} value={l.code}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Voice description card */}
              {voicesList.length > 0 && (() => {
                const selected = voicesList.find((v: any) => v.id === form.voice_id)
                if (!selected) return null
                return (
                  <div className="mt-3 p-3 bg-[#111118] rounded-lg border border-[#2A2A3A] flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: selected.gender === 'Female' ? '#ec489922' : '#6366f122',
                        border: `1px solid ${selected.gender === 'Female' ? '#ec489944' : '#6366f144'}`,
                      }}
                    >
                      <Volume2 size={13} style={{ color: selected.gender === 'Female' ? '#ec4899' : '#6366f1' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{selected.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2A2A3A] text-[#8888A0]">{selected.gender}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2A2A3A] text-[#8888A0] capitalize">{selected.character}</span>
                      </div>
                      <p className="text-xs text-[#8888A0] mt-0.5">{selected.description || selected.best_for}</p>
                    </div>
                  </div>
                )
              })()}

              <div className="mt-4">
                <label className="label">Speed: {form.voice_speed}x</label>
                <input
                  type="range" min="0.5" max="2" step="0.1"
                  className="w-full accent-indigo-500"
                  value={form.voice_speed}
                  onChange={e => set('voice_speed', parseFloat(e.target.value))}
                />
              </div>

              <div className="mt-4 p-3 bg-[#111118] rounded-lg border border-[#2A2A3A]">
                <label className="label mb-2">Preview Voice</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PREVIEW_TEXTS.map(p => (
                    <button
                      key={p.id}
                      className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                        previewText === p.text
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                          : 'border-[#2A2A3A] text-[#8888A0] hover:border-[#555568]'
                      }`}
                      onClick={() => setPreviewText(p.text)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="input flex-1 text-xs"
                    value={previewText}
                    onChange={e => setPreviewText(e.target.value)}
                    placeholder="Type custom preview text..."
                  />
                  <button
                    className="btn-secondary"
                    onClick={handlePreviewVoice}
                    disabled={previewPlaying}
                  >
                    <Play size={12} /> {previewPlaying ? 'Playing...' : 'Play'}
                  </button>
                </div>
                <p className="text-xs text-[#555568] mt-1">Click a preset or type your own text, then Play to hear the voice</p>
              </div>
            </div>

            {/* AI Model */}
            <div className="card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#555568] mb-4 flex items-center gap-2">
                <Brain size={13} /> AI Model
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group mb-0">
                  <label className="label">Provider</label>
                  <select className="select" value={form.llm_provider} onChange={e => {
                    set('llm_provider', e.target.value)
                    const models = LLM_MODELS[e.target.value] || []
                    if (models.length > 0) set('llm_model', models[0])
                  }}>
                    {LLM_PROVIDERS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group mb-0">
                  <label className="label">Model</label>
                  {form.llm_provider === 'custom' ? (
                    <input className="input" value={form.llm_model} onChange={e => set('llm_model', e.target.value)} placeholder="model-name" />
                  ) : (
                    <select className="select" value={form.llm_model} onChange={e => set('llm_model', e.target.value)}>
                      {(LLM_MODELS[form.llm_provider] || []).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {form.llm_provider === 'ollama' && (
                <p className="text-xs text-green-400 mt-2">
                  Ollama runs locally — zero cost per call. Make sure Ollama is running with the model pulled.
                </p>
              )}

              {form.llm_provider === 'custom' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="label">Endpoint URL</label>
                    <input className="input" value={form.llm_endpoint} onChange={e => set('llm_endpoint', e.target.value)} placeholder="https://api.example.com/v1" />
                  </div>
                  <div>
                    <label className="label">API Key</label>
                    <input className="input" type="password" value={form.llm_api_key} onChange={e => set('llm_api_key', e.target.value)} placeholder="sk-..." />
                  </div>
                </div>
              )}

              <div className="mt-4">
                <label className="label">Temperature: {form.llm_temperature}</label>
                <input
                  type="range" min="0" max="2" step="0.1"
                  className="w-full accent-indigo-500"
                  value={form.llm_temperature}
                  onChange={e => set('llm_temperature', parseFloat(e.target.value))}
                />
                <div className="flex justify-between text-xs text-[#555568] mt-0.5">
                  <span>Precise</span>
                  <span>Creative</span>
                </div>
              </div>
            </div>

            {/* Conversation */}
            <div className="card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#555568] mb-4">Conversation</h2>

              <div className="form-group">
                <label className="label">Personality / Tone</label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      className={`px-3 py-1.5 rounded-lg border text-xs transition-all flex items-center gap-1.5 ${
                        form.tone === t.value
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.15)]'
                          : 'border-[#2A2A3A] text-[#8888A0] hover:border-[#555568] hover:text-[#F0F0F8]'
                      }`}
                      onClick={() => set('tone', t.value)}
                      title={t.description}
                    >
                      <span>{t.emoji}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
                {(() => {
                  const selected = TONES.find(t => t.value === form.tone)
                  return selected ? (
                    <p className="text-xs text-[#555568] mt-2">{selected.emoji} {selected.description}</p>
                  ) : null
                })()}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div />
                <div className="form-group mb-0">
                  <label className="label">Max Call Duration (seconds)</label>
                  <input
                    type="number" className="input" min={30} max={3600}
                    value={form.max_call_duration}
                    onChange={e => set('max_call_duration', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-group mt-4">
                <label className="label">Conversation Flow (optional)</label>
                <select className="select" value={form.flow_id || ''} onChange={e => set('flow_id', e.target.value || null)}>
                  <option value="">Freeform — no structured flow</option>
                  {flowsList.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <div className="flex gap-2 mt-2">
                  <Link to="/flows/new" className="btn-ghost text-xs">+ Create New Flow</Link>
                </div>
              </div>
            </div>

            {/* Guardrails (collapsed) */}
            <div className="card p-5">
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => setShowGuardrails(!showGuardrails)}
              >
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#555568] flex items-center gap-2">
                  <Shield size={13} /> Guardrails
                </h2>
                <ChevronDown size={13} className={`text-[#555568] transition-transform ${showGuardrails ? 'rotate-180' : ''}`} />
              </button>

              {showGuardrails && (
                <div className="mt-4 space-y-3">
                  <InstructionBanner>
                    Set boundaries for safe conversations. These rules are injected into the agent's system prompt.
                  </InstructionBanner>
                  <div>
                    <label className="label">Forbidden Topics (comma-separated)</label>
                    <input
                      className="input"
                      placeholder="politics, religion, competitor names"
                      value={(form.guardrails as any)?.forbidden_topics?.join(', ') || ''}
                      onChange={e => set('guardrails', {
                        ...form.guardrails as any,
                        forbidden_topics: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                    />
                  </div>
                  <div>
                    <label className="label">Required Disclosures</label>
                    <textarea
                      className="input"
                      rows={2}
                      placeholder="This call may be recorded for quality purposes."
                      value={(form.guardrails as any)?.required_disclosures || ''}
                      onChange={e => set('guardrails', { ...form.guardrails as any, required_disclosures: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Preview */}
          <div className="col-span-2 sticky top-4 space-y-4 self-start">
            {/* Agent card preview */}
            <div className="card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#555568] mb-3">Preview</h3>
              <div className="bg-[#111118] rounded-lg p-3 border border-[#2A2A3A]">
                <div className="font-medium text-sm mb-1">{form.name || 'Agent Name'}</div>
                <div className="text-xs text-[#8888A0] space-y-0.5">
                  <div>Voice: <span className="text-[#F0F0F8]">{form.voice_id}</span> <span className="text-[#555568]">({form.voice_model})</span></div>
                  <div>Model: <span className="text-[#F0F0F8]">{form.llm_model}</span></div>
                  <div>Tone: <span className="text-[#F0F0F8] capitalize">{form.tone}</span></div>
                  <div>Language: <span className="text-[#F0F0F8]">{form.language}</span></div>
                </div>
              </div>
            </div>

            {/* Test call */}
            <div className="card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#555568] mb-3 flex items-center gap-2">
                <Phone size={13} /> Test Call
              </h3>
              {!isEdit && (
                <p className="text-xs text-[#555568] mb-3">Save the agent first to enable test calls.</p>
              )}
              <div className="space-y-2">
                <input
                  className="input"
                  placeholder="+91 98765 43210"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  disabled={!isEdit}
                />
                <button
                  className="btn-primary w-full justify-center"
                  onClick={handleTestCall}
                  disabled={!isEdit || !testPhone || calling}
                >
                  <Phone size={12} /> {calling ? 'Calling...' : 'Call Now'}
                </button>
              </div>
              {callStatus && (
                <div className="mt-2 p-2 bg-[#111118] rounded text-xs text-[#8888A0] border border-[#2A2A3A]">
                  {callStatus}
                </div>
              )}
            </div>

            {/* Quick status */}
            <div className="card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#555568] mb-3">Status</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#555568]">Active</span>
                  <span className={form.is_active ? 'text-green-400' : 'text-[#555568]'}>
                    {form.is_active ? 'Yes' : 'No'}
                  </span>
                </div>
                <button
                  className="btn-secondary w-full text-xs"
                  onClick={() => set('is_active', !form.is_active)}
                >
                  {form.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
