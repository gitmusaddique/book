import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  content: text("content").notNull().default(""),
  theme: text("theme").notNull().default("modern"),
  columnLayout: text("column_layout").notNull().default("single"),
  coverConfig: text("cover_config", { mode: "json" }).$type<{
    title?: string;
    subtitle?: string;
    author?: string;
    backgroundImage?: string;
  }>(),
  settings: text("settings", { mode: "json" }).$type<{
    autoWrapTables?: boolean;
    autoPositionImages?: boolean;
    includePageNumbers?: boolean;
    includeHeaders?: boolean;
  }>(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const images = sqliteTable("images", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  size: text("size").notNull(),
  mimetype: text("mimetype").notNull(),
  url: text("url").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
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
