/**
 * Utility functions for the evaluation system
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Save evaluation results to a JSON file
 * @param {Object} results - The evaluation results to save
 * @param {string} filename - The name of the file (without extension)
 * @returns {Promise<string>} - The path to the saved file
 */
async function saveResults(results, filename) {
  // Create results directory if it doesn't exist
  const resultsDir = path.join(__dirname, 'results');
  try {
    await fs.mkdir(resultsDir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }

  // If no filename provided, create one with timestamp
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const finalFilename = filename || `eval-results-${timestamp}`;
  const filePath = path.join(resultsDir, `${finalFilename}.json`);

  // Write results to file
  await fs.writeFile(filePath, JSON.stringify(results, null, 2));
  return filePath;
}

/**
 * Calculate statistics from evaluation results
 * @param {Array} evaluations - Array of evaluation results
 * @returns {Object} - Statistics about the evaluations
 */
function calculateStats(evaluations) {
  if (!evaluations.length) {
    return {
      average: 0,
      criteriaAverages: {
        accuracy: 0,
        relevance: 0,
        quality: 0
      }
    };
  }

  // Filter out items with errors
  const validEvaluations = evaluations.filter(item => !item.error && item.evaluation && item.evaluation.overall);
  
  if (validEvaluations.length === 0) {
    return {
      average: 0,
      successRate: 0,
      criteriaAverages: {
        accuracy: 0,
        relevance: 0,
        quality: 0
      }
    };
  }

  // Calculate overall average
  const sum = validEvaluations.reduce((acc, item) => acc + item.evaluation.overall, 0);
  const average = sum / validEvaluations.length;
  
  // Calculate success rate
  const successRate = validEvaluations.length / evaluations.length;

  // Calculate averages by criteria
  const criteria = { accuracy: 0, relevance: 0, quality: 0 };
  validEvaluations.forEach(item => {
    criteria.accuracy += item.evaluation.accuracy.score;
    criteria.relevance += item.evaluation.relevance.score;
    criteria.quality += item.evaluation.quality.score;
  });

  const criteriaAverages = {
    accuracy: criteria.accuracy / validEvaluations.length,
    relevance: criteria.relevance / validEvaluations.length,
    quality: criteria.quality / validEvaluations.length
  };

  return {
    average: parseFloat(average.toFixed(2)),
    successRate: parseFloat(successRate.toFixed(2)),
    totalEvaluations: evaluations.length,
    successfulEvaluations: validEvaluations.length,
    criteriaAverages: Object.entries(criteriaAverages).reduce((acc, [k, v]) => {
      acc[k] = parseFloat(v.toFixed(2));
      return acc;
    }, {})
  };
}

export { saveResults, calculateStats }; 