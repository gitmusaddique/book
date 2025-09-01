import { type Project, type InsertProject, type Image, type InsertImage } from "@shared/schema";
import { randomUUID } from "crypto";

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
      ...insertProject,
      id,
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
      ...updates,
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
      ...insertImage,
      id,
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

export const storage = new MemStorage();
