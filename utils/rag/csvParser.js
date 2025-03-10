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
    
    // Process each row
    const documents = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue;
      
      // Create a formatted text representation of the row
      let rowText = '';
      for (let j = 0; j < headers.length && j < values.length; j++) {
        rowText += `${headers[j]}: ${values[j]}. `;
      }
      
      // Add row as a document
      documents.push({
        content: rowText.trim(),
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