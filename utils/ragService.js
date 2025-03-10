// utils/ragService.js
// RAG (Retrieval Augmented Generation) service using Supabase

import { createClient } from '@supabase/supabase-js';
import { createEmbedding } from './llm.js';
import dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_KEY'];
const missing = requiredEnvVars.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.warn(`Missing Supabase environment variables: ${missing.join(', ')}`);
  console.warn('RAG functionality will not work properly');
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Default namespace for Network School documents
const DEFAULT_NAMESPACE = 'network_school';

/**
 * Insert a document into the Supabase vector store
 * 
 * @param {Object} options - Options for inserting a document
 * @param {Array} options.vector - The embedding vector
 * @param {string} options.content - The text content
 * @param {string} options.url - Source URL or identifier
 * @param {string} options.namespace - Namespace for organizing documents
 * @returns {Promise<boolean>} - Success status
 */
export const insertDocument = async ({ vector, content, url, namespace = DEFAULT_NAMESPACE }) => {
  try {
    const { error } = await supabase
      .from('rag_documents')
      .insert({ vector, content, url, namespace }); // doc_timestamp is set by default

    if (error) {
      console.error('Error inserting document:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception inserting document:', error);
    return false;
  }
};

/**
 * Query nearest vectors by cosine similarity
 * 
 * @param {Object} options - Query options
 * @param {Array} options.queryVector - The query embedding vector
 * @param {string} options.namespace - Namespace to search in
 * @param {number} options.limit - Maximum number of results
 * @returns {Promise<Array>} - Array of matching documents
 */
export const queryVectors = async ({ queryVector, namespace = DEFAULT_NAMESPACE, limit = 5 }) => {
  try {
    const { data, error } = await supabase.rpc('match_documents', {
      query_vec: queryVector,
      match_namespace: namespace,
      match_count: limit,
    });

    if (error) {
      console.error('Error querying vectors:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception querying vectors:', error);
    return [];
  }
};

/**
 * Create an embedding for a text query and find relevant documents
 * 
 * @param {string} query - The text query to embed and search for
 * @param {string} namespace - Namespace to search in
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} - Array of relevant document contents
 */
export const findRelevantDocuments = async (query, namespace = DEFAULT_NAMESPACE, limit = 5) => {
  try {
    // Create embedding for the query
    const queryEmbedding = await createEmbedding({ text: query });
    
    if (!queryEmbedding) {
      console.error('Failed to create embedding for query');
      return [];
    }
    
    // Query for similar documents
    const matches = await queryVectors({
      queryVector: queryEmbedding,
      namespace,
      limit
    });
    
    // Extract and return the content from matches
    return matches.map(match => ({
      content: match.content,
      similarity: match.similarity
    }));
  } catch (error) {
    console.error('Error finding relevant documents:', error);
    return [];
  }
};

/**
 * Generate a context string from relevant documents
 * 
 * @param {Array} documents - Array of document objects with content
 * @returns {string} - Formatted context string
 */
export const generateContextFromDocuments = (documents) => {
  if (!documents || documents.length === 0) {
    return 'No relevant documents found.';
  }
  
  return documents.map((doc, index) => 
    `Document ${index + 1} (similarity: ${(doc.similarity * 100).toFixed(2)}%):\n${doc.content}`
  ).join('\n\n');
};

/**
 * Main function to retrieve context for a query
 * 
 * @param {string} query - The user's query
 * @returns {Promise<string>} - Context string for the LLM
 */
export const getContextForQuery = async (query) => {
  try {
    const relevantDocs = await findRelevantDocuments(query);
    return generateContextFromDocuments(relevantDocs);
  } catch (error) {
    console.error('Error getting context for query:', error);
    return 'Error retrieving context information.';
  }
}; 