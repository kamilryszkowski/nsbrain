import os
import pandas as pd
from datetime import datetime
from pathlib import Path
from scrapers import scrape_luma, scrape_book, scrape_notion, scrape_discord

# Create data directories if they don't exist
DATA_DIR = Path("data")
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"

for dir_path in [DATA_DIR, RAW_DIR, PROCESSED_DIR]:
    dir_path.mkdir(exist_ok=True)

def scrape_all(
    discord_server_id: str = None,
    discord_auth_token: str = None,
    notion_iframe_url: str = None,
    save_individual: bool = True  # Changed default to True
) -> pd.DataFrame:
    """
    Run all scrapers and merge results
    
    Args:
        discord_server_id (str, optional): Discord server ID
        discord_auth_token (str, optional): Discord auth token
        notion_iframe_url (str, optional): Notion iframe URL
        save_individual (bool): Whether to save individual scraper results
        
    Returns:
        pd.DataFrame: Merged dataframe with all content
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dfs = {}
    
    # Run Luma scraper
    try:
        print("\nScraping Luma events...")
        dfs['luma'] = scrape_luma()
        if save_individual:
            output_path = RAW_DIR / f"luma_{timestamp}.csv"
            dfs['luma'].to_csv(output_path, index=False)
            print(f"Saved Luma data to {output_path}")
    except Exception as e:
        print(f"Error scraping Luma: {e}")
        dfs['luma'] = pd.DataFrame(columns=['url', 'content'])

    # Run Book scraper
    try:
        print("\nScraping Network State book...")
        dfs['book'] = scrape_book()
        if save_individual:
            output_path = RAW_DIR / f"book_{timestamp}.csv"
            dfs['book'].to_csv(output_path, index=False)
            print(f"Saved Book data to {output_path}")
    except Exception as e:
        print(f"Error scraping book: {e}")
        dfs['book'] = pd.DataFrame(columns=['url', 'content'])

    # Run Notion scraper if URL provided
    if notion_iframe_url:
        try:
            print("\nScraping Notion wiki...")
            dfs['notion'] = scrape_notion(notion_iframe_url)
            if save_individual:
                output_path = RAW_DIR / f"notion_{timestamp}.csv"
                dfs['notion'].to_csv(output_path, index=False)
                print(f"Saved Notion data to {output_path}")
        except Exception as e:
            print(f"Error scraping Notion: {e}")
            dfs['notion'] = pd.DataFrame(columns=['url', 'content'])

    # Run Discord scraper if credentials provided
    if discord_server_id and discord_auth_token:
        try:
            print("\nScraping Discord messages...")
            dfs['discord'] = scrape_discord(discord_server_id, discord_auth_token)
            if save_individual:
                output_path = RAW_DIR / f"discord_{timestamp}.csv"
                dfs['discord'].to_csv(output_path, index=False)
                print(f"Saved Discord data to {output_path}")
        except Exception as e:
            print(f"Error scraping Discord: {e}")
            dfs['discord'] = pd.DataFrame(columns=['url', 'content'])

    # Add metadata to each dataframe
    for source, df in dfs.items():
        df['source'] = source
        df['timestamp'] = timestamp

    # Merge all dataframes
    df_merged = pd.concat(dfs.values(), ignore_index=True)

    # Display summary
    print("\nScraping Summary:")
    print(f"Total entries: {len(df_merged)}")
    print("\nEntries by source:")
    print(df_merged['source'].value_counts())

    # Save merged results
    merged_output = PROCESSED_DIR / f"nsbrain_merged_{timestamp}.csv"
    df_merged.to_csv(merged_output, index=False)
    print(f"\nSaved merged results to {merged_output}")

    # Create latest symlinks
    create_latest_symlinks(timestamp)

    return df_merged

def create_latest_symlinks(timestamp: str):
    """Create symlinks to the latest files"""
    # Dictionary of source types and their patterns
    sources = {
        'luma': 'luma_*.csv',
        'book': 'book_*.csv',
        'notion': 'notion_*.csv',
        'discord': 'discord_*.csv',
        'merged': 'nsbrain_merged_*.csv'
    }
    
    # Create symlinks for raw files
    for source, pattern in sources.items():
        if source != 'merged':
            latest_file = sorted(RAW_DIR.glob(pattern))[-1] if list(RAW_DIR.glob(pattern)) else None
            if latest_file:
                symlink_path = RAW_DIR / f"{source}_latest.csv"
                create_symlink(latest_file, symlink_path)
    
    # Create symlink for merged file
    latest_merged = sorted(PROCESSED_DIR.glob(sources['merged']))[-1] if list(PROCESSED_DIR.glob(sources['merged'])) else None
    if latest_merged:
        symlink_path = PROCESSED_DIR / "nsbrain_latest.csv"
        create_symlink(latest_merged, symlink_path)

def create_symlink(target: Path, link_path: Path):
    """Create a symlink, replacing existing if necessary"""
    try:
        if link_path.exists():
            link_path.unlink()
        link_path.symlink_to(target.name)
    except Exception as e:
        print(f"Error creating symlink {link_path}: {e}")

if __name__ == "__main__":
    # Example usage
    df = scrape_all(
        discord_server_id="900827411917201418",
        discord_auth_token=os.getenv("DISCORD_AUTH_TOKEN"),
        notion_iframe_url="https://www.notioniframe.com/notion/f1zqsc17ar3",
        save_individual=True
    )