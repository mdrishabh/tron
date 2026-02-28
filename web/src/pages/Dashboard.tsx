import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR from 'swr'
import {
  PhoneCall, TrendingUp, Radio, Clock, Plus, ArrowRight,
  CheckCircle, XCircle, PhoneMissed, Activity
} from 'lucide-react'
import { api } from '../lib/api'
import { formatDuration, formatRelativeTime, getStatusColor, capFirst } from '../lib/utils'
import InstructionBanner from '../components/InstructionBanner'
import Badge from '../components/Badge'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const fetcher = (url: string) => api.get(url)

const OUTCOME_COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

export default function Dashboard() {
  const { data: overview } = useSWR('/analytics/overview', fetcher, { refreshInterval: 30000 })
  const { data: volume } = useSWR('/analytics/calls?days=7', fetcher, { refreshInterval: 60000 })
  const { data: outcomes } = useSWR('/analytics/outcomes?days=7', fetcher, { refreshInterval: 60000 })
  const { data: activeCalls } = useSWR('/calls/active', fetcher, { refreshInterval: 5000 })
  const { data: recentData } = useSWR('/calls?limit=10', fetcher, { refreshInterval: 15000 })

  const stats = overview as any
  const volumeData = volume as any[] || []
  const outcomesData = outcomes as any[] || []
  const active = activeCalls as any[] || []
  const recent = recentData as any[] || []

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="text-base font-semibold text-[#F0F0F8]">Dashboard</h1>
          <p className="text-xs text-[#555568]">Overview of your AI telecaller activity</p>
        </div>
        <div className="flex gap-2">
          <Link to="/test-call" className="btn-secondary">
            <PhoneCall size={13} /> Test Call
          </Link>
          <Link to="/agents/new" className="btn-primary">
            <Plus size={13} /> New Agent
          </Link>
        </div>
      </div>

      <div className="page-content">
        <InstructionBanner>
          To get started, create an Agent, then make a Test Call to verify your setup.
          Configure credentials in <Link to="/settings" className="text-blue-400 hover:underline">Settings</Link> to enable phone calls.
        </InstructionBanner>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <span className="stat-label">Calls Today</span>
              <PhoneCall size={14} className="text-[#555568]" />
            </div>
            <div className="stat-value">{stats?.total_calls_today ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <span className="stat-label">Success Rate (7d)</span>
              <TrendingUp size={14} className="text-[#555568]" />
            </div>
            <div className="stat-value">{stats?.success_rate ?? 0}%</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <span className="stat-label">Active Campaigns</span>
              <Activity size={14} className="text-[#555568]" />
            </div>
            <div className="stat-value">{stats?.active_campaigns ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <span className="stat-label">Avg Duration</span>
              <Clock size={14} className="text-[#555568]" />
            </div>
            <div className="stat-value">{formatDuration(stats?.avg_duration_seconds)}</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="col-span-3 card p-4">
            <h3 className="text-xs font-medium text-[#8888A0] uppercase tracking-wide mb-3">
              Call Volume — Last 7 Days
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={volumeData} barSize={20}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366F1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="col-span-2 card p-4">
            <h3 className="text-xs font-medium text-[#8888A0] uppercase tracking-wide mb-3">
              Outcome Distribution
            </h3>
            {outcomesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={outcomesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    dataKey="count"
                    nameKey="outcome"
                  >
                    {outcomesData.map((_: any, i: number) => (
                      <Cell key={i} fill={OUTCOME_COLORS[i % OUTCOME_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any, n: any) => [v, capFirst(n)]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-[#555568] text-xs">
                No call data yet
              </div>
            )}
          </div>
        </div>

        {/* Active calls */}
        {active.length > 0 && (
          <div className="card mb-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A3A]">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Active Calls ({active.length})
              </h3>
              <Link to="/live" className="btn-ghost text-xs gap-1">
                View Live Monitor <ArrowRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-[#2A2A3A]">
              {active.slice(0, 3).map((call: any) => (
                <div key={call.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                  <div className="flex-1 font-mono text-xs">{call.phone_number}</div>
                  <div className="text-[#8888A0] text-xs">{call.contact_name || '—'}</div>
                  <Badge status={call.status} />
                  <Link to={`/calls/${call.id}`} className="btn-ghost py-0.5 px-2 text-xs">
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent calls */}
        <div className="card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A3A]">
            <h3 className="text-sm font-medium">Recent Calls</h3>
            <Link to="/calls" className="btn-ghost text-xs gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#555568]">
              No calls yet. Make a test call from the{' '}
              <Link to="/test-call" className="text-indigo-400 hover:underline">Test Call</Link> page.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#2A2A3A]">
                  {['Phone', 'Contact', 'Duration', 'Outcome', 'Status', 'Time'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-[#555568] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((call: any) => (
                  <tr
                    key={call.id}
                    className="table-row-hover border-b border-[#2A2A3A] last:border-0"
                    onClick={() => window.location.href = `/calls/${call.id}`}
                  >
                    <td className="px-4 py-2 font-mono">{call.phone_number}</td>
                    <td className="px-4 py-2 text-[#8888A0]">{call.contact_name || '—'}</td>
                    <td className="px-4 py-2">{formatDuration(call.duration_seconds)}</td>
                    <td className="px-4 py-2">{call.outcome ? capFirst(call.outcome) : '—'}</td>
                    <td className="px-4 py-2"><Badge status={call.status} /></td>
                    <td className="px-4 py-2 text-[#555568]">{formatRelativeTime(call.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
