from django.urls import path 
from .views import NoteListCreateView, NoteDetailView

urlpatterns = [
    path('', NoteListCreateView.as_view(), name='notes-list-create'),
    path('<int:pk>/', NoteDetailView.as_view(), name='notes-detail'),
]


