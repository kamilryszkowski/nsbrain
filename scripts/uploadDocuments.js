// scripts/uploadDocuments.js
// Script to upload documents to the vector store

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processDocument, processCSVDocument } from '../utils/rag/index.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Process a file and upload its contents to the vector store
 * 
 * @param {string} filePath - Path to the file
 * @returns {Promise<Object>} - Processing results
 */
const processFile = async (filePath) => {
  try {
    console.log(`Processing file: ${filePath}`);
    
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    const fileExtension = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    
    // Process based on file type
    if (fileExtension === '.csv') {
      return await processCSVFile(content, filePath);
    } else {
      // For text files, markdown, etc.
      return await processTextFile(content, filePath);
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return {
      success: false,
      error: error.message,
      file: filePath
    };
  }
};

/**
 * Process a text file (txt, md, etc.)
 * 
 * @param {string} content - File content
 * @param {string} filePath - Path to the file
 * @returns {Promise<Object>} - Processing results
 */
const processTextFile = async (content, filePath) => {
  const fileName = path.basename(filePath);
  
  const result = await processDocument({
    text: content,
    source: fileName,
    metadata: {
      fileName,
      filePath,
      fileType: path.extname(filePath).substring(1)
    }
  });
  
  console.log(`Processed text file ${fileName}: ${result.successfulChunks}/${result.totalChunks} chunks successful`);
  return {
    ...result,
    file: filePath
  };
};

/**
 * Process a CSV file
 * 
 * @param {string} content - CSV content
 * @param {string} filePath - Path to the file
 * @returns {Promise<Object>} - Processing results
 */
const processCSVFile = async (content, filePath) => {
  const fileName = path.basename(filePath);
  
  const result = await processCSVDocument({
    csvContent: content,
    source: fileName,
    metadata: {
      fileName,
      filePath,
      fileType: 'csv'
    }
  });
  
  console.log(`Processed CSV file ${fileName}: ${result.successfulChunks}/${result.totalChunks} chunks successful`);
  return {
    ...result,
    file: filePath
  };
};

/**
 * Main function to process all files in a directory
 */
const main = async () => {
  // Get directory from command line arguments or use default
  const docsDir = process.argv[2] || path.join(__dirname, '../data');
  
  if (!fs.existsSync(docsDir)) {
    console.error(`Directory does not exist: ${docsDir}`);
    process.exit(1);
  }
  
  console.log(`Processing documents in: ${docsDir}`);
  
  // Get all files in the directory
  const files = fs.readdirSync(docsDir)
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      // Support text files, markdown, and CSV
      return ['.txt', '.md', '.csv'].includes(ext);
    })
    .map(file => path.join(docsDir, file));
  
  if (files.length === 0) {
    console.log('No supported files found in the directory.');
    process.exit(0);
  }
  
  console.log(`Found ${files.length} files to process.`);
  
  // Process each file
  const results = [];
  for (const file of files) {
    const result = await processFile(file);
    results.push(result);
  }
  
  // Print summary
  const successful = results.filter(r => r.success).length;
  const totalChunks = results.reduce((sum, r) => sum + (r.totalChunks || 0), 0);
  const successfulChunks = results.reduce((sum, r) => sum + (r.successfulChunks || 0), 0);
  
  console.log('\nSummary:');
  console.log(`Files processed: ${successful}/${files.length}`);
  console.log(`Chunks processed: ${successfulChunks}/${totalChunks}`);
  
  // List any failed files
  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    console.log('\nFailed files:');
    failed.forEach(f => console.log(`- ${f.file}: ${f.error || 'Unknown error'}`));
  }
};

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 