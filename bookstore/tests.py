import json

from django.test import TestCase
from django.urls import reverse


class ApiDocumentationTests(TestCase):
    def test_schema_contains_all_public_api_paths_and_jwt_auth(self):
        response = self.client.get(
            reverse("api-schema"),
            HTTP_ACCEPT="application/vnd.oai.openapi+json",
        )

        self.assertEqual(response.status_code, 200)
        schema = json.loads(response.content)
        expected_paths = {
            "/api/auth/register/",
            "/api/auth/login/",
            "/api/auth/refresh/",
            "/api/auth/logout/",
            "/api/auth/profile/",
            "/api/books/",
            "/api/books/{id}/",
            "/api/books/favorites/",
            "/api/books/{id}/favorite/",
            "/api/books/cart/",
            "/api/books/cart/items/",
            "/api/books/cart/items/{book_id}/",
            "/api/books/cart/sync/",
        }

        self.assertTrue(expected_paths.issubset(schema["paths"]))
        self.assertEqual(
            schema["components"]["securitySchemes"]["jwtAuth"]["scheme"],
            "bearer",
        )

    def test_documentation_pages_are_available(self):
        self.assertEqual(self.client.get(reverse("swagger-ui")).status_code, 200)
        self.assertEqual(self.client.get(reverse("redoc")).status_code, 200)
