// data/discord/ingest.js
// Discord data ingestion logic

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ingestDocument, deleteAllDocumentsInNamespace } from '../../utils/rag/index.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the namespace for Discord data
export const DISCORD_NAMESPACE = 'discord';

/**
 * Process Discord data from CSV file
 * CSV format: url,content
 * 
 * @returns {Promise<Object>} - Processing results
 */
export const ingestDiscordData = async () => {
  try {
    console.log('Starting Discord data ingestion...');
    
    // Path to the CSV file
    const csvFilePath = path.join(__dirname, 'data.csv');
    
    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      console.error(`Discord data file not found: ${csvFilePath}`);
      return {
        success: false,
        error: 'Data file not found',
        source: 'discord'
      };
    }
    
    // Delete existing documents under this namespace
    console.log(`Clearing existing Discord documents from database...`);
    await deleteAllDocumentsInNamespace(DISCORD_NAMESPACE);
    
    // Read file content
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    
    // Process the CSV content
    const result = await ingestDocument({
      csvContent,
      source: 'discord',
      namespace: DISCORD_NAMESPACE
    });
    
    console.log(`Discord data ingestion complete: ${result.successfulChunks}/${result.totalChunks} chunks successful`);
    
    return result;
  } catch (error) {
    console.error('Error ingesting Discord data:', error);
    return {
      success: false,
      error: error.message,
      source: 'discord'
    };
  }
};

export default ingestDiscordData; 