import os
import django
from django.utils.text import slugify

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from products.models import Product, Category

# 1. Create Superuser
User = get_user_model()
username = 'admin'
email = 'admin@example.com'
password = 'AdminPassword123!'

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username=username, email=email, password=password)
    print("Superuser created successfully: admin / AdminPassword123!")
else:
    print("Superuser already exists.")

# 2. Populate Initial Categories & Products
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
    defaults_dict = {
        "description": p["description"],
        "price": p["price"],
        "stock": p["stock"],
        "category": category_obj
    }

    if hasattr(Product, 'slug'):
        defaults_dict["slug"] = prod_slug

    obj, created = Product.objects.get_or_create(
        name=p["name"],
        defaults=defaults_dict
    )
    if created:
        print(f"Created product: {p['name']}")
    else:
        # Update existing records to ensure category and details are intact
        obj.category = category_obj
        obj.description = p["description"]
        obj.price = p["price"]
        obj.stock = p["stock"]
        if hasattr(obj, 'slug') and not obj.slug:
            obj.slug = prod_slug
        obj.save()

print("Initial catalog sync completed.")