/**
 * Wrapper for LLM functions to use in the evaluation system
 */

import { callLLM, models } from '../utils/llm.js';

/**
 * Get a response from the LLM for a given prompt
 * @param {string} prompt - The text prompt to send to the LLM
 * @param {Object} options - Additional options for the LLM
 * @param {string} options.model - The model to use (defaults to 'gpt-4o')
 * @returns {Promise<string>} - The LLM's response
 */
export async function getLLMResponse(prompt, options = {}) {
  const defaultModel = models['GPT-4o'] || 'gpt-4o';
  const model = options.model || defaultModel;
  
  const messages = [
    {
      role: 'system',
      content: 'You are an AI assistant for the Network State project. Answer questions accurately, clearly, and helpfully about Network State concepts, locations, events, and community.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];
  
  try {
    const response = await callLLM({
      model,
      messages
    });
    
    return response.message;
  } catch (error) {
    console.error('Error getting LLM response:', error);
    throw error;
  }
} 