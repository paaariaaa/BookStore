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

    def test_authenticated_user_can_update_profile_fields_only(self):
        user = User.objects.create_user(
            username="profile-user",
            password=self.password,
            is_staff=False,
        )
        self.client.force_authenticate(user=user)

        response = self.client.patch(
            "/api/auth/profile/",
            {
                "username": "updated-profile-user",
                "email": "updated@example.com",
                "first_name": "Updated",
                "last_name": "User",
                "is_staff": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "updated-profile-user")
        self.assertEqual(response.data["email"], "updated@example.com")
        self.assertFalse(response.data["is_staff"])
        user.refresh_from_db()
        self.assertEqual(user.first_name, "Updated")
        self.assertEqual(user.last_name, "User")
        self.assertFalse(user.is_staff)

    def test_authenticated_user_can_change_password_and_old_refresh_is_revoked(self):
        user = User.objects.create_user(
            username="password-user",
            password=self.password,
        )
        login_response = self.client.post(
            "/api/auth/login/",
            {"username": user.username, "password": self.password},
            format="json",
        )
        access = login_response.data["access"]
        refresh = login_response.data["refresh"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.post(
            "/api/auth/profile/password/",
            {
                "current_password": self.password,
                "new_password": "new-strong-password-456",
                "new_password_confirm": "new-strong-password-456",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.check_password("new-strong-password-456"))

        old_password_login = self.client.post(
            "/api/auth/login/",
            {"username": user.username, "password": self.password},
            format="json",
        )
        self.assertEqual(old_password_login.status_code, status.HTTP_401_UNAUTHORIZED)

        new_password_login = self.client.post(
            "/api/auth/login/",
            {"username": user.username, "password": "new-strong-password-456"},
            format="json",
        )
        self.assertEqual(new_password_login.status_code, status.HTTP_200_OK)

        revoked_refresh = self.client.post(
            "/api/auth/refresh/",
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(revoked_refresh.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_password_change_rejects_wrong_current_password_and_mismatch(self):
        user = User.objects.create_user(
            username="password-validation-user",
            password=self.password,
        )
        self.client.force_authenticate(user=user)

        wrong_current = self.client.post(
            "/api/auth/profile/password/",
            {
                "current_password": "wrong-password",
                "new_password": "new-strong-password-456",
                "new_password_confirm": "new-strong-password-456",
            },
            format="json",
        )
        self.assertEqual(wrong_current.status_code, status.HTTP_400_BAD_REQUEST)

        mismatch = self.client.post(
            "/api/auth/profile/password/",
            {
                "current_password": self.password,
                "new_password": "new-strong-password-456",
                "new_password_confirm": "different-password-789",
            },
            format="json",
        )
        self.assertEqual(mismatch.status_code, status.HTTP_400_BAD_REQUEST)
        user.refresh_from_db()
        self.assertTrue(user.check_password(self.password))


class UserManagementApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer = User.objects.create_user(
            username="customer",
            password="strong-test-password-123",
        )
        self.staff = User.objects.create_user(
            username="staff",
            password="strong-test-password-123",
            is_staff=True,
        )
        self.superuser = User.objects.create_superuser(
            username="superuser",
            password="strong-test-password-123",
        )
        self.target = User.objects.create_user(
            username="target",
            password="strong-test-password-123",
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_staff_can_list_users_but_regular_users_cannot(self):
        self.authenticate(self.staff)
        response = self.client.get("/api/auth/users/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 4)
        self.assertEqual(response.data[0]["role"], "customer")

        self.authenticate(self.customer)
        forbidden = self.client.get("/api/auth/users/")

        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_cannot_change_user_status_or_role(self):
        self.authenticate(self.staff)
        response = self.client.patch(
            f"/api/auth/users/{self.target.pk}/",
            {"is_active": False, "role": "admin"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.target.refresh_from_db()
        self.assertTrue(self.target.is_active)
        self.assertFalse(self.target.is_staff)

    def test_superuser_can_activate_users_and_assign_admin_role(self):
        self.authenticate(self.superuser)
        response = self.client.patch(
            f"/api/auth/users/{self.target.pk}/",
            {"is_active": False, "role": "admin"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_active"])
        self.assertEqual(response.data["role"], "admin")
        self.target.refresh_from_db()
        self.assertFalse(self.target.is_active)
        self.assertTrue(self.target.is_staff)

        response = self.client.patch(
            f"/api/auth/users/{self.target.pk}/",
            {"is_active": True, "role": "customer"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_active"])
        self.assertEqual(response.data["role"], "customer")
        self.target.refresh_from_db()
        self.assertTrue(self.target.is_active)
        self.assertFalse(self.target.is_staff)

    def test_superuser_cannot_lock_itself_or_modify_superuser_accounts(self):
        self.authenticate(self.superuser)
        self_lockout = self.client.patch(
            f"/api/auth/users/{self.superuser.pk}/",
            {"is_active": False, "role": "customer"},
            format="json",
        )

        self.assertEqual(self_lockout.status_code, status.HTTP_400_BAD_REQUEST)

        other_superuser = User.objects.create_superuser(
            username="other-superuser",
            password="strong-test-password-123",
        )
        protected = self.client.patch(
            f"/api/auth/users/{other_superuser.pk}/",
            {"is_active": False},
            format="json",
        )

        self.assertEqual(protected.status_code, status.HTTP_400_BAD_REQUEST)

    def test_superadmin_role_is_read_only_and_unknown_roles_are_rejected(self):
        self.authenticate(self.superuser)
        profile = self.client.get(f"/api/auth/users/{self.superuser.pk}/")
        self.assertEqual(profile.status_code, status.HTTP_200_OK)
        self.assertEqual(profile.data["role"], "superadmin")

        unknown_role = self.client.patch(
            f"/api/auth/users/{self.target.pk}/",
            {"role": "moderator"},
            format="json",
        )
        self.assertEqual(unknown_role.status_code, status.HTTP_400_BAD_REQUEST)
