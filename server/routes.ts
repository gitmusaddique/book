import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertImageSchema } from "@shared/schema";
import multer, { type FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { marked } from "marked";
import puppeteer from "puppeteer";

interface MulterRequest extends Request {
  file?: any;
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req: Request, file: any, cb: (error: Error | null, destination: string) => void) => {
      const uploadDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req: Request, file: any, cb: (error: Error | null, filename: string) => void) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: (req: Request, file: any, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    const uploadsPath = path.join(process.cwd(), "uploads");
    require('express').static(uploadsPath)(req, res, next);
  });

  // Project routes
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.listProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const data = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(data);
      res.status(201).json(project);
    } catch (error) {
      res.status(400).json({ message: "Invalid project data" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const updates = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, updates);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(400).json({ message: "Invalid update data" });
    }
  });

  // Image routes
  app.get("/api/projects/:id/images", async (req, res) => {
    try {
      const images = await storage.getProjectImages(req.params.id);
      res.json(images);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch images" });
    }
  });

  app.post("/api/projects/:id/images", upload.single('image'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const imageData = {
        projectId: req.params.id,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size.toString(),
        mimetype: req.file.mimetype,
        url: `/uploads/${req.file.filename}`
      };

      const image = await storage.createImage(imageData);
      res.status(201).json(image);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  app.delete("/api/images/:id", async (req, res) => {
    try {
      const image = await storage.getImage(req.params.id);
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }

      // Delete file from filesystem
      const filePath = path.join(process.cwd(), "uploads", image.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      const deleted = await storage.deleteImage(req.params.id);
      if (deleted) {
        res.json({ message: "Image deleted successfully" });
      } else {
        res.status(404).json({ message: "Image not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete image" });
    }
  });

  // PDF Export route
  app.post("/api/projects/:id/export", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const { format = "pdf", pageSize = "a4", options = {} } = req.body;

      // Generate HTML content
      const htmlContent = await generateBookHTML(project, options);

      if (format === "pdf") {
        // Generate actual PDF using Puppeteer
        const browser = await puppeteer.launch({
          headless: true,
          executablePath: '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium',
          args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ]
        });
        
        try {
          const page = await browser.newPage();
          
          // Set viewport for consistent rendering
          await page.setViewport({ width: 1200, height: 800 });
          
          // Load HTML content with a timeout
          await page.setContent(htmlContent, { 
            waitUntil: ['domcontentloaded', 'networkidle0'], 
            timeout: 30000 
          });
          
          // Wait a bit more for any fonts/styles to load
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const pdfOptions: any = {
            format: pageSize.toUpperCase(),
            printBackground: true,
            margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
            preferCSSPageSize: false
          };
          
          console.log('Generating PDF with options:', pdfOptions);
          const pdfBuffer = await page.pdf(pdfOptions);
          console.log('PDF generated, buffer size:', pdfBuffer.length);
          
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${project.title}.pdf"`);
          res.send(pdfBuffer);
        } finally {
          await browser.close();
        }
        return;
      }
      
      // HTML export
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${project.title}.html"`);
      res.send(htmlContent);
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ message: "Failed to export book" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function generateBookHTML(project: any, options: any): Promise<string> {
  const { content, theme, columnLayout, coverConfig } = project;
  
  // Parse markdown content
  const htmlContent = marked(content);
  
  // Generate table of contents
  const tocItems = generateTableOfContents(content);
  
  const themeStyles = getThemeStyles(theme);
  const layoutStyles = columnLayout === 'double' ? 'columns: 2; column-gap: 2rem;' : '';

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${project.title}</title>
    <style>
        ${themeStyles}
        .content { ${layoutStyles} }
        .cover-page { page-break-after: always; text-align: center; padding: 2in; }
        .toc-page { page-break-after: always; }
        .content { page-break-before: always; }
        h1 { page-break-before: always; }
        img { max-width: 100%; height: auto; }
        table { width: 100%; border-collapse: collapse; break-inside: auto; }
        td, th { border: 1px solid #000; padding: 8px; }
    </style>
</head>
<body>
    ${options.includeCover ? `
    <div class="cover-page">
        <h1>${coverConfig?.title || project.title}</h1>
        ${coverConfig?.subtitle ? `<h2>${coverConfig.subtitle}</h2>` : ''}
        <p>${coverConfig?.author || project.author}</p>
    </div>
    ` : ''}
    
    ${options.includeTOC ? `
    <div class="toc-page">
        <h2>Table of Contents</h2>
        <ul>
            ${tocItems.map(item => `
            <li style="margin-left: ${item.level * 20}px;">
                ${item.title}
            </li>
            `).join('')}
        </ul>
    </div>
    ` : ''}
    
    <div class="content">
        ${htmlContent}
    </div>
</body>
</html>
  `;
}

function generateTableOfContents(markdown: string) {
  const lines = markdown.split('\n');
  const tocItems: Array<{ title: string; level: number }> = [];
  
  lines.forEach(line => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const title = match[2];
      tocItems.push({ title, level });
    }
  });
  
  return tocItems;
}

function getThemeStyles(theme: string): string {
  const baseStyles = `
    body { margin: 0; padding: 0; line-height: 1.6; color: #000; background: #fff; }
    h1, h2, h3, h4, h5, h6 { margin: 1.5em 0 0.5em; font-weight: bold; }
    p { margin: 0.75em 0; }
    ul, ol { margin: 0.75em 0; padding-left: 2em; }
  `;

  switch (theme) {
    case 'bible':
      return baseStyles + `
        body { font-family: 'Times New Roman', serif; font-size: 12pt; }
        h1 { font-size: 18pt; text-align: center; }
        h2 { font-size: 16pt; }
        h3 { font-size: 14pt; }
      `;
    case 'science':
      return baseStyles + `
        body { font-family: 'Georgia', serif; font-size: 11pt; }
        h1 { font-size: 16pt; border-bottom: 2px solid #000; }
        h2 { font-size: 14pt; border-bottom: 1px solid #000; }
        h3 { font-size: 12pt; font-style: italic; }
      `;
    default: // modern
      return baseStyles + `
        body { font-family: 'Inter', sans-serif; font-size: 11pt; }
        h1 { font-size: 20pt; }
        h2 { font-size: 16pt; }
        h3 { font-size: 14pt; }
      `;
  }
}
