// data/wiki/ingest.js
// Wiki data ingestion logic

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ingestDocument, deleteAllDocumentsInNamespace } from '../../utils/rag/index.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the namespace for Wiki data
export const WIKI_NAMESPACE = 'wiki';

/**
 * Process Wiki data from CSV file
 * CSV format: url,content
 * 
 * @returns {Promise<Object>} - Processing results
 */
export const ingestWikiData = async () => {
  try {
    console.log('Starting Wiki data ingestion...');
    
    // Path to the CSV file
    const csvFilePath = path.join(__dirname, 'data.csv');
    
    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      console.error(`Wiki data file not found: ${csvFilePath}`);
      return {
        success: false,
        error: 'Data file not found',
        source: 'wiki'
      };
    }
    
    // Delete existing documents under this namespace
    console.log(`Clearing existing Wiki documents from database...`);
    await deleteAllDocumentsInNamespace(WIKI_NAMESPACE);
    
    // Read file content
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    
    // Process the CSV content
    const result = await ingestDocument({
      csvContent,
      source: 'wiki',
      namespace: WIKI_NAMESPACE
    });
    
    console.log(`Wiki data ingestion complete: ${result.successfulChunks}/${result.totalChunks} chunks successful`);
    
    return result;
  } catch (error) {
    console.error('Error ingesting Wiki data:', error);
    return {
      success: false,
      error: error.message,
      source: 'wiki'
    };
  }
};

export default ingestWikiData; 