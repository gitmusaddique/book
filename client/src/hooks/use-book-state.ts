import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { exportBook, downloadBlob, type ExportOptions } from "@/lib/pdf-utils";
import type { Project } from "@shared/schema";

export function useBookState(projectId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const [bookState, setBookState] = useState({
    title: "My Book",
    author: "Author Name",
    content: "",
    theme: "modern",
    columnLayout: "single",
    coverConfig: {},
    settings: {
      autoWrapTables: true,
      autoPositionImages: true,
      includePageNumbers: true,
      includeHeaders: false
    }
  });

  // Update local state when project data loads
  useEffect(() => {
    if (project) {
      setBookState({
        title: project.title,
        author: project.author,
        content: project.content,
        theme: project.theme,
        columnLayout: project.columnLayout,
        coverConfig: project.coverConfig || {},
        settings: project.settings || {
          autoWrapTables: true,
          autoPositionImages: true,
          includePageNumbers: true,
          includeHeaders: false
        }
      });
    }
  }, [project]);

  // Auto-save mutation
  const saveProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PATCH', `/api/projects/${projectId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
    onError: () => {
      toast({ title: "Failed to save project", variant: "destructive" });
    }
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: ({ projectId, options }: { projectId: string; options: ExportOptions }) => 
      exportBook(projectId, options),
    onSuccess: (blob, variables) => {
      const filename = `${bookState.title}.${variables.options.format}`;
      downloadBlob(blob, filename);
      toast({ title: "Book exported successfully" });
    },
    onError: () => {
      toast({ title: "Failed to export book", variant: "destructive" });
    }
  });

  // Auto-save debounced content changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (project && bookState.content !== project.content) {
        saveProjectMutation.mutate({ content: bookState.content });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [bookState.content, project]);

  const updateContent = (content: string) => {
    setBookState(prev => ({ ...prev, content }));
  };

  const updateSettings = (updates: any) => {
    setBookState(prev => ({ ...prev, ...updates }));
    saveProjectMutation.mutate(updates);
  };

  const updateCoverConfig = (coverConfig: any) => {
    setBookState(prev => ({ ...prev, coverConfig }));
    saveProjectMutation.mutate({ coverConfig });
  };

  const saveProject = () => {
    saveProjectMutation.mutate(bookState);
  };

  const exportBookFn = (options: ExportOptions) => {
    exportMutation.mutate({ projectId, options });
  };

  return {
    bookState,
    updateContent,
    updateSettings,
    updateCoverConfig,
    saveProject,
    exportBook: exportBookFn,
    isSaving: saveProjectMutation.isPending,
    isExporting: exportMutation.isPending,
  };
}
