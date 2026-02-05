# Discord Analyzer

A CLI application for downloading, storing, and searching Discord messages with semantic search capabilities powered by vector embeddings.

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Discord token ([how to get one](https://github.com/Tyrrrz/DiscordChatExporter/blob/master/.docs/Token-and-IDs.md))
- OpenAI API key (optional, for semantic search)

### Installation

```bash
cd app
npm install
cp .env.example .env   # Edit with your tokens
docker compose up -d postgres
npm run db:migrate
npm run build
npm run dev -- start   # Open http://localhost:3000
```

## Features

- **Export Discord Data**: Use DiscordChatExporter via Docker to export channels and guilds
- **PostgreSQL Storage**: Store messages with full-text search indexes
- **Vector Embeddings**: Generate OpenAI embeddings for semantic search
- **Hybrid Search**: Combine keyword and semantic search for best results
- **Web Interface**: React-based dashboard for search and analytics
- **Incremental Sync**: Track exports to only fetch new messages

## Usage

```bash
# List servers and channels
npm run dev -- guilds
npm run dev -- channels --guild <guild_id>

# Export messages
npm run dev -- export --channel <channel_id>
npm run dev -- export --channel <channel_id> --since 30d
npm run dev -- export --guild <guild_id> --since 2024-01-01

# Ingest and embed
npm run dev -- ingest
npm run dev -- embed    # Requires OpenAI API key

# Search
npm run dev -- search "your query"
npm run dev -- search "exact phrase" --type keyword
npm run dev -- search "related concept" --type semantic

# Web interface
npm run dev -- start    # http://localhost:3000
```

## Configuration

Set via environment variables or config file at `~/.discord-analyzer/config.yaml`:

```env
DISCORD_TOKEN=your_discord_token
OPENAI_API_KEY=your_openai_key
DATABASE_URL=postgresql://user:pass@localhost:5432/discord_analyzer
API_PORT=3001
WEB_PORT=3000
```

Interactive setup: `npm run dev -- config init`

## Architecture

```
app/
├── src/
│   ├── commands/       # CLI commands
│   ├── services/       # Business logic (search, embeddings)
│   ├── db/             # Database schema and client
│   ├── server/         # Fastify API server
│   └── utils/          # Utilities
├── web/                # React frontend
└── docs/               # Technical documentation
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ |
| Language | TypeScript |
| CLI | Commander.js + Inquirer |
| Backend | Fastify |
| Database | PostgreSQL 16 + pgvector |
| ORM | Drizzle ORM |
| Embeddings | OpenAI text-embedding-3-small (1536 dim) |
| Frontend | React + Vite + TailwindCSS |

## Documentation

For in-depth technical details about the search system:

| Document | Description |
|----------|-------------|
| [Search Specification](app/docs/SEARCH_SPECIFICATION.md) | Implementation details, API reference, database schema, and architecture diagrams |
| [Search Techniques Research](app/docs/SEARCH_TECHNIQUES_RESEARCH.md) | Theoretical foundations of BM25, vector embeddings, hybrid search, and ANN algorithms with academic references |

### Search System Overview

The search system supports three modes:

- **Keyword Search**: PostgreSQL full-text search with `ts_rank()` and GIN indexes
- **Semantic Search**: Vector similarity using pgvector with IVFFLAT indexing
- **Hybrid Search**: Merges both approaches, sorted by score with deduplication

See the [Search Specification](app/docs/SEARCH_SPECIFICATION.md) for SQL patterns and the [Research Document](app/docs/SEARCH_TECHNIQUES_RESEARCH.md) for algorithm theory.

## Development

```bash
npm run dev -- <command>    # CLI development mode
npm run build               # Build project
cd web && npm run dev       # Web UI development
```

## License

MIT
