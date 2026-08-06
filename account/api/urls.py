from django.urls import path
from .views import (
    LoginView,
    LogoutView,
    PasswordChangeView,
    ProfileView,
    RefreshView,
    RegisterView,
    UserManagementDetailView,
    UserManagementListView,
)


urlpatterns = [
    path(
        "register/",
        RegisterView.as_view(),
        name="register",
    ),
    path(
        "login/",
        LoginView.as_view(),
        name="login",
    ),
    path(
        "refresh/",
        RefreshView.as_view(),
        name="token-refresh",
    ),
    path(
        "logout/",
        LogoutView.as_view(),
        name="logout",
    ),
    path(
        "profile/",
        ProfileView.as_view(),
        name="profile",
    ),
    path(
        "profile/password/",
        PasswordChangeView.as_view(),
        name="profile-password",
    ),
    path(
        "users/",
        UserManagementListView.as_view(),
        name="user-management-list",
    ),
    path(
        "users/<int:pk>/",
        UserManagementDetailView.as_view(),
        name="user-management-detail",
    ),
]
