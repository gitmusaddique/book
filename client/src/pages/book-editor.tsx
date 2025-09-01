import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Save, 
  Download, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Edit, 
  Trash2,
  Settings,
  BookOpen,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Book {
  id: number;
  title: string;
  author: string;
  filename: string;
  coverConfig?: {
    title?: string;
    subtitle?: string;
    author?: string;
  };
  exportSettings: {
    pdfEngine: "pdflatex" | "xelatex" | "lualatex";
    headerPath: string;
    includeTOC: boolean;
    includeCover: boolean;
  };
}

interface Chapter {
  id: number;
  bookId: number;
  title: string;
  content: string;
  orderIndex: number;
  pageNumber: number;
}

export default function BookEditor() {
  const { id } = useParams();
  const bookId = parseInt(id!);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // UI State
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  // Form State
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Data Fetching
  const { data: book, isLoading: bookLoading } = useQuery<Book>({
    queryKey: ['/api/books', bookId],
    enabled: !!bookId,
  });

  const { data: chapters = [], isLoading: chaptersLoading } = useQuery<Chapter[]>({
    queryKey: ['/api/books', bookId, 'chapters'],
    enabled: !!bookId,
  });

  // Mutations
  const createChapterMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await fetch(`/api/books/${bookId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: "# " + title + "\n\nStart writing your chapter here...",
          orderIndex: chapters.length,
          pageNumber: chapters.length + 1,
        }),
      });
      if (!response.ok) throw new Error('Failed to create chapter');
      return response.json();
    },
    onSuccess: (newChapter) => {
      queryClient.invalidateQueries({ queryKey: ['/api/books', bookId, 'chapters'] });
      setSelectedChapter(newChapter);
      setEditingContent(newChapter.content);
      setShowChapterModal(false);
      setNewChapterTitle("");
      toast({ title: "Success", description: "Chapter created successfully!" });
    },
  });

  const updateChapterMutation = useMutation({
    mutationFn: async ({ chapterId, updates }: { chapterId: number; updates: Partial<Chapter> }) => {
      const response = await fetch(`/api/chapters/${chapterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update chapter');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/books', bookId, 'chapters'] });
      setHasUnsavedChanges(false);
      toast({ title: "Success", description: "Chapter saved successfully!" });
    },
  });

  const exportBookMutation = useMutation({
    mutationFn: async (exportSettings: any) => {
      const response = await fetch(`/api/books/${bookId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exportSettings }),
      });
      if (!response.ok) throw new Error('Failed to export book');
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${book?.filename || 'book'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Success", description: "Book exported successfully!" });
      setShowExportModal(false);
    },
  });

  // Effects
  useEffect(() => {
    if (chapters.length > 0 && !selectedChapter) {
      const firstChapter = chapters[0];
      setSelectedChapter(firstChapter);
      setEditingContent(firstChapter.content);
    }
  }, [chapters, selectedChapter]);

  useEffect(() => {
    setHasUnsavedChanges(editingContent !== (selectedChapter?.content || ""));
  }, [editingContent, selectedChapter]);

  // Resize handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(280, Math.min(600, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Handlers
  const handleSaveChapter = () => {
    if (!selectedChapter) return;
    updateChapterMutation.mutate({
      chapterId: selectedChapter.id,
      updates: { content: editingContent },
    });
  };

  const handleChapterSelect = (chapter: Chapter) => {
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Do you want to discard them?")) {
        return;
      }
    }
    setSelectedChapter(chapter);
    setEditingContent(chapter.content);
  };

  const handleCreateChapter = () => {
    if (!newChapterTitle.trim()) {
      toast({ title: "Error", description: "Please enter a chapter title.", variant: "destructive" });
      return;
    }
    createChapterMutation.mutate(newChapterTitle.trim());
  };

  const getCurrentChapterIndex = () => {
    return chapters.findIndex(ch => ch.id === selectedChapter?.id);
  };

  const navigateChapter = (direction: 'prev' | 'next') => {
    const currentIndex = getCurrentChapterIndex();
    let newIndex = currentIndex;
    
    if (direction === 'prev' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'next' && currentIndex < chapters.length - 1) {
      newIndex = currentIndex + 1;
    }
    
    if (newIndex !== currentIndex) {
      handleChapterSelect(chapters[newIndex]);
    }
  };

  if (bookLoading || chaptersLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-lg">Loading book...</div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Book not found</h2>
          <Link href="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Library
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentIndex = getCurrentChapterIndex();

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Library
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="text-xl font-bold" data-testid="book-title">{book.title}</h1>
            <p className="text-sm text-muted-foreground">by {book.author}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Chapter Navigation */}
          <div className="flex items-center space-x-2 mr-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateChapter('prev')}
              disabled={currentIndex <= 0}
              data-testid="button-prev-chapter"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm px-3">
              Page {selectedChapter?.pageNumber || 1} of {chapters.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateChapter('next')}
              disabled={currentIndex >= chapters.length - 1}
              data-testid="button-next-chapter"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettingsModal(true)}
            data-testid="button-settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
          
          <Button
            variant="outline"
            onClick={handleSaveChapter}
            disabled={!hasUnsavedChanges || updateChapterMutation.isPending}
            data-testid="button-save"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateChapterMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
          
          <Button
            onClick={() => setShowExportModal(true)}
            data-testid="button-export"
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar - Chapter List */}
        <div 
          className="bg-card border-r border-border flex-shrink-0"
          style={{ width: `${sidebarWidth}px` }}
        >
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Chapters</h3>
              <Dialog open={showChapterModal} onOpenChange={setShowChapterModal}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-chapter">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Chapter</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="chapter-title">Chapter Title</Label>
                      <Input
                        id="chapter-title"
                        value={newChapterTitle}
                        onChange={(e) => setNewChapterTitle(e.target.value)}
                        placeholder="Enter chapter title..."
                        data-testid="input-chapter-title"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowChapterModal(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateChapter}
                        disabled={createChapterMutation.isPending}
                        data-testid="button-create-chapter"
                      >
                        {createChapterMutation.isPending ? 'Creating...' : 'Create Chapter'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2">
              {chapters.map((chapter, index) => (
                <Card
                  key={chapter.id}
                  className={`mb-2 cursor-pointer transition-colors ${
                    selectedChapter?.id === chapter.id 
                      ? 'bg-primary/10 border-primary' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => handleChapterSelect(chapter)}
                  data-testid={`chapter-${chapter.id}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">{chapter.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          Page {chapter.pageNumber}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Math.ceil(chapter.content.length / 250)} min read
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Resize Handle */}
        <div
          className="w-1 bg-border cursor-col-resize hover:bg-primary/50 transition-colors"
          onMouseDown={() => setIsResizing(true)}
        />

        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedChapter ? (
            <>
              <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold" data-testid="chapter-title">
                  {selectedChapter.title}
                </h2>
              </div>
              <div className="flex-1 p-4">
                <Textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  placeholder="Start writing your chapter..."
                  className="w-full h-full resize-none font-mono text-sm"
                  data-testid="chapter-editor"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No chapters yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first chapter to start writing!
                </p>
                <Button onClick={() => setShowChapterModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Chapter
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Book as PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>PDF Engine</Label>
              <Select defaultValue={book.exportSettings?.pdfEngine || "pdflatex"}>
                <SelectTrigger data-testid="select-pdf-engine">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdflatex">pdflatex</SelectItem>
                  <SelectItem value="xelatex">xelatex</SelectItem>
                  <SelectItem value="lualatex">lualatex</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>LaTeX Header Path</Label>
              <Input
                defaultValue={book.exportSettings?.headerPath || "server/latex-header.tex"}
                data-testid="input-header-path"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-toc"
                defaultChecked={book.exportSettings?.includeTOC !== false}
                data-testid="checkbox-include-toc"
              />
              <Label htmlFor="include-toc">Include Table of Contents with Numbers</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-cover"
                defaultChecked={book.exportSettings?.includeCover !== false}
                data-testid="checkbox-include-cover"
              />
              <Label htmlFor="include-cover">Include Cover Page</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowExportModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => exportBookMutation.mutate(book.exportSettings)}
                disabled={exportBookMutation.isPending}
                data-testid="button-export-pdf"
              >
                {exportBookMutation.isPending ? 'Exporting...' : 'Export PDF'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}