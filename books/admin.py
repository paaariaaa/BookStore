
from django.contrib import admin
from .models import Book, Cart, CartItem, Favorite

admin.site.register(Book)
admin.site.register(Favorite)
admin.site.register(Cart)
admin.site.register(CartItem)
