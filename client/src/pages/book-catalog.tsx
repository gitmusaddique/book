import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, BookOpen, Trash2, Edit, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Book {
  id: number;
  title: string;
  author: string;
  filename: string;
  createdAt: string;
  updatedAt: string;
}

export default function BookCatalog() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookAuthor, setNewBookAuthor] = useState("");

  const { data: books, isLoading } = useQuery<Book[]>({
    queryKey: ['/api/books'],
  });

  const createBookMutation = useMutation({
    mutationFn: async (bookData: { title: string; author: string }) => {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookData),
      });
      if (!response.ok) throw new Error('Failed to create book');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      setShowCreateModal(false);
      setNewBookTitle("");
      setNewBookAuthor("");
      toast({
        title: "Success",
        description: "Book created successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create book. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteBookMutation = useMutation({
    mutationFn: async (bookId: number) => {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete book');
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      toast({
        title: "Success",
        description: "Book deleted successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete book. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateBook = () => {
    if (!newBookTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a book title.",
        variant: "destructive",
      });
      return;
    }
    
    createBookMutation.mutate({
      title: newBookTitle.trim(),
      author: newBookAuthor.trim() || "Unknown Author",
    });
  };

  const handleDeleteBook = (book: Book) => {
    if (window.confirm(`Are you sure you want to delete "${book.title}"? This action cannot be undone.`)) {
      deleteBookMutation.mutate(book.id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg">Loading your books...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="catalog-title">
              Book Library
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage your markdown books
            </p>
          </div>
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-book">
                <Plus className="w-4 h-4 mr-2" />
                New Book
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Book</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="book-title">Book Title</Label>
                  <Input
                    id="book-title"
                    value={newBookTitle}
                    onChange={(e) => setNewBookTitle(e.target.value)}
                    placeholder="Enter book title..."
                    data-testid="input-book-title"
                  />
                </div>
                <div>
                  <Label htmlFor="book-author">Author</Label>
                  <Input
                    id="book-author"
                    value={newBookAuthor}
                    onChange={(e) => setNewBookAuthor(e.target.value)}
                    placeholder="Enter author name..."
                    data-testid="input-book-author"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateModal(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateBook}
                    disabled={createBookMutation.isPending}
                    data-testid="button-confirm-create"
                  >
                    {createBookMutation.isPending ? 'Creating...' : 'Create Book'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Book Grid */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {!books || books.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No books yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first book to get started with writing!
            </p>
            <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-first-book">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Book
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {books.map((book) => (
              <Card
                key={book.id}
                className="group hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                data-testid={`book-card-${book.id}`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg line-clamp-2" title={book.title}>
                    {book.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    by {book.author}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(book.updatedAt)}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => setLocation(`/editor/${book.id}`)}
                      data-testid={`button-edit-book-${book.id}`}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBook(book);
                      }}
                      data-testid={`button-delete-book-${book.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}