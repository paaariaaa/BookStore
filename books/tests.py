from django.contrib.auth.models import User
from django.conf import settings
from django.core.files.storage import default_storage
from django.test import RequestFactory, TestCase
from django.views.static import serve
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from books.models import Book, Favorite


class FavoriteApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="favorite-user",
            password="strong-test-password-123",
        )
        self.other_user = User.objects.create_user(
            username="other-user",
            password="strong-test-password-123",
        )
        self.book = Book.objects.create(title="Clean Code", author="Robert C. Martin")
        self.other_book = Book.objects.create(title="Refactoring", author="Martin Fowler")

    def authenticate(self, user=None):
        access = RefreshToken.for_user(user or self.user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def test_favorite_endpoints_require_authentication(self):
        list_response = self.client.get("/api/books/favorites/")
        create_response = self.client.post(f"/api/books/{self.book.pk}/favorite/")

        self.assertEqual(list_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(create_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_post_is_idempotent_and_uses_authenticated_user(self):
        self.authenticate()
        url = f"/api/books/{self.book.pk}/favorite/"

        first_response = self.client.post(url)
        second_response = self.client.post(url)

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            Favorite.objects.filter(user=self.user, book=self.book).count(),
            1,
        )
        self.assertFalse(
            Favorite.objects.filter(user=self.other_user, book=self.book).exists()
        )

    def test_get_returns_only_authenticated_users_favorites(self):
        Favorite.objects.create(user=self.user, book=self.book)
        Favorite.objects.create(user=self.other_user, book=self.other_book)
        self.authenticate()

        response = self.client.get("/api/books/favorites/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.book.pk)
        self.assertTrue(response.data[0]["is_favorite"])

    def test_post_for_unknown_book_returns_not_found(self):
        self.authenticate()

        response = self.client.post("/api/books/999999/favorite/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_removes_only_authenticated_users_favorite(self):
        Favorite.objects.create(user=self.user, book=self.book)
        Favorite.objects.create(user=self.other_user, book=self.book)
        self.authenticate()

        response = self.client.delete(f"/api/books/{self.book.pk}/favorite/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Favorite.objects.filter(user=self.user, book=self.book).exists())
        self.assertTrue(
            Favorite.objects.filter(user=self.other_user, book=self.book).exists()
        )


class BookMediaTests(TestCase):
    image_name = "books/default-cover.png"

    def test_book_without_uploaded_image_uses_served_default_cover(self):
        book = Book.objects.create(
            title="Book with cover",
            author="Test Author",
        )

        self.assertEqual(book.image.name, self.image_name)
        self.assertTrue(default_storage.exists(book.image.name))

        request = RequestFactory().get(book.image.url)
        response = serve(
            request,
            path=book.image.name,
            document_root=settings.MEDIA_ROOT,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["content-type"], "image/png")
