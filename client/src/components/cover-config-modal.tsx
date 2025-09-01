import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface CoverConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  coverConfig: any;
  onSave: (config: any) => void;
}

export default function CoverConfigModal({
  isOpen,
  onClose,
  coverConfig,
  onSave
}: CoverConfigModalProps) {
  const [config, setConfig] = useState(coverConfig || {});

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-testid="modal-cover-config">
        <DialogHeader>
          <DialogTitle>Configure Book Cover</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cover Design Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="cover-title">Cover Title</Label>
              <Input
                id="cover-title"
                value={config.title || ''}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                placeholder="Book Title"
                data-testid="input-cover-title"
              />
            </div>
            <div>
              <Label htmlFor="cover-subtitle">Subtitle</Label>
              <Input
                id="cover-subtitle"
                value={config.subtitle || ''}
                onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                placeholder="Subtitle (optional)"
                data-testid="input-cover-subtitle"
              />
            </div>
            <div>
              <Label htmlFor="cover-author">Author</Label>
              <Input
                id="cover-author"
                value={config.author || ''}
                onChange={(e) => setConfig({ ...config, author: e.target.value })}
                placeholder="Author Name"
                data-testid="input-cover-author"
              />
            </div>
            <div>
              <Label>Background Image</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-gray-400">
                <div className="text-sm text-muted-foreground">Upload cover image (coming soon)</div>
              </div>
            </div>
          </div>

          {/* Cover Preview */}
          <div className="bg-muted p-4 rounded-lg">
            <Card className="p-8 text-center shadow-lg" data-testid="cover-preview">
              <div className="space-y-4">
                <h1 className="text-2xl font-bold" data-testid="text-preview-title">
                  {config.title || 'Book Title'}
                </h1>
                {config.subtitle && (
                  <p className="text-lg text-muted-foreground" data-testid="text-preview-subtitle">
                    {config.subtitle}
                  </p>
                )}
                <div className="flex-1 my-8">
                  <div className="h-32 bg-accent rounded-lg flex items-center justify-center">
                    <span className="text-muted-foreground">Cover Image</span>
                  </div>
                </div>
                <p className="text-lg font-medium" data-testid="text-preview-author">
                  {config.author || 'Author Name'}
                </p>
              </div>
            </Card>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="secondary" onClick={onClose} data-testid="button-cancel-cover">
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="button-save-cover">
            Save Cover
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
