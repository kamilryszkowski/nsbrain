/**
 * LLM-based evaluation logic for grading responses
 */

// Import LLM utility from our wrapper
import { generateResponse } from '../infer.js';
import { models } from '../utils/llm.js';

/**
 * Extract JSON from a string that might contain markdown formatting
 * @param {string} text - The text that might contain JSON in markdown format
 * @returns {string} - Extracted JSON string
 */
function extractJsonFromResponse(text) {
  // Try to extract JSON from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }
  
  // If no code blocks, find anything that looks like JSON (starts with { and ends with })
  const jsonMatch = text.match(/{[\s\S]*}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  
  // Return the original text if no JSON-like content found
  return text;
}

/**
 * Grade a response using an LLM evaluator
 * @param {string} question - The original question
 * @param {string} answer - The LLM's answer to evaluate
 * @returns {Promise<Object>} - Evaluation results including scores and feedback
 */
async function evaluateResponse(question, answer) {
  const evaluationPrompt = `
You are an expert evaluator of LLM responses about the Network State project.
You'll be given a question and an answer provided by an LLM system.

Please evaluate the answer based on the following criteria:
1. Accuracy (1-5): Did the AI provide a direct answer to the question? Score 5 if the answer directly addresses the question with specific information, and 1 if it completely fails to provide anything useful.
2. Quality (1-5): How well-formatted, clear, and well-structured is the answer? This is about presentation, organization, and readability, not content. Score 5 for excellent formatting and structure, and 1 for poor formatting.

For each criterion, provide:
- A score from 1-5 (where 1 is poor and 5 is excellent)
- A brief explanation of why you gave this score

Finally, calculate an overall score as the average of the two scores, rounded to one decimal place.

QUESTION: ${question}
ANSWER: ${answer}

Format your response as a JSON object with the following structure:
{
  "accuracy": { "score": number, "reason": "string" },
  "quality": { "score": number, "reason": "string" },
  "overall": number,
  "feedback": "string"
}

Return ONLY the JSON object without any additional text, explanation, or markdown formatting.
`;

  try {
    // Call the LLM with the evaluation prompt
    const evaluationResponse = await generateResponse(evaluationPrompt);
    
    console.log("Raw evaluation response:", evaluationResponse.substring(0, 100) + "...");
    
    // Extract JSON from the response
    const jsonStr = extractJsonFromResponse(evaluationResponse);
    console.log("Extracted JSON:", jsonStr.substring(0, 100) + "...");
    
    // Parse the JSON response
    let evaluation;
    try {
      evaluation = JSON.parse(jsonStr);
      
      // Validate the JSON structure
      if (!evaluation.accuracy || !evaluation.quality || !evaluation.overall) {
        throw new Error('Invalid evaluation structure');
      }
    } catch (error) {
      console.error('Failed to parse LLM evaluation response:', error);
      console.error('Response was:', evaluationResponse);
      
      // Fallback evaluation if parsing fails
      evaluation = {
        accuracy: { score: 0, reason: 'Failed to parse evaluator response' },
        quality: { score: 0, reason: 'Failed to parse evaluator response' },
        overall: 0,
        feedback: 'Evaluation failed due to parsing error'
      };
    }
    
    return evaluation;
  } catch (error) {
    console.error('Error during evaluation:', error);
    throw error;
  }
}

export { evaluateResponse }; 