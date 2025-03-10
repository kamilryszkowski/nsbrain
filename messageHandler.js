// messageHandler.js
// Handles processing and responding to user messages

import { callLLM, models } from './utils/llm.js';
import { loadWikiContent } from './utils/wikiLoader.js';
import { chunkMessage } from './utils/messageUtils.js';

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
        model: models['gemini-2.0-flash'],
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
          
          // Split the response into chunks if it's too long
          const chunks = chunkMessage(response);
          
          // Send the first chunk as the initial reply
          await interaction.editReply({
            content: chunks[0],
            ephemeral: false
          });
          
          // Send any additional chunks as follow-up messages
          for (let i = 1; i < chunks.length; i++) {
            await interaction.followUp({
              content: chunks[i],
              ephemeral: false
            });
          }
        } catch (error) {
          await interaction.editReply({
            content: 'Sorry, I could not process your request. Please try again later.',
            ephemeral: false
          });
        }
      }
    }
  };
};

export default createMessageHandler; 