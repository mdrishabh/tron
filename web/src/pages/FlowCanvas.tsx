import { useState, useCallback, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import useSWR from 'swr'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Save, ArrowLeft, Play, CheckCircle, ChevronRight, Plus, Trash2 } from 'lucide-react'
import api from '../lib/api'
import { NODE_TYPES } from '../lib/constants'
import InstructionBanner from '../components/InstructionBanner'

const fetcher = (url: string) => api.get(url)

// Node color map
const NODE_COLORS: Record<string, string> = {
  start_outbound: '#22c55e',
  start_inbound: '#10b981',
  greeting: '#6366f1',
  speak: '#8b5cf6',
  listen: '#06b6d4',
  llm_response: '#6366f1',
  branch_intent: '#f59e0b',
  branch_keyword: '#f59e0b',
  branch_sentiment: '#f97316',
  set_variable: '#ec4899',
  webhook: '#f97316',
  transfer: '#3b82f6',
  wait: '#a855f7',
  end_call: '#ef4444',
  // legacy aliases
  start: '#22c55e',
  say: '#6366f1',
  ask: '#8b5cf6',
  branch: '#f59e0b',
  hangup: '#ef4444',
  collect: '#8b5cf6',
  tag: '#ec4899',
  api_call: '#f97316',
  sms: '#10b981',
  note: '#6b7280',
  pause: '#a855f7',
  llm: '#6366f1',
  verify: '#06b6d4',
}

// Custom node renderer (generic)
function FlowNode({ data }: { data: any }) {
  const color = NODE_COLORS[data.type] || '#6366f1'
  const typeLabel = NODE_TYPES.find(n => n.type === data.type)?.label || data.type
  return (
    <div className={`rounded-lg border px-3 py-2 bg-[#111118] text-[#F0F0F8] min-w-[140px] max-w-[200px]`}
      style={{ borderColor: color }}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color }}>
          {typeLabel}
        </span>
      </div>
      {data.label && <div className="text-xs font-medium truncate">{data.label}</div>}
      {data.text && <div className="text-[11px] text-[#8888A0] mt-0.5 truncate">{data.text}</div>}
    </div>
  )
}

const nodeTypes = { flowNode: FlowNode }

const defaultNodes: Node[] = [
  {
    id: 'start-1',
    type: 'flowNode',
    position: { x: 250, y: 50 },
    data: { type: 'start_outbound', label: 'Start', text: 'Outbound call begins here' },
  },
  {
    id: 'speak-1',
    type: 'flowNode',
    position: { x: 250, y: 180 },
    data: { type: 'speak', label: 'Greeting', text: 'Namaste! How can I help you today?' },
  },
  {
    id: 'end-1',
    type: 'flowNode',
    position: { x: 250, y: 320 },
    data: { type: 'end_call', label: 'End Call', text: 'Thank you for calling!' },
  },
]

const defaultEdges: Edge[] = [
  { id: 'e1', source: 'start-1', target: 'speak-1', animated: true },
  { id: 'e2', source: 'speak-1', target: 'end-1' },
]

