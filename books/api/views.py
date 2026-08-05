from django.db import transaction
from django.db.models import BooleanField, Exists, OuterRef, Value
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


from books.models import Book, Cart, CartItem, Favorite

from .serializers import (
    AddCartItemSerializer,
    BookSerializer,
    CartSerializer,
    UpdateCartItemSerializer,
)


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


def get_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    return Cart.objects.prefetch_related("items__book").get(pk=cart.pk)


def validate_stock(book, quantity):
    if quantity > book.stock:
        from rest_framework.exceptions import ValidationError

        raise ValidationError(
            {"quantity": f"Only {book.stock} copies are available."}
        )


class CartView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(CartSerializer(get_cart(request.user), context={"request": request}).data)

    @transaction.atomic
    def delete(self, request):
        cart = Cart.objects.select_for_update().filter(user=request.user).first()
        if cart:
            cart.items.all().delete()
            cart.save(update_fields=["updated_at"])
        return Response(CartSerializer(get_cart(request.user), context={"request": request}).data)


class CartItemCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = AddCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        book = get_object_or_404(
            Book.objects.select_for_update(),
            pk=serializer.validated_data["book_id"],
        )
        cart, _ = Cart.objects.get_or_create(user=request.user)
        cart = Cart.objects.select_for_update().get(pk=cart.pk)
        item = CartItem.objects.select_for_update().filter(cart=cart, book=book).first()
        quantity = serializer.validated_data["quantity"] + (item.quantity if item else 0)
        validate_stock(book, quantity)

        if item:
            item.quantity = quantity
            item.save(update_fields=["quantity", "updated_at"])
            response_status = status.HTTP_200_OK
        else:
            CartItem.objects.create(cart=cart, book=book, quantity=quantity)
            response_status = status.HTTP_201_CREATED

        cart.save(update_fields=["updated_at"])

        return Response(
            CartSerializer(get_cart(request.user), context={"request": request}).data,
            status=response_status,
        )


class CartItemDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def patch(self, request, book_id):
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = get_object_or_404(
            CartItem.objects.select_for_update().select_related("book", "cart"),
            cart__user=request.user,
            book_id=book_id,
        )
        quantity = serializer.validated_data["quantity"]
        validate_stock(item.book, quantity)
        item.quantity = quantity
        item.save(update_fields=["quantity", "updated_at"])
        item.cart.save(update_fields=["updated_at"])
        return Response(CartSerializer(get_cart(request.user), context={"request": request}).data)

    @transaction.atomic
    def delete(self, request, book_id):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        cart = Cart.objects.select_for_update().get(pk=cart.pk)
        CartItem.objects.select_for_update().filter(
            cart=cart,
            book_id=book_id,
        ).delete()
        cart.save(update_fields=["updated_at"])
        return Response(CartSerializer(get_cart(request.user), context={"request": request}).data)
