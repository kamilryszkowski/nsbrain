// init.js
// Initializes and sets up the Discord bot

import { Client, Events, GatewayIntentBits, SlashCommandBuilder } from 'discord.js';

// Initialize the Discord bot
const initializeBot = (messageHandler) => {
  // Create Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ],
  });

  // Register commands
  const commands = {
    ask: new SlashCommandBuilder()
      .setName('ask')
      .setDescription('Ask a question about Network School')
      .addStringOption(option =>
        option
          .setName('question')
          .setDescription('Your question about NS')
          .setRequired(true)
      )
  };

  // Handle bot ready event
  const handleReady = async () => {
    console.log(`Discord bot logged in as ${client.user.tag}`);
    
    // Register slash commands for each guild
    for (const guild of client.guilds.cache.values()) {
      try {
        console.log(`Registering commands for guild: ${guild.name}`);
        await guild.commands.set([commands.ask.toJSON()]);
        console.log(`Successfully registered commands for ${guild.name}`);
      } catch (error) {
        console.error(`Failed to register commands for ${guild.name}:`, error);
      }
    }
  };

  // Initialize the bot
  const initialize = async () => {
    console.log('Setting up Discord bot...');

    // Set up event handlers
    client.on(Events.ClientReady, handleReady);
    client.on(Events.InteractionCreate, messageHandler.handleSlashCommand);

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