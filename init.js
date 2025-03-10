// init.js
// Initializes and sets up the Discord bot

import { Client, Events, GatewayIntentBits } from 'discord.js';

// Initialize the Discord bot
const initializeBot = (messageHandler) => {
  // Create Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent, // Needed to read message content
    ],
  });

  // Handle bot ready event
  const handleReady = async () => {
    console.log(`Discord bot logged in as ${client.user.tag}`);
    console.log(`Bot ID: ${client.user.id}`);
    console.log('Bot is ready to respond to mentions!');
  };

  // Initialize the bot
  const initialize = async () => {
    console.log('Setting up Discord bot...');

    // Set up event handlers
    client.on(Events.ClientReady, handleReady);
    
    // Handle message events for mentions
    client.on(Events.MessageCreate, (message) => {
      // Ignore messages from bots (including itself)
      if (message.author.bot) return;
      
      // Pass the message to the handler along with the bot's ID
      messageHandler.handleMention(message, client.user.id);
    });

    // Start the bot
    try {
      await client.login(process.env.DISCORD_TOKEN);
      console.log('Successfully logged in to Discord');
    } catch (error) {
      console.error('Failed to login to Discord:', error);
      throw error;
    }
  };

  return {
    initialize
  };
};

export default initializeBot; 