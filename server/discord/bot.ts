import { Client, Events, GatewayIntentBits, SlashCommandBuilder } from 'discord.js';
import { config } from '../config';
import { handleAskCommand, handleDirectMessage } from './commands';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,           // For slash commands
    GatewayIntentBits.DirectMessages,    // For DM handling
    GatewayIntentBits.MessageContent     // For reading message content
  ],
});

export async function setupBot() {
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

  client.on(Events.ClientReady, () => {
    console.log(`Discord bot logged in as ${client.user?.tag}`);

    // Register slash commands
    const guild = client.guilds.cache.first();
    if (guild) {
      guild.commands.set([askCommand])
        .then(() => console.log('Slash commands registered successfully'))
        .catch(error => console.error('Failed to register slash commands:', error));
    }
  });

  // Handle slash commands
  client.on(Events.InteractionCreate, async (interaction) => {
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
    await client.login(config.discord.token);
    return client;
  } catch (error) {
    console.error('Failed to login to Discord:', error);
    throw error;
  }
}