import os
import django
from django.utils.text import slugify

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.db import connection
from django.contrib.auth import get_user_model

# 1. Ensure columns exist via direct SQL fallback
with connection.cursor() as cursor:
    cursor.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='products_category' AND column_name='slug'
            ) THEN
                ALTER TABLE products_category ADD COLUMN slug VARCHAR(200) DEFAULT '';
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='products_product' AND column_name='slug'
            ) THEN
                ALTER TABLE products_product ADD COLUMN slug VARCHAR(200) DEFAULT '';
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='products_product' AND column_name='image_url'
            ) THEN
                ALTER TABLE products_product ADD COLUMN image_url VARCHAR(1000) DEFAULT '';
            END IF;
        END $$;
    """)

from products.models import Product, Category

# 2. Superuser creation
User = get_user_model()
username = 'admin'
email = 'admin@example.com'
password = 'AdminPassword123!'

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, email=email, password=password)
    print("Superuser created successfully: admin / AdminPassword123!")
else:
    print("Superuser already exists.")

# 3. Seed products safely
sample_products = [
    {
        "name": "Wireless Noise-Canceling Headphones",
        "description": "High-fidelity audio with active noise cancellation and 30-hour battery life.",
        "price": 199.99,
        "stock": 25,
        "category_name": "Audio & Studio"
    },
    {
        "name": "StudioGlide Desktop Condenser Mic",
        "description": "Studio-grade USB condenser microphone with desktop shock mount and cardioid pattern.",
        "price": 129.99,
        "stock": 28,
        "category_name": "Audio & Studio"
    },
    {
        "name": "VibeBeam Portable Bluetooth Speaker",
        "description": "Rugged outdoor stereo speaker with dual passive bass radiators and utility strap.",
        "price": 149.00,
        "stock": 30,
        "category_name": "Audio & Studio"
    },
    {
        "name": "Mechanical Gaming Keyboard",
        "description": "RGB backlit mechanical keyboard with hot-swappable tactile switches.",
        "price": 89.99,
        "stock": 40,
        "category_name": "Computer Peripherals"
    },
    {
        "name": "Ergonomic Office Chair",
        "description": "Adjustable lumbar support and breathable mesh for all-day comfort.",
        "price": 249.50,
        "stock": 15,
        "category_name": "Furniture"
    },
    {
        "name": "Stainless Steel Water Bottle",
        "description": "Vacuum insulated 1-liter water bottle keeps drinks cold for 24 hours.",
        "price": 24.99,
        "stock": 60,
        "category_name": "Fitness"
    }
]

for p in sample_products:
    cat_slug = slugify(p["category_name"])
    category_obj, _ = Category.objects.get_or_create(
        name=p["category_name"],
        defaults={"slug": cat_slug}
    )

    prod_slug = slugify(p["name"])
    obj, created = Product.objects.get_or_create(
        name=p["name"],
        defaults={
            "description": p["description"],
            "price": p["price"],
            "stock": p["stock"],
            "category": category_obj,
            "slug": prod_slug
        }
    )
    if created:
        print(f"Created product: {p['name']}")
    else:
        obj.category = category_obj
        obj.description = p["description"]
        obj.price = p["price"]
        obj.stock = p["stock"]
        obj.slug = prod_slug
        obj.save()

print("Initial catalog sync completed successfully.")