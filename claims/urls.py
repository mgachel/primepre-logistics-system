from django.urls import path
from . import views

app_name = 'claims'

urlpatterns = [
    # Customer endpoints
    path('my-claims/', views.CustomerClaimListCreateView.as_view(), name='customer-claims'),
    path('my-claims/<int:pk>/', views.CustomerClaimDetailView.as_view(), name='customer-claim-detail'),
    
    # Admin endpoints
    path('admin/claims/', views.AdminClaimListView.as_view(), name='admin-claims'),
    path('admin/claims/<int:pk>/', views.AdminClaimDetailView.as_view(), name='admin-claim-detail'),
    path('admin/claims/summary/', views.admin_claims_summary, name='admin-claims-summary'),
    path('admin/claims/by-shipping-mark/<str:shipping_mark>/', 
         views.customer_claims_by_shipping_mark, 
         name='claims-by-shipping-mark'),
]
