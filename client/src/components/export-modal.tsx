import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Download } from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: any) => void;
  isExporting: boolean;
  project: any;
}

export default function ExportModal({
  isOpen,
  onClose,
  onExport,
  isExporting,
  project
}: ExportModalProps) {
  const [exportOptions, setExportOptions] = useState({
    format: 'pdf',
    pageSize: 'a4',
    includeTOC: true,
    includeCover: true,
    includePageNumbers: true,
    includeHeaders: false
  });

  const handleExport = () => {
    onExport(exportOptions);
  };

  const estimatedWordCount = project?.content?.split(/\s+/).filter((word: string) => word.length > 0).length || 0;
  const estimatedPages = Math.max(1, Math.ceil(estimatedWordCount / 250));
  const estimatedSize = (estimatedPages * 0.1).toFixed(1);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="modal-export">
        <DialogHeader>
          <DialogTitle>Export Book</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Export Format</Label>
            <Select
              value={exportOptions.format}
              onValueChange={(value) => setExportOptions({ ...exportOptions, format: value })}
            >
              <SelectTrigger data-testid="select-export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF Document</SelectItem>
                <SelectItem value="html">HTML Package</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Page Size</Label>
            <Select
              value={exportOptions.pageSize}
              onValueChange={(value) => setExportOptions({ ...exportOptions, pageSize: value })}
            >
              <SelectTrigger data-testid="select-page-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a4">A4 (210 × 297 mm)</SelectItem>
                <SelectItem value="letter">Letter (8.5 × 11 in)</SelectItem>
                <SelectItem value="a5">A5 (148 × 210 mm)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-toc"
                checked={exportOptions.includeTOC}
                onCheckedChange={(checked) => 
                  setExportOptions({ ...exportOptions, includeTOC: !!checked })
                }
                data-testid="checkbox-include-toc"
              />
              <Label htmlFor="include-toc">Include Table of Contents</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-cover"
                checked={exportOptions.includeCover}
                onCheckedChange={(checked) => 
                  setExportOptions({ ...exportOptions, includeCover: !!checked })
                }
                data-testid="checkbox-include-cover"
              />
              <Label htmlFor="include-cover">Include Cover Page</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-page-numbers"
                checked={exportOptions.includePageNumbers}
                onCheckedChange={(checked) => 
                  setExportOptions({ ...exportOptions, includePageNumbers: !!checked })
                }
                data-testid="checkbox-include-page-numbers"
              />
              <Label htmlFor="include-page-numbers">Page Numbers</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-headers"
                checked={exportOptions.includeHeaders}
                onCheckedChange={(checked) => 
                  setExportOptions({ ...exportOptions, includeHeaders: !!checked })
                }
                data-testid="checkbox-include-headers"
              />
              <Label htmlFor="include-headers">Headers and Footers</Label>
            </div>
          </div>

          <Card className="p-4">
            <div className="text-sm space-y-1" data-testid="export-stats">
              <div className="flex justify-between">
                <span>Estimated Pages:</span>
                <span data-testid="text-estimated-pages">{estimatedPages}</span>
              </div>
              <div className="flex justify-between">
                <span>Word Count:</span>
                <span data-testid="text-word-count">{estimatedWordCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Size:</span>
                <span data-testid="text-estimated-size">{estimatedSize} MB</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button 
            variant="secondary" 
            onClick={onClose}
            disabled={isExporting}
            data-testid="button-cancel-export"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isExporting}
            data-testid="button-start-export"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? "Exporting..." : "Export Book"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
