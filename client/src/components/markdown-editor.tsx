import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Bold, 
  Italic, 
  Heading, 
  List, 
  Table, 
  Image as ImageIcon
} from "lucide-react";

interface MarkdownEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  projectId: string;
}

export default function MarkdownEditor({ 
  content, 
  onContentChange, 
  projectId 
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [lineCount, setLineCount] = useState(0);

  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    const lines = content.split('\n');
    setWordCount(words.length);
    setLineCount(lines.length);
  }, [content]);

  const insertText = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    
    onContentChange(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const toolbarActions = [
    {
      icon: Heading,
      title: "Insert Heading",
      action: () => insertText("# "),
      testId: "button-insert-heading"
    },
    {
      icon: Bold,
      title: "Bold",
      action: () => insertText("**", "**"),
      testId: "button-insert-bold"
    },
    {
      icon: Italic,
      title: "Italic",
      action: () => insertText("*", "*"),
      testId: "button-insert-italic"
    },
    {
      icon: List,
      title: "List",
      action: () => insertText("- "),
      testId: "button-insert-list"
    },
    {
      icon: Table,
      title: "Table",
      action: () => insertText("\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n"),
      testId: "button-insert-table"
    },
    {
      icon: ImageIcon,
      title: "Image",
      action: () => insertText("![Alt text](image-url)"),
      testId: "button-insert-image"
    }
  ];

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Editor Toolbar */}
      <div className="editor-toolbar px-4 py-2 flex items-center space-x-2">
        {toolbarActions.map((action, index) => (
          <Button
            key={index}
            variant="ghost"
            size="sm"
            onClick={action.action}
            title={action.title}
            data-testid={action.testId}
          >
            <action.icon className="w-4 h-4" />
          </Button>
        ))}
        
        <div className="flex-1" />
        
        <div className="text-sm text-muted-foreground" data-testid="text-editor-stats">
          <span data-testid="text-word-count">{wordCount}</span> words | 
          <span data-testid="text-line-count"> {lineCount}</span> lines
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 p-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          className="w-full h-full resize-none border-none outline-none font-mono text-sm leading-relaxed bg-transparent"
          placeholder="Start writing your book in markdown..."
          data-testid="textarea-markdown-editor"
        />
      </div>
    </div>
  );
}
