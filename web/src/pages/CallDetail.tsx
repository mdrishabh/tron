import { useParams, Link } from 'react-router-dom'
import useSWR from 'swr'
import { ArrowLeft, Phone, User, Clock, Tag, MessageSquare } from 'lucide-react'
import api from '../lib/api'
import Badge from '../components/Badge'

const fetcher = (url: string) => api.get(url)

const STATUS_BADGE: Record<string, string> = { completed: 'success', in_progress: 'info', failed: 'error', pending: 'neutral' }

export default function CallDetail() {
  const { id } = useParams()
  const { data: call, isLoading } = useSWR(`/calls/${id}`, fetcher)
  const c = call as any

  if (isLoading) return <div className="flex items-center justify-center h-full text-[#555568] text-sm">Loading...</div>
  if (!c) return <div className="flex items-center justify-center h-full text-[#555568] text-sm">Call not found</div>

  const transcript: Array<{ role: string; text: string; ts?: number }> = c.transcript || []

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link to="/calls" className="btn-ghost p-1.5"><ArrowLeft size={14} /></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold">{c.phone_number}</h1>
              <Badge variant={STATUS_BADGE[c.status] || 'neutral'}>
                {c.status}
              </Badge>
            </div>
            <p className="text-xs text-[#555568]">{c.started_at ? new Date(c.started_at).toLocaleString() : ''}</p>
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="grid grid-cols-3 gap-5">
          {/* Left: transcript */}
          <div className="col-span-2 space-y-4">
            <div className="card p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#555568] mb-4 flex items-center gap-2">
                <MessageSquare size={13} /> Transcript
              </h2>
              {transcript.length === 0 ? (
                <div className="text-center py-8 text-[#555568] text-sm">No transcript available</div>
              ) : (
                <div className="space-y-3">
                  {transcript.map((t, i) => (
                    <div key={i} className={`flex gap-3 ${t.role === 'agent' ? 'flex-row' : 'flex-row-reverse'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${t.role === 'agent' ? 'bg-indigo-600 text-white' : 'bg-[#2A2A3A] text-[#8888A0]'}`}>
                        {t.role === 'agent' ? 'A' : 'U'}
                      </div>
                      <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${t.role === 'agent' ? 'bg-indigo-600/20 border border-indigo-600/30' : 'bg-[#1E1E2E] border border-[#2A2A3A]'}`}>
                        {t.text}
                        {t.ts && <div className="text-[10px] text-[#555568] mt-1">{new Date(t.ts * 1000).toLocaleTimeString()}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: details */}
          <div className="space-y-4">
            <div className="card p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#555568] mb-3">Call Details</h2>
              <div className="space-y-2 text-xs">
                {[
                  { icon: <Phone size={11} />, label: 'Phone', value: c.phone_number },
                  { icon: <User size={11} />, label: 'Agent', value: c.agent_name || c.agent_id || '—' },
                  { icon: <Clock size={11} />, label: 'Duration', value: c.duration ? `${Math.floor(c.duration / 60)}m ${c.duration % 60}s` : '—' },
                  { icon: <Tag size={11} />, label: 'Outcome', value: c.outcome || '—' },
                  { icon: <Tag size={11} />, label: 'Direction', value: c.direction || '—' },
                  { icon: <Tag size={11} />, label: 'LiveKit Room', value: c.livekit_room || '—' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-start gap-2">
                    <span className="text-[#555568] flex items-center gap-1 flex-shrink-0">{row.icon}{row.label}</span>
                    <span className="text-right font-mono text-[11px] break-all">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {c.summary && (
              <div className="card p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#555568] mb-2">Summary</h2>
                <p className="text-xs text-[#8888A0] leading-relaxed">{c.summary}</p>
              </div>
            )}

            {c.tags && c.tags.length > 0 && (
              <div className="card p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#555568] mb-2">Tags</h2>
                <div className="flex flex-wrap gap-1">
                  {c.tags.map((tag: string) => (
                    <span key={tag} className="px-2 py-0.5 bg-indigo-600/20 border border-indigo-600/30 rounded text-xs text-indigo-300">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {c.recording_url && (
              <div className="card p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#555568] mb-2">Recording</h2>
                <audio controls className="w-full" src={c.recording_url} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
