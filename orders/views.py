import logging
from decimal import Decimal
from django.db import connection, transaction
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Order, OrderItem
from products.models import Product
from .serializers import OrderSerializer

logger = logging.getLogger(__name__)
User = get_user_model()


def ensure_order_schema():
    """Guarantee orders_order table supports guest checkouts without column errors."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='orders_order') THEN
                        -- Ensure user_id can be NULL for guests
                        ALTER TABLE orders_order ALTER COLUMN user_id DROP NOT NULL;

                        -- Ensure full_name column exists
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name='orders_order' AND column_name='full_name'
                        ) THEN
                            ALTER TABLE orders_order ADD COLUMN full_name VARCHAR(255) DEFAULT 'Guest Customer';
                        END IF;

                        -- Ensure email column exists
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name='orders_order' AND column_name='email'
                        ) THEN
                            ALTER TABLE orders_order ADD COLUMN email VARCHAR(254) DEFAULT '';
                        END IF;

                        -- Ensure shipping_address column exists
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name='orders_order' AND column_name='shipping_address'
                        ) THEN
                            ALTER TABLE orders_order ADD COLUMN shipping_address TEXT DEFAULT 'Standard Delivery';
                        END IF;

                        -- Ensure total_amount column exists
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name='orders_order' AND column_name='total_amount'
                        ) THEN
                            ALTER TABLE orders_order ADD COLUMN total_amount NUMERIC(10,2) DEFAULT 0.00;
                        END IF;

                        -- Ensure status column exists
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name='orders_order' AND column_name='status'
                        ) THEN
                            ALTER TABLE orders_order ADD COLUMN status VARCHAR(50) DEFAULT 'Ordered';
                        END IF;
                    END IF;
                END $$;
            """)
    except Exception as e:
        logger.warning(f"Schema auto-migration check warning: {e}")


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
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ensure_order_schema()
        data = request.data or {}
        items_data = data.get('items', [])
        shipping_address = data.get('shipping_address', '').strip() or 'Standard Delivery'

        if not items_data:
            return Response(
                {'error': 'No order items provided in request.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Detect User / Guest
        user = request.user if getattr(request, 'user', None) and request.user.is_authenticated else None
        customer_name = user.username if user else data.get('customer_name', 'Guest Customer')

        try:
            with transaction.atomic():
                total_amount = Decimal('0.00')
                items_to_process = []

                for entry in items_data:
                    prod_id = entry.get('product_id')
                    try:
                        qty = int(entry.get('quantity', 1))
                    except (ValueError, TypeError):
                        return Response(
                            {'error': f'Invalid quantity for item {prod_id}.'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    if qty <= 0:
                        return Response(
                            {'error': f'Quantity must be at least 1 (got {qty}).'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    try:
                        product = Product.objects.select_for_update().get(id=prod_id)
                    except Product.DoesNotExist:
                        return Response(
                            {'error': f'Product #{prod_id} does not exist in inventory.'},
                            status=status.HTTP_404_NOT_FOUND
                        )

                    if product.stock < qty:
                        return Response(
                            {'error': f'Insufficient stock for "{product.name}". Remaining: {product.stock}'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    unit_price = Decimal(str(product.price))
                    total_amount += unit_price * qty
                    items_to_process.append((product, qty, unit_price))

                # Create the order record
                order = Order.objects.create(
                    user=user,
                    full_name=customer_name,
                    email=user.email if (user and user.email) else '',
                    shipping_address=shipping_address,
                    total_amount=total_amount,
                    status='Ordered'
                )

                # Create line items and update inventory
                for product, qty, unit_price in items_to_process:
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        price=unit_price,
                        quantity=qty
                    )
                    product.stock -= qty
                    product.save(update_fields=['stock'])

            serializer = OrderSerializer(order)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as err:
            logger.exception("Checkout processing error")
            return Response(
                {'error': f'Order processing failed: {str(err)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MyOrdersView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if request.user and request.user.is_authenticated:
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