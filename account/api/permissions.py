from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsStaffForReadSuperuserForWrite(BasePermission):
    message = "Only a superuser can change user status or roles."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated or not user.is_staff:
            return False

        return request.method in SAFE_METHODS or user.is_superuser
