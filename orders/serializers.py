from rest_framework import serializers
from .models import Order, OrderItem
from products.serializers import ProductSerializer

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    product_details = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'product_details', 'price', 'quantity']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id',
            'user',
            'customer_name',
            'full_name',
            'email',
            'shipping_address',
            'total_amount',
            'status',
            'created_at',
            'items'
        ]

    def get_customer_name(self, obj):
        if obj.user:
            return obj.user.username
        return obj.full_name or "Guest Customer"