// index.js
// Main entry point for the Discord bot

import createMessageHandler from './messageHandler.js';
import initializeBot from './init.js';
import dotenv from 'dotenv';
import express from 'express';

// Initialize environment variables
dotenv.config();

// Validate environment variables
const requiredEnvVars = ['DISCORD_TOKEN', 'OPENAI_API_KEY', 'GEMINI_API_KEY'];
const missing = requiredEnvVars.filter(key => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

// Create message handler
const messageHandler = createMessageHandler();

// Initialize the Discord bot with the message handler
const bot = initializeBot(messageHandler);

// Create Express app for health checks
const app = express();
const port = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start the Express server
app.listen(port, () => {
  console.log(`Health check server running on port ${port}`);
});

// Run the bot
bot.initialize().catch(console.error); 