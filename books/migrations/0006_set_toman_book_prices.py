from decimal import Decimal

from django.db import migrations


PRICES = {
    "The Clean Coder": 720_000,
    "Yesteryear: A GMA Book Club Pick: A Novel": 550_000,
    "Things Fall Apart": 420_000,
    "Fairy Tales": 480_000,
    "The Divine Comedy": 650_000,
    "The Epic of Gilgamesh": 390_000,
    "The Book of Job": 320_000,
    "One Thousand and One Nights": 450_000,
    "Njal's Saga": 520_000,
    "Pride and Prejudice": 680_000,
    "Le Pere Goriot": 360_000,
    "Molloy, Malone Dies, The Unnamable": 540_000,
}


def set_toman_prices(apps, schema_editor):
    Book = apps.get_model("books", "Book")
    for title, price in PRICES.items():
        Book.objects.filter(title=title).update(price=Decimal(price))


class Migration(migrations.Migration):
    dependencies = [
        ("books", "0005_book_price_book_stock_cart_cartitem"),
    ]

    operations = [
        migrations.RunPython(set_toman_prices, migrations.RunPython.noop),
    ]
