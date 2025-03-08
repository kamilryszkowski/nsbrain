import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupBot } from "./discord/bot";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize Discord bot
  try {
    await setupBot();
    console.log('Discord bot initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Discord bot:', error);
    throw error;
  }

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return httpServer;
}
