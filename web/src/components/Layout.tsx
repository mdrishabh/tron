import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="flex h-full bg-[#0A0A0F]">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
