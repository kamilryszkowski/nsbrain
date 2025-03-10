// utils/messageUtils.js
// Utility functions for handling messages

/**
 * Split long messages into chunks of max 2000 characters
 * Try to split at paragraph boundaries, then at sentence boundaries, then at word boundaries
 * 
 * @param {string} text - The text to split into chunks
 * @param {number} maxLength - Maximum length of each chunk (default: 2000 for Discord)
 * @returns {string[]} - Array of message chunks
 */
export const chunkMessage = (text, maxLength = 2000) => {
  // If the message is already short enough, return it as is
  if (text.length <= maxLength) {
    return [text];
  }
  
  const chunks = [];
  let remainingText = text;
  
  while (remainingText.length > 0) {
    if (remainingText.length <= maxLength) {
      chunks.push(remainingText);
      break;
    }
    
    // Try to find a paragraph break within the limit
    let splitIndex = remainingText.lastIndexOf('\n\n', maxLength);
    
    // If no paragraph break, try to find a line break
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = remainingText.lastIndexOf('\n', maxLength);
    }
    
    // If no line break, try to find a sentence break
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      const sentenceBreaks = ['. ', '! ', '? '];
      for (const sentenceBreak of sentenceBreaks) {
        const breakIndex = remainingText.lastIndexOf(sentenceBreak, maxLength - 1);
        if (breakIndex !== -1 && breakIndex > maxLength / 2) {
          splitIndex = breakIndex + 1; // Include the period and space
          break;
        }
      }
    }
    
    // If no good breaking point found, just split at the maximum length at a word boundary
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = remainingText.lastIndexOf(' ', maxLength);
    }
    
    // If all else fails, just split at the maximum length
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = maxLength;
    }
    
    chunks.push(remainingText.substring(0, splitIndex));
    remainingText = remainingText.substring(splitIndex).trim();
  }
  
  return chunks;
}; 