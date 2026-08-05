from rest_framework import serializers
from books.models import Book, Cart, CartItem

class BookSerializer(serializers.ModelSerializer):
    is_favorite = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = "__all__"

    def get_is_favorite(self, obj):
        if hasattr(obj, "_is_favorite"):
            return obj._is_favorite

        request = self.context.get("request")

        if request and request.user.is_authenticated:
            return obj.favorites.filter(user=request.user).exists()

        return False


class CartItemSerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ["book", "quantity", "line_total"]

    def get_line_total(self, obj):
        return obj.book.price * obj.quantity


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "items", "total_items", "subtotal", "updated_at"]

    def get_total_items(self, obj):
        return sum(item.quantity for item in obj.items.all())

    def get_subtotal(self, obj):
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
