import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const wikiContexts = pgTable("wiki_contexts", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  content: text("content").notNull(),
});

export const queries = pgTable("queries", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  query: text("query").notNull(),
  response: text("response").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  responseTime: integer("response_time").notNull() // in milliseconds
});

export const insertWikiContextSchema = createInsertSchema(wikiContexts).pick({
  topic: true,
  content: true,
});

export const insertQuerySchema = createInsertSchema(queries).pick({
  userId: true,
  query: true,
  response: true,
  responseTime: true,
});

export type InsertWikiContext = z.infer<typeof insertWikiContextSchema>;
export type WikiContext = typeof wikiContexts.$inferSelect;
export type InsertQuery = z.infer<typeof insertQuerySchema>;
export type Query = typeof queries.$inferSelect;
