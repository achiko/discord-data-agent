# Discord Analyzer

A CLI application for downloading, storing, and searching Discord messages with semantic search capabilities powered by vector embeddings.

## How to Start the Project

```bash
# 1. Navigate to the app directory
cd app

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and add your DISCORD_TOKEN and OPENAI_API_KEY (optional)

# 4. Start the database
docker compose up -d postgres

# 5. Run database migrations
npm run db:migrate

# 6. Build the project
npm run build

# 7. Start the web interface
npm run dev -- start
# Open http://localhost:3000 in your browser
```

## Features

- **Export Discord Data**: Use DiscordChatExporter via Docker to export channels and guilds
- **PostgreSQL Storage**: Store messages with full-text search indexes
- **Vector Embeddings**: Generate OpenAI embeddings for semantic search
- **Hybrid Search**: Combine keyword and semantic search for best results
- **Web Interface**: React-based dashboard for search and analytics
- **Incremental Sync**: Track exports to only fetch new messages

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Discord token ([how to get one](https://github.com/Tyrrrz/DiscordChatExporter/blob/master/.docs/Token-and-IDs.md))
- OpenAI API key (optional, for semantic search)

### Installation

```bash
cd app

# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env with your Discord token and OpenAI key (optional)

# Start PostgreSQL with pgvector
docker compose up -d postgres

# Run database migrations
npm run db:migrate

# Build the CLI
npm run build
```

### Usage

#### List your Discord servers
```bash
npm run dev -- guilds
```

#### List channels in a server
```bash
npm run dev -- channels --guild <guild_id>
```

#### Export a channel
```bash
# Export all messages
npm run dev -- export --channel <channel_id>

# Export messages from the last 30 days
npm run dev -- export --channel <channel_id> --since 30d

# Export an entire guild
npm run dev -- export --guild <guild_id> --since 2024-01-01
```

#### Ingest exported data
```bash
npm run dev -- ingest
```

#### Generate embeddings (requires OpenAI API key)
```bash
npm run dev -- embed
```

#### Search messages
```bash
# Hybrid search (keyword + semantic)
npm run dev -- search "your query"

# Keyword only
npm run dev -- search "exact phrase" --type keyword

# Semantic only (requires embeddings)
npm run dev -- search "related concept" --type semantic
```

#### Start the web interface
```bash
npm run dev -- start
# Visit http://localhost:3000
```

## Configuration

Configuration can be set via:
1. Environment variables (highest priority)
2. Config file at `~/.discord-analyzer/config.yaml`

### Environment Variables

```env
DISCORD_TOKEN=your_discord_token
OPENAI_API_KEY=your_openai_key
DATABASE_URL=postgresql://user:pass@localhost:5432/discord_analyzer
API_PORT=3001
WEB_PORT=3000
```

### Interactive Configuration
```bash
npm run dev -- config init
```

## Architecture

```
app/
├── src/
│   ├── commands/       # CLI commands
│   ├── services/       # Business logic
│   ├── db/             # Database schema and client
│   ├── server/         # Fastify API server
│   └── utils/          # Utilities
└── web/                # React frontend
```

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **CLI**: Commander.js + Inquirer
- **Backend**: Fastify
- **Database**: PostgreSQL 16 + pgvector
- **ORM**: Drizzle ORM
- **Embeddings**: OpenAI text-embedding-3-small
- **Frontend**: React + Vite + TailwindCSS

## Development

```bash
# Run CLI in development mode
npm run dev -- <command>

# Build
npm run build

# Run web UI in development mode
cd web && npm run dev
```

## License

MIT
