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
    // Handle message with mentions
    handleMention: async (message, botId) => {
      // Check if the message mentions the bot
      const isMentioned = message.mentions.users.has(botId);
      
      if (!isMentioned) {
        return; // Not mentioned, ignore the message
      }
      
      console.log(`Bot was mentioned by ${message.author.tag}: ${message.content}`);
      
      // Extract the query by removing the mention
      // This regex removes all mentions from the message
      const query = message.content.replace(/<@!?(\d+)>/g, '').trim();
      
      if (!query) {
        await message.reply("Hello! Please ask me a question about Network School.");
        return;
      }
      
      // Show typing indicator
      await message.channel.sendTyping();
      
      try {
        const response = await generateResponse(query);
        
        // Split the response into chunks if it's too long
        const chunks = chunkMessage(response);
        
        // Send the first chunk as a reply to the original message
        await message.reply(chunks[0]);
        
        // Send any additional chunks as follow-up messages
        for (let i = 1; i < chunks.length; i++) {
          await message.channel.send(chunks[i]);
        }
      } catch (error) {
        console.error('Error generating response:', error);
        await message.reply('Sorry, I could not process your request. Please try again later.');
      }
    }
  };
};

export default createMessageHandler; 