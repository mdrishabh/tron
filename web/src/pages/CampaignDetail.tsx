import { useParams, Link } from 'react-router-dom'
import useSWR, { mutate } from 'swr'
import { ArrowLeft, Play, Pause, StopCircle, Download, Phone, User, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import api from '../lib/api'
import Badge from '../components/Badge'

const fetcher = (url: string) => api.get(url)

const CAMPAIGN_BADGE: Record<string, string> = { draft: 'neutral', running: 'success', paused: 'warning', completed: 'info', cancelled: 'error' }
const STATUS_BADGE: Record<string, string> = { completed: 'success', in_progress: 'info', failed: 'error', pending: 'neutral' }

const OUTCOME_ICONS: Record<string, any> = {
  connected: <CheckCircle size={12} className="text-green-400" />,
  voicemail: <AlertCircle size={12} className="text-yellow-400" />,
  no_answer: <XCircle size={12} className="text-[#555568]" />,
  failed: <XCircle size={12} className="text-red-400" />,
  pending: <Clock size={12} className="text-[#555568]" />,
}

export default function CampaignDetail() {
  const { id } = useParams()
  const { data: campaign, isLoading } = useSWR(`/campaigns/${id}`, fetcher)
  const { data: calls } = useSWR(`/calls?campaign_id=${id}&limit=200`, fetcher)

  const c = campaign as any
  const callList = (calls as any[]) || []

  if (isLoading) return <div className="flex items-center justify-center h-full text-[#555568] text-sm">Loading...</div>
  if (!c) return null

  const total = c.total_contacts || 0
  const completed = c.completed_contacts || 0
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const connected = callList.filter((x: any) => x.outcome === 'connected').length
  const cr = callList.length > 0 ? Math.round((connected / callList.length) * 100) : 0

  async function action(act: string) {
    try { await api.post(`/campaigns/${id}/${act}`, {}); mutate(`/campaigns/${id}`) } catch (e: any) { alert(e.message) }
  }

  function exportCSV() {
    const rows = [['Phone', 'Name', 'Status', 'Outcome', 'Duration', 'Called At'].join(',')]
    callList.forEach((call: any) => {
      rows.push([call.phone_number, call.contact_name || '', call.status, call.outcome || '', call.duration || 0, call.started_at || ''].join(','))
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${c.name}-results.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link to="/campaigns" className="btn-ghost p-1.5"><ArrowLeft size={14} /></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold">{c.name}</h1>
              <Badge variant={CAMPAIGN_BADGE[c.status] || 'neutral'}>{c.status}</Badge>
            </div>
            <p className="text-xs text-[#555568]">Agent: {c.agent_name || c.agent_id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs" onClick={exportCSV}><Download size={12} /> Export CSV</button>
          {c.status === 'draft' && <button className="btn-primary" onClick={() => action('start')}><Play size={12} /> Start</button>}
          {c.status === 'running' && (
            <>
              <button className="btn-secondary" onClick={() => action('pause')}><Pause size={12} /> Pause</button>
              <button className="btn-secondary text-red-400" onClick={() => action('cancel')}><StopCircle size={12} /></button>
            </>
          )}
          {c.status === 'paused' && <button className="btn-primary" onClick={() => action('resume')}><Play size={12} /> Resume</button>}
        </div>
      </div>

      <div className="page-content space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Contacts', value: total, icon: <User size={14} /> },
            { label: 'Calls Made', value: completed, icon: <Phone size={14} /> },
            { label: 'Connected', value: connected, icon: <CheckCircle size={14} /> },
            { label: 'Connection Rate', value: `${cr}%`, icon: <CheckCircle size={14} /> },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <div className="flex items-center gap-2 text-[#555568] mb-1 text-xs">{s.icon}{s.label}</div>
              <div className="text-2xl font-semibold">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="card p-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Progress</span>
            <span className="text-[#555568]">{completed}/{total} contacts</span>
          </div>
          <div className="h-2 bg-[#1E1E2E] rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-[#555568] mt-1">
            <span>{pct}% complete</span>
            {c.started_at && <span>Started: {new Date(c.started_at).toLocaleString()}</span>}
          </div>
        </div>

        {/* Contacts table */}
        <div className="card">
          <div className="p-4 border-b border-[#1E1E2E] flex items-center justify-between">
            <h2 className="text-sm font-semibold">Call Results</h2>
            <span className="text-xs text-[#555568]">{callList.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#1E1E2E]">
                <tr className="text-[10px] uppercase tracking-wider text-[#555568]">
                  <th className="text-left p-3 pl-4">Contact</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Outcome</th>
                  <th className="text-left p-3">Duration</th>
                  <th className="text-left p-3">Time</th>
                  <th className="text-left p-3 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {callList.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-[#555568] text-sm">No calls yet</td></tr>
                ) : callList.map((call: any) => (
                  <tr key={call.id} className="border-b border-[#1E1E2E]/50 hover:bg-[#111118]/50 text-sm">
                    <td className="p-3 pl-4">
                      <div className="font-medium text-xs">{call.contact_name || call.phone_number}</div>
                      {call.contact_name && <div className="text-[10px] text-[#555568]">{call.phone_number}</div>}
                    </td>
                    <td className="p-3">
                      <Badge variant={STATUS_BADGE[call.status] || 'neutral'}>
                        {call.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {OUTCOME_ICONS[call.outcome || 'pending']}
                        <span className="text-xs text-[#8888A0] capitalize">{call.outcome || '—'}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-[#8888A0]">
                      {call.duration ? `${Math.floor(call.duration / 60)}:${String(call.duration % 60).padStart(2, '0')}` : '—'}
                    </td>
                    <td className="p-3 text-xs text-[#555568]">
                      {call.started_at ? new Date(call.started_at).toLocaleString() : '—'}
                    </td>
                    <td className="p-3 pr-4">
                      <Link to={`/calls/${call.id}`} className="text-xs text-indigo-400 hover:text-indigo-300">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
