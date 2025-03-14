// data/book/ingest.js
// Network School book data ingestion logic

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processCSVDocument, deleteAllDocumentsInNamespace } from '../../utils/rag/index.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the namespace for Network School book data
export const BOOK_NAMESPACE = 'book';

/**
 * Process Network School book data from CSV file
 * CSV format: url,content
 * 
 * @returns {Promise<Object>} - Processing results
 */
export const ingestBookData = async () => {
  try {
    console.log('Starting Network School book data ingestion...');
    
    // Path to the CSV file
    const csvFilePath = path.join(__dirname, 'data.csv');
    
    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      console.error(`Network School book data file not found: ${csvFilePath}`);
      return {
        success: false,
        error: 'Data file not found',
        source: 'book'
      };
    }
    
    // Delete existing documents under this namespace
    console.log(`Clearing existing Network School book documents from database...`);
    await deleteAllDocumentsInNamespace(BOOK_NAMESPACE);
    
    // Read file content
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    
    // Process the CSV content
    const result = await processCSVDocument({
      csvContent,
      source: 'Network School Book',
      namespace: BOOK_NAMESPACE
    });
    
    console.log(`Network School book data ingestion complete: ${result.successfulChunks}/${result.totalChunks} chunks successful`);
    
    return {
      ...result,
      source: 'book'
    };
  } catch (error) {
    console.error('Error ingesting Network School book data:', error);
    return {
      success: false,
      error: error.message,
      source: 'book'
    };
  }
};

export default ingestBookData; 