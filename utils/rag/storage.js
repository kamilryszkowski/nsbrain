// utils/rag/storage.js
// Document storage functionality for RAG

import supabase, { DEFAULT_NAMESPACE } from './client.js';

/**
 * Insert documents into the Supabase vector store
 * 
 * @param {Array|Object} documents - Single document object or array of document objects
 * @param {string} namespace - Namespace for the documents
 * @returns {Promise<{success: boolean, count: number}>} - Success status and count of inserted documents
 */
export const insertDocuments = async (documents, namespace = DEFAULT_NAMESPACE) => {
  try {
    // Handle single document case
    if (!Array.isArray(documents)) {
      documents = [documents];
    }
    
    // Return early if no documents
    if (documents.length === 0) {
      return { success: false, count: 0 };
    }
    
    // Prepare documents for insertion
    const docsToInsert = documents.map(doc => ({
      vector: doc.vector,
      content: doc.content,
      url: doc.url || '',
      namespace
    }));
    
    // Insert in batches of 100 to avoid hitting limits
    const batchSize = 100;
    let successCount = 0;
    
    for (let i = 0; i < docsToInsert.length; i += batchSize) {
      const batch = docsToInsert.slice(i, i + batchSize);
      const { error } = await supabase.from('rag_documents').insert(batch);
      
      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
      } else {
        successCount += batch.length;
      }
    }
    
    return { 
      success: successCount > 0, 
      count: successCount 
    };
  } catch (error) {
    console.error('Error in document insertion:', error);
    return { success: false, count: 0 };
  }
};