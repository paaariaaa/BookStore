from django.db import transaction
from django.db.models import BooleanField, Exists, OuterRef, Value
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, extend_schema_view


from books.models import Book, Cart, CartItem, Favorite

from .permissions import IsAdminOrReadOnly
from .serializers import (
    AddCartItemSerializer,
    BookSerializer,
    CartSerializer,
    CartSyncSerializer,
    FavoriteResponseSerializer,
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


@extend_schema_view(
    get=extend_schema(tags=["Books"], summary="List books"),
)
class BookListView(ListCreateAPIView):
    serializer_class = BookSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        return with_favorite_status(Book.objects.all(), self.request.user)


@extend_schema_view(
    get=extend_schema(tags=["Books"], summary="Retrieve a book"),
)
class BookDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = BookSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        return with_favorite_status(Book.objects.all(), self.request.user)


@extend_schema_view(
    get=extend_schema(tags=["Favorites"], summary="List the current user's favorite books"),
)
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

    @extend_schema(
        tags=["Favorites"],
        summary="Add a book to favorites",
        request=None,
        responses={200: FavoriteResponseSerializer, 201: FavoriteResponseSerializer},
    )
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

    @extend_schema(
        tags=["Favorites"],
        summary="Remove a book from favorites",
        request=None,
        responses={204: None},
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

    @extend_schema(tags=["Cart"], summary="Get the current user's cart", responses=CartSerializer)
    def get(self, request):
        return Response(CartSerializer(get_cart(request.user), context={"request": request}).data)

    @extend_schema(tags=["Cart"], summary="Clear the cart", request=None, responses=CartSerializer)
    @transaction.atomic
    def delete(self, request):
        cart = Cart.objects.select_for_update().filter(user=request.user).first()
        if cart:
            cart.items.all().delete()
            cart.save(update_fields=["updated_at"])
        return Response(CartSerializer(get_cart(request.user), context={"request": request}).data)


class CartItemCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Cart"],
        summary="Add a book to the cart",
        request=AddCartItemSerializer,
        responses={200: CartSerializer, 201: CartSerializer},
    )
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

    @extend_schema(
        tags=["Cart"],
        summary="Set a cart item's quantity",
        request=UpdateCartItemSerializer,
        responses=CartSerializer,
    )
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

    @extend_schema(
        tags=["Cart"],
        summary="Remove a book from the cart",
        request=None,
        responses=CartSerializer,
    )
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

class CartSyncView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Cart"],
        summary="Merge a guest cart into the current user's cart",
        request=CartSyncSerializer,
        responses=CartSerializer,
    )
    @transaction.atomic
    def post(self, request):
        serializer = CartSyncSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        requested_items = serializer.validated_data["items"]
        book_ids = [item["book_id"] for item in requested_items]
        books = {
            book.pk: book
            for book in Book.objects.select_for_update().filter(pk__in=book_ids)
        }

        if len(books) != len(book_ids):
            missing_ids = sorted(set(book_ids) - set(books))
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"book_id": f"Unknown books: {missing_ids}"})

        for item_data in requested_items:
            validate_stock(
                books[item_data["book_id"]],
                item_data["quantity"],
            )

        cart, _ = Cart.objects.get_or_create(user=request.user)
        cart = Cart.objects.select_for_update().get(pk=cart.pk)
        existing_items = {
            item.book_id: item
            for item in CartItem.objects.select_for_update().filter(
                cart=cart,
                book_id__in=book_ids,
            )
        }

        for item_data in requested_items:
            book_id = item_data["book_id"]
            item = existing_items.get(book_id)
            if item:
                item.quantity = max(item.quantity, item_data["quantity"])
                item.save(update_fields=["quantity", "updated_at"])
            else:
                CartItem.objects.create(
                    cart=cart,
                    book=books[book_id],
                    quantity=item_data["quantity"],
                )

        cart.save(update_fields=["updated_at"])
        return Response(CartSerializer(get_cart(request.user), context={"request": request}).data)
# End of cart API views.
