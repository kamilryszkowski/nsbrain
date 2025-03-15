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

/**
 * Format a message for logging
 * @param {Object} message - Discord message object
 * @returns {string} - Formatted message info
 */
const formatMessageInfo = (message) => {
  const timestamp = new Date().toISOString();
  const sender = message.author?.tag || 'Unknown User';
  const channelInfo = message.channel?.name 
    ? `#${message.channel.name}` 
    : message.channel?.type === 'DM' 
      ? 'DM' 
      : 'Unknown Channel';
  const guildInfo = message.guild?.name || 'DM';
  
  return `[${timestamp}] ${guildInfo} | ${channelInfo} | ${sender}`;
};

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} - Result of the function
 */
const retryWithBackoff = async (fn, { maxRetries = 3, initialDelay = 1000, maxDelay = 10000 } = {}) => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries - 1) break;
      
      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Create message handler with all necessary functionality
const createMessageHandler = () => {
  // Base system prompt without context (context will be added dynamically)
  const BASE_SYSTEM_PROMPT = `You are a helpful assistant for the Network School (NS) community. 

Your goal is to provide accurate and concise answers based on the provided context, and if it's a general question, your general knowledge. Under each context chunk, its respective source URL is provided.

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

      // Call the LLM with retries
      const result = await retryWithBackoff(
        async () => callLLM({
          model: models['gemini-2.0-flash'],
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
        }),
        { maxRetries: 3, initialDelay: 1000 }
      );
  
      // Only wrap URLs in the Sources section
      const parts = result.message.split('Sources:');
      if (parts.length === 2) {
        // Wrap URLs in angle brackets only in the sources section
        const mainContent = parts[0];
        const sourcesSection = wrapUrlsInAngleBrackets(parts[1]);
        return `${mainContent}Sources:${sourcesSection}`;
      }
      
      // If no Sources section found, return as is
      return result.message;
    } catch (error) {
      console.error('Error calling LLM API:', error);
      throw new Error('Failed to generate response');
    }
  };

  // Safely send a message using multiple fallback methods
  const safeSendMessage = async (message, content) => {
    return retryWithBackoff(async () => {
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
        // Log the sent message
        console.log(`${formatMessageInfo(message)} | Response sent: ${content.slice(0, 100)}${content.length > 100 ? '...' : ''}`);
        return true;
      } else {
        if (error) throw error;
        throw new Error('Failed to send message via any method');
      }
    }, { maxRetries: 3, initialDelay: 1000 });
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
      
      // Generate response with retries
      const response = await retryWithBackoff(
        () => generateResponse(query),
        { maxRetries: 3, initialDelay: 1000 }
      );
      
      // Split the response into chunks if it's too long
      const chunks = chunkMessage(response);
      
      // Send the first chunk with retries
      const firstChunkSent = await safeSendMessage(message, chunks[0]);
      
      // Send any additional chunks with retries
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
        
        // Log the received mention
        console.log(`${formatMessageInfo(message)} | Mention received: ${query}`);
        
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
        
        // Log the received DM
        console.log(`${formatMessageInfo(message)} | DM received: ${query}`);
        
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