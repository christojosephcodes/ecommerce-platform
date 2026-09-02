from django.urls import path
from .views import (
    RegisterView,
    CheckoutView,
    UserOrdersView,
    AdminOrdersListView,
    UpdateOrderStatusView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path('my-orders/', UserOrdersView.as_view(), name='user-orders'),
    path('admin/orders/', AdminOrdersListView.as_view(), name='admin-orders'),
    path('admin/orders/<int:pk>/status/', UpdateOrderStatusView.as_view(), name='update-status'),
]