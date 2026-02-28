import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { Phone, PhoneOff, Wifi, WifiOff } from 'lucide-react'
import api from '../lib/api'
import InstructionBanner from '../components/InstructionBanner'

const fetcher = (url: string) => api.get(url)

interface TranscriptEntry { role: string; text: string; ts: number }

export default function TestCall() {
  const { data: agents } = useSWR('/agents', fetcher)
  const agentList = (agents as any[]) || []

  const [agentId, setAgentId] = useState('')
  const [phone, setPhone] = useState('')
  const [calling, setCalling] = useState(false)
  const [callId, setCallId] = useState<string | null>(null)
  const [roomName, setRoomName] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [status, setStatus] = useState('')
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (agentList.length > 0 && !agentId) {
      setAgentId(agentList[0].id)
    }
  }, [agentList])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  useEffect(() => {
    if (!callId) return

    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${location.host}/ws/tron`)
    wsRef.current = ws

    ws.onopen = () => setWsConnected(true)
    ws.onclose = () => setWsConnected(false)
    ws.onmessage = evt => {
      try {
        const msg = JSON.parse(evt.data)
        if (msg.type === 'transcript_update' && msg.data?.call_id === callId) {
          setTranscript(prev => [...prev, {
            role: msg.data.role,
            text: msg.data.text,
            ts: Date.now(),
          }])
        } else if (msg.type === 'call_ended' && msg.data?.call_id === callId) {
          setStatus('Call ended')
          setCalling(false)
        }
      } catch {}
    }

    return () => ws.close()
  }, [callId])

  async function startCall() {
    if (!agentId || !phone) return
    setCalling(true)
    setTranscript([])
    setStatus('Initiating call...')
    try {
      const res = await api.post('/calls/dial', {
        agent_id: agentId,
        phone_number: phone,
      }) as any
      setCallId(res.call_id || res.id)
      setRoomName(res.livekit_room)
      setStatus(`Connected · Room: ${res.livekit_room}`)
    } catch (e: any) {
      setStatus(`Error: ${e.message}`)
      setCalling(false)
    }
  }

  async function endCall() {
    if (!callId) { setCalling(false); return }
    try {
      await api.post(`/calls/${callId}/hangup`, {})
    } catch {}
    setStatus('Call ended')
    setCalling(false)
    setCallId(null)
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="text-base font-semibold">Test Call</h1>
          <p className="text-xs text-[#555568]">Initiate a live test call and monitor transcript in real time</p>
        </div>
        {callId && (
          <div className="flex items-center gap-2 text-xs">
            {wsConnected
              ? <><Wifi size={13} className="text-green-400" /><span className="text-green-400">Live</span></>
              : <><WifiOff size={13} className="text-[#555568]" /><span className="text-[#555568]">WS not connected</span></>}
          </div>
        )}
      </div>

      <div className="page-content">
        <div className="grid grid-cols-5 gap-5">
          {/* Left: controls */}
          <div className="col-span-2 space-y-4">
            <InstructionBanner>
              Select an agent, enter a phone number (with country code), and hit Call.
              The live transcript will appear on the right as the conversation unfolds.
            </InstructionBanner>

            <div className="card p-4 space-y-4">
              <div>
                <label className="label">Agent</label>
                <select className="select" value={agentId} onChange={e => setAgentId(e.target.value)} disabled={calling}>
                  {agentList.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Phone Number</label>
                <input
                  className="input font-mono"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  disabled={calling}
                />
              </div>

              {!calling ? (
                <button
                  className="btn-primary w-full justify-center"
                  onClick={startCall}
                  disabled={!agentId || !phone}
                >
                  <Phone size={14} /> Start Call
                </button>
              ) : (
                <button className="btn-secondary w-full justify-center text-red-400 border-red-800/50" onClick={endCall}>
                  <PhoneOff size={14} /> End Call
                </button>
              )}

              {status && (
                <div className="p-2 bg-[#111118] rounded border border-[#2A2A3A] text-xs text-[#8888A0]">
                  {status}
                </div>
              )}
            </div>

            {callId && (
              <div className="card p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#555568] mb-2">Call Info</h3>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#555568]">Call ID</span>
                    <span className="font-mono text-[11px] truncate ml-2">{callId}</span>
                  </div>
                  {roomName && (
                    <div className="flex justify-between">
                      <span className="text-[#555568]">Room</span>
                      <span className="font-mono text-[11px] truncate ml-2">{roomName}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: transcript */}
          <div className="col-span-3">
            <div className="card h-full flex flex-col min-h-[400px]">
              <div className="p-3 border-b border-[#1E1E2E] flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#555568]">Live Transcript</h3>
                {transcript.length > 0 && (
                  <button className="text-xs text-[#555568] hover:text-[#F0F0F8]" onClick={() => setTranscript([])}>Clear</button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {transcript.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-10 gap-2">
                    <Phone size={28} className="text-[#2A2A3A]" />
                    <p className="text-[#555568] text-sm">Transcript will appear here once the call connects</p>
                  </div>
                ) : transcript.map((t, i) => (
                  <div key={i} className={`flex gap-3 ${t.role === 'agent' ? '' : 'flex-row-reverse'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${t.role === 'agent' ? 'bg-indigo-600 text-white' : 'bg-[#2A2A3A] text-[#8888A0]'}`}>
                      {t.role === 'agent' ? 'A' : 'U'}
                    </div>
                    <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${t.role === 'agent' ? 'bg-indigo-600/20 border border-indigo-600/30' : 'bg-[#1E1E2E] border border-[#2A2A3A]'}`}>
                      {t.text}
                      <div className="text-[10px] text-[#555568] mt-0.5">
                        {new Date(t.ts).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
