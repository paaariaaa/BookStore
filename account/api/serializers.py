from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_staff",
        ]
        read_only_fields = ["is_staff"]


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )
    new_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )
    new_password_confirm = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate_current_password(self, value):
        request = self.context["request"]
        if not request.user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        request = self.context["request"]
        new_password = attrs["new_password"]

        if new_password != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "The new passwords do not match."}
            )

        if request.user.check_password(new_password):
            raise serializers.ValidationError(
                {"new_password": "The new password must be different."}
            )

        try:
            validate_password(new_password, user=request.user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                {"new_password": list(exc.messages)}
            ) from exc

        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


class PasswordChangeResponseSerializer(serializers.Serializer):
    detail = serializers.CharField(read_only=True)


class AdminUserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "is_staff",
            "is_superuser",
            "role",
            "date_joined",
            "last_login",
        ]
        read_only_fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_staff",
            "is_superuser",
            "date_joined",
            "last_login",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["role"] = self.get_role(instance)
        return data

    def get_role(self, instance):
        if instance.is_superuser:
            return "superadmin"
        if instance.is_staff:
            return "admin"
        return "customer"

    def validate_role(self, value):
        if value not in {"admin", "customer"}:
            raise serializers.ValidationError(
                "Role must be either 'admin' or 'customer'."
            )

        return value

    def validate(self, attrs):
        request = self.context["request"]
        target = self.instance
        requested_role = attrs.get("role")

        if target and target.is_superuser and target != request.user:
            raise serializers.ValidationError(
                {"detail": "Superuser accounts cannot be changed through this API."}
            )

        if target == request.user:
            if attrs.get("is_active") is False:
                raise serializers.ValidationError(
                    {"is_active": "You cannot deactivate your own account."}
                )
            if requested_role == "customer":
                raise serializers.ValidationError(
                    {"role": "You cannot remove your own administrator access."}
                )

        if not attrs.get("is_active", True) and target and target.is_superuser:
            raise serializers.ValidationError(
                {"is_active": "Superuser accounts cannot be deactivated here."}
            )

        return attrs

    def update(self, instance, validated_data):
        requested_role = validated_data.pop("role", None)

        if requested_role:
            instance.is_staff = requested_role == "admin"

        return super().update(instance, validated_data)


class AuthResponseSerializer(serializers.Serializer):
    user = UserSerializer(read_only=True)
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        validators=[validate_password],
    )
    password_confirm = serializers.CharField(
        write_only=True,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "password",
            "password_confirm",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {
                    "password_confirm": "رمزهای عبور یکسان نیستند."
                }
            )

        attrs.pop("password_confirm")
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            password=validated_data["password"],
        )

class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        data["user"] = UserSerializer(self.user).data

        return data


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(write_only=True)

    def validate_refresh(self, value):
        try:
            return RefreshToken(value)
        except TokenError as exc:
            raise serializers.ValidationError(
                "Refresh token is invalid or expired."
            ) from exc

    def save(self, **kwargs):
        self.validated_data["refresh"].blacklist()
