import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Hash, Loader2, Pin, Paperclip, ExternalLink } from 'lucide-react'
import { api, getDiscordMessageUrl } from '../lib/api'
import { format } from 'date-fns'

export default function MessagePage() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['message', id],
    queryFn: () => api.getMessage(id!, 10),
    enabled: !!id,
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
        <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4">
          <ArrowLeft size={20} />
          Back to search
        </Link>
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          {error instanceof Error ? error.message : 'Failed to load message'}
        </div>
      </div>
    )
  }

  if (!data) return null

  const { message, context } = data

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4">
        <ArrowLeft size={20} />
        Back to search
      </Link>

      {/* Channel Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Hash size={16} />
          <span>{message.channelName}</span>
        </div>
        {message.guildId && (
          <a
            href={getDiscordMessageUrl(message.guildId, message.channelId, message.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#5865f2] transition-colors"
          >
            <ExternalLink size={14} />
            Open in Discord
          </a>
        )}
      </div>

      {/* Messages with context */}
      <div className="bg-[#36393f] rounded-lg overflow-hidden">
        {/* Before context */}
        {context.before.length > 0 && (
          <>
            <div className="p-2 text-center text-xs text-gray-500 bg-[#2f3136]">
              {context.before.length} earlier message{context.before.length !== 1 ? 's' : ''}
            </div>
            {context.before.map((msg) => (
              <MessageRow
                key={msg.id}
                id={msg.id}
                username={msg.username}
                content={msg.content}
                timestamp={msg.timestamp}
                isHighlighted={false}
              />
            ))}
          </>
        )}

        {/* Main message */}
        <div className="bg-[#5865f2]/10 border-l-4 border-[#5865f2]">
          <MessageRow
            id={message.id}
            username={message.username}
            content={message.content}
            timestamp={message.timestamp}
            editedTimestamp={message.editedTimestamp}
            isPinned={message.isPinned}
            attachments={message.attachmentsJson as unknown[]}
            isHighlighted={true}
          />
        </div>

        {/* After context */}
        {context.after.length > 0 && (
          <>
            {context.after.map((msg) => (
              <MessageRow
                key={msg.id}
                id={msg.id}
                username={msg.username}
                content={msg.content}
                timestamp={msg.timestamp}
                isHighlighted={false}
              />
            ))}
            <div className="p-2 text-center text-xs text-gray-500 bg-[#2f3136]">
              {context.after.length} later message{context.after.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MessageRow({
  username,
  content,
  timestamp,
  editedTimestamp,
  isPinned,
  attachments,
  isHighlighted,
}: {
  id: string
  username: string
  content: string
  timestamp: string
  editedTimestamp?: string | null
  isPinned?: boolean
  attachments?: unknown[]
  isHighlighted: boolean
}) {
  const date = format(new Date(timestamp), 'MMM d, yyyy h:mm a')

  return (
    <div className={`px-4 py-3 hover:bg-[#3f4248]/50 ${isHighlighted ? '' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-medium ${isHighlighted ? 'text-white' : 'text-gray-300'}`}>
              {username}
            </span>
            <span className="text-xs text-gray-500">{date}</span>
            {isPinned && <Pin size={12} className="text-yellow-500" />}
            {editedTimestamp && <span className="text-xs text-gray-500">(edited)</span>}
          </div>
          <p className={`whitespace-pre-wrap ${isHighlighted ? 'text-white' : 'text-gray-300'}`}>
            {content}
          </p>
          {attachments && attachments.length > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
              <Paperclip size={12} />
              {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
