import { useQuery } from '@tanstack/react-query'
import { Hash, Server, MessageSquare, Loader2 } from 'lucide-react'
// React router for navigation
import { api } from '../lib/api'

export default function ChannelsPage() {
  const { data: guildsData, isLoading: guildsLoading } = useQuery({
    queryKey: ['guilds'],
    queryFn: () => api.getGuilds(),
  })

  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.getChannels(),
  })

  const isLoading = guildsLoading || channelsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-[#5865f2]" size={48} />
      </div>
    )
  }

  // Group channels by guild
  const channelsByGuild = channelsData?.channels.reduce((acc, channel) => {
    if (!acc[channel.guildId]) {
      acc[channel.guildId] = {
        guild: guildsData?.guilds.find((g) => g.id === channel.guildId),
        channels: [],
      }
    }
    acc[channel.guildId].channels.push(channel)
    return acc
  }, {} as Record<string, { guild: NonNullable<typeof guildsData>['guilds'][0] | undefined; channels: NonNullable<typeof channelsData>['channels'] }>)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Channels</h1>

      {guildsData?.guilds.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Server size={48} className="mx-auto mb-4 opacity-50" />
          <p>No data imported yet</p>
          <p className="text-sm mt-2">Use the CLI to export and ingest Discord messages</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(channelsByGuild || {}).map(([guildId, { guild, channels }]) => (
            <div key={guildId} className="bg-[#36393f] rounded-lg overflow-hidden">
              {/* Guild Header */}
              <div className="px-4 py-3 bg-[#2f3136] border-b border-[#202225] flex items-center gap-3">
                <Server size={20} className="text-gray-400" />
                <div>
                  <h2 className="font-medium text-white">{guild?.name || 'Unknown Guild'}</h2>
                  <p className="text-xs text-gray-400">
                    {channels.length} channel{channels.length !== 1 ? 's' : ''} •{' '}
                    {guild?.messageCount.toLocaleString() || 0} messages
                  </p>
                </div>
              </div>

              {/* Channels List */}
              <div className="divide-y divide-[#40444b]">
                {/* Group by category */}
                {Object.entries(
                  channels.reduce((acc, ch) => {
                    const cat = ch.category || 'No Category'
                    if (!acc[cat]) acc[cat] = []
                    acc[cat].push(ch)
                    return acc
                  }, {} as Record<string, typeof channels>)
                ).map(([category, categoryChannels]) => (
                  <div key={category}>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
                      {category}
                    </div>
                    {categoryChannels.map((channel) => (
                      <ChannelRow key={channel.id} channel={channel} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ChannelRow({
  channel,
}: {
  channel: {
    id: string
    name: string
    type: string
    topic: string | null
    messageCount: number
  }
}) {
  return (
    <div className="px-4 py-3 hover:bg-[#3f4248] transition-colors flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Hash size={18} className="text-gray-400" />
        <div>
          <span className="text-white">{channel.name}</span>
          {channel.topic && (
            <p className="text-xs text-gray-500 line-clamp-1 max-w-md">{channel.topic}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400 flex items-center gap-1">
          <MessageSquare size={14} />
          {channel.messageCount.toLocaleString()}
        </span>
      </div>
    </div>
  )
}
