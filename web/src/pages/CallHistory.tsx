import { useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR from 'swr'
import { Search, Filter, Phone, PhoneIncoming, PhoneOutgoing, Download } from 'lucide-react'
import api from '../lib/api'
import Badge from '../components/Badge'
import InstructionBanner from '../components/InstructionBanner'

const fetcher = (url: string) => api.get(url)

const STATUS_BADGE: Record<string, string> = { completed: 'success', in_progress: 'info', failed: 'error', pending: 'neutral' }

export default function CallHistory() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState('')
  const [directionFilter, setDirectionFilter] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (statusFilter) params.set('status', statusFilter)
  if (outcomeFilter) params.set('outcome', outcomeFilter)
  if (directionFilter) params.set('direction', directionFilter)
  params.set('limit', String(PAGE_SIZE))
  params.set('offset', String(page * PAGE_SIZE))

  const { data: calls, isLoading } = useSWR(`/calls?${params.toString()}`, fetcher)
  const list = (calls as any[]) || []

  function exportCSV() {
    const rows = [['ID', 'Phone', 'Direction', 'Status', 'Outcome', 'Duration', 'Agent', 'Started'].join(',')]
    list.forEach((c: any) => {
      rows.push([c.id, c.phone_number, c.direction, c.status, c.outcome || '', c.duration || 0, c.agent_id, c.started_at || ''].join(','))
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'call-history.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="text-base font-semibold">Call History</h1>
          <p className="text-xs text-[#555568]">{list.length} calls loaded</p>
        </div>
        <button className="btn-secondary text-xs" onClick={exportCSV}><Download size={12} /> Export CSV</button>
      </div>

      <div className="page-content">
        <InstructionBanner>
          Browse all outbound and inbound calls. Click any row to view the full transcript and recording.
        </InstructionBanner>

        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555568]" />
            <input
              className="input pl-8 text-sm"
              placeholder="Search by phone number..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
            />
          </div>
          <select className="select w-auto text-sm" value={directionFilter} onChange={e => { setDirectionFilter(e.target.value); setPage(0) }}>
            <option value="">All Directions</option>
            <option value="outbound">Outbound</option>
            <option value="inbound">Inbound</option>
          </select>
          <select className="select w-auto text-sm" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }}>
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="failed">Failed</option>
          </select>
          <select className="select w-auto text-sm" value={outcomeFilter} onChange={e => { setOutcomeFilter(e.target.value); setPage(0) }}>
            <option value="">All Outcomes</option>
            <option value="connected">Connected</option>
            <option value="voicemail">Voicemail</option>
            <option value="no_answer">No Answer</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#1E1E2E]">
                <tr className="text-[10px] uppercase tracking-wider text-[#555568]">
                  <th className="text-left p-3 pl-4">Direction</th>
                  <th className="text-left p-3">Phone Number</th>
                  <th className="text-left p-3">Agent</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Outcome</th>
                  <th className="text-left p-3">Duration</th>
                  <th className="text-left p-3">Date</th>
                  <th className="p-3 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center py-10 text-[#555568] text-sm">Loading...</td></tr>
                ) : list.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-[#555568] text-sm">No calls found</td></tr>
                ) : list.map((c: any) => (
                  <tr key={c.id} className="border-b border-[#1E1E2E]/50 hover:bg-[#111118]/50 text-sm">
                    <td className="p-3 pl-4">
                      {c.direction === 'outbound'
                        ? <PhoneOutgoing size={13} className="text-indigo-400" />
                        : <PhoneIncoming size={13} className="text-green-400" />}
                    </td>
                    <td className="p-3 font-mono text-xs">{c.phone_number}</td>
                    <td className="p-3 text-xs text-[#8888A0]">{c.agent_name || c.agent_id || '—'}</td>
                    <td className="p-3">
                      <Badge variant={STATUS_BADGE[c.status] || 'neutral'}>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs capitalize text-[#8888A0]">{c.outcome || '—'}</td>
                    <td className="p-3 text-xs text-[#8888A0]">
                      {c.duration ? `${Math.floor(c.duration / 60)}:${String(c.duration % 60).padStart(2, '0')}` : '—'}
                    </td>
                    <td className="p-3 text-xs text-[#555568]">
                      {c.started_at ? new Date(c.started_at).toLocaleString() : '—'}
                    </td>
                    <td className="p-3 pr-4">
                      <Link to={`/calls/${c.id}`} className="text-xs text-indigo-400 hover:text-indigo-300">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.length >= PAGE_SIZE && (
            <div className="flex justify-between items-center p-3 border-t border-[#1E1E2E]">
              <button className="btn-ghost text-xs" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Previous</button>
              <span className="text-xs text-[#555568]">Page {page + 1}</span>
              <button className="btn-ghost text-xs" onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
