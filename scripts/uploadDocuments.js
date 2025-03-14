// scripts/uploadDocuments.js
// Script to upload documents to the vector store

// Import data source ingestion functions
import ingestDiscordData from '../data/discord/ingest.js';
import ingestLumaData from '../data/luma/ingest.js';
import ingestWikiData from '../data/wiki/ingest.js';
import ingestBookData from '../data/book/ingest.js';

// Data source definitions
const DATA_SOURCES = {
  discord: { name: 'Discord', ingestFn: ingestDiscordData },
  luma: { name: 'Luma Events', ingestFn: ingestLumaData },
  wiki: { name: 'Wiki', ingestFn: ingestWikiData },
  book: { name: 'Network School Book', ingestFn: ingestBookData }
};

/**
 * Process a single data source with error handling
 * 
 * @param {string} name - Name of the data source
 * @param {Function} ingestFunction - The ingestion function to call
 * @returns {Promise<Object>} - Processing result
 */
const processDataSource = async (name, ingestFunction) => {
  console.log(`\n=== PROCESSING ${name.toUpperCase()} DATA ===`);
  
  try {
    const result = await ingestFunction();
    console.log(`${name} processing complete.`);
    return result;
  } catch (error) {
    console.error(`Error processing ${name} data:`, error);
    return {
      success: false,
      error: error.message,
      source: name.toLowerCase(),
      totalChunks: 0,
      successfulChunks: 0,
      failedChunks: 0
    };
  }
};

/**
 * Process all data sources using their specific ingestion functions
 * 
 * @param {string} [singleSource] - Optional single source to process
 * @returns {Promise<Array>} - Array of processing results
 */
const processAllDataSources = async (singleSource = null) => {
  if (singleSource) {
    const source = DATA_SOURCES[singleSource];
    if (!source) {
      console.error(`Unknown data source: ${singleSource}`);
      console.log(`Available sources: ${Object.keys(DATA_SOURCES).join(', ')}`);
      return [];
    }
    
    console.log(`Starting ingestion of ${source.name} data...`);
    const result = await processDataSource(source.name, source.ingestFn);
    return [result];
  }
  
  console.log('Starting ingestion of all data sources...');
  
  // Array to store results
  const results = [];
  
  // Process all data sources
  for (const [key, source] of Object.entries(DATA_SOURCES)) {
    const result = await processDataSource(source.name, source.ingestFn);
    results.push(result);
  }
  
  return results;
};

/**
 * Main function to process data sources
 */
const main = async () => {
  console.log('=== DOCUMENT UPLOAD STARTED ===');
  console.log('Time:', new Date().toLocaleString());
  
  try {
    // Check if a specific source was requested
    const args = process.argv.slice(2);
    const singleSource = args[0];
    
    // Process data sources
    const results = await processAllDataSources(singleSource);
    
    if (results.length === 0) {
      console.log('\n=== DOCUMENT UPLOAD ABORTED ===');
      console.log('Time:', new Date().toLocaleString());
      return false;
    }
    
    // Print summary
    const successful = results.filter(r => r.success).length;
    const totalChunks = results.reduce((sum, r) => sum + (r.totalChunks || 0), 0);
    const successfulChunks = results.reduce((sum, r) => sum + (r.successfulChunks || 0), 0);
    
    console.log('\n=== SUMMARY ===');
    console.log(`Data sources processed: ${successful}/${results.length}`);
    console.log(`Chunks processed: ${successfulChunks}/${totalChunks}`);
    
    // List any failed sources
    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      console.log('\nFailed data sources:');
      failed.forEach(f => console.log(`- ${f.source}: ${f.error || 'Unknown error'}`));
    }
    
    console.log('\n=== DOCUMENT UPLOAD COMPLETED ===');
    console.log('Time:', new Date().toLocaleString());
    
    // Return success status
    return successful === results.length;
  } catch (error) {
    console.error('\n=== DOCUMENT UPLOAD FAILED ===');
    console.error('Unhandled error:', error);
    console.log('Time:', new Date().toLocaleString());
    return false;
  }
};

// Run the main function
main().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 