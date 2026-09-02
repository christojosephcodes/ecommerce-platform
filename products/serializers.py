from rest_framework import serializers
from .models import Category, Product

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    display_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 
            'category', 
            'category_name', 
            'name', 
            'slug', 
            'description', 
            'price', 
            'stock', 
            'image', 
            'image_url', 
            'display_image', 
            'created_at'
        ]
        extra_kwargs = {
            'image': {'required': False, 'allow_null': True},
            'image_url': {'required': False, 'allow_blank': True, 'allow_null': True},
            'slug': {'required': False},
        }

    def get_display_image(self, obj):
        # 1. Prefer explicitly provided image URL link
        if obj.image_url and obj.image_url.strip():
            url = obj.image_url.strip()
            if url.startswith('http://'):
                return url.replace('http://', 'https://')
            return url
        
        # 2. Fall back to uploaded file served via HTTPS
        if obj.image:
            try:
                url = obj.image.url
                if url.startswith('http://'):
                    return url.replace('http://', 'https://')
                if url.startswith('/'):
                    return f"https://shopcore-backend-aapu.onrender.com{url}"
                return url
            except Exception:
                return None
        return None