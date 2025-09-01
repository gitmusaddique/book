import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import MarkdownEditor from "@/components/markdown-editor";
import LivePreview from "@/components/live-preview";
import Sidebar from "@/components/sidebar";
import CoverConfigModal from "@/components/cover-config-modal";
import ExportModal from "@/components/export-modal";
import { useBookState } from "@/hooks/use-book-state";
import { Button } from "@/components/ui/button";
import { Save, Download } from "lucide-react";

export default function BookEditor() {
  const { id } = useParams();
  const projectId = id || "default";
  
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const {
    bookState,
    updateContent,
    updateSettings,
    updateCoverConfig,
    saveProject,
    exportBook,
    isSaving,
    isExporting
  } = useBookState(projectId);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(280, Math.min(600, e.clientX));
      setLeftPanelWidth(newWidth);
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

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-lg">Loading project...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold" data-testid="app-title">MarkBook</h1>
          <div className="text-sm text-muted-foreground">Markdown to Book Converter</div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="secondary" 
            onClick={saveProject}
            disabled={isSaving}
            data-testid="button-save-project"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Project"}
          </Button>
          <Button 
            onClick={() => setShowExportModal(true)}
            disabled={isExporting}
            data-testid="button-export-pdf"
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div 
          className="bg-muted border-r border-border flex flex-col"
          style={{ width: leftPanelWidth }}
        >
          <Sidebar
            bookState={bookState}
            onUpdateSettings={updateSettings}
            onUpdateCoverConfig={updateCoverConfig}
            onConfigureCover={() => setShowCoverModal(true)}
            projectId={projectId}
          />
        </div>

        {/* Resizer */}
        <div
          className="resizer"
          onMouseDown={() => setIsResizing(true)}
          data-testid="panel-resizer"
        />

        {/* Main Editor Area */}
        <div className="flex-1 flex">
          <MarkdownEditor
            content={bookState.content}
            onContentChange={updateContent}
            projectId={projectId}
          />

          {/* Resizer */}
          <div className="resizer" />

          <LivePreview
            content={bookState.content}
            theme={bookState.theme}
            columnLayout={bookState.columnLayout}
            coverConfig={bookState.coverConfig}
            title={bookState.title}
            author={bookState.author}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-muted border-t border-border px-6 py-2 text-sm text-muted-foreground flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span>Ready</span>
          <span>•</span>
          <span>Auto-save: <span className="text-foreground">Enabled</span></span>
          <span>•</span>
          <span>Last saved: <span>Just now</span></span>
        </div>
        <div className="flex items-center space-x-4">
          <span>Theme: <span className="text-foreground">{bookState.theme}</span></span>
          <span>•</span>
          <span>Layout: <span className="text-foreground">{bookState.columnLayout} Column</span></span>
        </div>
      </div>

      {/* Modals */}
      <CoverConfigModal
        isOpen={showCoverModal}
        onClose={() => setShowCoverModal(false)}
        coverConfig={bookState.coverConfig}
        onSave={updateCoverConfig}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={exportBook}
        isExporting={isExporting}
        project={bookState}
      />
    </div>
  );
}
