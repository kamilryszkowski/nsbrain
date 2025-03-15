/**
 * Test script for running a small evaluation
 */

// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

import { generateResponse } from '../infer.js';
import { evaluateResponse } from './evaluator.js';

// Test with just a few questions
const testQuestions = [
  "Who handles IT support for NS facilities?",
  "What events are scheduled at Network School this week?"
];

async function runTest() {
  console.log('Starting test evaluation...');
  
  for (const question of testQuestions) {
    console.log(`\nTesting: ${question}`);
    
    try {
      // Get LLM response
      console.log('Fetching LLM response...');
      const answer = await generateResponse(question);
      
      console.log('\nAnswer:');
      console.log(answer);
      
      // Evaluate the response
      console.log('\nEvaluating response...');
      const evaluation = await evaluateResponse(question, answer);
      
      console.log('\nEvaluation:');
      console.log(`Overall score: ${evaluation.overall}/5`);
      console.log(`Accuracy: ${evaluation.accuracy.score}/5 - ${evaluation.accuracy.reason}`);
      console.log(`Quality: ${evaluation.quality.score}/5 - ${evaluation.quality.reason}`);
      console.log(`Feedback: ${evaluation.feedback}`);
    } catch (error) {
      console.error(`Error processing question "${question}":`, error);
    }
  }
  
  console.log('\nTest completed');
}

// Run the test
runTest().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 