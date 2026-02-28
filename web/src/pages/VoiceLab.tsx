import { useState } from 'react'
import useSWR from 'swr'
import { Play, Volume2, Mic } from 'lucide-react'
import api from '../lib/api'
import { LANGUAGES, TTS_MODELS } from '../lib/constants'
import InstructionBanner from '../components/InstructionBanner'

const fetcher = (url: string) => api.get(url)

const GENDER_COLORS: Record<string, string> = {
  Male: '#6366f1',
  Female: '#ec4899',
  Neutral: '#6b7280',
}

const PREVIEW_TEXTS = [
  { id: 'hinglish', label: 'Hinglish', text: 'Namaste! Main aapka AI assistant hoon. Aap mujhse kuch bhi pooch sakte hain.' },
  { id: 'sales', label: 'Sales', text: 'Hello! Humara naya product launch hua hai jo aapke business ko 3x grow kar sakta hai.' },
  { id: 'support', label: 'Support', text: 'Aapka call important hai humare liye. Main aapki problem solve karne mein help karungi.' },
  { id: 'english', label: 'English', text: 'Hello! I am your AI voice assistant. How can I help you today?' },
  { id: 'formal', label: 'Formal Hindi', text: 'Namaskar! Kripya apna sawaal poochein, main aapki sahayata karunga.' },
]

export default function VoiceLab() {
  const [model, setModel] = useState('bulbul:v3-beta')
  const { data: voices, isLoading } = useSWR(`/voices?model=${model}`, fetcher)
  const [text, setText] = useState('Namaste! Main Tron AI hoon. Aap mujhse baat kar sakte hain.')
  const [language, setLanguage] = useState('hi-IN')
  const [playing, setPlaying] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const voiceList = (voices as any[]) || []
  const filtered = voiceList.filter(v =>
    !filter || v.name.toLowerCase().includes(filter.toLowerCase()) || v.gender.toLowerCase() === filter.toLowerCase()
  )

  async function playVoice(voiceId: string) {
    if (playing === voiceId) return
    setPlaying(voiceId)
    try {
      const response = await fetch('/api/tron/voices/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: voiceId, text, language, model }),
      })
      if (!response.ok) throw new Error(`Preview failed: ${response.statusText}`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => { setPlaying(null); URL.revokeObjectURL(url) }
      audio.onerror = () => { setPlaying(null) }
      audio.play()
    } catch (e: any) {
      alert(e.message)
      setPlaying(null)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="text-base font-semibold">Voice Lab</h1>
          <p className="text-xs text-[#555568]">{voiceList.length} voices — {TTS_MODELS.find(m => m.value === model)?.label || model}</p>
        </div>
      </div>

      <div className="page-content">
        <InstructionBanner>
          Preview all available Indian voices. Select a TTS model, enter sample text, and click a voice to hear it speak.
          Requires a valid Sarvam API key in Settings.
        </InstructionBanner>

        {/* Controls */}
        <div className="card p-4 mb-5">
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="label">Preview Text</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {PREVIEW_TEXTS.map(p => (
                  <button
                    key={p.id}
                    className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                      text === p.text
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                        : 'border-[#2A2A3A] text-[#8888A0] hover:border-[#555568]'
                    }`}
                    onClick={() => setText(p.text)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <textarea
                className="input min-h-[60px] resize-none"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Type custom text or click a preset above..."
              />
            </div>
            <div>
              <label className="label">TTS Model</label>
              <select className="select" value={model} onChange={e => setModel(e.target.value)}>
                {TTS_MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <p className="text-xs text-[#555568] mt-1">
                {TTS_MODELS.find(m => m.value === model)?.description || ''}
              </p>
            </div>
            <div>
              <label className="label">Language</label>
              <select className="select" value={language} onChange={e => setLanguage(e.target.value)}>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
              <div className="mt-2">
                <label className="label">Filter</label>
                <select className="select" value={filter} onChange={e => setFilter(e.target.value)}>
                  <option value="">All Voices</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-[#555568] text-sm">Loading voices...</div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {filtered.map((v: any) => (
              <div
                key={v.id}
                className={`card p-3 cursor-pointer transition-all hover:border-indigo-500/50 ${playing === v.id ? 'border-indigo-500' : ''}`}
                onClick={() => playVoice(v.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${GENDER_COLORS[v.gender] || '#6366f1'}22`, border: `1px solid ${GENDER_COLORS[v.gender] || '#6366f1'}44` }}
                  >
                    {v.gender === 'Female' ? <Mic size={14} style={{ color: GENDER_COLORS[v.gender] }} /> : <Volume2 size={14} style={{ color: GENDER_COLORS[v.gender] }} />}
                  </div>
                  <button
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${playing === v.id ? 'bg-indigo-600 animate-pulse' : 'bg-[#1E1E2E] hover:bg-indigo-600/30'}`}
                  >
                    <Play size={11} className={playing === v.id ? 'text-white' : 'text-[#8888A0]'} />
                  </button>
                </div>
                <div className="font-medium text-sm">{v.name}</div>
                <div className="text-xs text-[#555568] flex justify-between mt-0.5">
                  <span>{v.gender}</span>
                  {v.character && <span className="capitalize">{v.character}</span>}
                </div>
                {v.description && (
                  <div className="text-[10px] text-[#555568] mt-1 line-clamp-2">{v.description}</div>
                )}
                {!v.description && v.best_for && (
                  <div className="text-[10px] text-[#555568] mt-0.5">Best for: {v.best_for}</div>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-4 text-center py-10 text-[#555568] text-sm">No voices match your filter</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
