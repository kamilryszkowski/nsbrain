from bs4 import BeautifulSoup
import pandas as pd
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from urllib.parse import urljoin

def scrape_luma():
    """
    Scrape event listings from lu.ma/ns
    
    Returns:
        pandas.DataFrame: DataFrame containing event URLs and content
    """
    # Set up Selenium
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    driver = webdriver.Chrome(options=chrome_options)

    try:
        # Base URL
        base_url = "https://lu.ma/ns"
        driver.get(base_url)

        # Scroll to load all events
        last_height = driver.execute_script("return document.body.scrollHeight")
        while True:
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            new_height = driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height

        # Parse fully loaded page
        soup = BeautifulSoup(driver.page_source, "html.parser")

        # Find event links
        event_links = []
        for link in soup.select("a.event-link.content-link"):
            href = link.get("href")
            if href:
                full_url = urljoin("https://lu.ma", href)
                if full_url not in event_links:
                    event_links.append(full_url)

        print(f"Found {len(event_links)} event links")

        # Scrape each event page
        luma_data = []

        for event_url in event_links:
            try:
                driver.get(event_url)
                time.sleep(2)  # Wait for page to load
                event_soup = BeautifulSoup(driver.page_source, "html.parser")
                
                # Extract specific elements
                title = event_soup.find("h1") or event_soup.find("h3")
                title_text = title.get_text(strip=True) if title else "No title"
                hosts_section = event_soup.find(string="Hosted By")
                hosts = hosts_section.find_next("div").get_text(strip=True) if hosts_section else "Unknown"
                location_section = event_soup.find(string="Location")
                location = location_section.find_next("div").get_text(strip=True) if location_section else "Unknown"
                
                # Extract date and time
                row_container = event_soup.find("div", class_="jsx-1546168629 row-container")
                if row_container:
                    date_elem = row_container.find("div", class_="jsx-2370077516 title text-ellipses")
                    time_elem = row_container.find("div", class_="jsx-2370077516 desc text-ellipses")
                    date_text = date_elem.get_text(strip=True) if date_elem else "Unknown date"
                    time_text = time_elem.get_text(strip=True) if time_elem else "Unknown time"
                    datetime_text = f"{date_text} at {time_text}" if date_text != "Unknown date" and time_text != "Unknown time" else "Unknown date and time"
                else:
                    datetime_text = "Unknown date and time"
                
                about_section = event_soup.find(string="About Event")
                description = about_section.find_next("div").get_text(strip=True) if about_section else "No description"
                attendees_section = event_soup.find(string=lambda t: "Going" in t and t)
                attendees = attendees_section.strip() if attendees_section else "Unknown attendance"

                # Combine into clean content string
                content = (
                    f"Title: {title_text}\n"
                    f"Hosts: {hosts}\n"
                    f"Date and Time: {datetime_text}\n"
                    f"Location: {location}\n"
                    f"Description: {description}\n"
                    f"Attendees: {attendees}"
                )
                
                luma_data.append([event_url, content])
                print(f"Scraped event: {event_url}")
                time.sleep(0.5)
            except Exception as e:
                print(f"Error scraping {event_url}: {e}")

        # Create DataFrame
        df_luma = pd.DataFrame(luma_data, columns=["url", "content"])
        return df_luma

    finally:
        driver.quit()

if __name__ == "__main__":
    df = scrape_luma()
    print(f"\nTotal events scraped: {len(df)}")
    print(df.head())