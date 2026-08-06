# books/api/urls.py

from django.urls import path

from .views import (
    BookDetailView,
    BookFavoriteView,
    BookListView,
    CartItemCreateView,
    CartItemDetailView,
    CartSyncView,
    CartView,
    FavoriteListView,
    MockPaymentView,
)

urlpatterns = [
    path("", BookListView.as_view(), name="book-list"),
    path("cart/", CartView.as_view(), name="cart"),
    path("cart/items/", CartItemCreateView.as_view(), name="cart-item-create"),
    path("cart/items/<int:book_id>/", CartItemDetailView.as_view(), name="cart-item-detail"),
    path("cart/sync/", CartSyncView.as_view(), name="cart-sync"),
    path("cart/pay/mock/", MockPaymentView.as_view(), name="mock-payment"),
    path("favorites/", FavoriteListView.as_view(), name="favorite-list"),
    path("<int:pk>/", BookDetailView.as_view(), name="book-detail"),
    path(
        "<int:pk>/favorite/",
        BookFavoriteView.as_view(),
        name="book-favorite",
    ),
]
