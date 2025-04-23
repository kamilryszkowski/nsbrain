# NSbrain - Network School Discord Bot

A Discord bot for the Network School community, powered by AI and RAG (Retrieval Augmented Generation) capabilities. The bot provides intelligent responses by combining LLM capabilities with a knowledge base of Network School-specific information.

## Overview

NSbrain is designed to:
- Answer questions about Network School using context from various sources
- Handle both direct messages and mentions in channels
- Provide accurate responses with source citations
- Scale across multiple data sources and knowledge bases

## Project Structure

```
.
├── data/               # Knowledge base data sources
│   ├── book/          # Book content
│   ├── discord/       # Discord message history
│   ├── luma/          # Luma content
│   └── wiki/          # Wiki content
├── utils/
│   ├── rag/           # RAG implementation
│   └── ...            # Other utility modules
├── scripts/           # Data upload and maintenance scripts
├── eval/              # Evaluation tools
├── python/            # Python utilities
├── infer.js           # Core inference logic
├── messageHandler.js  # Discord message processing
├── init.js           # Bot initialization
└── index.js          # Main entry point
```

## Core Components

### RAG System
The bot uses a sophisticated RAG system for knowledge retrieval. [Detailed documentation here](utils/rag/README.md).

Key features:
- Document processing and chunking
- Vector storage using Supabase
- Semantic search and retrieval
- Multiple namespace support (Book, Discord, Luma, Wiki)

### Message Handling
- Supports both direct messages and channel mentions
- Intelligent message processing and response generation
- Built-in retry mechanisms and error handling
- Typing indicators and message chunking for long responses

### AI Integration
- Primary model: Gemini 2.0 Flash
- OpenAI integration as fallback
- Context-aware responses with source attribution
- Efficient prompt management

## Getting Started

### Prerequisites
- Node.js (Latest LTS version recommended)
- A Discord bot token
- API keys for Gemini and OpenAI
- Supabase account and credentials

### Environment Setup

Create a `.env` file with the following variables:
```
DISCORD_TOKEN=your_discord_bot_token
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the bot:
   ```bash
   npm start
   ```

### Data Management

To upload new documents to the knowledge base:
```bash
npm run upload-docs
```

## Available Scripts

- `npm start` - Start the Discord bot
- `npm run upload-docs` - Upload documents to the knowledge base
- `npm run eval` - Run evaluation tools

## Dependencies

- `discord.js` - Discord API integration
- `@google/generative-ai` - Gemini AI integration
- `@supabase/supabase-js` - Vector database client
- `openai` - OpenAI API integration
- Additional utilities for CSV parsing and HTTP requests

## Contributing

When contributing to this repository, please:
- Follow the existing code style
- Update documentation as needed
- Test your changes thoroughly
- Use ES6+ syntax
- Maintain compatibility with existing data structures

## License

[Add your license information here]


