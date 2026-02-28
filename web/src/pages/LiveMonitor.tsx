import { useEffect, useRef, useState } from 'react'
import { Phone, PhoneOff, Activity, Wifi, WifiOff } from 'lucide-react'
import api from '../lib/api'
import Badge from '../components/Badge'
import InstructionBanner from '../components/InstructionBanner'

interface ActiveCall {
  call_id: string
  phone_number: string
  agent_name: string
  started_at: string
  duration: number
  livekit_room: string
  transcript_tail: Array<{ role: string; text: string }>
}

export default function LiveMonitor() {
  const [calls, setCalls] = useState<ActiveCall[]>([])
  const [connected, setConnected] = useState(false)
  const [lastPing, setLastPing] = useState<Date | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [durations, setDurations] = useState<Record<string, number>>({})

  useEffect(() => {
    // Poll active calls
    async function fetchActive() {
      try {
        const res = await api.get('/calls/active') as any[]
        setCalls(res || [])
      } catch {}
    }
    fetchActive()

    // WebSocket
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${location.host}/ws/tron`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    ws.onmessage = evt => {
      try {
        const msg = JSON.parse(evt.data)
        if (msg.type === 'ping') { setLastPing(new Date()); return }
        if (msg.type === 'call_started') {
          fetchActive()
        } else if (msg.type === 'call_ended') {
          setCalls(c => c.filter(x => x.call_id !== msg.data?.call_id))
        } else if (msg.type === 'transcript_update') {
          const { call_id, role, text } = msg.data || {}
          setCalls(prev => prev.map(c => {
            if (c.call_id !== call_id) return c
            const tail = [...(c.transcript_tail || []), { role, text }].slice(-6)
            return { ...c, transcript_tail: tail }
          }))
        }
      } catch {}
    }

    // Duration counter
    timerRef.current = setInterval(() => {
      setDurations(prev => {
        const next: Record<string, number> = {}
        calls.forEach(c => {
          const secs = Math.floor((Date.now() - new Date(c.started_at).getTime()) / 1000)
          next[c.call_id] = secs
        })
        return next
      })
    }, 1000)

    const pollInterval = setInterval(fetchActive, 10000)

    return () => {
      ws.close()
      if (timerRef.current) clearInterval(timerRef.current)
      clearInterval(pollInterval)
    }
  }, [])

  async function hangup(callId: string) {
    try {
      await api.post(`/calls/${callId}/hangup`, {})
      setCalls(c => c.filter(x => x.call_id !== callId))
    } catch (e: any) {
      alert(e.message)
    }
  }

  function formatDuration(secs: number) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="text-base font-semibold">Live Monitor</h1>
          <p className="text-xs text-[#555568]">{calls.length} active call{calls.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {connected
            ? <><Wifi size={13} className="text-green-400" /><span className="text-green-400">Live</span></>
            : <><WifiOff size={13} className="text-red-400" /><span className="text-red-400">Disconnected</span></>}
          {lastPing && <span className="text-[#555568]">Last ping: {lastPing.toLocaleTimeString()}</span>}
        </div>
      </div>

      <div className="page-content">
        <InstructionBanner>
          Live view of all active calls. Transcript updates in real time via WebSocket. You can force hang up any call.
        </InstructionBanner>

        {calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Activity size={32} className="text-[#2A2A3A]" />
            <p className="text-[#555568] text-sm">No active calls right now</p>
            <p className="text-xs text-[#555568]">Calls will appear here as soon as they connect</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {calls.map(call => {
              const dur = durations[call.call_id] ?? Math.floor((Date.now() - new Date(call.started_at).getTime()) / 1000)
              return (
                <div key={call.call_id} className="card p-4 border-l-4 border-l-green-500">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Phone size={13} className="text-green-400" />
                        <span className="font-medium text-sm">{call.phone_number}</span>
                        <Badge variant="success">Live</Badge>
                      </div>
                      <div className="text-xs text-[#555568] mt-0.5">
                        Agent: {call.agent_name} · {formatDuration(dur)}
                      </div>
                    </div>
                    <button
                      className="btn-secondary text-xs text-red-400 border-red-800/50"
                      onClick={() => hangup(call.call_id)}
                    >
                      <PhoneOff size={11} /> Hang Up
                    </button>
                  </div>

                  <div className="bg-[#0A0A0F] rounded-lg p-3 border border-[#1E1E2E] space-y-1.5 min-h-[80px]">
                    {(call.transcript_tail || []).length === 0 ? (
                      <p className="text-xs text-[#555568] italic">Waiting for transcript...</p>
                    ) : (call.transcript_tail || []).map((t, i) => (
                      <div key={i} className={`flex gap-2 text-xs ${t.role === 'agent' ? '' : 'flex-row-reverse'}`}>
                        <span className={`font-semibold flex-shrink-0 ${t.role === 'agent' ? 'text-indigo-400' : 'text-[#8888A0]'}`}>
                          {t.role === 'agent' ? 'A' : 'U'}:
                        </span>
                        <span className="text-[#F0F0F8]">{t.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 text-[10px] text-[#555568] font-mono truncate">
                    Room: {call.livekit_room}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
