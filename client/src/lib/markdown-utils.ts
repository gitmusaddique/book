import { marked } from "marked";

export function parseMarkdownToHTML(markdown: string): string {
  try {
    const result = marked(markdown);
    return typeof result === 'string' ? result : '';
  } catch (error) {
    console.error('Error parsing markdown:', error);
    return '';
  }
}

export interface TOCItem {
  title: string;
  level: number;
  page?: number;
}

export function generateTableOfContents(markdown: string): TOCItem[] {
  const lines = markdown.split('\n');
  const tocItems: TOCItem[] = [];
  
  lines.forEach(line => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const title = match[2].trim();
      tocItems.push({ title, level });
    }
  });
  
  return tocItems;
}

export function getWordCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

export function getEstimatedReadingTime(wordCount: number): number {
  // Average reading speed is 200-250 words per minute
  return Math.ceil(wordCount / 225);
}
