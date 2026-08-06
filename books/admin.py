
from django.contrib import admin
from .models import Book, Cart, CartItem, Favorite, Order, OrderItem

admin.site.register(Book)
admin.site.register(Favorite)
admin.site.register(Cart)
admin.site.register(CartItem)
admin.site.register(Order)
admin.site.register(OrderItem)