export default function FlowCanvas() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const { data: existing } = useSWR(id ? `/flows/${id}` : null, fetcher)

  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges)
  const [selected, setSelected] = useState<Node | null>(null)
  const [flowName, setFlowName] = useState('')
  const [flowDesc, setFlowDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validResult, setValidResult] = useState<{ valid: boolean; issues: string[] } | null>(null)
  const [error, setError] = useState('')
  const nodeCounter = useRef({ count: 100 })

  // Load existing flow
  const existingData = existing as any
  if (existingData && !flowName && existingData.name) {
    setFlowName(existingData.name)
    setFlowDesc(existingData.description || '')
    if (existingData.canvas?.nodes?.length > 0) {
      setNodes(existingData.canvas.nodes)
      setEdges(existingData.canvas.edges || [])
    }
  }

  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({ ...params, animated: params.source?.includes('start') }, eds))
  }, [setEdges])

  function addNode(type: string) {
    nodeCounter.current.count++
    const newNode: Node = {
      id: `${type}-${nodeCounter.current.count}`,
      type: 'flowNode',
      position: { x: 200 + Math.random() * 100, y: 200 + Math.random() * 100 },
      data: {
        type,
        label: NODE_TYPES.find(n => n.type === type)?.label || type,
        text: '',
      },
    }
    setNodes(nds => [...nds, newNode])
    setSelected(newNode)
  }

  function deleteSelected() {
    if (!selected) return
    setNodes(nds => nds.filter(n => n.id !== selected.id))
    setEdges(eds => eds.filter(e => e.source !== selected.id && e.target !== selected.id))
    setSelected(null)
  }

  function updateSelectedData(key: string, value: string) {
    if (!selected) return
    setNodes(nds => nds.map(n => n.id === selected.id ? { ...n, data: { ...n.data, [key]: value } } : n))
    setSelected(s => s ? { ...s, data: { ...s.data, [key]: value } } : s)
  }

  async function handleSave() {
    if (!flowName.trim()) { setError('Flow name is required'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: flowName,
        description: flowDesc,
        canvas: { nodes, edges },
      }
      if (isEdit) {
        await api.put(`/flows/${id}`, payload)
      } else {
        await api.post('/flows', payload)
      }
      navigate('/agents')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleValidate() {
    setValidating(true)
    setValidResult(null)
    try {
      const payload = { name: flowName || 'Untitled', canvas: { nodes, edges } }
      const result = await api.post(id ? `/flows/${id}/validate` : '/flows/validate', payload) as any
      setValidResult(result)
    } catch (e: any) {
      setValidResult({ valid: false, issues: [e.message] })
    } finally {
      setValidating(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0A0A0F] overflow-hidden min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-[#1E1E2E]">
        <div className="flex items-center gap-3">
          <Link to="/agents" className="btn-ghost p-1.5">
            <ArrowLeft size={14} />
          </Link>
          <div>
            <input
              className="bg-transparent text-sm font-semibold focus:outline-none border-b border-transparent focus:border-[#6366F1] transition-colors pb-0.5"
              placeholder="Flow Name"
              value={flowName}
              onChange={e => setFlowName(e.target.value)}
            />
            <input
              className="block bg-transparent text-xs text-[#555568] focus:outline-none w-full mt-0.5"
              placeholder="Description (optional)"
              value={flowDesc}
              onChange={e => setFlowDesc(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          {validResult && (
            <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${validResult.valid ? 'text-green-400' : 'text-red-400'}`}>
              <CheckCircle size={12} />
              {validResult.valid ? 'Valid' : `${validResult.issues.length} issue(s)`}
            </div>
          )}
          <button className="btn-secondary text-xs" onClick={handleValidate} disabled={validating}>
            {validating ? 'Checking...' : 'Validate'}
          </button>
          <button className="btn-primary text-xs" onClick={handleSave} disabled={saving}>
            <Save size={12} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex-shrink-0 p-2 bg-red-900/20 border-b border-red-800/50 text-red-400 text-xs px-4">
          {error}
        </div>
      )}

      {validResult && !validResult.valid && (
        <div className="flex-shrink-0 p-2 bg-amber-900/20 border-b border-amber-800/50 text-amber-400 text-xs px-4">
          Issues: {validResult.issues.join(' | ')}
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {/* Left palette */}
        <div className="w-48 flex-shrink-0 border-r border-[#1E1E2E] p-3 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#555568] mb-2">Node Types</p>
          <div className="space-y-1">
            {NODE_TYPES.map(nt => (
              <button
                key={nt.type}
                className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-[#1E1E2E] flex items-center gap-2 transition-colors"
                onClick={() => addNode(nt.type)}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: NODE_COLORS[nt.type] || '#6366f1' }} />
                {nt.label}
              </button>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-[#1E1E2E]">
            <InstructionBanner>
              Drag nodes to position them. Connect by dragging from a node's handle.
            </InstructionBanner>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 min-w-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelected(node)}
            onPaneClick={() => setSelected(null)}
            nodeTypes={nodeTypes}
            fitView
            className="bg-[#0A0A0F]"
            defaultEdgeOptions={{ style: { stroke: '#6366F1', strokeWidth: 1.5 } }}
          >
            <Background variant={BackgroundVariant.Dots} color="#1E1E2E" gap={20} size={1} />
            <Controls className="!bg-[#111118] !border-[#2A2A3A] !rounded-lg" />
            <MiniMap
              className="!bg-[#111118] !border !border-[#2A2A3A] !rounded-lg"
              nodeColor={n => NODE_COLORS[(n.data as any)?.type || ''] || '#6366f1'}
            />
            <Panel position="top-right">
              <div className="bg-[#111118] border border-[#2A2A3A] rounded-lg px-3 py-1.5 text-xs text-[#555568]">
                {nodes.length} nodes · {edges.length} connections
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Right inspector */}
        {selected && (
          <div className="w-64 flex-shrink-0 border-l border-[#1E1E2E] p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#555568]">Node Properties</h3>
              <button
                className="btn-ghost p-1 text-red-400 hover:text-red-300"
                onClick={deleteSelected}
                title="Delete node"
              >
                <Trash2 size={13} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Node Type</label>
                <div className="text-xs font-semibold capitalize" style={{ color: NODE_COLORS[(selected.data as any).type] }}>
                  {(selected.data as any).type}
                </div>
              </div>

              <div>
                <label className="label">Label</label>
                <input
                  className="input text-xs"
                  value={(selected.data as any).label || ''}
                  onChange={e => updateSelectedData('label', e.target.value)}
                />
              </div>

              {['speak', 'greeting', 'listen', 'say', 'ask', 'collect', 'sms'].includes((selected.data as any).type) && (
                <div>
                  <label className="label">Text / Message</label>
                  <textarea
                    className="input text-xs min-h-[80px]"
                    value={(selected.data as any).text || ''}
                    onChange={e => updateSelectedData('text', e.target.value)}
                    placeholder="What should the agent say?"
                  />
                </div>
              )}

              {['branch_intent', 'branch_keyword', 'branch_sentiment', 'branch'].includes((selected.data as any).type) && (
                <div>
                  <label className="label">Condition</label>
                  <input
                    className="input text-xs"
                    value={(selected.data as any).condition || ''}
                    onChange={e => updateSelectedData('condition', e.target.value)}
                    placeholder="e.g. user says yes"
                  />
                </div>
              )}

              {(selected.data as any).type === 'transfer' && (
                <div>
                  <label className="label">Transfer To</label>
                  <input
                    className="input text-xs"
                    value={(selected.data as any).transfer_to || ''}
                    onChange={e => updateSelectedData('transfer_to', e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
              )}

              {['webhook', 'api_call'].includes((selected.data as any).type) && (
                <>
                  <div>
                    <label className="label">URL</label>
                    <input
                      className="input text-xs"
                      value={(selected.data as any).url || ''}
                      onChange={e => updateSelectedData('url', e.target.value)}
                      placeholder="https://api.example.com/endpoint"
                    />
                  </div>
                  <div>
                    <label className="label">Method</label>
                    <select className="select text-xs" value={(selected.data as any).method || 'POST'}
                      onChange={e => updateSelectedData('method', e.target.value)}>
                      <option>GET</option><option>POST</option><option>PUT</option>
                    </select>
                  </div>
                </>
              )}

              {(selected.data as any).type === 'tag' && (
                <div>
                  <label className="label">Tag Name</label>
                  <input
                    className="input text-xs"
                    value={(selected.data as any).tag || ''}
                    onChange={e => updateSelectedData('tag', e.target.value)}
                    placeholder="interested, not-interested..."
                  />
                </div>
              )}

              <div className="pt-2 border-t border-[#1E1E2E] text-[10px] text-[#555568]">
                ID: {selected.id}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
