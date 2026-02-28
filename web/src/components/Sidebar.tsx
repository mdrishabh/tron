import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Bot, GitBranch, PhoneCall, Radio,
  BarChart3, Mic, Settings, Phone, History, Zap
} from 'lucide-react'
import { cn } from '../lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/agents', icon: Bot, label: 'Agents' },
  { to: '/flows', icon: GitBranch, label: 'Flows' },
  { to: '/campaigns', icon: PhoneCall, label: 'Campaigns' },
  { to: '/calls', icon: History, label: 'Call History' },
  { to: '/live', icon: Radio, label: 'Live Monitor' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/voices', icon: Mic, label: 'Voice Lab' },
  { to: '/test-call', icon: Phone, label: 'Test Call' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  return (
    <aside className="w-52 shrink-0 bg-[#0A0A0F] border-r border-[#2A2A3A] flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#2A2A3A]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-sm text-[#F0F0F8] tracking-wide">TRON</div>
            <div className="text-[10px] text-[#555568] leading-none">AI Telecaller</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-2 text-sm transition-colors duration-100 mx-2 rounded-md',
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 font-medium'
                  : 'text-[#8888A0] hover:text-[#F0F0F8] hover:bg-[#1C1C26]'
              )
            }
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom info */}
      <div className="px-4 py-3 border-t border-[#2A2A3A]">
        <div className="text-[10px] text-[#555568]">v1.0.0 · Self-hosted</div>
        <div className="text-[10px] text-[#555568]">~$0.01-0.03/min</div>
      </div>
    </aside>
  )
}
