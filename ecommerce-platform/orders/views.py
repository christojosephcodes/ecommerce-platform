from rest_framework import views, generics, permissions, status
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .models import Order, OrderItem
from .serializers import OrderSerializer
from products.models import Product

User = get_user_model()

class RegisterView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        if not username or not password:
            return Response({'error': 'Username and password are required'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username is already taken'}, status=status.HTTP_400_BAD_REQUEST)
        User.objects.create_user(username=username, password=password)
        return Response({'message': 'User registered successfully'}, status=status.HTTP_201_CREATED)

class CheckoutView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        items_data = request.data.get('items', [])
        shipping_address = request.data.get('shipping_address', 'Default Address')
        if not items_data:
            return Response({'error': 'No items in order'}, status=status.HTTP_400_BAD_REQUEST)

        total = 0
        for item in items_data:
            prod = Product.objects.filter(id=item.get('product_id')).first()
            if not prod or prod.stock < item.get('quantity', 1):
                return Response({'error': f"Insufficient stock for {getattr(prod, 'name', 'item')}"}, status=status.HTTP_400_BAD_REQUEST)
            total += prod.price * item.get('quantity', 1)

        order = Order.objects.create(
            user=request.user,
            full_name=request.user.username,
            email=request.user.email or f"{request.user.username}@shopcore.local",
            total_amount=total,
            status='Ordered'
        )

        for item in items_data:
            prod = Product.objects.get(id=item.get('product_id'))
            qty = item.get('quantity', 1)
            OrderItem.objects.create(order=order, product=prod, price=prod.price, quantity=qty)
            prod.stock -= qty
            prod.save()

        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class UserOrdersView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-created_at')

class AdminOrdersListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = Order.objects.all().order_by('-created_at')

class UpdateOrderStatusView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, pk):
        order = Order.objects.filter(pk=pk).first()
        if not order:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        new_status = request.data.get('status')
        order.status = new_status
        order.save()
        return Response({'message': 'Status updated', 'status': new_status})