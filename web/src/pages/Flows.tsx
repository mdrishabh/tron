import useSWR from 'swr'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, GitBranch, Copy, Trash2, Edit2 } from 'lucide-react'
import api from '../lib/api'
import InstructionBanner from '../components/InstructionBanner'
import EmptyState from '../components/EmptyState'

const fetcher = (url: string) => api.get(url)

export default function Flows() {
  const { data, mutate } = useSWR('/flows', fetcher)
  const navigate = useNavigate()
  const flows: any[] = (data as any[]) || []

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!confirm('Delete this flow?')) return
    await api.delete(`/flows/${id}`)
    mutate()
  }

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    await api.post(`/flows/${id}/duplicate`)
    mutate()
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="text-base font-semibold">Flows</h1>
          <p className="text-xs text-[#555568]">{flows.length} flow{flows.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => navigate('/flows/new')}>
          <Plus size={14} />
          New Flow
        </button>
      </div>

      <div className="page-content space-y-4">
        <InstructionBanner>
          A flow is a visual script that defines how a conversation progresses. Connect it to an agent to control call behaviour.
        </InstructionBanner>

        {flows.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            title="No flows yet"
            description="Create a visual conversation flow to control how your agents handle calls."
            action={
              <button className="btn-primary flex items-center gap-2 text-xs" onClick={() => navigate('/flows/new')}>
                <Plus size={12} />
                New Flow
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {flows.map((flow: any) => (
              <Link
                key={flow.id}
                to={`/flows/${flow.id}`}
                className="card p-4 block hover:border-[#6366F1]/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#6366F1]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <GitBranch size={14} className="text-[#6366F1]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{flow.name}</span>
                        {flow.nodes && (
                          <span className="text-[10px] text-[#555568] bg-[#1E1E2E] px-1.5 py-0.5 rounded">
                            {Array.isArray(flow.nodes) ? flow.nodes.length : Object.keys(flow.nodes || {}).length} nodes
                          </span>
                        )}
                      </div>
                      {flow.description && (
                        <p className="text-xs text-[#555568] truncate">{flow.description}</p>
                      )}
                      <p className="text-[10px] text-[#555568] mt-1">
                        Updated {new Date(flow.updated_at || flow.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <button
                      onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/flows/${flow.id}`) }}
                      className="p-1.5 hover:bg-[#1E1E2E] rounded text-[#8888A0] hover:text-[#F0F0F8] transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={e => handleDuplicate(flow.id, e)}
                      className="p-1.5 hover:bg-[#1E1E2E] rounded text-[#8888A0] hover:text-[#F0F0F8] transition-colors"
                      title="Duplicate"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={e => handleDelete(flow.id, e)}
                      className="p-1.5 hover:bg-red-500/10 rounded text-[#8888A0] hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
