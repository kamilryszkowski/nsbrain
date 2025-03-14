// utils/rag/csvParser.js
// CSV parsing functionality for RAG

import { parse } from 'csv-parse/sync';

/**
 * Process CSV content into document chunks
 * 
 * @param {string} csvContent - The CSV content as a string
 * @param {Object} metadata - Additional metadata to include
 * @returns {Array} - Array of document chunks
 */
export const processCSVContent = (csvContent, metadata = {}) => {
  if (!csvContent) return [];
  
  try {
    // Parse CSV content using csv-parse library
    // This automatically handles multi-line fields in quotes and other CSV complexities
    const parsedRows = parse(csvContent, {
      columns: true,       // Use the first row as column names
      skip_empty_lines: true,  // Skip empty lines
      trim: true,          // Trim whitespace from fields
      relax_quotes: true,  // Be more forgiving with quotes
      relax_column_count: true, // Allow rows with inconsistent column counts
    });
    
    if (parsedRows.length === 0) return [];
    
    // Verify that the CSV has the expected columns
    const firstRow = parsedRows[0];
    if (!firstRow.url || !firstRow.content) {
      console.error('CSV must contain "url" and "content" columns');
      return [];
    }
    
    // Process each row
    const documents = [];
    
    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      
      // Skip rows with empty content
      if (!row.content || !row.content.trim()) continue;
      
      // Add row as a document
      documents.push({
        content: row.content.trim(),
        url: row.url ? row.url.trim() : '',
        metadata: {
          ...metadata,
          rowIndex: i + 1, // +1 because we're skipping the header row in the count
          source: metadata.source || 'csv'
        }
      });
    }
    
    return documents;
  } catch (error) {
    console.error('Error processing CSV content:', error);
    return [];
  }
};

