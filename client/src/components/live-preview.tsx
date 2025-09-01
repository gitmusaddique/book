import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut } from "lucide-react";
import { generateTableOfContents, parseMarkdownToHTML } from "@/lib/markdown-utils";

interface LivePreviewProps {
  content: string;
  theme: string;
  columnLayout: string;
  coverConfig: any;
  title: string;
  author: string;
}

type PreviewMode = 'content' | 'toc' | 'cover';

export default function LivePreview({
  content,
  theme,
  columnLayout,
  coverConfig,
  title,
  author
}: LivePreviewProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('content');
  const [zoom, setZoom] = useState(100);

  const htmlContent = useMemo(() => parseMarkdownToHTML(content), [content]);
  const tableOfContents = useMemo(() => generateTableOfContents(content), [content]);

  const handleZoomIn = () => setZoom(prev => Math.min(200, prev + 10));
  const handleZoomOut = () => setZoom(prev => Math.max(50, prev - 10));

  const themeClass = `theme-${theme}`;
  const columnClass = columnLayout === 'double' ? 'double-column' : '';

  return (
    <div className="flex-1 flex flex-col bg-secondary">
      {/* Preview Toolbar */}
      <div className="bg-card border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="font-semibold">Live Preview</h3>
          <div className="flex space-x-1">
            <Button
              variant={previewMode === 'toc' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setPreviewMode('toc')}
              data-testid="button-show-toc"
            >
              TOC
            </Button>
            <Button
              variant={previewMode === 'content' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setPreviewMode('content')}
              data-testid="button-show-content"
            >
              Content
            </Button>
            <Button
              variant={previewMode === 'cover' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setPreviewMode('cover')}
              data-testid="button-show-cover"
            >
              Cover
            </Button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            data-testid="button-zoom-out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground" data-testid="text-zoom-level">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            data-testid="button-zoom-in"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 p-4 overflow-auto">
        <div 
          className="max-w-2xl mx-auto"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
        >
          {/* Book Cover Preview */}
          {previewMode === 'cover' && (
            <div className="book-preview bg-white border border-border rounded-lg p-8 mb-6" data-testid="cover-preview">
              <div className="text-center">
                <h1 className="text-3xl font-bold mb-4" data-testid="text-cover-title">
                  {coverConfig?.title || title}
                </h1>
                {coverConfig?.subtitle && (
                  <div className="text-lg text-muted-foreground mb-8" data-testid="text-cover-subtitle">
                    {coverConfig.subtitle}
                  </div>
                )}
                <div className="text-lg text-muted-foreground mb-8" data-testid="text-cover-author">
                  {coverConfig?.author || author}
                </div>
                <div className="border-t border-border pt-4">
                  <div className="text-sm text-muted-foreground">Published with MarkBook</div>
                </div>
              </div>
            </div>
          )}

          {/* Table of Contents Preview */}
          {previewMode === 'toc' && (
            <div className="bg-white border border-border rounded-lg p-6 mb-6" data-testid="toc-preview">
              <h2 className="text-xl font-bold mb-4 text-center">Table of Contents</h2>
              <div className="space-y-2">
                {tableOfContents.length === 0 ? (
                  <p className="text-muted-foreground text-center" data-testid="text-toc-empty">
                    No headings found. Add headings to your content to generate a table of contents.
                  </p>
                ) : (
                  tableOfContents.map((item, index) => (
                    <div 
                      key={index}
                      className="flex justify-between items-center py-1"
                      style={{ marginLeft: `${(item.level - 1) * 20}px` }}
                      data-testid={`toc-item-${index}`}
                    >
                      <span>{item.title}</span>
                      <span className="text-muted-foreground">{item.page || index + 1}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Content Preview */}
          {previewMode === 'content' && (
            <div 
              className={`bg-white border border-border rounded-lg p-8 ${themeClass} ${columnClass}`}
              data-testid="content-preview"
            >
              {htmlContent ? (
                <div 
                  className="markdown-content"
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              ) : (
                <p className="text-muted-foreground text-center" data-testid="text-content-empty">
                  Start writing in the editor to see your content here.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
