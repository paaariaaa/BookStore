from rest_framework.generics import ListAPIView ,RetrieveAPIView
from books.models import Book,Favorite
from .serializers import BookSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

class BookListView(ListAPIView):
    queryset = Book.objects.all()
    serializer_class = BookSerializer

class BookDetailView(RetrieveAPIView):
	queryset = Book.objects.all()
	serializer_class = BookSerializer

class FavoriteListView(ListAPIView):
    serializer_class = BookSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Book.objects.filter(
            favorites__user=self.request.user
        )

class BookFavoriteView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        book = Book.objects.get(pk=pk)

        Favorite.objects.get_or_create(
            user=request.user,
            book=book,
        )

        return Response(
            {"is_favorite": True},
            status=status.HTTP_200_OK,
        )

    def delete(self, request, pk):
        book = Book.objects.get(pk=pk)

        Favorite.objects.filter(
            user=request.user,
            book=book,
        ).delete()

        return Response(status=status.HTTP_204_NO_CONTENT)