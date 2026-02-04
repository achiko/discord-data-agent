import { useQuery } from '@tanstack/react-query'
import { Users, MessageSquare, Hash, Server, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { format } from 'date-fns'

export default function AnalyticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => api.getAnalyticsOverview(),
  })

  const { data: messagesPerDay } = useQuery({
    queryKey: ['messages-per-day'],
    queryFn: () => api.getMessagesPerDay(30),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-[#5865f2]" size={48} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          {error instanceof Error ? error.message : 'Failed to load analytics'}
        </div>
      </div>
    )
  }

  if (!data) return null

  const maxMessages = messagesPerDay?.data
    ? Math.max(...messagesPerDay.data.map((d) => d.count))
    : 0

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Analytics Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<MessageSquare size={24} />}
          label="Total Messages"
          value={data.totals.messages.toLocaleString()}
          color="blue"
        />
        <StatCard
          icon={<Users size={24} />}
          label="Total Users"
          value={data.totals.users.toLocaleString()}
          color="green"
        />
        <StatCard
          icon={<Hash size={24} />}
          label="Channels"
          value={data.totals.channels.toLocaleString()}
          color="yellow"
        />
        <StatCard
          icon={<Server size={24} />}
          label="Guilds"
          value={data.totals.guilds.toLocaleString()}
          color="purple"
        />
      </div>

      {/* Date Range */}
      {data.dateRange.first && data.dateRange.last && (
        <div className="mb-8 p-4 bg-[#36393f] rounded-lg">
          <h3 className="text-sm text-gray-400 mb-2">Data Range</h3>
          <p className="text-white">
            {format(new Date(data.dateRange.first), 'MMM d, yyyy')} — {format(new Date(data.dateRange.last), 'MMM d, yyyy')}
          </p>
        </div>
      )}

      {/* Activity Chart */}
      {messagesPerDay && messagesPerDay.data.length > 0 && (
        <div className="mb-8 p-4 bg-[#36393f] rounded-lg">
          <h3 className="text-sm text-gray-400 mb-4">Messages Per Day (Last 30 Days)</h3>
          <div className="flex items-end gap-1 h-32">
            {messagesPerDay.data.map((day, i) => (
              <div
                key={i}
                className="flex-1 bg-[#5865f2] rounded-t hover:bg-[#4752c4] transition-colors"
                style={{ height: `${maxMessages > 0 ? (day.count / maxMessages) * 100 : 0}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                title={`${format(new Date(day.date), 'MMM d')}: ${day.count} messages`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Channels */}
        <div className="p-4 bg-[#36393f] rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">Top Channels</h3>
          <div className="space-y-3">
            {data.topChannels.map((channel, i) => (
              <div key={channel.channelId} className="flex items-center gap-3">
                <span className="text-gray-400 w-6">{i + 1}.</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Hash size={14} className="text-gray-400" />
                    <span className="text-white">{channel.channelName}</span>
                  </div>
                  <span className="text-xs text-gray-500">{channel.guildName}</span>
                </div>
                <span className="text-gray-400">{channel.messageCount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Users */}
        <div className="p-4 bg-[#36393f] rounded-lg">
          <h3 className="text-lg font-medium text-white mb-4">Most Active Users</h3>
          <div className="space-y-3">
            {data.topUsers.map((user, i) => (
              <div key={user.userId} className="flex items-center gap-3">
                <span className="text-gray-400 w-6">{i + 1}.</span>
                <div className="flex-1">
                  <span className="text-white">{user.username}</span>
                </div>
                <span className="text-gray-400">{user.messageCount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Embedding Coverage */}
      <div className="mt-6 p-4 bg-[#36393f] rounded-lg">
        <h3 className="text-lg font-medium text-white mb-4">Embedding Coverage</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-4 bg-[#202225] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#5865f2] rounded-full transition-all"
              style={{
                width: `${data.totals.messages > 0 ? (data.totals.embeddings / data.totals.messages) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-white">
            {data.totals.embeddings.toLocaleString()} / {data.totals.messages.toLocaleString()}
          </span>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          {data.totals.messages > 0
            ? `${((data.totals.embeddings / data.totals.messages) * 100).toFixed(1)}% of messages have embeddings for semantic search`
            : 'No messages ingested yet'}
        </p>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: 'blue' | 'green' | 'yellow' | 'purple'
}) {
  const colors = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    purple: 'bg-purple-500/20 text-purple-400',
  }

  return (
    <div className="p-4 bg-[#36393f] rounded-lg">
      <div className={`w-12 h-12 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  )
}
