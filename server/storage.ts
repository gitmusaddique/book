import { type Project, type InsertProject, type Image, type InsertImage, projects, images } from "@shared/schema";
import { randomUUID } from "crypto";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";

export interface IStorage {
  // Project methods
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined>;
  listProjects(): Promise<Project[]>;
  
  // Image methods
  getImage(id: string): Promise<Image | undefined>;
  createImage(image: InsertImage): Promise<Image>;
  getProjectImages(projectId: string): Promise<Image[]>;
  deleteImage(id: string): Promise<boolean>;
}

export class SqliteStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    // Ensure database directory exists
    const dbDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const sqlite = new Database(path.join(dbDir, "bookapp.db"));
    this.db = drizzle(sqlite);
    
    // Create tables
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        theme TEXT NOT NULL DEFAULT 'modern',
        column_layout TEXT NOT NULL DEFAULT 'single',
        cover_config TEXT,
        settings TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );
      
      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        project_id TEXT REFERENCES projects(id),
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        size TEXT NOT NULL,
        mimetype TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch())
      );
    `);

    // Create default project if it doesn't exist
    this.initializeDefaultProject();
  }

  private async initializeDefaultProject() {
    try {
      const existing = await this.getProject("default");
      if (!existing) {
        await this.createDefaultProject();
      }
    } catch (error) {
      console.error("Error initializing default project:", error);
    }
  }

  private async createDefaultProject() {
    const defaultProject = {
      id: "default",
      title: "My Book",
      author: "Author Name",
      content: "# Chapter 1: Introduction\n\nWelcome to your book...",
      theme: "modern",
      columnLayout: "single",
      coverConfig: JSON.stringify({
        title: "My Book",
        author: "Author Name"
      }),
      settings: JSON.stringify({
        autoWrapTables: true,
        autoPositionImages: true,
        includePageNumbers: true,
        includeHeaders: false
      })
    };
    
    await this.db.insert(projects).values(defaultProject);
  }

  async getProject(id: string): Promise<Project | undefined> {
    const result = await this.db.select().from(projects).where(eq(projects.id, id)).limit(1);
    const project = result[0];
    if (!project) return undefined;

    // Parse JSON fields
    return {
      ...project,
      coverConfig: project.coverConfig ? JSON.parse(project.coverConfig) : null,
      settings: project.settings ? JSON.parse(project.settings) : null
    };
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const projectData = {
      id,
      title: insertProject.title,
      author: insertProject.author,
      content: insertProject.content || "",
      theme: insertProject.theme || "modern",
      columnLayout: insertProject.columnLayout || "single",
      coverConfig: insertProject.coverConfig ? JSON.stringify(insertProject.coverConfig) : null,
      settings: insertProject.settings ? JSON.stringify(insertProject.settings) : null
    };
    
    await this.db.insert(projects).values(projectData);
    
    const result = await this.getProject(id);
    if (!result) throw new Error("Failed to create project");
    return result;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const updateData: any = {};
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.author !== undefined) updateData.author = updates.author;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.theme !== undefined) updateData.theme = updates.theme;
    if (updates.columnLayout !== undefined) updateData.columnLayout = updates.columnLayout;
    if (updates.coverConfig !== undefined) {
      updateData.coverConfig = updates.coverConfig ? JSON.stringify(updates.coverConfig) : null;
    }
    if (updates.settings !== undefined) {
      updateData.settings = updates.settings ? JSON.stringify(updates.settings) : null;
    }
    
    await this.db.update(projects)
      .set(updateData)
      .where(eq(projects.id, id));
    
    return this.getProject(id);
  }

  async listProjects(): Promise<Project[]> {
    const results = await this.db.select().from(projects);
    return results.map(project => ({
      ...project,
      coverConfig: project.coverConfig ? JSON.parse(project.coverConfig) : null,
      settings: project.settings ? JSON.parse(project.settings) : null
    }));
  }

  async getImage(id: string): Promise<Image | undefined> {
    const result = await this.db.select().from(images).where(eq(images.id, id)).limit(1);
    return result[0];
  }

  async createImage(insertImage: InsertImage): Promise<Image> {
    const id = randomUUID();
    const imageData = {
      id,
      projectId: insertImage.projectId || null,
      filename: insertImage.filename,
      originalName: insertImage.originalName,
      size: insertImage.size,
      mimetype: insertImage.mimetype,
      url: insertImage.url
    };
    
    await this.db.insert(images).values(imageData);
    
    const result = await this.getImage(id);
    if (!result) throw new Error("Failed to create image");
    return result;
  }

  async getProjectImages(projectId: string): Promise<Image[]> {
    return await this.db.select().from(images).where(eq(images.projectId, projectId));
  }

  async deleteImage(id: string): Promise<boolean> {
    const result = await this.db.delete(images).where(eq(images.id, id));
    return result.changes > 0;
  }
}

export class MemStorage implements IStorage {
  private projects: Map<string, Project>;
  private images: Map<string, Image>;

  constructor() {
    this.projects = new Map();
    this.images = new Map();
    
    // Create a default project
    const defaultProject: Project = {
      id: "default",
      title: "My Book",
      author: "Author Name",
      content: "# Chapter 1: Introduction\n\nWelcome to your book...",
      theme: "modern",
      columnLayout: "single",
      coverConfig: {
        title: "My Book",
        author: "Author Name"
      },
      settings: {
        autoWrapTables: true,
        autoPositionImages: true,
        includePageNumbers: true,
        includeHeaders: false
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.projects.set(defaultProject.id, defaultProject);
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const project: Project = {
      id,
      title: insertProject.title,
      author: insertProject.author,
      content: insertProject.content || "",
      theme: insertProject.theme || "modern",
      columnLayout: insertProject.columnLayout || "single",
      coverConfig: insertProject.coverConfig || null,
      settings: insertProject.settings || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;

    const updatedProject: Project = {
      ...project,
      title: updates.title ?? project.title,
      author: updates.author ?? project.author,
      content: updates.content ?? project.content,
      theme: updates.theme ?? project.theme,
      columnLayout: updates.columnLayout ?? project.columnLayout,
      coverConfig: updates.coverConfig ?? project.coverConfig,
      settings: updates.settings ?? project.settings,
      updatedAt: new Date()
    };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async listProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getImage(id: string): Promise<Image | undefined> {
    return this.images.get(id);
  }

  async createImage(insertImage: InsertImage): Promise<Image> {
    const id = randomUUID();
    const image: Image = {
      id,
      projectId: insertImage.projectId || null,
      filename: insertImage.filename,
      originalName: insertImage.originalName,
      size: insertImage.size,
      mimetype: insertImage.mimetype,
      url: insertImage.url,
      createdAt: new Date()
    };
    this.images.set(id, image);
    return image;
  }

  async getProjectImages(projectId: string): Promise<Image[]> {
    return Array.from(this.images.values()).filter(
      (image) => image.projectId === projectId
    );
  }

  async deleteImage(id: string): Promise<boolean> {
    return this.images.delete(id);
  }
}

export const storage = new SqliteStorage();