import { type Book, type InsertBook, type Chapter, type InsertChapter, type Image, type InsertImage, type ExportSettings, books, chapters, images } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc } from "drizzle-orm";
import path from "path";
import fs from "fs";

export interface IStorage {
  // Book methods
  getBook(id: number): Promise<Book | undefined>;
  getBookByFilename(filename: string): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: number, updates: Partial<InsertBook>): Promise<Book | undefined>;
  renameBook(id: number, newTitle: string): Promise<Book | undefined>;
  listBooks(): Promise<Book[]>;
  deleteBook(id: number): Promise<boolean>;
  
  // Chapter methods
  getChapter(id: number): Promise<Chapter | undefined>;
  getBookChapters(bookId: number): Promise<Chapter[]>;
  createChapter(chapter: InsertChapter): Promise<Chapter>;
  updateChapter(id: number, updates: Partial<InsertChapter>): Promise<Chapter | undefined>;
  deleteChapter(id: number): Promise<boolean>;
  reorderChapters(bookId: number, chapterIds: number[]): Promise<void>;
  
  // File management
  saveBookToFile(book: Book, chapters: Chapter[]): Promise<string>;
  generateFilename(title: string): string;
  
  // Image methods
  getImage(id: number): Promise<Image | undefined>;
  createImage(image: InsertImage): Promise<Image>;
  getBookImages(bookId: number): Promise<Image[]>;
  deleteImage(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeDefaultBook();
  }

  private async initializeDefaultBook() {
    try {
      const existingBooks = await this.listBooks();
      if (existingBooks.length === 0) {
        await this.createDefaultBook();
      }
    } catch (error) {
      console.error("Error initializing default book:", error);
    }
  }

  private async createDefaultBook() {
    const book = await this.createBook({
      title: "My First Book",
      author: "Author Name",
      filename: this.generateFilename("My First Book"),
    });

    // Create a default chapter
    await this.createChapter({
      bookId: book.id,
      title: "Chapter 1: Introduction",
      content: "Welcome to your first book!\n\nThis is the beginning of your writing journey. You can edit this content, add new chapters, and create a professional book.\n\n## Getting Started\n\n1. Edit this chapter content\n2. Add new chapters using the + button\n3. Configure your PDF export settings\n4. Export your book as a professional PDF",
      orderIndex: 0,
      pageNumber: 1,
    });
  }

  generateFilename(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  async saveBookToFile(book: Book, chapters: Chapter[]): Promise<string> {
    const booksDir = path.join(process.cwd(), "books");
    if (!fs.existsSync(booksDir)) {
      fs.mkdirSync(booksDir, { recursive: true });
    }

    const filename = `${book.filename}.md`;
    const filepath = path.join(booksDir, filename);

    // Create markdown content
    let content = `# ${book.title}\n\n`;
    if (book.author) {
      content += `**Author:** ${book.author}\n\n`;
    }
    
    // Add chapters in order
    const sortedChapters = chapters.sort((a, b) => a.orderIndex - b.orderIndex);
    for (const chapter of sortedChapters) {
      content += `# ${chapter.title}\n\n${chapter.content}\n\n`;
    }

    fs.writeFileSync(filepath, content);
    return filepath;
  }

  // Book methods
  async getBook(id: number): Promise<Book | undefined> {
    const result = await db.select().from(books).where(eq(books.id, id)).limit(1);
    return result[0];
  }

  async getBookByFilename(filename: string): Promise<Book | undefined> {
    const result = await db.select().from(books).where(eq(books.filename, filename)).limit(1);
    return result[0];
  }

  async createBook(book: InsertBook): Promise<Book> {
    const result = await db.insert(books).values({
      ...book,
      exportSettings: book.exportSettings || {
        pdfEngine: "pdflatex",
        headerPath: "server/latex-header.tex",
        includeTOC: true,
        includeCover: true,
      }
    }).returning();
    return result[0];
  }

  async updateBook(id: number, updates: Partial<InsertBook>): Promise<Book | undefined> {
    const result = await db.update(books)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(books.id, id))
      .returning();
    return result[0];
  }

  async renameBook(id: number, newTitle: string): Promise<Book | undefined> {
    const newFilename = this.generateFilename(newTitle);
    
    // Update database
    const result = await db.update(books)
      .set({ 
        title: newTitle, 
        filename: newFilename, 
        updatedAt: new Date() 
      })
      .where(eq(books.id, id))
      .returning();

    // Rename file on disk
    const booksDir = path.join(process.cwd(), "books");
    const oldBook = await this.getBook(id);
    if (oldBook) {
      const oldPath = path.join(booksDir, `${oldBook.filename}.md`);
      const newPath = path.join(booksDir, `${newFilename}.md`);
      
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
      }
    }

    return result[0];
  }

  async listBooks(): Promise<Book[]> {
    return await db.select().from(books).orderBy(desc(books.updatedAt));
  }

  async deleteBook(id: number): Promise<boolean> {
    const book = await this.getBook(id);
    if (!book) return false;

    // Delete file from disk
    const booksDir = path.join(process.cwd(), "books");
    const filepath = path.join(booksDir, `${book.filename}.md`);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    // Delete from database (chapters will be deleted by cascade)
    const result = await db.delete(books).where(eq(books.id, id));
    return result.rowCount! > 0;
  }

  // Chapter methods
  async getChapter(id: number): Promise<Chapter | undefined> {
    const result = await db.select().from(chapters).where(eq(chapters.id, id)).limit(1);
    return result[0];
  }

  async getBookChapters(bookId: number): Promise<Chapter[]> {
    return await db.select().from(chapters)
      .where(eq(chapters.bookId, bookId))
      .orderBy(asc(chapters.orderIndex));
  }

  async createChapter(chapter: InsertChapter): Promise<Chapter> {
    const result = await db.insert(chapters).values(chapter).returning();
    return result[0];
  }

  async updateChapter(id: number, updates: Partial<InsertChapter>): Promise<Chapter | undefined> {
    const result = await db.update(chapters)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(chapters.id, id))
      .returning();
    return result[0];
  }

  async deleteChapter(id: number): Promise<boolean> {
    const result = await db.delete(chapters).where(eq(chapters.id, id));
    return result.rowCount! > 0;
  }

  async reorderChapters(bookId: number, chapterIds: number[]): Promise<void> {
    for (let i = 0; i < chapterIds.length; i++) {
      await db.update(chapters)
        .set({ 
          orderIndex: i, 
          pageNumber: i + 1,
          updatedAt: new Date() 
        })
        .where(eq(chapters.id, chapterIds[i]));
    }
  }

  // Image methods
  async getImage(id: number): Promise<Image | undefined> {
    const result = await db.select().from(images).where(eq(images.id, id)).limit(1);
    return result[0];
  }

  async createImage(insertImage: InsertImage): Promise<Image> {
    const result = await db.insert(images).values(insertImage).returning();
    return result[0];
  }

  async getBookImages(bookId: number): Promise<Image[]> {
    return await db.select().from(images).where(eq(images.bookId, bookId));
  }

  async deleteImage(id: number): Promise<boolean> {
    const result = await db.delete(images).where(eq(images.id, id));
    return result.rowCount! > 0;
  }
}

export const storage = new DatabaseStorage();