// utils/rag/csvParser.js
// CSV parsing functionality for RAG

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
    // Parse CSV content
    const lines = csvContent.split('\n');
    if (lines.length < 2) return []; // Need at least header and one data row
    
    // Parse header
    const headers = parseCSVLine(lines[0]);
    
    // Verify that the CSV has the expected columns
    const urlIndex = headers.findIndex(h => h.toLowerCase() === 'url');
    const contentIndex = headers.findIndex(h => h.toLowerCase() === 'content');
    
    if (urlIndex === -1 || contentIndex === -1) {
      console.error('CSV must contain "url" and "content" columns');
      return [];
    }
    
    // Process each row
    const documents = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      const values = parseCSVLine(lines[i]);
      if (values.length < 2) continue; // Skip rows without enough values
      
      const url = values[urlIndex];
      const content = values[contentIndex];
      
      if (!content.trim()) continue; // Skip rows with empty content
      
      // Add row as a document
      documents.push({
        content: content.trim(),
        url: url.trim(),
        metadata: {
          ...metadata,
          rowIndex: i,
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

/**
 * Parse a CSV line handling quoted values
 * 
 * @param {string} line - CSV line to parse
 * @returns {Array} - Array of values
 */
export const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
}; 