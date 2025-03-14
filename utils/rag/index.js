// utils/rag/index.js
// Main RAG service that integrates all components

import { createEmbedding } from '../llm.js';
import { splitTextIntoChunks } from './chunking.js';
import { processCSVContent } from './csvParser.js';
import { insertDocuments, deleteAllDocumentsInNamespace } from './storage.js';
import { getRAG } from './retrieval.js';
import supabase, { DEFAULT_NAMESPACE } from './client.js';

/**
 * Process a document by splitting it into chunks and storing with embeddings
 * 
 * @param {Object} options - Document processing options
 * @param {string} options.text - The document text content
 * @param {string} options.source - Source URL or identifier
 * @param {Object} options.metadata - Additional metadata (stored in content)
 * @param {string} options.namespace - Namespace for the document
 * @returns {Promise<Object>} - Processing results with success count and total
 */
export const processDocument = async ({ 
  text, 
  source, 
  metadata = {}, 
  namespace = DEFAULT_NAMESPACE 
}) => {
  try {
    // Split the document into chunks
    const chunks = splitTextIntoChunks(text, metadata);
    
    // Process each chunk
    const documents = await Promise.all(
      chunks.map(async (chunk) => {
        try {
          // Create embedding for the chunk
          const embedding = await createEmbedding({ text: chunk.content });
          
          if (!embedding) {
            console.error('Failed to create embedding for chunk');
            return null;
          }
          
          return {
            vector: embedding,
            content: chunk.content,
            url: source || ''
          };
        } catch (error) {
          console.error('Error processing chunk:', error);
          return null;
        }
      })
    );
    
    // Filter out failed chunks
    const validDocuments = documents.filter(doc => doc !== null);
    
    // Insert documents in batch
    const result = await insertDocuments(validDocuments, namespace);
    
    return {
      success: result.success,
      totalChunks: chunks.length,
      successfulChunks: result.count,
      failedChunks: chunks.length - result.count
    };
  } catch (error) {
    console.error('Error processing document:', error);
    return {
      success: false,
      totalChunks: 0,
      successfulChunks: 0,
      failedChunks: 0,
      error: error.message
    };
  }
};

/**
 * Process a CSV file content
 * 
 * @param {Object} options - CSV processing options
 * @param {string} options.csvContent - The CSV content as string
 * @param {string} options.source - Source URL or identifier
 * @param {Object} options.metadata - Additional metadata (stored in content)
 * @param {string} options.namespace - Namespace for the document
 * @returns {Promise<Object>} - Processing results
 */
export const processCSVDocument = async ({
  csvContent,
  source,
  metadata = {},
  namespace = DEFAULT_NAMESPACE
}) => {
  try {
    // Process CSV content into document chunks
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
    
    console.log(`Processing ${documents.length} documents in batches of 250...`);
    
    // Process documents in batches of 250
    const BATCH_SIZE = 250;
    let successfulChunks = 0;
    let failedChunks = 0;
    
    /**
     * Helper function to create embedding with retry logic
     * 
     * @param {string} text - Text to create embedding for
     * @param {number} retries - Number of retries left
     * @param {number} delay - Current delay in ms
     * @returns {Promise<Array|null>} - Embedding vector or null
     */
    const createEmbeddingWithRetry = async (text, retries = 3, delay = 2000) => {
      try {
        const vector = await createEmbedding({ text });
        return vector;
      } catch (error) {
        if (error.message && (error.message.includes('rate limit') || error.message.includes('429'))) {
          if (retries > 0) {
            console.log(`Rate limit hit, retrying in ${delay/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return createEmbeddingWithRetry(text, retries - 1, delay * 2);
          }
        }
        throw error;
      }
    };
    
    // Process in batches
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      const batch = documents.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(documents.length/BATCH_SIZE)} (${batch.length} documents)...`);
      
      // Create embeddings for each document in the batch
      const batchWithEmbeddings = await Promise.all(
        batch.map(async (doc) => {
          try {
            const vector = await createEmbeddingWithRetry(doc.content);
            
            if (!vector) {
              console.error('Failed to create embedding for CSV row');
              failedChunks++;
              return null;
            }
            
            return {
              vector,
              content: doc.content,
              url: doc.url || source || ''
            };
          } catch (error) {
            console.error('Error processing CSV row:', error);
            failedChunks++;
            return null;
          }
        })
      );
      
      // Filter out failed documents
      const validBatchDocuments = batchWithEmbeddings.filter(doc => doc !== null);
      
      // Insert batch documents
      if (validBatchDocuments.length > 0) {
        const batchResult = await insertDocuments(validBatchDocuments, namespace);
        successfulChunks += batchResult.count;
        
        console.log(`Batch ${Math.floor(i/BATCH_SIZE) + 1} complete: ${batchResult.count}/${batch.length} documents inserted`);
        
        // Add a small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < documents.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    return {
      success: successfulChunks > 0,
      totalChunks: documents.length,
      successfulChunks,
      failedChunks
    };
  } catch (error) {
    console.error('Error processing CSV document:', error);
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
  splitTextIntoChunks,
  processCSVContent,
  insertDocuments,
  deleteAllDocumentsInNamespace,
  getRAG,
  supabase,
  DEFAULT_NAMESPACE
}; 