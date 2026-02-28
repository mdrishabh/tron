import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Agents from './pages/Agents'
import AgentBuilder from './pages/AgentBuilder'
import Flows from './pages/Flows'
import FlowCanvas from './pages/FlowCanvas'
import Campaigns from './pages/Campaigns'
import CampaignDetail from './pages/CampaignDetail'
import CallHistory from './pages/CallHistory'
import CallDetail from './pages/CallDetail'
import LiveMonitor from './pages/LiveMonitor'
import Analytics from './pages/Analytics'
import VoiceLab from './pages/VoiceLab'
import Settings from './pages/Settings'
import TestCall from './pages/TestCall'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="agents" element={<Agents />} />
          <Route path="agents/new" element={<AgentBuilder />} />
          <Route path="agents/:id" element={<AgentBuilder />} />
          <Route path="flows" element={<Flows />} />
          <Route path="flows/new" element={<FlowCanvas />} />
          <Route path="flows/:id" element={<FlowCanvas />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="campaigns/:id" element={<CampaignDetail />} />
          <Route path="calls" element={<CallHistory />} />
          <Route path="calls/:id" element={<CallDetail />} />
          <Route path="live" element={<LiveMonitor />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="voices" element={<VoiceLab />} />
          <Route path="settings" element={<Settings />} />
          <Route path="test-call" element={<TestCall />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
