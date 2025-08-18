import { apiClient, ApiResponse, PaginatedResponse } from './api';

// Note Types
export interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNoteData {
  title: string;
  content?: string;
}

export interface UpdateNoteData {
  title?: string;
  content?: string;
}

export interface NotesFilters {
  search?: string;
  page?: number;
  page_size?: number;
}

export const notesService = {
  // Get all notes for the current user
  async getNotes(filters: NotesFilters = {}): Promise<ApiResponse<PaginatedResponse<Note>>> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.page_size) params.append('page_size', filters.page_size.toString());

    const response = await apiClient.get<any>(`/api/notes/?${params.toString()}`);
    
    // Handle both paginated and non-paginated responses
    if (Array.isArray(response.data)) {
      return {
        data: {
          results: response.data,
          count: response.data.length,
          next: null,
          previous: null,
        },
        success: true,
      };
    }
    
    return {
      data: response.data,
      success: true,
    };
  },

  // Get a specific note by ID
  async getNoteById(id: number): Promise<ApiResponse<Note>> {
    const response = await apiClient.get<Note>(`/api/notes/${id}/`);
    return {
      data: response.data,
      success: true,
    };
  },

  // Create a new note
  async createNote(noteData: CreateNoteData): Promise<ApiResponse<Note>> {
    const response = await apiClient.post<Note>('/api/notes/', noteData);
    return {
      data: response.data,
      success: true,
    };
  },

  // Update an existing note
  async updateNote(id: number, noteData: UpdateNoteData): Promise<ApiResponse<Note>> {
    const response = await apiClient.patch<Note>(`/api/notes/${id}/`, noteData);
    return {
      data: response.data,
      success: true,
    };
  },

  // Delete a note
  async deleteNote(id: number): Promise<ApiResponse<void>> {
    await apiClient.delete(`/api/notes/${id}/`);
    return {
      data: undefined,
      success: true,
    };
  },

  // Search notes
  async searchNotes(query: string): Promise<ApiResponse<Note[]>> {
    const response = await this.getNotes({ search: query, page_size: 50 });
    return {
      data: response.data.results,
      success: response.success,
    };
  },
};
