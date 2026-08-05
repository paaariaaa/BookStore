from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient


class AuthenticationTokenFlowTests(TestCase):
    password = "strong-test-password-123"

    def setUp(self):
        self.client = APIClient()

    def test_register_returns_tokens_and_access_identifies_user(self):
        register_response = self.client.post(
            "/api/auth/register/",
            {
                "username": "registered-user",
                "email": "registered@example.com",
                "password": self.password,
                "password_confirm": self.password,
            },
            format="json",
        )

        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertIn("user", register_response.data)
        self.assertIn("access", register_response.data)
        self.assertIn("refresh", register_response.data)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {register_response.data['access']}"
        )
        profile_response = self.client.get("/api/auth/profile/")

        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_response.data["username"], "registered-user")

    def test_login_refresh_rotation_and_logout(self):
        user = User.objects.create_user(
            username="login-user",
            password=self.password,
        )
        login_response = self.client.post(
            "/api/auth/login/",
            {"username": user.username, "password": self.password},
            format="json",
        )

        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn("user", login_response.data)
        old_refresh = login_response.data["refresh"]

        refresh_response = self.client.post(
            "/api/auth/refresh/",
            {"refresh": old_refresh},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_response.data)
        self.assertIn("refresh", refresh_response.data)
        new_refresh = refresh_response.data["refresh"]
        self.assertNotEqual(new_refresh, old_refresh)

        reused_response = self.client.post(
            "/api/auth/refresh/",
            {"refresh": old_refresh},
            format="json",
        )
        self.assertEqual(reused_response.status_code, status.HTTP_401_UNAUTHORIZED)

        logout_response = self.client.post(
            "/api/auth/logout/",
            {"refresh": new_refresh},
            format="json",
        )
        self.assertEqual(logout_response.status_code, status.HTTP_204_NO_CONTENT)

        logged_out_refresh_response = self.client.post(
            "/api/auth/refresh/",
            {"refresh": new_refresh},
            format="json",
        )
        self.assertEqual(
            logged_out_refresh_response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
