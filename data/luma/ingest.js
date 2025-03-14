// data/luma/ingest.js
// Luma events data ingestion logic

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processCSVDocument, deleteAllDocumentsInNamespace } from '../../utils/rag/index.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the namespace for Luma events data
export const LUMA_NAMESPACE = 'luma_events';

/**
 * Process Luma events data from CSV file
 * 
 * @returns {Promise<Object>} - Processing results
 */
export const ingestLumaData = async () => {
  try {
    console.log('Starting Luma events data ingestion...');
    
    // Path to the CSV file
    const csvFilePath = path.join(__dirname, 'data.csv');
    
    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      console.error(`Luma events data file not found: ${csvFilePath}`);
      return {
        success: false,
        error: 'Data file not found',
        source: 'luma'
      };
    }
    
    // Delete existing documents under this namespace
    console.log(`Clearing existing Luma events documents from database...`);
    await deleteAllDocumentsInNamespace(LUMA_NAMESPACE);
    
    // Read file content
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    
    // Process the CSV content
    const result = await processCSVDocument({
      csvContent,
      source: 'Luma Events',
      namespace: LUMA_NAMESPACE
    });
    
    console.log(`Luma events data ingestion complete: ${result.successfulChunks}/${result.totalChunks} chunks successful`);
    
    return {
      ...result,
      source: 'luma'
    };
  } catch (error) {
    console.error('Error ingesting Luma events data:', error);
    return {
      success: false,
      error: error.message,
      source: 'luma'
    };
  }
};

export default ingestLumaData; 