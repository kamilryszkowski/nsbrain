/**
 * Main evaluation script for the LLM pipeline
 */

// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

// Import dependencies
import { getFlattenedQuestions } from './questions.js';
import { evaluateResponse } from './evaluator.js';
import { saveResults, calculateStats } from './utils.js';

// Import LLM utility from our wrapper
import { getLLMResponse } from './llm-wrapper.js';

/**
 * Run the evaluation on the entire question set
 * @param {boolean} verbose - Whether to log detailed information
 * @returns {Promise<Object>} - Evaluation results
 */
async function runEvaluation(verbose = true) {
  console.log('Starting LLM pipeline evaluation...');
  
  const startTime = Date.now();
  const questions = getFlattenedQuestions();
  const results = [];
  
  console.log(`Running evaluation on ${questions.length} questions across ${new Set(questions.map(q => q.category)).size} categories`);
  
  // Loop through each question
  for (let i = 0; i < questions.length; i++) {
    const { category, question } = questions[i];
    
    if (verbose) {
      console.log(`\n[${i + 1}/${questions.length}] Testing: ${question}`);
      console.log(`Category: ${category}`);
    }
    
    try {
      // Get LLM response to the question
      console.log('Fetching LLM response...');
      const answer = await getLLMResponse(question);
      
      if (verbose) {
        console.log('\nAnswer:');
        console.log(answer);
      }
      
      // Evaluate the response
      console.log('Evaluating response...');
      const evaluation = await evaluateResponse(question, answer);
      
      if (verbose) {
        console.log('\nEvaluation:');
        console.log(`Overall score: ${evaluation.overall}/5`);
        console.log(`Accuracy: ${evaluation.accuracy.score}/5`);
        console.log(`Relevance: ${evaluation.relevance.score}/5`);
        console.log(`Quality: ${evaluation.quality.score}/5`);
      }
      
      // Store result
      results.push({
        category,
        question,
        answer,
        evaluation,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`Error processing question "${question}":`, error);
      
      // Add failed entry to results
      results.push({
        category,
        question,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Calculate statistics
  const stats = calculateStats(results);
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Log summary
  console.log('\n===== EVALUATION SUMMARY =====');
  console.log(`Total questions: ${questions.length}`);
  console.log(`Successful evaluations: ${stats.successfulEvaluations}/${stats.totalEvaluations} (${Math.round(stats.successRate * 100)}%)`);
  
  if (stats.successfulEvaluations > 0) {
    console.log(`Average overall score: ${stats.average}/5`);
    
    console.log('\nCategory averages:');
    Object.entries(stats.categoryAverages).forEach(([category, score]) => {
      console.log(`- ${category}: ${score}/5`);
    });
    
    console.log('\nCriteria averages:');
    console.log(`- Accuracy: ${stats.criteriaAverages.accuracy}/5`);
    console.log(`- Relevance: ${stats.criteriaAverages.relevance}/5`);
    console.log(`- Quality: ${stats.criteriaAverages.quality}/5`);
  } else {
    console.log('\nNo successful evaluations to calculate averages.');
  }
  
  console.log(`\nEvaluation completed in ${totalTime} seconds`);
  
  // Save results with a more detailed timestamp
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const evalName = `eval-${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  
  const resultObject = {
    metadata: {
      timestamp: now.toISOString(),
      totalQuestions: questions.length,
      successfulEvaluations: stats.successfulEvaluations,
      successRate: stats.successRate,
      executionTimeSeconds: parseFloat(totalTime)
    },
    statistics: stats,
    results
  };
  
  const savedPath = await saveResults(resultObject, evalName);
  console.log(`Results saved to: ${savedPath}`);
  
  return resultObject;
}

// Allow running directly or importing as a module
if (import.meta.url === `file://${process.argv[1]}`) {
  runEvaluation().catch(error => {
    console.error('Evaluation failed:', error);
    process.exit(1);
  });
}

export { runEvaluation }; 