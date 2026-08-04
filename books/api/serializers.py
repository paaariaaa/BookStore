from rest_framework import serializers
from books.models import Book

class BookSerializer(serializers.ModelSerializer):
    is_favorite = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = "__all__"

    def get_is_favorite(self, obj):
        request = self.context.get("request")

        if request and request.user.is_authenticated:
            return obj.favorites.filter(user=request.user).exists()

        return False