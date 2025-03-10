// messageHandler.js
// Handles processing and responding to user messages

import { callLLM, models } from './utils/llm.js';
import { loadWikiContent } from './utils/wikiLoader.js';

// Create message handler with all necessary functionality
const createMessageHandler = () => {
  // Load wiki content
  const wikiContent = loadWikiContent();
  console.log('Wiki content loaded successfully');

  // System prompt with wiki content included
  const SYSTEM_PROMPT = `You are a helpful assistant for the Network School (NS) community. 
Your goal is to provide accurate and concise answers based on the provided wiki context.
Always cite specific details from the wiki when available.

Here is the wiki content:
${wikiContent}`;

  // LLM functionality
  const generateResponse = async (query) => {
    try {
      const result = await callLLM({
        model: models['GPT-4o'],
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
      });
  
      return result.message;
    } catch (error) {
      console.error('Error calling LLM API:', error.message);
      throw new Error('Failed to generate response');
    }
  };

  return {
    // Handle slash commands
    handleSlashCommand: async (interaction) => {
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
    },

    // Handle direct messages
    handleDirectMessage: async (message) => {
      // Debug all incoming messages
      console.log(`Message received: ${message.content} | Channel type: ${message.channel.type} | Author: ${message.author.tag} | Bot: ${message.author.bot}`);
      
      // Ignore messages from bots or non-DM channels
      if (message.author.bot) {
        console.log('Ignoring message from bot');
        return;
      }
      
      // Check channel type with more detailed logging
      console.log(`Channel type: ${message.channel.type} (${typeof message.channel.type})`);
      
      // In Discord.js v14, DM channel type is ChannelType.DM which is 1
      if (message.channel.type !== 1) {
        console.log(`Ignoring message in non-DM channel type: ${message.channel.type}`);
        return;
      }
      
      console.log(`Processing DM from ${message.author.tag}: ${message.content}`);
      
      // Show typing indicator
      message.channel.sendTyping();
      
      try {
        const response = await generateResponse(message.content);
        await message.reply(response);
        console.log(`Successfully replied to DM from ${message.author.tag}`);
      } catch (error) {
        console.error('Error processing DM:', error);
        await message.reply('Sorry, I could not process your request. Please try again later.');
      }
    }
  };
};

export default createMessageHandler; 