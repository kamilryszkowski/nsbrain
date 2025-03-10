// utils/rag/retrieval.js
// Document retrieval functionality for RAG

import supabase, { DEFAULT_NAMESPACE } from './client.js';
import { createEmbedding } from '../llm.js';

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
      similarity: match.similarity,
      url: match.url
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
 * Retrieve and format context for a query
 * 
 * @param {string} query - The user's query
 * @returns {Promise<string>} - Context string for the LLM
 */
export const getRAG = async (query) => {
  try {
    const relevantDocs = await findRelevantDocuments(query);
    return generateContextFromDocuments(relevantDocs);
  } catch (error) {
    console.error('Error getting context for query:', error);
    return 'Error retrieving context information.';
  }
}; 