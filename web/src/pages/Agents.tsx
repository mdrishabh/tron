import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useSWR, { mutate } from 'swr'
import { Plus, Bot, Phone, Copy, Trash2, Edit, Activity } from 'lucide-react'
import api from '../lib/api'
import InstructionBanner from '../components/InstructionBanner'
import EmptyState from '../components/EmptyState'
import Badge from '../components/Badge'
import Modal from '../components/Modal'

const fetcher = (url: string) => api.get(url)

export default function Agents() {
  const navigate = useNavigate()
  const { data, error, isLoading } = useSWR('/agents', fetcher, { refreshInterval: 10000 })
  const agents = data as any[] || []
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/agents/${deleteTarget.id}`)
      mutate('/agents')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  async function handleDuplicate(agent: any, e: React.MouseEvent) {
    e.stopPropagation()
    await api.post(`/agents/${agent.id}/duplicate`)
    mutate('/agents')
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="text-base font-semibold">Agents</h1>
          <p className="text-xs text-[#555568]">{agents.length} agent{agents.length !== 1 ? 's' : ''} configured</p>
        </div>
        <Link to="/agents/new" className="btn-primary">
          <Plus size={13} /> New Agent
        </Link>
      </div>

      <div className="page-content">
        <InstructionBanner>
          An agent defines who Tron becomes on a call — the voice, personality, language, and AI model.
          Create an agent and make a <Link to="/test-call" className="text-blue-400 hover:underline">test call</Link> to hear it in action.
        </InstructionBanner>

        {isLoading && (
          <div className="text-center py-8 text-[#555568] text-sm">Loading agents...</div>
        )}

        {!isLoading && agents.length === 0 && (
          <EmptyState
            icon={Bot}
            title="No agents yet"
            description="Create your first AI agent to start making calls."
            action={
              <Link to="/agents/new" className="btn-primary">
                <Plus size={13} /> Create Agent
              </Link>
            }
          />
        )}

        {agents.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {agents.map((agent: any) => (
              <div
                key={agent.id}
                className="card p-4 cursor-pointer hover:border-indigo-500/50 transition-colors"
                onClick={() => navigate(`/agents/${agent.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                      <Bot size={16} className="text-indigo-400" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{agent.name}</div>
                      <div className="text-[10px] text-[#555568]">{agent.voice_id} · {agent.language}</div>
                    </div>
                  </div>
                  <span className={agent.is_active ? 'badge-green' : 'badge-gray'}>
                    {agent.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {agent.persona && (
                  <p className="text-xs text-[#8888A0] mb-3 line-clamp-2">{agent.persona}</p>
                )}

                <div className="grid grid-cols-2 gap-1 mb-3 text-xs">
                  <div className="text-[#555568]">Model</div>
                  <div className="text-[#F0F0F8]">{agent.llm_model}</div>
                  <div className="text-[#555568]">Tone</div>
                  <div className="text-[#F0F0F8] capitalize">{agent.tone}</div>
                  <div className="text-[#555568]">Max Duration</div>
                  <div className="text-[#F0F0F8]">{agent.max_call_duration}s</div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-[#2A2A3A]">
                  <Link
                    to={`/agents/${agent.id}`}
                    className="btn-secondary flex-1 text-xs justify-center"
                    onClick={e => e.stopPropagation()}
                  >
                    <Edit size={11} /> Edit
                  </Link>
                  <Link
                    to={`/test-call?agent=${agent.id}`}
                    className="btn-secondary flex-1 text-xs justify-center"
                    onClick={e => e.stopPropagation()}
                  >
                    <Phone size={11} /> Test
                  </Link>
                  <button
                    className="btn-ghost p-1.5"
                    onClick={e => handleDuplicate(agent, e)}
                    title="Duplicate"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    className="btn-ghost p-1.5 text-red-400 hover:text-red-300"
                    onClick={e => { e.stopPropagation(); setDeleteTarget(agent) }}
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Agent"
        size="sm"
      >
        <p className="text-sm text-[#8888A0] mb-4">
          Are you sure you want to delete <strong className="text-[#F0F0F8]">{deleteTarget?.name}</strong>?
          This cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
          <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
