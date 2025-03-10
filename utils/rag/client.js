// utils/rag/client.js
// Supabase client initialization for RAG

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_KEY'];
const missing = requiredEnvVars.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.warn(`Missing Supabase environment variables: ${missing.join(', ')}`);
  console.warn('RAG functionality will not work properly');
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Default namespace for Network School documents
export const DEFAULT_NAMESPACE = 'network_school';

export default supabase; 