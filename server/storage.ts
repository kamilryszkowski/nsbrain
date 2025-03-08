import { wikiContexts, queries, type WikiContext, type InsertWikiContext, type Query, type InsertQuery } from "@shared/schema";

export interface IStorage {
  // Wiki context operations
  getWikiContext(topic: string): Promise<WikiContext | undefined>;
  getAllWikiContexts(): Promise<WikiContext[]>;
  createWikiContext(context: InsertWikiContext): Promise<WikiContext>;
  
  // Query operations
  saveQuery(query: InsertQuery): Promise<Query>;
  getQueriesByUser(userId: string): Promise<Query[]>;
}

export class MemStorage implements IStorage {
  private wikiContexts: Map<number, WikiContext>;
  private queries: Map<number, Query>;
  private currentWikiId: number;
  private currentQueryId: number;

  constructor() {
    this.wikiContexts = new Map();
    this.queries = new Map();
    this.currentWikiId = 1;
    this.currentQueryId = 1;
  }

  async getWikiContext(topic: string): Promise<WikiContext | undefined> {
    return Array.from(this.wikiContexts.values()).find(
      (ctx) => ctx.topic.toLowerCase() === topic.toLowerCase()
    );
  }

  async getAllWikiContexts(): Promise<WikiContext[]> {
    return Array.from(this.wikiContexts.values());
  }

  async createWikiContext(insertContext: InsertWikiContext): Promise<WikiContext> {
    const id = this.currentWikiId++;
    const context: WikiContext = { ...insertContext, id };
    this.wikiContexts.set(id, context);
    return context;
  }

  async saveQuery(insertQuery: InsertQuery): Promise<Query> {
    const id = this.currentQueryId++;
    const query: Query = { 
      ...insertQuery, 
      id,
      timestamp: new Date()
    };
    this.queries.set(id, query);
    return query;
  }

  async getQueriesByUser(userId: string): Promise<Query[]> {
    return Array.from(this.queries.values()).filter(
      (query) => query.userId === userId
    );
  }
}

export const storage = new MemStorage();
