from rest_framework import permissions

class IsOwner(permissions.BasePermission):
    """
    Only allow owners to retrieve/update/destroy their notes.
    """

    def has_object_permission(self, request, view, obj):
        # obj.owner is the Note owner
        return obj.owner == request.user
