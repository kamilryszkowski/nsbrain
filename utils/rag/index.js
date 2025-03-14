// utils/rag/index.js
// Main RAG service that integrates all components

import { createEmbedding } from '../llm.js';
import { processCSVContent } from './csvParser.js';
import { insertDocuments, deleteAllDocumentsInNamespace } from './storage.js';
import { getRAG } from './retrieval.js';
import supabase, { DEFAULT_NAMESPACE } from './client.js';

// Constants
const BATCH_SIZE = 250;

/**
 * Create embeddings for documents and store them in the vector database
 * 
 * @param {Object} options - Options for processing
 * @param {Array} options.documents - Array of document objects with content property
 * @param {string} options.namespace - Namespace for the documents
 * @returns {Promise<{success: boolean, totalCount: number, successCount: number, failedCount: number}>} - Processing results
 */
const createEmbeddingsAndStore = async ({ 
  documents, 
  namespace = DEFAULT_NAMESPACE 
}) => {
  let successCount = 0;
  let failedCount = 0;
  
  // Create embeddings and prepare documents for storage
  console.log(`Creating embeddings for ${documents.length} documents...`);
  
  const documentsWithEmbeddings = [];
  
  // Process in batches to avoid overwhelming the embedding API
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    console.log(`Processing embedding batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(documents.length/BATCH_SIZE)}...`);
    
    // Create embeddings for each document in the batch
    const batchResults = await Promise.all(
      batch.map(async (doc) => {
        try {
          // Create embedding - no retry logic
          const vector = await createEmbedding({ text: doc.content });
          
          if (!vector) {
            console.error('Failed to create embedding');
            failedCount++;
            return null;
          }
          
          return {
            vector,
            content: doc.content,
            url: doc.url || ''
          };
        } catch (error) {
          console.error('Error creating embedding:', error.message || error);
          failedCount++;
          return null;
        }
      })
    );
    
    // Add valid documents to the collection
    documentsWithEmbeddings.push(...batchResults.filter(doc => doc !== null));
    
    // Add a small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < documents.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Store documents with embeddings
  console.log(`Storing ${documentsWithEmbeddings.length} documents with embeddings...`);
  
  // Process storage in batches
  for (let i = 0; i < documentsWithEmbeddings.length; i += BATCH_SIZE) {
    const batch = documentsWithEmbeddings.slice(i, i + BATCH_SIZE);
    console.log(`Storing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(documentsWithEmbeddings.length/BATCH_SIZE)}...`);
    
    // Insert batch documents
    if (batch.length > 0) {
      const batchResult = await insertDocuments(batch, namespace);
      successCount += batchResult.count;
      failedCount += (batch.length - batchResult.count);
      
      console.log(`Batch ${Math.floor(i/BATCH_SIZE) + 1} complete: ${batchResult.count}/${batch.length} documents inserted`);
      
      // Add a small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < documentsWithEmbeddings.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
  
  return {
    success: successCount > 0,
    totalCount: documents.length,
    successCount,
    failedCount
  };
};

/**
 * Ingest a CSV file content into the vector database
 * 
 * @param {Object} options - CSV ingestion options
 * @param {string} options.csvContent - The CSV content as string
 * @param {string} options.source - Source URL or identifier
 * @param {Object} options.metadata - Additional metadata (stored in content)
 * @param {string} options.namespace - Namespace for the document
 * @returns {Promise<Object>} - Ingestion results
 */
export const ingestDocument = async ({
  csvContent,
  source,
  metadata = {},
  namespace = DEFAULT_NAMESPACE
}) => {
  try {
    // Parse CSV content into documents
    const documents = processCSVContent(csvContent, { source, ...metadata });
    
    if (!documents || documents.length === 0) {
      return {
        success: false,
        totalChunks: 0,
        successfulChunks: 0,
        failedChunks: 0,
        error: 'No valid CSV data found'
      };
    }
    
    console.log(`Processing ${documents.length} CSV documents...`);
    
    // Create embeddings and store documents
    const result = await createEmbeddingsAndStore({
      documents,
      namespace
    });
    
    return {
      success: result.success,
      totalChunks: documents.length,
      successfulChunks: result.successCount,
      failedChunks: result.failedCount
    };
  } catch (error) {
    console.error('Error ingesting document:', error);
    return {
      success: false,
      totalChunks: 0,
      successfulChunks: 0,
      failedChunks: 0,
      error: error.message
    };
  }
};

// Export all components for external use
export {
  processCSVContent,
  insertDocuments,
  deleteAllDocumentsInNamespace,
  getRAG,
  supabase,
  DEFAULT_NAMESPACE
}; 