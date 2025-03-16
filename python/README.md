# NS Brain Scraper

A collection of scrapers to gather content from Network State related sources (Lu.ma events, The Network State book, Notion wiki, Discord messages).

## Setup

1. Install dependencies:
   - Python 3.8+
   - Chrome/Chromium
   - ChromeDriver matching your Chrome version
   - Poetry (package manager)
   - Just (command runner)

2. Install project:
```
git clone <repository-url>
cd nsbrain
just install
```

3. Create `.env` file:
```
DISCORD_SERVER_ID="your_server_id"
DISCORD_AUTH_TOKEN="your_auth_token"
NOTION_IFRAME_URL="your_notion_iframe_url"
```

To get Discord credentials:
- Enable Developer Mode in Discord (Settings → Advanced)
- Right-click server → Copy Server ID
- Get auth token from browser (F12 → Network → Headers)

## Usage
Run all scrapers:
```
just scrape
```

Run individual scrapers:
```
just list-data # Show all data files
just latest # Show latest files
just clean-data # Remove all data
```

## Data

Output is stored in:
- `data/raw/` - Individual source files
- `data/processed/` - Merged data

For RAG ingestion, use:
- `data/processed/nsbrain_latest.csv` (all sources)
- Or individual files at `data/raw/*_latest.csv`

CSVs contain: url, content, source, timestamp