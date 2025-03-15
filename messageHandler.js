// messageHandler.js
// Handles processing and responding to user messages

import { callLLM, models } from './utils/llm.js';
import { chunkMessage } from './utils/messageUtils.js';
import { getRAG, NAMESPACES } from './utils/rag/index.js';

/**
 * Wraps URLs in a text with angle brackets to prevent Discord from unfurling them
 * @param {string} text - The text containing URLs
 * @returns {string} - Text with URLs wrapped in angle brackets
 */
const wrapUrlsInAngleBrackets = (text) => {
  // This regex matches URLs that aren't already wrapped in angle brackets
  const urlRegex = /(?<!<)(https?:\/\/[^\s>]+)(?!>)/g;
  return text.replace(urlRegex, '<$1>');
};

// Create message handler with all necessary functionality
const createMessageHandler = () => {
  // Base system prompt without context (context will be added dynamically)
  const BASE_SYSTEM_PROMPT = `You are a helpful assistant for the Network School (NS) community. 

Your goal is to provide accurate and concise answers based on the provided context. Under each context chunk, its respective source URL is provided.

At the end of your response, include a "Sources:" section that lists only the URLs of sources you actually referenced in your answer. If a source wasn't used in your answer, don't include it. The URLs should be provided in plain text, NOT as markdown links.

If the context doesn't contain relevant information, acknowledge this and provide general information.`;

  // LLM functionality with dynamic context retrieval
  const generateResponse = async (query) => {
    try {
      // Retrieve relevant context for the query from all 4 namespaces
      const { context } = await getRAG({ 
        query,
        namespaces: [NAMESPACES.BOOK, NAMESPACES.DISCORD, NAMESPACES.LUMA, NAMESPACES.WIKI],
        limit: 5 // Fetch 5 chunks from each namespace
      });
      
      // Create the full system prompt with context
      const fullSystemPrompt = `${BASE_SYSTEM_PROMPT}

Here is the context information:
${context}`;

      // Call the LLM with the query and context
      const result = await callLLM({
        model: models['gemini-2.0-flash'], // Use Gemini model
        messages: [
          {
            role: "system",
            content: fullSystemPrompt
          },
          {
            role: "user",
            content: query
          }
        ],
      });
  
      // Wrap URLs in the response with angle brackets, to prevent Discord from unfurling them
      return wrapUrlsInAngleBrackets(result.message);
    } catch (error) {
      console.error('Error calling LLM API:', error.message);
      throw new Error('Failed to generate response');
    }
  };

  // Safely send a message using multiple fallback methods
  const safeSendMessage = async (message, content) => {
    let sentSuccessfully = false;
    let error = null;
    
    // Method 1: Try channel.send
    if (!sentSuccessfully && message.channel && typeof message.channel.send === 'function') {
      try {
        await message.channel.send(content);
        sentSuccessfully = true;
      } catch (err) {
        error = err;
      }
    }
    
    // Method 2: Try reply
    if (!sentSuccessfully && typeof message.reply === 'function') {
      try {
        await message.reply(content);
        sentSuccessfully = true;
      } catch (err) {
        error = err;
      }
    }
    
    // Method 3: Try createDM
    if (!sentSuccessfully && message.author && typeof message.author.createDM === 'function') {
      try {
        const dmChannel = await message.author.createDM();
        await dmChannel.send(content);
        sentSuccessfully = true;
      } catch (err) {
        error = err;
      }
    }
    
    if (sentSuccessfully) {
      return true;
    } else {
      if (error) throw error;
      throw new Error('Failed to send message via any method');
    }
  };

  // Process a query and send the response
  const processQuery = async (message, query) => {
    try {
      // Show typing indicator if available
      if (message.channel && typeof message.channel.sendTyping === 'function') {
        try {
          await message.channel.sendTyping();
        } catch (err) {
          // Continue even if typing indicator fails
        }
      }
      
      // Generate response
      const response = await generateResponse(query);
      
      // Split the response into chunks if it's too long
      const chunks = chunkMessage(response);
      
      // Send the first chunk
      const firstChunkSent = await safeSendMessage(message, chunks[0]);
      
      // Send any additional chunks
      if (firstChunkSent && chunks.length > 1) {
        for (let i = 1; i < chunks.length; i++) {
          try {
            await safeSendMessage(message, chunks[i]);
          } catch (err) {
            console.error(`Error sending chunk ${i+1}:`, err.message);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error processing query:', error);
      try {
        await safeSendMessage(message, 'Sorry, I could not process your request. Please try again later.');
      } catch (sendError) {
        console.error('Failed to send error message:', sendError.message);
      }
      return false;
    }
  };

  return {
    // Handle message with mentions
    handleMention: async (message, botId) => {
      try {
        // Check if the message mentions the bot
        const isMentioned = message.mentions && message.mentions.users && message.mentions.users.has(botId);
        
        if (!isMentioned) {
          return; // Not mentioned, ignore the message
        }
        
        // Extract the query by removing the mention
        // This regex removes all mentions from the message
        const query = message.content.replace(/<@!?(\d+)>/g, '').trim();
        
        if (!query) {
          await safeSendMessage(message, "Hello! Please ask me a question about Network School.");
          return;
        }
        
        await processQuery(message, query);
      } catch (error) {
        console.error('Error in handleMention:', error);
      }
    },

    // Handle direct messages
    handleDirectMessage: async (message) => {
      try {
        const query = message.content.trim();
        
        if (!query) {
          try {
            await safeSendMessage(message, "Hello! Please ask me a question about Network School.");
          } catch (err) {
            console.error('Failed to send greeting:', err.message);
          }
          return;
        }
        
        await processQuery(message, query);
      } catch (error) {
        console.error('Error in handleDirectMessage:', error);
      }
    }
  };
};

export default createMessageHandler; 