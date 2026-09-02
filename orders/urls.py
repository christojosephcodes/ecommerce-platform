from django.urls import path
from .views import (
    RegisterView,
    CheckoutView,
    MyOrdersView,
    AdminOrdersListView,
    AdminOrderStatusUpdateView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='order-register'),
    path('checkout/', CheckoutView.as_view(), name='order-checkout'),
    path('my-orders/', MyOrdersView.as_view(), name='my-orders'),
    path('admin/orders/', AdminOrdersListView.as_view(), name='admin-orders-list'),
    path('admin/orders/<int:order_id>/status/', AdminOrderStatusUpdateView.as_view(), name='admin-order-status-update'),
]