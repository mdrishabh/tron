import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Save, Check, X, Loader, Phone, Mic, Brain, Settings as SettingsIcon } from 'lucide-react'
import api from '../lib/api'
import InstructionBanner from '../components/InstructionBanner'

const fetcher = (url: string) => api.get(url)

type TestResult = { ok: boolean; message: string } | null

export default function Settings() {
  const { data: settings } = useSWR('/settings', fetcher)

  const [vals, setVals] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('telephony')
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})

  useEffect(() => {
    if (settings) setVals({ ...(settings as Record<string, string>) })
  }, [settings])

  function set(k: string, v: string) {
    setVals(prev => ({ ...prev, [k]: v }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api.put('/settings', vals)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function runTest(type: string) {
    setTesting(type)
    setTestResults(prev => ({ ...prev, [type]: null }))
    try {
      const result = await api.post(`/settings/test/${type}`, vals) as any
      setTestResults(prev => ({ ...prev, [type]: { ok: true, message: result.message || 'Connection OK' } }))
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, [type]: { ok: false, message: e.message } }))
    } finally {
      setTesting(null)
    }
  }

  function TestBtn({ type }: { type: string }) {
    const res = testResults[type]
    return (
      <div className="flex items-center gap-2 mt-2">
        <button
          className="btn-secondary text-xs"
          onClick={() => runTest(type)}
          disabled={testing === type}
        >
          {testing === type ? <Loader size={11} className="animate-spin" /> : 'Test Connection'}
        </button>
        {res && (
          <span className={`text-xs flex items-center gap-1 ${res.ok ? 'text-green-400' : 'text-red-400'}`}>
            {res.ok ? <Check size={11} /> : <X size={11} />}
            {res.message}
          </span>
        )}
      </div>
    )
  }

  const TABS = [
    { id: 'telephony', label: 'Telephony', icon: <Phone size={13} /> },
    { id: 'voice', label: 'Voice Engine', icon: <Mic size={13} /> },
    { id: 'llm', label: 'AI Models', icon: <Brain size={13} /> },
    { id: 'defaults', label: 'Defaults', icon: <SettingsIcon size={13} /> },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="text-base font-semibold">Settings</h1>
          <p className="text-xs text-[#555568]">Platform configuration</p>
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saved ? <><Check size={13} /> Saved!</> : <><Save size={13} /> {saving ? 'Saving...' : 'Save Settings'}</>}
        </button>
      </div>

      <div className="page-content">
        <InstructionBanner>
          Changes are saved to the database. Sensitive values like API keys are masked in the display but stored securely.
        </InstructionBanner>

        <div className="flex gap-5">
          {/* Tabs sidebar */}
          <div className="w-44 flex-shrink-0 space-y-0.5">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${tab === t.id ? 'bg-indigo-600/20 text-indigo-300' : 'text-[#8888A0] hover:bg-[#1E1E2E] hover:text-[#F0F0F8]'}`}
                onClick={() => setTab(t.id)}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 max-w-xl">
            {tab === 'telephony' && (
              <div className="card p-5 space-y-4">
                <h2 className="text-sm font-semibold">Twilio SIP Trunk</h2>
                <div>
                  <label className="label">Account SID</label>
                  <input className="input" value={vals.twilio_account_sid || ''} onChange={e => set('twilio_account_sid', e.target.value)} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                </div>
                <div>
                  <label className="label">Auth Token</label>
                  <input className="input" type="password" value={vals.twilio_auth_token || ''} onChange={e => set('twilio_auth_token', e.target.value)} placeholder="••••••••••••••••" />
                </div>
                <div>
                  <label className="label">From Number</label>
                  <input className="input" value={vals.twilio_from_number || ''} onChange={e => set('twilio_from_number', e.target.value)} placeholder="+18083204948" />
                </div>
                <div>
                  <label className="label">SIP Trunk SID</label>
                  <input className="input" value={vals.twilio_trunk_sid || ''} onChange={e => set('twilio_trunk_sid', e.target.value)} placeholder="STxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                </div>
                <TestBtn type="twilio" />
              </div>
            )}

            {tab === 'voice' && (
              <div className="card p-5 space-y-5">
                <div>
                  <h2 className="text-sm font-semibold mb-3">LiveKit</h2>
                  <div className="space-y-3">
                    <div>
                      <label className="label">LiveKit URL</label>
                      <input className="input" value={vals.livekit_url || ''} onChange={e => set('livekit_url', e.target.value)} placeholder="wss://your-project.livekit.cloud" />
                    </div>
                    <div>
                      <label className="label">API Key</label>
                      <input className="input" value={vals.livekit_api_key || ''} onChange={e => set('livekit_api_key', e.target.value)} />
                    </div>
                    <div>
                      <label className="label">API Secret</label>
                      <input className="input" type="password" value={vals.livekit_api_secret || ''} onChange={e => set('livekit_api_secret', e.target.value)} placeholder="••••••••••••••••" />
                    </div>
                  </div>
                  <TestBtn type="livekit" />
                </div>

                <div className="border-t border-[#1E1E2E] pt-4">
                  <h2 className="text-sm font-semibold mb-3">Sarvam AI (STT + TTS)</h2>
                  <div>
                    <label className="label">Sarvam API Key</label>
                    <input className="input" type="password" value={vals.sarvam_api_key || ''} onChange={e => set('sarvam_api_key', e.target.value)} placeholder="••••••••••••••••" />
                  </div>
                  <TestBtn type="sarvam" />
                </div>
              </div>
            )}

            {tab === 'llm' && (
              <div className="card p-5 space-y-4">
                <h2 className="text-sm font-semibold">LLM Configuration</h2>
                <div>
                  <label className="label">Ollama Base URL</label>
                  <input className="input" value={vals.ollama_base_url || ''} onChange={e => set('ollama_base_url', e.target.value)} placeholder="http://localhost:11434" />
                  <TestBtn type="llm" />
                </div>
                <div className="border-t border-[#1E1E2E] pt-4">
                  <label className="label">OpenAI API Key (optional)</label>
                  <input className="input" type="password" value={vals.openai_api_key || ''} onChange={e => set('openai_api_key', e.target.value)} placeholder="sk-..." />
                </div>
                <div>
                  <label className="label">Google Gemini API Key (optional)</label>
                  <input className="input" type="password" value={vals.gemini_api_key || ''} onChange={e => set('gemini_api_key', e.target.value)} placeholder="AIza..." />
                </div>
              </div>
            )}

            {tab === 'defaults' && (
              <div className="card p-5 space-y-4">
                <h2 className="text-sm font-semibold">Agent Defaults</h2>
                <div>
                  <label className="label">Default Voice</label>
                  <input className="input" value={vals.default_voice || ''} onChange={e => set('default_voice', e.target.value)} placeholder="shreya" />
                </div>
                <div>
                  <label className="label">Default Language</label>
                  <input className="input" value={vals.default_language || ''} onChange={e => set('default_language', e.target.value)} placeholder="hi-IN" />
                </div>
                <div>
                  <label className="label">Default LLM Provider</label>
                  <input className="input" value={vals.default_llm_provider || ''} onChange={e => set('default_llm_provider', e.target.value)} placeholder="ollama" />
                </div>
                <div>
                  <label className="label">Default LLM Model</label>
                  <input className="input" value={vals.default_llm_model || ''} onChange={e => set('default_llm_model', e.target.value)} placeholder="qwen2.5:32b" />
                </div>
                <div>
                  <label className="label">Max Concurrent Calls</label>
                  <input type="number" className="input" value={vals.max_concurrent_calls || ''} onChange={e => set('max_concurrent_calls', e.target.value)} placeholder="10" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
