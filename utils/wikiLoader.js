import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load wiki content from all .txt and .csv files in the data/ folder
export const loadWikiContent = () => {
  // Go up one directory level to get to the project root, then into data/
  const dataDir = path.join(__dirname, '..', 'data');
  let wikiContent = '';

  console.log('Loading wiki content from:', dataDir);
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    console.log('Data directory not found. Creating it...');
    fs.mkdirSync(dataDir);
  }
  
  try {
    const files = fs.readdirSync(dataDir);
    const txtFiles = files.filter(file => file.endsWith('.txt'));
    const csvFiles = files.filter(file => file.endsWith('.csv'));
    
    if (txtFiles.length === 0 && csvFiles.length === 0) {
      console.log('No .txt or .csv files found in data directory');
      return 'No wiki content available.';
    }
    
    console.log(`Found ${txtFiles.length} .txt files and ${csvFiles.length} .csv files in data directory`);
    
    // Process text files
    txtFiles.forEach(file => {
      const filePath = path.join(dataDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(file, '.txt');
      
      // Add file name as a section header
      wikiContent += `\n## ${fileName}:\n${content}\n\n`;
    });
    
    // Process CSV files synchronously
    csvFiles.forEach(file => {
      const filePath = path.join(dataDir, file);
      const fileName = path.basename(file, '.csv');
      const csvContent = processCSVSync(filePath);
      
      // Add file name as a section header
      wikiContent += `\n## ${fileName}:\n${csvContent}\n\n`;
    });
    
    return wikiContent;
  } catch (error) {
    console.error('Error loading wiki content:', error);
    return 'Error loading wiki content.';
  }
};

// Process CSV file synchronously
const processCSVSync = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  if (lines.length === 0) return '';
  
  // Parse header
  const headers = lines[0].split(',').map(h => h.trim());
  
  let result = '';
  
  // Process each row
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    
    const values = parseCSVLine(lines[i]);
    
    // Create a formatted entry for each row
    result += '- ';
    for (let j = 0; j < headers.length && j < values.length; j++) {
      result += `${headers[j]}: ${values[j]}`;
      if (j < headers.length - 1 && j < values.length - 1) {
        result += ', ';
      }
    }
    result += '\n';
  }
  
  return result;
};

// Parse a CSV line handling quoted values
const parseCSVLine = (line) => {
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