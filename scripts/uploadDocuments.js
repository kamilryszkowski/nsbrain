// scripts/uploadDocuments.js
// Script to upload documents to the vector store

import { fileURLToPath } from 'url';
import path from 'path';

// Import data source ingestion functions
import ingestDiscordData from '../data/discord/ingest.js';
import ingestLumaData from '../data/luma/ingest.js';
import ingestWikiData from '../data/wiki/ingest.js';
import ingestBookData from '../data/book/ingest.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Process all data sources using their specific ingestion functions
 */
const processAllDataSources = async () => {
  console.log('Starting ingestion of all data sources...');
  
  // Array to store results
  const results = [];
  
  // Process Discord data
  console.log('\n=== PROCESSING DISCORD DATA ===');
  const discordResult = await ingestDiscordData();
  results.push(discordResult);
  
  // Process Luma events data
  console.log('\n=== PROCESSING LUMA EVENTS DATA ===');
  const lumaResult = await ingestLumaData();
  results.push(lumaResult);
  
  // Process Wiki data
  console.log('\n=== PROCESSING WIKI DATA ===');
  const wikiResult = await ingestWikiData();
  results.push(wikiResult);
  
  // Process Network School book data
  console.log('\n=== PROCESSING NETWORK SCHOOL BOOK DATA ===');
  const bookResult = await ingestBookData();
  results.push(bookResult);
  
  return results;
};

/**
 * Main function to process all data sources
 */
const main = async () => {
  // Process all data sources using their specific ingestion functions
  const results = await processAllDataSources();
  
  // Print summary
  const successful = results.filter(r => r.success).length;
  const totalChunks = results.reduce((sum, r) => sum + (r.totalChunks || 0), 0);
  const successfulChunks = results.reduce((sum, r) => sum + (r.successfulChunks || 0), 0);
  
  console.log('\nSummary:');
  console.log(`Data sources processed: ${successful}/${results.length}`);
  console.log(`Chunks processed: ${successfulChunks}/${totalChunks}`);
  
  // List any failed sources
  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    console.log('\nFailed data sources:');
    failed.forEach(f => console.log(`- ${f.source}: ${f.error || 'Unknown error'}`));
  }
};

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 