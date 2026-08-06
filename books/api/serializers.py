from decimal import Decimal

from rest_framework import serializers
from books.models import Book, BookReview, Cart, CartItem, Order, OrderItem

class BookSerializer(serializers.ModelSerializer):
    is_favorite = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = "__all__"

    def get_is_favorite(self, obj) -> bool:
        if hasattr(obj, "_is_favorite"):
            return obj._is_favorite

        request = self.context.get("request")

        if request and request.user.is_authenticated:
            return obj.favorites.filter(user=request.user).exists()

        return False


class BookReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    is_owner = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = BookReview
        fields = [
            "id",
            "book",
            "user",
            "username",
            "rating",
            "comment",
            "created_at",
            "updated_at",
            "is_owner",
            "can_edit",
            "can_delete",
        ]
        read_only_fields = [
            "id",
            "book",
            "user",
            "username",
            "created_at",
            "updated_at",
            "is_owner",
            "can_edit",
            "can_delete",
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        view = self.context.get("view")
        book_id = getattr(view, "kwargs", {}).get("book_id") if view else None

        if (
            not self.instance
            and request
            and request.user.is_authenticated
            and book_id
            and BookReview.objects.filter(
                book_id=book_id,
                user=request.user,
            ).exists()
        ):
            raise serializers.ValidationError(
                {"detail": "You have already reviewed this book."}
            )

        return attrs

    def _is_owner(self, obj) -> bool:
        request = self.context.get("request")
        return bool(
            request
            and request.user.is_authenticated
            and obj.user_id == request.user.id
        )

    def get_is_owner(self, obj) -> bool:
        return self._is_owner(obj)

    def get_can_edit(self, obj) -> bool:
        return self._is_owner(obj)

    def get_can_delete(self, obj) -> bool:
        request = self.context.get("request")
        return bool(
            request
            and request.user.is_authenticated
            and (request.user.is_staff or obj.user_id == request.user.id)
        )


class FavoriteResponseSerializer(serializers.Serializer):
    book_id = serializers.IntegerField(read_only=True)
    is_favorite = serializers.BooleanField(read_only=True)


class CartItemSerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ["book", "quantity", "line_total"]

    def get_line_total(self, obj) -> Decimal:
        return obj.book.price * obj.quantity


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "items", "total_items", "subtotal", "updated_at"]

    def get_total_items(self, obj) -> int:
        return sum(item.quantity for item in obj.items.all())

    def get_subtotal(self, obj) -> Decimal:
        return sum(item.book.price * item.quantity for item in obj.items.all())


class AddCartItemSerializer(serializers.Serializer):
    book_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=99, default=1)


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class CartSyncItemSerializer(serializers.Serializer):
    book_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class CartSyncSerializer(serializers.Serializer):
    items = CartSyncItemSerializer(many=True, allow_empty=True)

    def validate_items(self, items):
        book_ids = [item["book_id"] for item in items]
        if len(book_ids) != len(set(book_ids)):
            raise serializers.ValidationError("Each book may appear only once.")
        return items


class MockPaymentSerializer(serializers.Serializer):
    succeed = serializers.BooleanField(default=True)


class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ["book", "title", "unit_price", "quantity", "line_total"]

    def get_line_total(self, obj) -> Decimal:
        return obj.unit_price * obj.quantity


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "reference",
            "status",
            "total_amount",
            "items",
            "created_at",
            "paid_at",
        ]
