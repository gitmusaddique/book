import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Upload, Plus, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps {
  bookState: any;
  onUpdateSettings: (settings: any) => void;
  onUpdateCoverConfig: (config: any) => void;
  onConfigureCover: () => void;
  projectId: string;
}

export default function Sidebar({
  bookState,
  onUpdateSettings,
  onUpdateCoverConfig,
  onConfigureCover,
  projectId
}: SidebarProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: images = [] } = useQuery({
    queryKey: ["/api/projects", projectId, "images"],
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      const response = await apiRequest('POST', `/api/projects/${projectId}/images`, formData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "images"] });
      toast({ title: "Image uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to upload image", variant: "destructive" });
    }
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      await apiRequest('DELETE', `/api/images/${imageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "images"] });
      toast({ title: "Image deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete image", variant: "destructive" });
    }
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File size must be less than 5MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      await uploadImageMutation.mutateAsync(file);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleThemeChange = (theme: string) => {
    onUpdateSettings({ ...bookState, theme });
  };

  const handleLayoutChange = (columnLayout: string) => {
    onUpdateSettings({ ...bookState, columnLayout });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Project Info */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold mb-3">Book Configuration</h3>
        <div className="space-y-3">
          <div>
            <Label htmlFor="book-title">Book Title</Label>
            <Input
              id="book-title"
              value={bookState.title}
              onChange={(e) => onUpdateSettings({ ...bookState, title: e.target.value })}
              placeholder="Enter book title"
              data-testid="input-book-title"
            />
          </div>
          <div>
            <Label htmlFor="book-author">Author</Label>
            <Input
              id="book-author"
              value={bookState.author}
              onChange={(e) => onUpdateSettings({ ...bookState, author: e.target.value })}
              placeholder="Enter author name"
              data-testid="input-book-author"
            />
          </div>
        </div>
      </div>

      {/* Theme Selection */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold mb-3">Book Theme</h3>
        <RadioGroup value={bookState.theme} onValueChange={handleThemeChange}>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 p-3 border border-border rounded-md hover:bg-accent">
              <RadioGroupItem value="modern" id="theme-modern" data-testid="radio-theme-modern" />
              <div className="flex-1">
                <Label htmlFor="theme-modern" className="font-medium">Modern</Label>
                <div className="text-sm text-muted-foreground">Clean, minimalist design</div>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-3 border border-border rounded-md hover:bg-accent">
              <RadioGroupItem value="bible" id="theme-bible" data-testid="radio-theme-bible" />
              <div className="flex-1">
                <Label htmlFor="theme-bible" className="font-medium">Classic Bible</Label>
                <div className="text-sm text-muted-foreground">Traditional serif styling</div>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-3 border border-border rounded-md hover:bg-accent">
              <RadioGroupItem value="science" id="theme-science" data-testid="radio-theme-science" />
              <div className="flex-1">
                <Label htmlFor="theme-science" className="font-medium">Scientific Journal</Label>
                <div className="text-sm text-muted-foreground">Academic publication style</div>
              </div>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Layout Options */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold mb-3">Layout Options</h3>
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium mb-2 block">Column Layout</Label>
            <div className="flex space-x-2">
              <Button
                variant={bookState.columnLayout === 'single' ? 'default' : 'secondary'}
                size="sm"
                className="flex-1"
                onClick={() => handleLayoutChange('single')}
                data-testid="button-layout-single"
              >
                Single
              </Button>
              <Button
                variant={bookState.columnLayout === 'double' ? 'default' : 'secondary'}
                size="sm"
                className="flex-1"
                onClick={() => handleLayoutChange('double')}
                data-testid="button-layout-double"
              >
                Double
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Auto-wrap Tables</Label>
            <Checkbox 
              checked={bookState.settings?.autoWrapTables}
              onCheckedChange={(checked) => 
                onUpdateSettings({ 
                  ...bookState, 
                  settings: { ...bookState.settings, autoWrapTables: checked } 
                })
              }
              data-testid="checkbox-auto-wrap-tables"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Auto-position Images</Label>
            <Checkbox 
              checked={bookState.settings?.autoPositionImages}
              onCheckedChange={(checked) => 
                onUpdateSettings({ 
                  ...bookState, 
                  settings: { ...bookState.settings, autoPositionImages: checked } 
                })
              }
              data-testid="checkbox-auto-position-images"
            />
          </div>
        </div>
      </div>

      {/* Cover Configuration */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold mb-3">Cover Configuration</h3>
        <div className="space-y-3">
          <Button
            variant="secondary"
            className="w-full justify-start"
            onClick={onConfigureCover}
            data-testid="button-configure-cover"
          >
            Configure Book Cover
          </Button>
        </div>
      </div>

      {/* Image Management */}
      <div className="p-4 flex-1 overflow-hidden">
        <h3 className="font-semibold mb-3">Image Library</h3>
        
        {/* Upload Area */}
        <div className="space-y-2 mb-4">
          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="image-upload"
              data-testid="input-image-upload"
            />
            <Label htmlFor="image-upload" className="cursor-pointer">
              <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                {isUploading ? "Uploading..." : "Drop images here or click to upload"}
              </div>
            </Label>
          </div>
        </div>

        {/* Image List */}
        <div className="space-y-2 max-h-64 overflow-y-auto" data-testid="image-list">
          {images.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-images">
              No images uploaded yet
            </p>
          ) : (
            images.map((image: any) => (
              <Card key={image.id} className="flex items-center p-2" data-testid={`image-item-${image.id}`}>
                <img
                  src={image.url}
                  alt={image.originalName}
                  className="w-12 h-8 object-cover rounded mr-3"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{image.originalName}</div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round(parseInt(image.size) / 1024)} KB
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Copy image markdown to clipboard
                    navigator.clipboard.writeText(`![${image.originalName}](${image.url})`);
                    toast({ title: "Image markdown copied to clipboard" });
                  }}
                  data-testid={`button-copy-image-${image.id}`}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteImageMutation.mutate(image.id)}
                  data-testid={`button-delete-image-${image.id}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
