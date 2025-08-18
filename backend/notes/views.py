from rest_framework import generics, permissions
from django.db.models import Q
from .models import Note
from .serializers import NoteSerializer
from .permissions import IsOwner

class NoteListCreateView(generics.ListCreateAPIView):
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return notes for the authenticated user
        queryset = Note.objects.filter(owner=self.request.user)
        
        # Apply search filter if provided
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(content__icontains=search)
            )
        
        return queryset

    def perform_create(self, serializer):
        # Set owner to the authenticated user on create
        serializer.save(owner=self.request.user)

class NoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    lookup_url_kwarg = "pk"

    def get_queryset(self):
        # Constrain lookup to the current user's notes only
        return Note.objects.filter(owner=self.request.user)
