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
          
          // Include metadata in content since we don't have a metadata column
          const metadataPrefix = `Source: ${source || 'Unknown'}\n`;
          const enhancedContent = metadataPrefix + chunk.content;
          
          return {
            vector: embedding,
            content: enhancedContent,
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
    
    // Create embeddings for each document
    const docsWithEmbeddings = await Promise.all(
      documents.map(async (doc) => {
        try {
          const vector = await createEmbedding({ text: doc.content });
          
          if (!vector) {
            console.error('Failed to create embedding for CSV row');
            return null;
          }
          
          // Include metadata in content since we don't have a metadata column
          const metadataPrefix = `Source: ${source || 'Unknown'}\n`;
          const enhancedContent = metadataPrefix + doc.content;
          
          return {
            vector,
            content: enhancedContent,
            url: doc.url || source || ''
          };
        } catch (error) {
          console.error('Error processing CSV row:', error);
          return null;
        }
      })
    );
    
    // Filter out failed documents
    const validDocuments = docsWithEmbeddings.filter(doc => doc !== null);
    
    // Insert documents in batch
    const result = await insertDocuments(validDocuments, namespace);
    
    return {
      success: result.success,
      totalChunks: documents.length,
      successfulChunks: result.count,
      failedChunks: documents.length - result.count
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