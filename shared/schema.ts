import { sql } from "drizzle-orm";
import { pgTable, text, integer, serial, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(), // Auto-generated from title
  coverConfig: jsonb("cover_config").$type<{
    title?: string;
    subtitle?: string;
    author?: string;
  }>(),
  exportSettings: jsonb("export_settings").$type<{
    pdfEngine: "pdflatex" | "xelatex" | "lualatex";
    headerPath: string;
    includeTOC: boolean;
    includeCover: boolean;
  }>().default({
    pdfEngine: "pdflatex" as const,
    headerPath: "server/latex-header.tex",
    includeTOC: true,
    includeCover: true,
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").references(() => books.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull().default(""),
  orderIndex: integer("order_index").notNull().default(0),
  pageNumber: integer("page_number").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").references(() => books.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  size: varchar("size", { length: 50 }).notNull(),
  mimetype: varchar("mimetype", { length: 100 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChapterSchema = createInsertSchema(chapters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertImageSchema = createInsertSchema(images).omit({
  id: true,
  createdAt: true,
});

// Export settings validation
export const exportSettingsSchema = z.object({
  pdfEngine: z.enum(["pdflatex", "xelatex", "lualatex"]).default("pdflatex"),
  headerPath: z.string().default("server/latex-header.tex"),
  includeTOC: z.boolean().default(true),
  includeCover: z.boolean().default(true),
});

export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof books.$inferSelect;
export type InsertChapter = z.infer<typeof insertChapterSchema>;
export type Chapter = typeof chapters.$inferSelect;
export type InsertImage = z.infer<typeof insertImageSchema>;
export type Image = typeof images.$inferSelect;
export type ExportSettings = z.infer<typeof exportSettingsSchema>;
