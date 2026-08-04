from django.db import models
from django.contrib.auth.models import User




class Book(models.Model):
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    language = models.CharField(max_length=100, blank=True)
    pages = models.PositiveIntegerField(default=1)
    published_year = models.PositiveSmallIntegerField(null=True, blank=True)
    isbn = models.CharField(max_length=13, unique=True, null=True, blank=True)
    image = models.ImageField(upload_to="books/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)



    def __str__(self):
        return f"{self.title} - {self.author}"


class Favorite(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="favorites",
    )
    book = models.ForeignKey(
        Book,
        on_delete=models.CASCADE,
        related_name="favorites",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "book"],
                name="unique_user_book_favorite",
            )
        ]

    def __str__(self):
        return f"{self.user.username} - {self.book.title}"
