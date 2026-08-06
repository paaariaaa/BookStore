from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsAdminOrReadOnly(BasePermission):
    """Allow public reads, but restrict catalog changes to staff users."""

    message = "Only administrators can add, edit, or delete books."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True

        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
        )


class IsReviewOwnerOrStaff(BasePermission):
    message = "Only the review owner or an administrator can change this review."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True

        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        if request.method == "DELETE" and request.user.is_staff:
            return True

        return obj.user_id == request.user.id
