from django.db import models
from django.contrib.auth import AbstractUser
# Create your models here.


class CustomUser(AbstractUser):
    
    ROLE_CHOICES =(
        ('Staff', 'staff'),
        ('Admin','admin'),
        ('Client', 'client')
    )
    
    REGION_CHOICES = (
        ('accra', 'Accra'),
        ('kumasi', 'Kumasi'),
        ('tamale', 'Tamale'),
        
    )
    
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices = ROLE_CHOICES)
    phone = models.CharField(max_length=10)
    company_name= models.CharField(max_length=70, null=True, blank=True)
    region = models.CharField(max_length=50, choices=REGION_CHOICES)
    shipping_mark = models.CharField(max_length=50, unique=True)
    verification_code = models.CharField(max_length=6, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    
    
    
    
    
    
    def __str__(self):
        return self.email
    
    
    