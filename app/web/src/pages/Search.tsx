import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search as SearchIcon, Filter, Hash, Loader2, LayoutGrid, List } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, type SearchResult, type CompareSearchResponse } from '../lib/api'
import { format } from 'date-fns'

type ViewMode = 'single' | 'compare'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState<'hybrid' | 'semantic' | 'keyword'>('hybrid')
  const [channelFilter, setChannelFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('single')

  const { data: channelsData } = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.getChannels(),
  })

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['search', query, searchType, channelFilter],
    queryFn: () => api.search({ q: query, type: searchType, channel: channelFilter || undefined }),
    enabled: false,
  })

  const { data: compareData, isLoading: isCompareLoading, error: compareError, refetch: refetchCompare } = useQuery({
    queryKey: ['search-compare', query, channelFilter],
    queryFn: () => api.compareSearch({ q: query, channel: channelFilter || undefined }),
    enabled: false,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      if (viewMode === 'compare') {
        refetchCompare()
      } else {
        refetch()
      }
    }
  }

  const isSearching = viewMode === 'compare' ? isCompareLoading : isLoading
  const searchError = viewMode === 'compare' ? compareError : error

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Search Messages</h1>
        <div className="flex items-center gap-2 bg-[#40444b] rounded-lg p-1">
          <button
            onClick={() => setViewMode('single')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
              viewMode === 'single' ? 'bg-[#5865f2] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <List size={16} />
            Single
          </button>
          <button
            onClick={() => setViewMode('compare')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
              viewMode === 'compare' ? 'bg-[#5865f2] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <LayoutGrid size={16} />
            Compare
          </button>
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full pl-10 pr-4 py-3 bg-[#40444b] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-lg transition-colors ${showFilters ? 'bg-[#5865f2] text-white' : 'bg-[#40444b] text-gray-400 hover:text-white'}`}
          >
            <Filter size={20} />
          </button>
          <button
            type="submit"
            disabled={!query.trim() || isSearching}
            className="px-6 py-3 bg-[#5865f2] text-white rounded-lg font-medium hover:bg-[#4752c4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSearching ? <Loader2 className="animate-spin" size={20} /> : 'Search'}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-[#36393f] rounded-lg flex flex-wrap gap-4">
            {viewMode === 'single' && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">Search Type:</label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as 'hybrid' | 'semantic' | 'keyword')}
                  className="bg-[#40444b] text-white rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                >
                  <option value="hybrid">Hybrid</option>
                  <option value="semantic">Semantic</option>
                  <option value="keyword">Keyword (BM25)</option>
                </select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Channel:</label>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="bg-[#40444b] text-white rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
              >
                <option value="">All Channels</option>
                {channelsData?.channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    #{channel.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </form>

      {/* Error Display */}
      {searchError && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          {searchError instanceof Error ? searchError.message : 'Search failed'}
        </div>
      )}

      {/* Single Mode Results */}
      {viewMode === 'single' && data && (
        <div>
          <p className="text-gray-400 mb-4">
            Found {data.total} result{data.total !== 1 ? 's' : ''} for "{data.query}"
          </p>

          <div className="space-y-4">
            {data.results.map((result) => (
              <SearchResultCard key={result.messageId} result={result} />
            ))}
          </div>

          {data.results.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No messages found matching your search.
            </div>
          )}
        </div>
      )}

      {/* Compare Mode Results */}
      {viewMode === 'compare' && compareData && (
        <CompareResultsView data={compareData} />
      )}

      {/* Empty State */}
      {!data && !compareData && !isSearching && (
        <div className="text-center py-12 text-gray-400">
          <SearchIcon size={48} className="mx-auto mb-4 opacity-50" />
          <p>Enter a search query to find messages</p>
          <p className="text-sm mt-2">
            {viewMode === 'compare'
              ? 'Compare mode shows results from keyword (BM25), semantic, and hybrid search side by side'
              : 'Use semantic search to find related content, or keyword search for exact matches'}
          </p>
        </div>
      )}
    </div>
  )
}

function CompareResultsView({ data }: { data: CompareSearchResponse }) {
  const columns = [
    { key: 'keyword' as const, label: 'Keyword (BM25)', description: 'PostgreSQL ts_rank full-text search' },
    { key: 'semantic' as const, label: 'Semantic', description: 'Vector similarity (cosine)' },
    { key: 'hybrid' as const, label: 'Hybrid', description: 'Merged and ranked by score' },
  ]

  return (
    <div>
      <p className="text-gray-400 mb-4">
        Comparing results for "{data.query}"
      </p>

      <div className="grid grid-cols-3 gap-4">
        {columns.map(({ key, label, description }) => (
          <div key={key} className="space-y-3">
            <div className="sticky top-0 bg-[#2f3136] p-3 rounded-lg border border-[#40444b]">
              <h3 className="font-semibold text-white">{label}</h3>
              <p className="text-xs text-gray-400 mt-1">{description}</p>
              <p className="text-xs text-[#5865f2] mt-1">{data.results[key].length} results</p>
            </div>
            <div className="space-y-2">
              {data.results[key].map((result, index) => (
                <CompactResultCard key={result.messageId} result={result} rank={index + 1} />
              ))}
              {data.results[key].length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No results
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SearchResultCard({ result }: { result: SearchResult }) {
  const scorePercent = (result.score * 100).toFixed(1)
  const date = format(new Date(result.timestamp), 'MMM d, yyyy h:mm a')

  return (
    <Link
      to={`/messages/${result.messageId}`}
      className="block p-4 bg-[#36393f] rounded-lg hover:bg-[#3f4248] transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{result.username}</span>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Hash size={12} />
            {result.channelName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 bg-[#5865f2]/20 text-[#5865f2] rounded">
            {scorePercent}% match
          </span>
          <span className="text-xs text-gray-500">{date}</span>
        </div>
      </div>
      <p className="text-[#dcddde] line-clamp-3">{result.content}</p>
    </Link>
  )
}

function CompactResultCard({ result, rank }: { result: SearchResult; rank: number }) {
  const scorePercent = (result.score * 100).toFixed(1)

  return (
    <Link
      to={`/messages/${result.messageId}`}
      className="block p-3 bg-[#36393f] rounded-lg hover:bg-[#3f4248] transition-colors"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-mono text-gray-500 w-5">#{rank}</span>
        <span className="text-sm font-medium text-white truncate flex-1">{result.username}</span>
        <span className="text-xs px-1.5 py-0.5 bg-[#5865f2]/20 text-[#5865f2] rounded">
          {scorePercent}%
        </span>
      </div>
      <p className="text-sm text-[#dcddde] line-clamp-2 pl-7">{result.content}</p>
      <div className="flex items-center gap-1 mt-1.5 pl-7 text-xs text-gray-500">
        <Hash size={10} />
        {result.channelName}
      </div>
    </Link>
  )
}
