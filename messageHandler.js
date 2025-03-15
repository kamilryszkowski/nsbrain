// messageHandler.js
// Handles processing and responding to user messages

import { callLLM, models } from './utils/llm.js';
import { chunkMessage } from './utils/messageUtils.js';
import { generateResponse } from './infer.js';
import { retryWithBackoff } from './utils/retryUtils.js';

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

// Create message handler with all necessary functionality
const createMessageHandler = () => {
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
        // Check if this is a reply to the bot's message
        const isReplyToBot = message.reference?.messageId && 
          message.channel.messages?.cache?.get(message.reference.messageId)?.author?.id === botId;

        // Check if the message has a proper @ mention of the bot
        const hasProperMention = message.mentions?.users?.has(botId);
        
        // Only proceed if it's either a reply to bot's message or has a proper @ mention
        if (!isReplyToBot && !hasProperMention) {
          return; // Not a proper mention or reply, ignore the message
        }
        
        // Extract the query by removing the mention
        // This regex removes all mentions from the message
        const query = message.content.replace(/<@!?(\d+)>/g, '').trim();
        
        // Log the received mention or reply
        const interactionType = isReplyToBot ? 'Reply' : 'Mention';
        console.log(`${formatMessageInfo(message)} | ${interactionType} received: ${query}`);
        
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