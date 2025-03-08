import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupBot } from "./discord/bot";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Add some initial wiki content for testing
  await storage.createWikiContext({
    topic: "Laundry Services",
    content: "The campus has two laundry facilities. The main laundry room is located in Building A and is open 24/7. It accepts both coins and card payments. The secondary laundry room is in Building B and is open from 7 AM to 10 PM. Remember to bring your own detergent!"
  });

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