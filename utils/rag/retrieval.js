// utils/rag/retrieval.js
// Document retrieval functionality for RAG

import supabase, { DEFAULT_NAMESPACE } from './client.js';
import { createEmbedding } from '../llm.js';

// Define available namespaces
export const NAMESPACES = {
  BOOK: 'book',
  DISCORD: 'discord',
  LUMA: 'luma',
  WIKI: 'wiki',
};

/**
 * Query nearest vectors by cosine similarity
 * 
 * @param {Object} params - Query parameters
 * @param {Array} params.queryVector - The query embedding vector
 * @param {string} params.namespace - Namespace to search in
 * @param {number} params.limit - Maximum number of results
 * @returns {Promise<Array>} - Array of matching documents
 */
export const queryVectors = async ({ 
  queryVector, 
  namespace = DEFAULT_NAMESPACE, 
  limit = 10
}) => {

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
 * Generate a context string from relevant documents
 * 
 * @param {Object} params - Parameters
 * @param {Array} params.documents - Array of document objects with content
 * @param {string} params.namespace - The namespace the documents came from
 * @returns {string} - Formatted context string
 */
export const generateContextFromDocuments = ({ 
  documents, 
  namespace = 'unknown' 
}) => {
  if (!documents || documents.length === 0) {
    return `No relevant documents found in ${namespace}.`;
  }
  
  // Format namespace header based on namespace type
  let namespaceHeader;
  switch(namespace) {
    case NAMESPACES.BOOK:
      namespaceHeader = "--- Context from Balaji's Network State book ---";
      break;
    case NAMESPACES.DISCORD:
      namespaceHeader = "--- Context from Discord ---";
      break;
    case NAMESPACES.LUMA:
      namespaceHeader = "--- Context from Luma ---";
      break;
    case NAMESPACES.WIKI:
      namespaceHeader = "--- Context from Wiki ---";
      break;
    default:
      namespaceHeader = `--- Context from ${namespace} ---`;
  }
  
  // Format each document with its source
  const formattedDocuments = documents.map(doc => {
    const sourceInfo = doc.url ? `Source: ${doc.url}` : 'Source: No URL available';
    return `${doc.content}\n\n${sourceInfo}`;
  });
  
  // Return formatted context with namespace header and documents with sources
  return `${namespaceHeader}\n\n${formattedDocuments.join('\n\n')}`;
};

/**
 * Retrieve and format context for a query from multiple namespaces
 * 
 * @param {Object} params - Parameters
 * @param {string} params.query - The user's query
 * @param {Array<string>} params.namespaces - Array of namespaces to search in
 * @param {number} params.limit - Maximum number of results per namespace
 * @returns {Promise<Object>} - Object containing context string
 */
export const getRAG = async ({ 
  query, 
  namespaces = [NAMESPACES.BOOK, NAMESPACES.DISCORD, NAMESPACES.LUMA, NAMESPACES.WIKI], 
  limit = 5
}) => {
  try {
    // Create embedding for the query (only need to do this once)
    const queryEmbedding = await createEmbedding({ text: query });
    
    if (!queryEmbedding) {
      console.error('Failed to create embedding for query');
      return { 
        context: 'Error: Failed to create embedding for query.'
      };
    }
    
    // Query each namespace in parallel
    const namespaceResults = await Promise.all(
      namespaces.map(async (namespace) => {
        try {
          // Query for similar documents in this namespace
          const matches = await queryVectors({
            queryVector: queryEmbedding,
            namespace,
            limit
          });
          
          // Extract and format the content from matches
          const documents = matches.map(match => ({
            content: match.content,
            similarity: match.similarity,
            url: match.url
          }));
          
          return { namespace, documents };
        } catch (error) {
          console.error(`Error finding documents in namespace ${namespace}:`, error);
          return { namespace, documents: [] };
        }
      })
    );
    
    // Generate context from all namespaces
    const contextParts = namespaceResults
      .filter(result => result.documents.length > 0) // Only include namespaces with results
      .map(result => 
        generateContextFromDocuments({ 
          documents: result.documents, 
          namespace: result.namespace 
        })
      );
    
    // Join with double line breaks for better separation between namespace sections
    return {
      context: contextParts.join('\n\n\n')
    };
  } catch (error) {
    console.error('Error getting context for query:', error);
    return { 
      context: 'Error retrieving context information.'
    };
  }
}; 