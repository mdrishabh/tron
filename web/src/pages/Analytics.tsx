import useSWR from 'swr'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { Phone, CheckCircle, Clock, TrendingUp, Users } from 'lucide-react'
import api from '../lib/api'
import InstructionBanner from '../components/InstructionBanner'

const fetcher = (url: string) => api.get(url)

const PIE_COLORS = ['#22c55e', '#f59e0b', '#6b7280', '#ef4444', '#6366f1']

export default function Analytics() {
  const { data: overview } = useSWR('/analytics/overview', fetcher)
  const { data: callVolume } = useSWR('/analytics/calls?days=14', fetcher)
  const { data: outcomes } = useSWR('/analytics/outcomes', fetcher)
  const { data: agents } = useSWR('/analytics/agents', fetcher)

  const ov = overview as any || {}
  const volumeData = (callVolume as any[]) || []
  const outcomeData = ((outcomes as any[]) || []).map((r: any) => ({ name: r.outcome, value: r.count }))
  const agentData = (agents as any[]) || []

  const stats = [
    { label: 'Calls Today', value: ov.total_calls_today ?? 0, icon: <Phone size={16} />, color: 'indigo' },
    { label: 'Calls This Week', value: ov.total_calls_week ?? 0, icon: <CheckCircle size={16} />, color: 'green' },
    { label: 'Avg Duration', value: (ov.avg_duration_seconds ?? 0) > 0 ? `${Math.floor(ov.avg_duration_seconds / 60)}m ${Math.floor(ov.avg_duration_seconds % 60)}s` : '0s', icon: <Clock size={16} />, color: 'blue' },
    { label: 'Success Rate', value: `${(ov.success_rate ?? 0).toFixed(1)}%`, icon: <TrendingUp size={16} />, color: 'purple' },
    { label: 'Active Campaigns', value: ov.active_campaigns ?? 0, icon: <Users size={16} />, color: 'pink' },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="text-base font-semibold">Analytics</h1>
          <p className="text-xs text-[#555568]">Platform-wide performance metrics</p>
        </div>
      </div>

      <div className="page-content space-y-5">
        <InstructionBanner>
          Analytics are computed from your call history. Data refreshes on each page load.
        </InstructionBanner>

        {/* KPI row */}
        <div className="grid grid-cols-5 gap-4">
          {stats.map(s => (
            <div key={s.label} className="card p-4">
              <div className="text-[#555568] mb-2">{s.icon}</div>
              <div className="text-2xl font-semibold">{s.value}</div>
              <div className="text-xs text-[#555568] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-3 gap-5">
          <div className="card p-4 col-span-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#555568] mb-4">Call Volume (14 days)</h2>
            {volumeData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-[#555568] text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={volumeData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#555568' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#555568' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#111118', border: '1px solid #2A2A3A', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#555568] mb-4">Outcomes</h2>
            {outcomeData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-[#555568] text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={outcomeData} cx="50%" cy="45%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {outcomeData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#111118', border: '1px solid #2A2A3A', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#8888A0' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Agent performance table */}
        <div className="card">
          <div className="p-4 border-b border-[#1E1E2E]">
            <h2 className="text-sm font-semibold">Agent Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#1E1E2E]">
                <tr className="text-[10px] uppercase tracking-wider text-[#555568]">
                  <th className="text-left p-3 pl-4">Agent</th>
                  <th className="text-left p-3">Total Calls</th>
                  <th className="text-left p-3">Success Rate</th>
                  <th className="text-left p-3">Avg Duration</th>
                </tr>
              </thead>
              <tbody>
                {agentData.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-[#555568] text-sm">No agent data yet</td></tr>
                ) : agentData.map((a: any) => (
                  <tr key={a.agent_id} className="border-b border-[#1E1E2E]/50 hover:bg-[#111118]/50 text-sm">
                    <td className="p-3 pl-4 font-medium text-sm">{a.agent_name || a.agent_id}</td>
                    <td className="p-3 text-xs">{a.total_calls}</td>
                    <td className="p-3 text-xs">{a.success_rate?.toFixed(1)}%</td>
                    <td className="p-3 text-xs">{a.avg_duration > 0 ? `${Math.floor(a.avg_duration / 60)}m ${Math.floor(a.avg_duration % 60)}s` : '—'}</td>
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
