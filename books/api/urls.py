# books/api/urls.py

from django.urls import path

from .views import (
    BookDetailView,
    BookFavoriteView,
    BookListView,
    FavoriteListView,
)


urlpatterns = [
    path("", BookListView.as_view(), name="book-list"),
    path("favorites/", FavoriteListView.as_view(), name="favorite-list"),
    path("<int:pk>/", BookDetailView.as_view(), name="book-detail"),
    path(
        "<int:pk>/favorite/",
        BookFavoriteView.as_view(),
        name="book-favorite",
    ),
]