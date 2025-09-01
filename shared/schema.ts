import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  author: text("author").notNull(),
  content: text("content").notNull().default(""),
  theme: text("theme").notNull().default("modern"),
  columnLayout: text("column_layout").notNull().default("single"),
  coverConfig: jsonb("cover_config").$type<{
    title?: string;
    subtitle?: string;
    author?: string;
    backgroundImage?: string;
  }>(),
  settings: jsonb("settings").$type<{
    autoWrapTables?: boolean;
    autoPositionImages?: boolean;
    includePageNumbers?: boolean;
    includeHeaders?: boolean;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const images = pgTable("images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  size: text("size").notNull(),
  mimetype: text("mimetype").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertImageSchema = createInsertSchema(images).omit({
  id: true,
  createdAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertImage = z.infer<typeof insertImageSchema>;
export type Image = typeof images.$inferSelect;
