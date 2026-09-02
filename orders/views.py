from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Order, OrderItem
from products.models import Product
from .serializers import OrderSerializer

User = get_user_model()

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()
        email = request.data.get('email', '').strip()

        if not username or not password:
            return Response(
                {'error': 'Username and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {'error': 'A user with that username already exists.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = User.objects.create_user(
            username=username,
            password=password,
            email=email or f"{username}@shopcore.local"
        )

        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Account created successfully.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'username': user.username,
            'is_staff': user.is_staff
        }, status=status.HTTP_201_CREATED)


class CheckoutView(APIView):
    # Allow both registered users and guest visitors to checkout
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def post(self, request):
        data = request.data
        items_data = data.get('items', [])
        shipping_address = data.get('shipping_address', '').strip() or 'Standard Delivery'

        if not items_data:
            return Response(
                {'error': 'No order items provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user if request.user.is_authenticated else None
        customer_name = user.username if user else data.get('customer_name', 'Guest Customer')

        # Validate stock first
        total_amount = 0.0
        product_instances = []

        for entry in items_data:
            prod_id = entry.get('product_id')
            qty = int(entry.get('quantity', 1))

            if qty <= 0:
                return Response(
                    {'error': f'Invalid quantity: {qty}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                product = Product.objects.select_for_update().get(id=prod_id)
            except Product.DoesNotExist:
                return Response(
                    {'error': f'Product with ID {prod_id} not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )

            if product.stock < qty:
                return Response(
                    {'error': f'Insufficient stock for "{product.name}". Remaining: {product.stock}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            item_total = float(product.price) * qty
            total_amount += item_total
            product_instances.append((product, qty, product.price))

        # Create Order
        order = Order.objects.create(
            user=user,
            full_name=customer_name,
            shipping_address=shipping_address,
            total_amount=round(total_amount, 2),
            status='Ordered'
        )

        # Create OrderItems and deduct stock
        for product, qty, price in product_instances:
            OrderItem.objects.create(
                order=order,
                product=product,
                price=price,
                quantity=qty
            )
            product.stock -= qty
            product.save(update_fields=['stock'])

        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MyOrdersView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            orders = Order.objects.filter(user=request.user).order_by('-created_at')
        else:
            orders = Order.objects.none()
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminOrdersListView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        orders = Order.objects.all().order_by('-created_at')
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminOrderStatusUpdateView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, order_id):
        new_status = request.data.get('status')
        if not new_status:
            return Response({'error': 'Status is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(id=order_id)
            order.status = new_status
            order.save(update_fields=['status'])
            return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)