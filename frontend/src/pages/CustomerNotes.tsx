import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  FileText, 
  Calendar,
  MoreHorizontal,
  X,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { notesService, Note, CreateNoteData, UpdateNoteData } from '@/services/notesService';
import { formatDate } from '@/lib/date';

export default function CustomerNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  
  // Form states
  const [formData, setFormData] = useState<CreateNoteData>({
    title: '',
    content: '',
  });
  const [saving, setSaving] = useState(false);

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {
        search: searchTerm || undefined,
        page_size: 100,
      };
      
      const response = await notesService.getNotes(filters);
      setNotes(response.data.results || []);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
      setError('Failed to load notes. Please try again.');
      setNotes([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  // Fetch notes on component mount and when search changes
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotes();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, fetchNotes]);

  // Create note
  const handleCreateNote = async () => {
    if (!formData.title.trim()) return;
    
    try {
      setSaving(true);
      await notesService.createNote(formData);
      setShowCreateModal(false);
      setFormData({ title: '', content: '' });
      fetchNotes();
    } catch (err) {
      setError('Failed to create note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Update note
  const handleUpdateNote = async () => {
    if (!selectedNote || !formData.title.trim()) return;
    
    try {
      setSaving(true);
      await notesService.updateNote(selectedNote.id, formData);
      setShowEditModal(false);
      setSelectedNote(null);
      setFormData({ title: '', content: '' });
      fetchNotes();
    } catch (err) {
      setError('Failed to update note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Delete note
  const handleDeleteNote = async () => {
    if (!noteToDelete) return;
    
    try {
      await notesService.deleteNote(noteToDelete.id);
      setShowDeleteDialog(false);
      setNoteToDelete(null);
      fetchNotes();
    } catch (err) {
      setError('Failed to delete note. Please try again.');
    }
  };

  // Open edit modal
  const openEditModal = (note: Note) => {
    setSelectedNote(note);
    setFormData({
      title: note.title,
      content: note.content,
    });
    setShowEditModal(true);
  };

  // Open delete dialog
  const openDeleteDialog = (note: Note) => {
    setNoteToDelete(note);
    setShowDeleteDialog(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({ title: '', content: '' });
    setSelectedNote(null);
  };

  // Truncate text for preview
  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Notes</h1>
          <p className="text-muted-foreground">
            Create and manage your personal notes
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes by title or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center text-red-800">
              <AlertTriangle className="h-4 w-4 mr-2" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading notes...</p>
          </div>
        </div>
      ) : notes?.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No notes found</p>
              <p className="text-sm">
                {searchTerm 
                  ? "Try adjusting your search terms"
                  : "Start by creating your first note"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(notes || []).map((note) => (
            <Card key={note.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-semibold">
                    <div className="overflow-hidden text-ellipsis" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {note.title}
                    </div>
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openEditModal(note)}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => openDeleteDialog(note)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {note.content && (
                  <div className="text-sm text-muted-foreground mb-4" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {truncateText(note.content)}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    Updated {formatDate(note.updated_at)}
                  </div>
                  {note.created_at !== note.updated_at && (
                    <Badge variant="outline" className="text-xs">
                      Edited
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Note Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="text-sm font-medium">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                id="title"
                placeholder="Enter note title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="content" className="text-sm font-medium">
                Content
              </label>
              <Textarea
                id="content"
                placeholder="Write your note content here..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="mt-1 min-h-[200px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateNote}
              disabled={!formData.title.trim() || saving}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Note
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Note Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-title" className="text-sm font-medium">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                id="edit-title"
                placeholder="Enter note title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="edit-content" className="text-sm font-medium">
                Content
              </label>
              <Textarea
                id="edit-content"
                placeholder="Write your note content here..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="mt-1 min-h-[200px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEditModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateNote}
              disabled={!formData.title.trim() || saving}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the note "{noteToDelete?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
