from rest_framework import generics, status
from rest_framework.decorators import api_view 
from rest_framework.response import Response
from .serializers import RegisterSerializer, LoginSerializer
from django.contrib.auth import get_user_model, authenticate
from django.core.mail import send_mail
import random 
from rest_framework.authtoken.models import Token

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer 
    
    
@api_view(['POST'])
def verify_account(request):
    code = request.data.get('code')
    email = request.data.get('email') 
    
    try:
        user = User.objects.get(email=email, verification_code=code)
        user.is_verified = True
        user.is_active = True  
        user.verification_code = None  
        user.save()
        return Response({"message": "Account verified successfully"}, status=status.HTTP_200_OK)
    
    except User.DoesNotExist:
        return Response({"error": "Invalid verification code or email"}, status=status.HTTP_400_BAD_REQUEST)
    
    
@api_view(['POST'])
def resend_verification_code(request):
    email = request.data.get('email')
    try:
        user = User.objects.get(email=email) 
        if user.is_verified:
            return Response({"message": "Account already verified"}, status=status.HTTP_200_OK) 
        
        user.verification_code = str(random.randint(100000, 999999))
        user.save()
        
        send_mail(
            subject='Primepre Account Verification',
            message=f'Your new verification code is: {user.verification_code}',
            from_email='Primepre <no-reply@primepre.com>',
            recipient_list=[user.email],
            fail_silently=False,
        )
        return Response({"message": "Verification code resent successfully"}, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)


class LoginView(generics.GenericAPIView):
    queryset = User.objects.all()
    serializer_class = LoginSerializer
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            

            user = authenticate(request, email=email, password=password)
            
            if user is None:
                return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
            
            # Generate or get authentication token
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                "token": token.key,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "shipping_mark": user.shipping_mark,
                    "role": user.role,
                }
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
