// scripts/uploadDocuments.js
// Utility script to upload documents to Supabase

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createEmbedding } from '../utils/llm.js';
import { insertDocument } from '../utils/ragService.js';
import dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default namespace for Network School documents
const DEFAULT_NAMESPACE = 'network_school';

/**
 * Process a text file and upload its content to Supabase
 * 
 * @param {string} filePath - Path to the text file
 * @param {string} namespace - Namespace for the document
 * @returns {Promise<boolean>} - Success status
 */
const processTextFile = async (filePath, namespace = DEFAULT_NAMESPACE) => {
  try {
    console.log(`Processing file: ${filePath}`);
    
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Create embedding for the content
    const vector = await createEmbedding({ text: content });
    
    if (!vector) {
      console.error(`Failed to create embedding for file: ${filePath}`);
      return false;
    }
    
    // Insert document into Supabase
    const success = await insertDocument({
      vector,
      content,
      url: path.basename(filePath),
      namespace
    });
    
    if (success) {
      console.log(`Successfully uploaded: ${filePath}`);
    } else {
      console.error(`Failed to upload: ${filePath}`);
    }
    
    return success;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return false;
  }
};

/**
 * Process a directory of text files and upload them to Supabase
 * 
 * @param {string} dirPath - Path to the directory
 * @param {string} namespace - Namespace for the documents
 * @returns {Promise<{total: number, success: number}>} - Upload statistics
 */
const processDirectory = async (dirPath, namespace = DEFAULT_NAMESPACE) => {
  try {
    console.log(`Processing directory: ${dirPath}`);
    
    // Check if directory exists
    if (!fs.existsSync(dirPath)) {
      console.error(`Directory not found: ${dirPath}`);
      return { total: 0, success: 0 };
    }
    
    // Get all files in the directory
    const files = fs.readdirSync(dirPath);
    const textFiles = files.filter(file => file.endsWith('.txt') || file.endsWith('.md'));
    
    console.log(`Found ${textFiles.length} text files in ${dirPath}`);
    
    let successCount = 0;
    
    // Process each text file
    for (const file of textFiles) {
      const filePath = path.join(dirPath, file);
      const success = await processTextFile(filePath, namespace);
      if (success) successCount++;
    }
    
    return { total: textFiles.length, success: successCount };
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error);
    return { total: 0, success: 0 };
  }
};

// Main function
const main = async () => {
  try {
    // Get data directory path
    const dataDir = path.join(__dirname, '..', 'data');
    
    // Process all files in the data directory
    const result = await processDirectory(dataDir);
    
    console.log(`Upload complete. Successfully uploaded ${result.success} of ${result.total} files.`);
  } catch (error) {
    console.error('Error in main function:', error);
  }
};

// Run the script
main().catch(console.error); 