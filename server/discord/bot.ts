import { Client, Events, GatewayIntentBits, SlashCommandBuilder, Permissions } from 'discord.js';
import { config } from '../config';
import { handleAskCommand, handleDirectMessage } from './commands';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,           // For slash commands
    GatewayIntentBits.DirectMessages,    // For DM handling
    GatewayIntentBits.MessageContent,    // For reading message content
    GatewayIntentBits.GuildMessages,     // For receiving messages in guilds
  ],
});

export async function setupBot() {
  console.log('Setting up Discord bot...');

  // Register commands
  const askCommand = new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask a question about Network School')
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('Your question about NS')
        .setRequired(true)
    );

  client.on(Events.ClientReady, async () => {
    console.log(`Discord bot logged in as ${client.user?.tag}`);
    console.log('Available guilds:', client.guilds.cache.map(g => g.name).join(', '));

    // Register slash commands for each guild
    for (const guild of client.guilds.cache.values()) {
      try {
        console.log(`Registering commands for guild: ${guild.name}`);
        // Check bot permissions in the guild
        const member = await guild.members.fetch(client.user!.id);
        console.log(`Bot permissions in ${guild.name}:`, member.permissions.toArray());

        // Register the command
        await guild.commands.set([askCommand]);
        console.log(`Successfully registered commands for ${guild.name}`);
      } catch (error) {
        console.error(`Failed to register commands for ${guild.name}:`, error);
      }
    }
  });

  // Handle slash commands
  client.on(Events.InteractionCreate, async (interaction) => {
    console.log('Received interaction:', interaction.type, interaction.commandName);
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ask') {
      await handleAskCommand(interaction);
    }
  });

  // Handle direct messages
  client.on(Events.MessageCreate, async (message) => {
    if (message.channel.isDMBased() && !message.author.bot) {
      await handleDirectMessage(message);
    }
  });

  // Error handling
  client.on(Events.Error, (error) => {
    console.error('Discord client error:', error);
  });

  // Start the bot
  try {
    console.log('Attempting to login to Discord...');
    await client.login(config.discord.token);
    console.log('Successfully logged in to Discord');
    return client;
  } catch (error) {
    console.error('Failed to login to Discord:', error);
    throw error;
  }
}