# RAG (Retrieval Augmented Generation) Module

This module provides a complete implementation of Retrieval Augmented Generation for the Network School Discord bot. It enables the bot to retrieve relevant information from a knowledge base to enhance its responses.

## Components

The RAG module is organized into several specialized files:

- **client.js**: Initializes the Supabase client for vector storage
- **chunking.js**: Handles splitting documents into manageable chunks
- **csvParser.js**: Processes CSV files into document chunks
- **storage.js**: Manages document storage in the vector database
- **retrieval.js**: Implements document retrieval and context generation
- **index.js**: Main entry point that integrates all components

## Usage

### Document Processing

To process and store documents:

```javascript
import { processDocument, processCSVDocument } from './utils/rag/index.js';

// Process a text document
const result = await processDocument({
  text: "Document content...",
  source: "document_name.txt",
  metadata: { type: "text", author: "John Doe" }
});

// Process a CSV document
const csvResult = await processCSVDocument({
  csvContent: "header1,header2\nvalue1,value2\nvalue3,value4",
  source: "data.csv",
  metadata: { type: "csv", department: "Sales" }
});
```

### Document Retrieval

To retrieve relevant documents for a query:

```javascript
import { getRAG } from './utils/rag/index.js';

// Get context for a user query
const context = await getRAG("What is Network School?");
```

### Document Management

To manage documents in the database:

```javascript
import { deleteAllDocumentsInNamespace, insertDocuments } from './utils/rag/index.js';

// Delete all documents in a namespace before ingesting new data
await deleteAllDocumentsInNamespace('my_namespace');

// Insert new documents
const insertResult = await insertDocuments(documents, 'my_namespace');
```

### Advanced Usage

For more advanced use cases, you can import specific components:

```javascript
import { 
  splitTextIntoChunks, 
  findRelevantDocuments,
  insertDocuments,
  deleteAllDocumentsInNamespace,
  supabase,
  DEFAULT_NAMESPACE
} from './utils/rag/index.js';

// Create custom chunks
const chunks = splitTextIntoChunks(longText, { source: "manual" });

// Find relevant documents without formatting
const docs = await findRelevantDocuments("query", "custom_namespace");

// Insert documents directly
const result = await insertDocuments({
  vector: embeddingVector,
  content: "Document content with metadata included",
  url: "source_identifier"
});
```

## Implementation Notes

- Metadata is included directly in the content field since there's no separate metadata column
- Source information is prefixed to the content to maintain context
- The module adapts to the existing database schema without requiring changes
- When ingesting complete datasets, existing documents in the same namespace are deleted first
- Each data source uses a separate namespace for better organization and management

## Data Ingestion Process

The standard data ingestion process follows these steps:

1. Delete all existing documents in the target namespace
2. Read and parse the source data (CSV, text, etc.)
3. Process the data into chunks with appropriate context
4. Generate embeddings for each chunk
5. Insert the chunks with their embeddings into the database

This process ensures that each ingestion provides a complete and up-to-date dataset without duplicates.

## Configuration

The module requires the following environment variables:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase API key

These can be set in your `.env` file. 