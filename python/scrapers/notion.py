from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup
import pandas as pd
import time
import traceback
import re

class NotionScraper:
    def __init__(self, iframe_url, displayed_base_url="https://ns.com/wiki", headless=False):
        """
        Initialize Notion iframe scraper
        
        Args:
            iframe_url (str): URL of the Notion iframe
            displayed_base_url (str): Base URL to use in output
            headless (bool): Whether to run Chrome in headless mode
        """
        # Setup Chrome options
        self.chrome_options = Options()
        if headless:
            self.chrome_options.add_argument("--headless")
        self.chrome_options.add_argument("--disable-gpu")
        self.chrome_options.add_argument("--window-size=1920,1080")
        self.chrome_options.add_argument("--no-sandbox")
        
        self.iframe_url = iframe_url
        self.displayed_base_url = displayed_base_url
        self.driver = None

    def format_content(self, text):
        """Format text with proper spacing and line breaks"""
        # Replace multiple spaces with a single space
        text = re.sub(r'\s+', ' ', text)
        
        # Add line breaks at logical points
        text = re.sub(r'([.!?]) ([A-Z])', r'\1\n\n\2', text)
        text = re.sub(r' (\d+\. )', r'\n\n\1', text)
        text = re.sub(r' (• )', r'\n\n\1', text)
        text = re.sub(r'([.!?]) (• )', r'\1\n\n\2', text)
        
        return text.strip()

    def get_fresh_links(self):
        """Get fresh list of links from the main page"""
        # Wait for wiki content to load
        WebDriverWait(self.driver, 20).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "a.notion-page-link"))
        )
        
        # Allow page to fully render
        time.sleep(2)
        
        # Get all page links
        return self.driver.find_elements(By.CSS_SELECTOR, "a.notion-page-link")

    def extract_categories(self):
        """Extract categories and their links from the page"""
        categories = {}
        
        # Wait for content to load
        WebDriverWait(self.driver, 20).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "h3, h2, h1"))
        )
        
        soup = BeautifulSoup(self.driver.page_source, "html.parser")
        headers = soup.find_all(['h1', 'h2', 'h3'])
        
        for header in headers:
            # Skip main title
            if "Network School Wiki" in header.text:
                continue
                
            category_name = header.text.strip()
            if not category_name:
                continue
                
            # Find links under this header
            links = []
            sibling = header.find_next_sibling()
            while sibling and sibling.name not in ['h1', 'h2', 'h3']:
                link_elements = sibling.select("a")
                for link in link_elements:
                    link_text = link.text.strip()
                    if link_text:
                        links.append(link_text)
                sibling = sibling.find_next_sibling()
            
            if links:
                categories[category_name] = links
                
        return categories

    def scrape(self):
        """
        Scrape content from Notion iframe
        
        Returns:
            pandas.DataFrame: DataFrame containing page URLs and content
        """
        self.driver = webdriver.Chrome(options=self.chrome_options)
        notion_data = []
        
        try:
            # Open main page
            print(f"Navigating to {self.iframe_url}...")
            self.driver.get(self.iframe_url)
            
            # Get initial links and categories
            links = self.get_fresh_links()
            categories = self.extract_categories()
            print(f"Found {len(links)} links on the main page.")
            
            # Process each link
            for i in range(len(links)):
                fresh_links = self.get_fresh_links()
                
                if i >= len(fresh_links):
                    print(f"Warning: Link index {i} is out of range.")
                    continue
                    
                current_link = fresh_links[i]
                link_text = current_link.text.strip()
                
                try:
                    # Click the link
                    print(f"\n[{i+1}/{len(links)}] Clicking: {link_text}")
                    current_link.click()
                    
                    # Wait for content and parse
                    try:
                        WebDriverWait(self.driver, 15).until(
                            EC.presence_of_element_located((By.CSS_SELECTOR, ".notion-page-content"))
                        )
                        time.sleep(2)
                    except Exception as wait_error:
                        print(f"Wait timeout, but continuing: {wait_error}")
                    
                    # Create breadcrumb URL
                    clean_link_text = link_text.replace('\n', ' ').strip()
                    category = next((cat for cat, links in categories.items() 
                                  if any(clean_link_text.lower() in l.lower() or 
                                        l.lower() in clean_link_text.lower() for l in links)), None)
                    
                    human_url = (f"{self.displayed_base_url} -> {category} -> {clean_link_text}" 
                               if category else f"{self.displayed_base_url} -> {clean_link_text}")
                    
                    # Extract content
                    page_soup = BeautifulSoup(self.driver.page_source, "html.parser")
                    content_selectors = [
                        ".notion-page-content",
                        "div.notion-page-content-inner", 
                        ".notion-scroller",
                        "main"
                    ]
                    
                    raw_content = ""
                    for selector in content_selectors:
                        content_divs = page_soup.select(selector)
                        if content_divs:
                            raw_content = "\n".join([div.get_text(" ", strip=True) for div in content_divs])
                            if raw_content:
                                break
                    
                    formatted_content = self.format_content(raw_content or "No content found")
                    
                    notion_data.append({
                        "url": human_url,
                        "content": formatted_content
                    })
                    
                    print(f"Content length: {len(formatted_content)} characters")
                    
                    # Return to main page
                    self.driver.get(self.iframe_url)
                    
                except Exception as e:
                    print(f"Error processing link {link_text}: {e}")
                    traceback.print_exc()
                    
                    # Return to main page and log error
                    self.driver.get(self.iframe_url)
                    
                    clean_link_text = link_text.replace('\n', ' ').strip()
                    category = next((cat for cat, links in categories.items() 
                                  if any(clean_link_text.lower() in l.lower() or 
                                        l.lower() in clean_link_text.lower() for l in links)), None)
                    
                    error_url = (f"{self.displayed_base_url} -> {category} -> {clean_link_text} (ERROR)"
                                if category else f"{self.displayed_base_url} -> {clean_link_text} (ERROR)")
                    
                    notion_data.append({
                        "url": error_url,
                        "content": f"ERROR: {str(e)}"
                    })
            
            # Create DataFrame
            df_notion = pd.DataFrame(notion_data, columns=["url", "content"])
            return df_notion
            
        finally:
            if self.driver:
                self.driver.quit()

def scrape_notion(iframe_url, displayed_base_url="https://ns.com/wiki", headless=False):
    """
    Wrapper function to initialize scraper and start scraping
    
    Args:
        iframe_url (str): URL of the Notion iframe
        displayed_base_url (str): Base URL to use in output
        headless (bool): Whether to run Chrome in headless mode
        
    Returns:
        pandas.DataFrame: DataFrame containing page URLs and content
    """
    scraper = NotionScraper(iframe_url, displayed_base_url, headless)
    return scraper.scrape()

if __name__ == "__main__":
    # Example usage
    IFRAME_URL = "https://www.notioniframe.com/notion/f1zqsc17ar3"
    
    df = scrape_notion(IFRAME_URL)
    print(f"\nTotal pages parsed: {len(df)}")
    print(df.head())
    
    # Save to CSV
    df.to_csv("wiki_content.csv", index=False)
    print("Saved to wiki_content.csv")