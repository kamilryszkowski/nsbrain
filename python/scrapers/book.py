import requests
import pandas as pd
from bs4 import BeautifulSoup
import time
from urllib.parse import urljoin
import re
from tqdm import tqdm

def scrape_book():
    """
    Scrape chapters from thenetworkstate.com
    
    Returns:
        pandas.DataFrame: DataFrame containing chapter URLs and content
    """
    # Headers
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36"
    }

    # Base URL
    base_url = "https://thenetworkstate.com"

    # Fetch main page
    print("Fetching main page...")
    response = requests.get(base_url, headers=headers)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    # Find all chapter/subsection links
    chapter_links = []
    chapter_containers = soup.select("div.flex.flex-col.w-full.border.border-gray-300.rounded-xl")
    for container in chapter_containers:
        for link in container.select("a[href]"):
            href = link.get("href")
            full_url = urljoin(base_url, href)
            if full_url not in chapter_links:
                chapter_links.append(full_url)

    print(f"Found {len(chapter_links)} chapter links")

    # Scrape each chapter
    book_data = []
    for chapter_url in tqdm(chapter_links):
        try:
            chapter_response = requests.get(chapter_url, headers=headers)
            chapter_response.raise_for_status()
            chapter_soup = BeautifulSoup(chapter_response.text, "html.parser")
            
            # Extract chapter title
            title = chapter_soup.find("h1") or chapter_soup.find("h2")
            title_text = title.get_text(strip=True) if title else "No title"
            
            # Extract content (all paragraphs) and clean it
            paragraphs = [p.get_text(strip=True) for p in chapter_soup.select("p") if p.get_text(strip=True)]
            if paragraphs:
                # Join paragraphs with spaces, then normalize whitespace
                raw_content = " ".join(paragraphs)
                clean_content = re.sub(r'\s+', ' ', raw_content).strip()
                formatted_content = f"Title: {title_text}\nContent: {clean_content}"
                book_data.append([chapter_url, formatted_content])
            
            print(f"Scraped chapter: {chapter_url}")
            time.sleep(0.5)  # Avoid rate limits
        except Exception as e:
            print(f"Error scraping {chapter_url}: {e}")

    # Create DataFrame
    df_book = pd.DataFrame(book_data, columns=["url", "content"])
    return df_book

if __name__ == "__main__":
    df = scrape_book()
    print(f"\nTotal chapters scraped: {len(df)}")
    print(df.head())