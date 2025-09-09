from django.contrib import admin
from .models import Note

@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    """Admin interface for Notes management"""
    
    list_display = ('title', 'owner', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at', 'owner__user_role')
    search_fields = ('title', 'content', 'owner__phone', 'owner__first_name', 'owner__last_name')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'content', 'owner')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        return super().get_queryset(request).select_related('owner')
    
    def has_change_permission(self, request, obj=None):
        """Allow users to edit their own notes, admins can edit all"""
        if not obj:
            return True
        if request.user.is_superuser or request.user.user_role == 'SUPER_ADMIN':
            return True
        return obj.owner == request.user
    
    def has_delete_permission(self, request, obj=None):
        """Allow users to delete their own notes, admins can delete all"""
        return self.has_change_permission(request, obj)
