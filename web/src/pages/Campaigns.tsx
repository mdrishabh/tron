import { useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR, { mutate } from 'swr'
import { Plus, Play, Pause, StopCircle, Users, Phone, Eye, Trash2 } from 'lucide-react'
import api from '../lib/api'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import InstructionBanner from '../components/InstructionBanner'

const fetcher = (url: string) => api.get(url)

const STATUS_COLORS: Record<string, any> = {
  draft: 'neutral',
  running: 'success',
  paused: 'warning',
  completed: 'info',
  cancelled: 'error',
}

const blankCampaign = {
  name: '',
  agent_id: '',
  contacts: [] as string[],
  schedule_start: '',
  schedule_end: '',
  max_concurrent: 3,
  retry_attempts: 2,
  retry_interval_minutes: 60,
  calling_hours_start: '09:00',
  calling_hours_end: '18:00',
}

export default function Campaigns() {
  const { data: campaigns, isLoading } = useSWR('/campaigns', fetcher)
  const { data: agents } = useSWR('/agents', fetcher)

  const [showCreate, setShowCreate] = useState(false)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ ...blankCampaign })
  const [contactsText, setContactsText] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const list = (campaigns as any[]) || []
  const agentsList = (agents as any[]) || []

  function set(k: string, v: any) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function resetModal() {
    setForm({ ...blankCampaign })
    setContactsText('')
    setCsvFile(null)
    setStep(1)
    setError('')
  }

  async function handleCreate() {
    if (!form.name || !form.agent_id) { setError('Name and agent are required'); return }
    setSaving(true)
    setError('')
    try {
      const payload: any = { ...form }
      // parse contacts
      const phones = contactsText
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(s => s.length > 5)
      payload.contacts = phones.map(phone => ({ phone_number: phone, name: '' }))

      if (csvFile) {
        // upload CSV
        const created = await api.post('/campaigns', { ...payload, contacts: undefined }) as any
        const fd = new FormData()
        fd.append('file', csvFile)
        await fetch(`/api/tron/campaigns/${created.id}/import-contacts`, { method: 'POST', body: fd })
        mutate('/campaigns')
      } else {
        await api.post('/campaigns', payload)
        mutate('/campaigns')
      }
      setShowCreate(false)
      resetModal()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function action(id: string, act: 'start' | 'pause' | 'resume' | 'cancel') {
    try {
      await api.post(`/campaigns/${id}/${act}`, {})
      mutate('/campaigns')
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function deleteCampaign(id: string) {
    if (!confirm('Delete this campaign?')) return
    try {
      await fetch(`/api/tron/campaigns/${id}`, { method: 'DELETE' })
      mutate('/campaigns')
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="text-base font-semibold">Campaigns</h1>
          <p className="text-xs text-[#555568]">{list.length} total</p>
        </div>
        <button className="btn-primary" onClick={() => { resetModal(); setShowCreate(true) }}>
          <Plus size={13} /> New Campaign
        </button>
      </div>

      <div className="page-content">
        <InstructionBanner>
          A campaign dials a list of contacts using a selected agent. Set calling hours and retry rules to maximise connection rates.
        </InstructionBanner>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-[#555568] text-sm">Loading...</div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No campaigns yet"
            description="Create a campaign to start dialling contacts automatically."
            action={<button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={13} /> New Campaign</button>}
          />
        ) : (
          <div className="space-y-3">
            {list.map((c: any) => (
              <div key={c.id} className="card p-4 flex items-center justify-between hover:border-[#6366F1]/30 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link to={`/campaigns/${c.id}`} className="font-medium text-sm hover:text-[#6366F1] transition-colors truncate">
                        {c.name}
                      </Link>
                      <Badge variant={STATUS_COLORS[c.status]}>{c.status}</Badge>
                    </div>
                    <div className="text-xs text-[#555568] mt-0.5 flex items-center gap-3">
                      <span className="flex items-center gap-1"><Users size={10} /> {c.total_contacts || 0} contacts</span>
                      <span className="flex items-center gap-1"><Phone size={10} /> {c.completed_contacts || 0} called</span>
                      {c.schedule_start && <span>Starts: {new Date(c.schedule_start).toLocaleString()}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* progress */}
                  {(c.total_contacts || 0) > 0 && (
                    <div className="w-24">
                      <div className="flex justify-between text-[10px] text-[#555568] mb-0.5">
                        <span>Progress</span>
                        <span>{Math.round(((c.completed_contacts || 0) / (c.total_contacts || 1)) * 100)}%</span>
                      </div>
                      <div className="h-1 bg-[#1E1E2E] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.round(((c.completed_contacts || 0) / (c.total_contacts || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {c.status === 'draft' && (
                    <button className="btn-primary text-xs" onClick={() => action(c.id, 'start')}><Play size={11} /> Start</button>
                  )}
                  {c.status === 'running' && (
                    <>
                      <button className="btn-secondary text-xs" onClick={() => action(c.id, 'pause')}><Pause size={11} /> Pause</button>
                      <button className="btn-secondary text-xs text-red-400" onClick={() => action(c.id, 'cancel')}><StopCircle size={11} /></button>
                    </>
                  )}
                  {c.status === 'paused' && (
                    <button className="btn-primary text-xs" onClick={() => action(c.id, 'resume')}><Play size={11} /> Resume</button>
                  )}
                  <Link to={`/campaigns/${c.id}`} className="btn-ghost p-1.5"><Eye size={13} /></Link>
                  <button className="btn-ghost p-1.5 text-red-400" onClick={() => deleteCampaign(c.id)}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <Modal open={showCreate} title="New Campaign" onClose={() => setShowCreate(false)} size="lg">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-5">
            {['Details', 'Contacts', 'Schedule', 'Review'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-indigo-600 text-white' : 'bg-[#1E1E2E] text-[#555568]'}`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className={`text-xs ${step === i + 1 ? 'text-[#F0F0F8]' : 'text-[#555568]'}`}>{s}</span>
                {i < 3 && <div className={`w-8 h-px ${step > i + 1 ? 'bg-green-500' : 'bg-[#1E1E2E]'}`} />}
              </div>
            ))}
          </div>

          {error && <div className="p-2 bg-red-900/20 border border-red-800/50 rounded text-red-400 text-xs mb-3">{error}</div>}

          {step === 1 && (
            <div className="space-y-3">
              <div>
                <label className="label">Campaign Name *</label>
                <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. March Sales Push" />
              </div>
              <div>
                <label className="label">Agent *</label>
                <select className="select" value={form.agent_id} onChange={e => set('agent_id', e.target.value)}>
                  <option value="">Select an agent...</option>
                  {agentsList.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Max Concurrent Calls</label>
                  <input type="number" className="input" min={1} max={20} value={form.max_concurrent} onChange={e => set('max_concurrent', +e.target.value)} />
                </div>
                <div>
                  <label className="label">Retry Attempts</label>
                  <input type="number" className="input" min={0} max={5} value={form.retry_attempts} onChange={e => set('retry_attempts', +e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <InstructionBanner>Enter phone numbers one per line, or upload a CSV with a "phone" column.</InstructionBanner>
              <div>
                <label className="label">Phone Numbers</label>
                <textarea
                  className="input min-h-[120px] font-mono text-xs"
                  placeholder="+91 98765 43210&#10;+91 99887 76655&#10;..."
                  value={contactsText}
                  onChange={e => setContactsText(e.target.value)}
                />
                <p className="text-xs text-[#555568] mt-1">
                  {contactsText.split(/[\n,]+/).filter(s => s.trim().length > 5).length} numbers entered
                </p>
              </div>
              <div>
                <label className="label">Or Upload CSV</label>
                <input type="file" accept=".csv" className="input text-xs" onChange={e => setCsvFile(e.target.files?.[0] || null)} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start Time (optional)</label>
                  <input type="datetime-local" className="input text-xs" value={form.schedule_start} onChange={e => set('schedule_start', e.target.value)} />
                </div>
                <div>
                  <label className="label">End Time (optional)</label>
                  <input type="datetime-local" className="input text-xs" value={form.schedule_end} onChange={e => set('schedule_end', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Calling Hours Start</label>
                  <input type="time" className="input" value={form.calling_hours_start} onChange={e => set('calling_hours_start', e.target.value)} />
                </div>
                <div>
                  <label className="label">Calling Hours End</label>
                  <input type="time" className="input" value={form.calling_hours_end} onChange={e => set('calling_hours_end', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Retry Interval (minutes)</label>
                <input type="number" className="input" min={15} value={form.retry_interval_minutes} onChange={e => set('retry_interval_minutes', +e.target.value)} />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div className="bg-[#111118] rounded-lg p-3 border border-[#2A2A3A] text-xs space-y-2">
                <div className="flex justify-between"><span className="text-[#555568]">Campaign Name</span><span>{form.name}</span></div>
                <div className="flex justify-between"><span className="text-[#555568]">Agent</span><span>{agentsList.find((a: any) => a.id === form.agent_id)?.name || form.agent_id}</span></div>
                <div className="flex justify-between"><span className="text-[#555568]">Contacts</span><span>{contactsText.split(/[\n,]+/).filter(s => s.trim().length > 5).length} phone numbers</span></div>
                <div className="flex justify-between"><span className="text-[#555568]">Concurrency</span><span>{form.max_concurrent} simultaneous</span></div>
                <div className="flex justify-between"><span className="text-[#555568]">Retries</span><span>{form.retry_attempts}x every {form.retry_interval_minutes}min</span></div>
                <div className="flex justify-between"><span className="text-[#555568]">Calling Hours</span><span>{form.calling_hours_start} – {form.calling_hours_end}</span></div>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-5">
            <button className="btn-secondary" onClick={() => step > 1 ? setStep(s => s - 1) : setShowCreate(false)}>
              {step === 1 ? 'Cancel' : 'Back'}
            </button>
            {step < 4 ? (
              <button className="btn-primary" onClick={() => setStep(s => s + 1)}>Next</button>
            ) : (
              <button className="btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating...' : 'Create Campaign'}
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
