const { Client, Events, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
const { OpenAI } = require('openai');
const { loadWikiContent } = require('./wikiLoader');
require('dotenv').config();

// Validate environment variables
const requiredEnvVars = ['DISCORD_TOKEN', 'OPENAI_API_KEY'];
const missing = requiredEnvVars.filter(key => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

// Configuration
const config = {
  discord: {
    token: process.env.DISCORD_TOKEN,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o',
  },
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// Load wiki content from data/ folder
const wikiContent = loadWikiContent();
console.log('Wiki content loaded successfully');

// System prompt with wiki content included
const SYSTEM_PROMPT = `You are a helpful assistant for the Network School (NS) community. 
Your goal is to provide accurate and concise answers based on the provided wiki context.
Always cite specific details from the wiki when available.

Here is the wiki content:
${wikiContent}`;

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ],
});

// Generate response using OpenAI SDK
async function generateResponse(query) {
  try {
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: query
        }
      ],
      max_tokens: config.openai.maxTokens,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI API:', error.message);
    throw new Error('Failed to generate response');
  }
}

// Set up bot
async function setupBot() {
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
    console.log(`Discord bot logged in as ${client.user.tag}`);
    
    // Register slash commands for each guild
    for (const guild of client.guilds.cache.values()) {
      try {
        console.log(`Registering commands for guild: ${guild.name}`);
        await guild.commands.set([askCommand.toJSON()]);
        console.log(`Successfully registered commands for ${guild.name}`);
      } catch (error) {
        console.error(`Failed to register commands for ${guild.name}:`, error);
      }
    }
  });

  // Handle slash commands
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ask') {
      const query = interaction.options.getString('question', true);
      console.log('Processing /ask command:', query);
      
      // Defer reply to give us time to call the API
      await interaction.deferReply({ ephemeral: false });
      
      try {
        const response = await generateResponse(query);
        await interaction.editReply({
          content: response,
          ephemeral: false
        });
      } catch (error) {
        await interaction.editReply({
          content: 'Sorry, I could not process your request. Please try again later.',
          ephemeral: false
        });
      }
    }
  });

  // Handle direct messages
  client.on(Events.MessageCreate, async (message) => {
    // Ignore messages from bots or non-DM channels
    if (message.author.bot || message.channel.type !== 'DM') return;
    
    console.log(`Received DM from ${message.author.tag}: ${message.content}`);
    
    // Show typing indicator
    message.channel.sendTyping();
    
    try {
      const response = await generateResponse(message.content);
      await message.reply(response);
    } catch (error) {
      console.error('Error processing DM:', error);
      await message.reply('Sorry, I could not process your request. Please try again later.');
    }
  });

  // Start the bot
  try {
    await client.login(config.discord.token);
    console.log('Successfully logged in to Discord');
  } catch (error) {
    console.error('Failed to login to Discord:', error);
    throw error;
  }
}

// Run the bot
setupBot().catch(console.error); 