import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  StickyNote,
  Calendar,
  Search,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { notesService, Note } from "@/services/notesService";

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
  });
  const { toast } = useToast();
  const { user } = useAuthStore();
  const isCustomer = user?.user_role === 'CUSTOMER' || user?.is_admin_user === false;

  // Admin green used on admin-only accents for this page. Change ADMIN_GREEN to adjust color.
  const ADMIN_GREEN = "#00703D";

  // Load notes from API
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const response = await notesService.getNotes();
      if (response.success) {
        setNotes(response.data.results);
        setFilteredNotes(response.data.results);
      } else {
        toast({
          title: "Error",
          description: "Failed to load notes",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load notes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter notes based on search term
  useEffect(() => {
    const filtered = notes.filter(
      (note) =>
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredNotes(filtered);
  }, [searchTerm, notes]);

  const handleAddNote = () => {
    setEditingNote(null);
    setFormData({ title: "", content: "" });
    setShowNoteDialog(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setFormData({ title: note.title, content: note.content });
    setShowNoteDialog(true);
  };

  const handleSaveNote = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both title and content",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingNote) {
        // Update existing note
        const response = await notesService.updateNote(editingNote.id, formData);
        if (response.success) {
          toast({
            title: "Success",
            description: "Note updated successfully",
          });
          loadNotes(); // Reload notes to get updated data
        } else {
          toast({
            title: "Error",
            description: "Failed to update note",
            variant: "destructive",
          });
        }
      } else {
        // Add new note
        const response = await notesService.createNote(formData);
        if (response.success) {
          toast({
            title: "Success",
            description: "Note created successfully",
          });
          loadNotes(); // Reload notes to get new data
        } else {
          toast({
            title: "Error",
            description: "Failed to create note",
            variant: "destructive",
          });
        }
      }

      setShowNoteDialog(false);
      setFormData({ title: "", content: "" });
    } catch (error) {
      toast({
        title: "Error",
        description: editingNote ? "Failed to update note" : "Failed to create note",
        variant: "destructive",
      });
    }
  };

  const handleDeleteNote = (note: Note) => {
    setNoteToDelete(note);
  };

  const confirmDeleteNote = async () => {
    if (noteToDelete) {
      try {
        const response = await notesService.deleteNote(noteToDelete.id);
        if (response.success) {
          toast({
            title: "Success",
            description: "Note deleted successfully",
          });
          loadNotes(); // Reload notes to reflect deletion
        } else {
          toast({
            title: "Error",
            description: "Failed to delete note",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete note",
          variant: "destructive",
        });
      } finally {
        setNoteToDelete(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Notes</h1>
            <p className="text-muted-foreground">
              Manage your personal notes and reminders
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-5/6"></div>
                  <div className="h-3 bg-muted rounded w-4/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">Notes</h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            Manage your personal notes and reminders
          </p>
        </div>
        <Button onClick={handleAddNote} className={`flex items-center justify-center gap-2 w-full sm:w-auto ${isCustomer ? '' : `bg-[${ADMIN_GREEN}] text-white`}`}>
          <Plus className={`h-4 w-4 ${isCustomer ? '' : `text-[${ADMIN_GREEN}]`}`} />
          <span>Add Note</span>
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary" className={`flex items-center gap-2 ${isCustomer ? '' : `bg-[${ADMIN_GREEN}] text-white`}`}>
          <StickyNote className={`h-3 w-3 ${isCustomer ? '' : `text-[${ADMIN_GREEN}]`}`} />
          {filteredNotes.length} {filteredNotes.length === 1 ? "note" : "notes"}
        </Badge>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <Card className="p-8 text-center">
          <StickyNote className={`h-12 w-12 mx-auto mb-4 ${isCustomer ? 'text-muted-foreground' : `text-[${ADMIN_GREEN}]`}`} />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchTerm ? "No notes found" : "No notes yet"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm
              ? "Try adjusting your search terms"
              : "Create your first note to get started"}
          </p>
          {!searchTerm && (
            <Button onClick={handleAddNote} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Note
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <Card key={note.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-medium line-clamp-2">
                    {note.title}
                  </CardTitle>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditNote(note)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteNote(note)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDate(note.created_at)}
                  {note.created_at !== note.updated_at && (
                    <span className="text-xs">(edited)</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {note.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? "Edit Note" : "Add New Note"}
            </DialogTitle>
            <DialogDescription>
              {editingNote
                ? "Update your note details below"
                : "Create a new note to keep track of important information"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter note title..."
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Enter note content..."
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNoteDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveNote}>
              {editingNote ? "Update Note" : "Add Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!noteToDelete}
        onOpenChange={() => setNoteToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{noteToDelete?.title}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


