from django.contrib.auth.models import User
from django.conf import settings
from django.core.files.storage import default_storage
from django.test import RequestFactory, TestCase
from django.views.static import serve
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from books.models import Book, CartItem, Favorite


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


class CartApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="cart-user", password="password-123")
        self.other_user = User.objects.create_user(username="other-cart-user", password="password-123")
        self.book = Book.objects.create(
            title="Cart Book",
            author="Author",
            price="12.50",
            stock=3,
        )

    def authenticate(self, user=None):
        token = RefreshToken.for_user(user or self.user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_cart_requires_authentication(self):
        self.assertEqual(self.client.get("/api/books/cart/").status_code, 401)
        self.assertEqual(self.client.post("/api/books/cart/items/", {}).status_code, 401)

    def test_add_update_remove_and_clear_cart(self):
        self.authenticate()
        add_url = "/api/books/cart/items/"

        created = self.client.post(add_url, {"book_id": self.book.pk, "quantity": 1}, format="json")
        incremented = self.client.post(add_url, {"book_id": self.book.pk, "quantity": 1}, format="json")
        updated = self.client.patch(
            f"/api/books/cart/items/{self.book.pk}/",
            {"quantity": 3},
            format="json",
        )

        self.assertEqual(created.status_code, 201)
        self.assertEqual(incremented.status_code, 200)
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["total_items"], 3)
        self.assertEqual(str(updated.data["subtotal"]), "37.50")
        self.assertEqual(CartItem.objects.count(), 1)

        removed = self.client.delete(f"/api/books/cart/items/{self.book.pk}/")
        self.assertEqual(removed.status_code, 200)
        self.assertEqual(removed.data["items"], [])

        self.client.post(add_url, {"book_id": self.book.pk}, format="json")
        cleared = self.client.delete("/api/books/cart/")
        self.assertEqual(cleared.status_code, 200)
        self.assertEqual(cleared.data["total_items"], 0)

    def test_stock_limit_is_enforced(self):
        self.authenticate()
        response = self.client.post(
            "/api/books/cart/items/",
            {"book_id": self.book.pk, "quantity": 4},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("quantity", response.data)

    def test_users_have_isolated_carts(self):
        self.authenticate()
        self.client.post("/api/books/cart/items/", {"book_id": self.book.pk}, format="json")
        self.authenticate(self.other_user)

        response = self.client.get("/api/books/cart/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["items"], [])
