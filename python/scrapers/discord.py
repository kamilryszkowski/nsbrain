import requests
import pandas as pd
from datetime import datetime
import time
import re
import os
class DiscordScraper:
    def __init__(self, server_id, auth_token):
        """
        Initialize Discord scraper
        
        Args:
            server_id (str): Discord server/guild ID
            auth_token (str): Discord authentication token
        """
        self.server_id = server_id
        self.headers = {
            'authorization': auth_token,
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            'origin': 'https://discord.com',
            'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
            'content-type': 'application/json'
        }

    def get_all_channels(self):
        """Get all accessible channels from the server"""
        print(f"Fetching channels for server ID: {self.server_id}")
        
        # Try to get channels directly from the API
        url = f"https://discord.com/api/v9/guilds/{self.server_id}/channels"
        response = requests.get(url, headers=self.headers)
        
        if response.status_code == 200:
            channels_data = response.json()
            # Filter for text channels (type 0)
            text_channels = [
                {'id': c['id'], 'name': c['name']}
                for c in channels_data if c['type'] == 0
            ]
            print(f"Found {len(text_channels)} text channels via API")
            return text_channels
        
        # If that fails, try alternate approach by getting visible channels
        print("Couldn't get channels via API, trying alternate method...")
        
        # Try to get channels from user's guild
        url = f"https://discord.com/api/v9/users/@me/guilds/{self.server_id}/channels"
        response = requests.get(url, headers=self.headers)
        
        if response.status_code == 200:
            channels_data = response.json()
            # Filter for text channels
            text_channels = [
                {'id': c['id'], 'name': c.get('name', f'channel_{c["id"]}')}
                for c in channels_data if c.get('type') == 0
            ]
            print(f"Found {len(text_channels)} text channels via user's guild")
            return text_channels
        
        # If both approaches fail, we need to explore the server in a browser-like way
        print("Trying to explore accessible channels...")
        
        # First, try to get any visible channel (like welcome channel)
        url = f"https://discord.com/api/v9/guilds/{self.server_id}"
        response = requests.get(url, headers=self.headers)
        
        channels = []
        if response.status_code == 200:
            guild_data = response.json()
            
            # Check for system_channel, rules_channel, public_updates_channel
            for channel_type in ['system_channel_id', 'rules_channel_id', 'public_updates_channel_id']:
                if channel_type in guild_data and guild_data[channel_type]:
                    channel_id = guild_data[channel_type]
                    channels.append({
                        'id': channel_id,
                        'name': f"channel_{channel_id}"
                    })
        
        # Add known working channels
        channels.extend([
            {'id': '1277286643262554133', 'name': 'public_channel'},
            {'id': '1346501335855529994', 'name': 'private_channel'}
        ])
        
        print(f"Found {len(channels)} channels through exploration")
        return channels

    def format_content(self, content):
        """Format the message content to be more human-readable"""
        if not content:
            return ""
        
        # Replace multiple spaces with a single space
        formatted = re.sub(r'\s+', ' ', content)
        
        # Add line breaks at appropriate places
        formatted = re.sub(r'([.!?]) ([A-Z])', r'\1\n\n\2', formatted)
        
        # Add line breaks before bullet points or numbers
        formatted = re.sub(r' (\d+\. )', r'\n\n\1', formatted)
        formatted = re.sub(r' (• )', r'\n\n\1', formatted)
        
        return formatted.strip()

    def fetch_messages(self, channel_id, channel_name):
        """Fetch all messages from a specific channel"""
        messages_data = []
        last_message_id = None
        
        print(f"\nFetching messages from channel: {channel_name} (ID: {channel_id})")
        
        # Update referer header for this specific channel
        self.headers['referer'] = f'https://discord.com/channels/{self.server_id}/{channel_id}'
        
        while True:
            # Build URL with pagination
            url = f'https://discord.com/api/v9/channels/{channel_id}/messages?limit=100'
            if last_message_id:
                url += f'&before={last_message_id}'
            
            # Get messages
            response = requests.get(url, headers=self.headers)
            
            # Check for rate limits
            if response.status_code == 429:
                retry_after = int(response.headers.get('retry-after', 5))
                print(f"Rate limited. Waiting {retry_after} seconds...")
                time.sleep(retry_after)
                continue
                
            # Check for permission errors
            if response.status_code == 403:
                print(f"No permission to access channel: {channel_name}")
                return []
                
            # Check for other errors
            if response.status_code != 200:
                print(f"Error: Status code {response.status_code}")
                print(response.text)
                return []
            
            # Parse response
            messages = response.json()
            
            # Break if no more messages
            if not messages:
                break
                
            # Parse messages
            for msg in messages:
                # Create message URL
                message_url = f"https://discord.com/channels/{self.server_id}/{channel_id}/{msg['id']}"
                
                # For full dataframe (df_all)
                messages_data.append({
                    'message_id': msg['id'],
                    'channel_id': channel_id,
                    'channel_name': channel_name,
                    'timestamp': datetime.fromisoformat(msg['timestamp'].replace('Z', '+00:00')),
                    'content': msg['content'],
                    'username': msg['author']['username'],
                    'author_id': msg['author']['id'],
                    'profile_image': msg['author'].get('avatar') and f"https://cdn.discordapp.com/avatars/{msg['author']['id']}/{msg['author']['avatar']}.png",
                    'is_bot': msg['author'].get('bot', False),
                    'message_url': message_url
                })
            
            # Update last_message_id for next iteration
            last_message_id = messages[-1]['id']
            print(f"Fetched {len(messages_data)} messages from {channel_name} so far...")
            
            # Delay to avoid rate limits
            time.sleep(0.5)
        
        return messages_data

    def scrape(self):
        """
        Scrape all accessible channels and messages
        
        Returns:
            pandas.DataFrame: DataFrame containing message URLs and content
        """
        # Get all channels
        channels = self.get_all_channels()
        print(f"Found {len(channels)} channels to process")

        # Collect all messages
        all_messages = []

        # Process each channel
        for i, channel in enumerate(channels):
            print(f"\nProcessing channel {i+1}/{len(channels)}: {channel['name']}")
            channel_messages = self.fetch_messages(channel['id'], channel['name'])
            
            if channel_messages:
                print(f"Fetched {len(channel_messages)} messages from {channel['name']}")
                all_messages.extend(channel_messages)
            else:
                print(f"No messages fetched from {channel['name']}")

        # Create full dataframe
        df_all = pd.DataFrame(all_messages)

        # Create the simplified dataframe with just url and content
        if not df_all.empty:
            # Create formatted content for df_discord
            formatted_content = []
            
            for _, row in df_all.iterrows():
                # Format the content
                content = self.format_content(row['content'])
                
                # Add channel and author context
                channel_prefix = f"[#{row['channel_name']}] {row['username']} ({row['timestamp'].strftime('%Y-%m-%d %H:%M:%S')}): "
                full_content = channel_prefix + content
                
                formatted_content.append({
                    'url': row['message_url'],
                    'content': full_content
                })
            
            # Create the simplified dataframe
            df_discord = pd.DataFrame(formatted_content)
            
            # Display information
            print(f"\nTotal messages scraped: {len(df_all)}")
            print(f"Distinct channels: {df_all['channel_name'].nunique()}")
            
            return df_discord
        else:
            print("No messages were fetched from any channel.")
            return pd.DataFrame(columns=["url", "content"])

def scrape_discord(server_id, auth_token):
    """
    Wrapper function to initialize scraper and start scraping
    
    Args:
        server_id (str): Discord server/guild ID
        auth_token (str): Discord authentication token
        
    Returns:
        pandas.DataFrame: DataFrame containing message URLs and content
    """
    scraper = DiscordScraper(server_id, auth_token)
    return scraper.scrape()

if __name__ == "__main__":
    # Example usage
    SERVER_ID = "900827411917201418"
    AUTH_TOKEN = os.getenv("DISCORD_AUTH_TOKEN")
    
    df = scrape_discord(SERVER_ID, AUTH_TOKEN)
    
    # Save to CSV
    df.to_csv('discord_messages.csv', index=False)
    print("Saved to discord_messages.csv")