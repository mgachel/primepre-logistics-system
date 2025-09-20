from django.contrib.auth.backends import BaseBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()

class PhoneBackend(BaseBackend):
    """
    Custom authentication backend that allows users to log in using their phone number instead of username.
    """
    
    def authenticate(self, request, phone=None, password=None, **kwargs):
        if phone is None or password is None:
            return None
            
        try:
            # Find user by phone number
            user = User.objects.get(Q(phone=phone))
        except User.DoesNotExist:
            return None
        
        # Check password
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        
        return None
    
    def user_can_authenticate(self, user):
        """
        Reject users with is_active=False. Custom user models that don't have
        an `is_active` field are allowed.
        """
        is_active = getattr(user, 'is_active', None)
        return is_active or is_active is None
    
    def get_user(self, user_id):
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
        return user if self.user_can_authenticate(user) else None