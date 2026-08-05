from django.db.models import BooleanField, Exists, OuterRef, Value
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


from books.models import Book, Favorite

from .serializers import BookSerializer


def with_favorite_status(queryset, user):
    if not user.is_authenticated:
        return queryset.annotate(
            _is_favorite=Value(False, output_field=BooleanField()),
        )

    return queryset.annotate(
        _is_favorite=Exists(
            Favorite.objects.filter(
                user=user,
                book_id=OuterRef("pk"),
            )
        )
    )


class BookListView(ListAPIView):
    serializer_class = BookSerializer

    def get_queryset(self):
        return with_favorite_status(Book.objects.all(), self.request.user)


class BookDetailView(RetrieveAPIView):
    serializer_class = BookSerializer

    def get_queryset(self):
        return with_favorite_status(Book.objects.all(), self.request.user)


class FavoriteListView(ListAPIView):
    serializer_class = BookSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Book.objects.filter(
            favorites__user=self.request.user,
        ).annotate(
            _is_favorite=Value(True, output_field=BooleanField()),
        )


class BookFavoriteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        book = get_object_or_404(Book, pk=pk)
        _, created = Favorite.objects.get_or_create(
            user=request.user,
            book=book,
        )

        return Response(
            {
                "book_id": book.pk,
                "is_favorite": True,
            },
            status=(
                status.HTTP_201_CREATED
                if created
                else status.HTTP_200_OK
            ),
        )

    def delete(self, request, pk):
        book = get_object_or_404(Book, pk=pk)

        Favorite.objects.filter(
            user=request.user,
            book=book,
        ).delete()

        return Response(status=status.HTTP_204_NO_CONTENT)
