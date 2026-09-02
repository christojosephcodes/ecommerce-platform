from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),

    # Token Endpoints matching frontend calls
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='auth_token_alias'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # API resources
    path('api/products/', include('products.urls')),
    path('api/orders/', include('orders.urls')),

    # Media File Serving in Production
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]