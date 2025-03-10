// utils/rag/chunking.js
// Document chunking functionality for RAG

// Chunking configuration
export const CHUNK_SIZE = 1000;
export const CHUNK_OVERLAP = 300;

/**
 * Split text into overlapping chunks for better retrieval
 * 
 * @param {string} text - The text to split into chunks
 * @param {Object} metadata - Metadata to attach to each chunk
 * @param {number} chunkSize - Size of each chunk
 * @param {number} chunkOverlap - Overlap between chunks
 * @returns {Array} - Array of document chunks with metadata
 */
export const splitTextIntoChunks = (text, metadata = {}, chunkSize = CHUNK_SIZE, chunkOverlap = CHUNK_OVERLAP) => {
  if (!text || typeof text !== 'string') {
    console.warn('Invalid text provided for chunking');
    return [];
  }

  const chunks = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    // Calculate end index for this chunk
    let endIndex = startIndex + chunkSize;
    
    // If this isn't the last chunk, try to find a good breaking point
    if (endIndex < text.length) {
      // Look for paragraph breaks, sentences, or spaces near the end of the chunk
      const paragraphBreak = text.lastIndexOf('\n\n', endIndex);
      const lineBreak = text.lastIndexOf('\n', endIndex);
      const sentenceBreak = Math.max(
        text.lastIndexOf('. ', endIndex),
        text.lastIndexOf('! ', endIndex),
        text.lastIndexOf('? ', endIndex)
      );
      const spaceBreak = text.lastIndexOf(' ', endIndex);
      
      // Find the closest break point that's not too far from the end
      const minBreakPoint = startIndex + (chunkSize / 2);
      
      if (paragraphBreak > minBreakPoint) {
        endIndex = paragraphBreak + 2; // Include the paragraph break
      } else if (lineBreak > minBreakPoint) {
        endIndex = lineBreak + 1; // Include the line break
      } else if (sentenceBreak > minBreakPoint) {
        endIndex = sentenceBreak + 2; // Include the period and space
      } else if (spaceBreak > minBreakPoint) {
        endIndex = spaceBreak + 1; // Include the space
      }
      // Otherwise, just use the calculated endIndex
    }
    
    // Extract the chunk
    const chunk = text.substring(startIndex, endIndex);
    
    // Add chunk with metadata
    chunks.push({
      content: chunk,
      metadata: {
        ...metadata,
        chunkIndex: chunks.length,
        startIndex,
        endIndex
      }
    });
    
    // Move to next chunk with overlap
    startIndex = endIndex - chunkOverlap;
  }
  
  return chunks;
}; 