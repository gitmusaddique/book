import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookSchema, insertChapterSchema, insertImageSchema, exportSettingsSchema } from "@shared/schema";
import multer, { type FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { marked } from "marked";
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

  // Book routes
  app.get("/api/books", async (req, res) => {
    try {
      const books = await storage.listBooks();
      res.json(books);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch books" });
    }
  });

  app.get("/api/books/:id", async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);
      const book = await storage.getBook(bookId);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      res.json(book);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch book" });
    }
  });

  app.post("/api/books", async (req, res) => {
    try {
      const data = insertBookSchema.parse({
        ...req.body,
        filename: storage.generateFilename(req.body.title)
      });
      const book = await storage.createBook(data);
      res.status(201).json(book);
    } catch (error) {
      res.status(400).json({ message: "Invalid book data" });
    }
  });

  app.patch("/api/books/:id", async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);
      const updates = insertBookSchema.partial().parse(req.body);
      const book = await storage.updateBook(bookId, updates);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      res.json(book);
    } catch (error) {
      res.status(400).json({ message: "Invalid update data" });
    }
  });

  app.delete("/api/books/:id", async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);
      const success = await storage.deleteBook(bookId);
      if (!success) {
        return res.status(404).json({ message: "Book not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete book" });
    }
  });

  // Chapter routes
  app.get("/api/books/:bookId/chapters", async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const chapters = await storage.getBookChapters(bookId);
      res.json(chapters);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chapters" });
    }
  });

  app.get("/api/chapters/:id", async (req, res) => {
    try {
      const chapterId = parseInt(req.params.id);
      const chapter = await storage.getChapter(chapterId);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }
      res.json(chapter);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chapter" });
    }
  });

  app.post("/api/books/:bookId/chapters", async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const data = insertChapterSchema.parse({
        ...req.body,
        bookId
      });
      const chapter = await storage.createChapter(data);
      res.status(201).json(chapter);
    } catch (error) {
      res.status(400).json({ message: "Invalid chapter data" });
    }
  });

  app.patch("/api/chapters/:id", async (req, res) => {
    try {
      const chapterId = parseInt(req.params.id);
      const updates = insertChapterSchema.partial().parse(req.body);
      const chapter = await storage.updateChapter(chapterId, updates);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }
      res.json(chapter);
    } catch (error) {
      res.status(400).json({ message: "Invalid chapter update data" });
    }
  });

  app.delete("/api/chapters/:id", async (req, res) => {
    try {
      const chapterId = parseInt(req.params.id);
      const success = await storage.deleteChapter(chapterId);
      if (!success) {
        return res.status(404).json({ message: "Chapter not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete chapter" });
    }
  });

  // Image routes
  app.get("/api/books/:id/images", async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);
      const images = await storage.getBookImages(bookId);
      res.json(images);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch images" });
    }
  });

  app.post("/api/books/:id/images", upload.single('image'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const imageData = {
        bookId: parseInt(req.params.id),
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
      const imageId = parseInt(req.params.id);
      const image = await storage.getImage(imageId);
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }

      // Delete file from filesystem
      const filePath = path.join(process.cwd(), "uploads", image.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      const deleted = await storage.deleteImage(imageId);
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
  app.post("/api/books/:id/export", async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);
      const book = await storage.getBook(bookId);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }

      const chapters = await storage.getBookChapters(bookId);

      // Use book's export settings or defaults
      const exportSettings = book.exportSettings || {
        pdfEngine: "pdflatex" as const,
        headerPath: "server/latex-header.tex",
        includeTOC: true,
        includeCover: true,
      };

      // Allow override from request
      const finalSettings = {
        ...exportSettings,
        ...req.body.exportSettings
      };

      try {
        console.log('Generating PDF with Pandoc...');
        
        // Save book content to file first
        const filePath = await storage.saveBookToFile(book, chapters);
        
        // Generate PDF using Pandoc
        const pdfBuffer = await generatePDFWithPandoc(filePath, finalSettings);
        console.log('PDF generated successfully, buffer size:', pdfBuffer.length);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${book.filename}.pdf"`);
        res.send(pdfBuffer);
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        res.status(500).json({ message: "Failed to generate PDF" });
      }
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
  
  const themeStyles = getThemeStyles();
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

function getThemeStyles(): string {
  // Single default theme for clean, professional look
  return `
    body { 
      margin: 0; 
      padding: 0; 
      line-height: 1.6; 
      color: #000; 
      background: #fff; 
      font-family: 'Georgia', serif; 
      font-size: 12pt; 
    }
    h1, h2, h3, h4, h5, h6 { 
      margin: 1.5em 0 0.5em; 
      font-weight: bold; 
      color: #333;
    }
    h1 { font-size: 24pt; text-align: center; page-break-before: always; }
    h2 { font-size: 18pt; margin-top: 2em; }
    h3 { font-size: 16pt; }
    h4 { font-size: 14pt; }
    p { margin: 0.75em 0; text-align: justify; }
    ul, ol { margin: 0.75em 0; padding-left: 2em; }
    .drop-cap {
      float: left;
      font-size: 48pt;
      line-height: 40pt;
      padding-right: 8pt;
      margin-top: 4pt;
      font-weight: bold;
    }
  `;
}

async function generatePDFWithPandoc(markdownFilePath: string, exportSettings: any): Promise<Buffer> {
  // Generate temporary PDF output file
  const tempDir = '/tmp';
  const pdfFile = path.join(tempDir, `book-${Date.now()}.pdf`);
  
  // Use the export settings to determine PDF engine and header path
  const pdfEngine = exportSettings.pdfEngine || 'pdflatex';
  const headerPath = path.join(process.cwd(), exportSettings.headerPath || 'server/latex-header.tex');
  
  try {
    // Convert markdown to PDF using pandoc with LaTeX header
    const pandocCmd = `pandoc "${markdownFilePath}" -H "${headerPath}" -o "${pdfFile}" --pdf-engine=${pdfEngine}`;
    
    await execAsync(pandocCmd);
    
    // Read the generated PDF
    const pdfBuffer = fs.readFileSync(pdfFile);
    
    // Clean up temporary PDF file
    fs.unlinkSync(pdfFile);
    
    return pdfBuffer;
  } catch (error) {
    // Clean up PDF file if it exists
    try {
      if (fs.existsSync(pdfFile)) fs.unlinkSync(pdfFile);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    throw error;
  }
}
