/**
 * Centralized inference module for LLM and RAG functionality
 */

import { callLLM, models, createEmbedding } from './utils/llm.js';
import { getRAG, NAMESPACES } from './utils/rag/retrieval.js';
import { retryWithBackoff } from './utils/retryUtils.js';

// Base system prompt without context (context will be added dynamically)
const BASE_SYSTEM_PROMPT = `You are a helpful assistant for the Network School (NS) community. 

Your goal is to provide accurate and concise answers to questions, making use of the provided context (if relevant). Under each context chunk, its respective source URL is provided.

If you used the context in your answer, include a "Sources:" section that lists only the URLs of sources you actually referenced in your answer. If a source wasn't used in your answer, don't include it. The URLs should be provided in plain text, NOT as markdown links.

If the context doesn't contain relevant information, acknowledge this and provide general information.`;

/**
 * Wrap URLs in a text with angle brackets to prevent unfurling
 * @param {string} text - The text containing URLs
 * @returns {string} - Text with URLs wrapped in angle brackets
 */
const wrapUrlsInAngleBrackets = (text) => {
  // This regex matches URLs that aren't already wrapped in angle brackets
  const urlRegex = /(?<!<)(https?:\/\/[^\s>]+)(?!>)/g;
  return text.replace(urlRegex, '<$1>');
};

/**
 * Generate a response using RAG and LLM
 * @param {string} query - The user's query
 * @param {Object} options - Additional options
 * @param {string} options.model - The model to use (defaults to gemini-2.0-flash)
 * @param {Array<string>} options.namespaces - Namespaces to search in
 * @param {number} options.limit - Maximum number of results per namespace
 * @param {string} options.systemPrompt - Custom system prompt (uses default if not provided)
 * @returns {Promise<string>} - The LLM's response
 */
export async function generateResponse(query, options = {}) {
  try {
    const defaultModel = models['gemini-2.0-flash'];
    const model = options.model || defaultModel;
    const namespaces = options.namespaces || [NAMESPACES.BOOK, NAMESPACES.DISCORD, NAMESPACES.LUMA, NAMESPACES.WIKI];
    const limit = options.limit || 5;
    const systemPrompt = options.systemPrompt || BASE_SYSTEM_PROMPT;

    // Retrieve relevant context for the query from specified namespaces
    const { context } = await getRAG({ 
      query,
      namespaces,
      limit
    });
    
    // Create the full system prompt with context
    const fullSystemPrompt = `${systemPrompt}

Here is the context information:
${context}`;

    // Call the LLM with retries
    const result = await retryWithBackoff(
      async () => callLLM({
        model,
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
    console.error('Error generating response:', error);
    throw new Error('Failed to generate response');
  }
} 