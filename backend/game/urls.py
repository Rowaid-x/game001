"""URL configuration for game API."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'games', views.GameViewSet, basename='game')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'rounds', views.RoundViewSet, basename='round')

urlpatterns = [
    path('', include(router.urls)),
]
