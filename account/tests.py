from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient


class RefreshTokenTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="refresh-user",
            password="strong-test-password-123",
        )

    def test_refresh_rotates_token_and_blacklists_previous_token(self):
        login_response = self.client.post(
            "/api/auth/login/",
            {
                "username": self.user.username,
                "password": "strong-test-password-123",
            },
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        old_refresh = login_response.data["refresh"]

        refresh_response = self.client.post(
            "/api/auth/refresh/",
            {"refresh": old_refresh},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_response.data)
        self.assertIn("refresh", refresh_response.data)
        self.assertNotEqual(refresh_response.data["refresh"], old_refresh)

        reused_token_response = self.client.post(
            "/api/auth/refresh/",
            {"refresh": old_refresh},
            format="json",
        )
        self.assertEqual(
            reused_token_response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
