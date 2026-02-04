import { Routes, Route, NavLink } from 'react-router-dom'
import { Search, BarChart3, MessageSquare } from 'lucide-react'
import SearchPage from './pages/Search'
import AnalyticsPage from './pages/Analytics'
import ChannelsPage from './pages/Channels'
import MessagePage from './pages/Message'

function App() {
  return (
    <div className="flex h-screen bg-[#2f3136]">
      {/* Sidebar */}
      <nav className="w-16 bg-[#202225] flex flex-col items-center py-4 gap-2">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `p-3 rounded-xl transition-all ${
              isActive
                ? 'bg-[#5865f2] text-white'
                : 'bg-[#36393f] text-[#dcddde] hover:bg-[#5865f2]/80 hover:text-white'
            }`
          }
          title="Search"
        >
          <Search size={24} />
        </NavLink>
        <NavLink
          to="/analytics"
          className={({ isActive }) =>
            `p-3 rounded-xl transition-all ${
              isActive
                ? 'bg-[#5865f2] text-white'
                : 'bg-[#36393f] text-[#dcddde] hover:bg-[#5865f2]/80 hover:text-white'
            }`
          }
          title="Analytics"
        >
          <BarChart3 size={24} />
        </NavLink>
        <NavLink
          to="/channels"
          className={({ isActive }) =>
            `p-3 rounded-xl transition-all ${
              isActive
                ? 'bg-[#5865f2] text-white'
                : 'bg-[#36393f] text-[#dcddde] hover:bg-[#5865f2]/80 hover:text-white'
            }`
          }
          title="Channels"
        >
          <MessageSquare size={24} />
        </NavLink>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/channels" element={<ChannelsPage />} />
          <Route path="/messages/:id" element={<MessagePage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
