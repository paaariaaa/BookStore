from django.db import migrations


BOOKS = [
    {
        "title": "The Clean Coder",
        "author": "Robert C. Martin",
        "country": "United States",
        "description": (
            "A practical guide to professionalism in software development, "
            "covering responsibility, communication, estimation, testing, and sustainable work."
        ),
        "language": "English",
        "pages": 256,
        "published_year": 2011,
        "isbn": "9780137081073",
        "source_url": "https://en.wikipedia.org/wiki/Robert_C._Martin",
        "image": "books/Prentice.Hall.The.Clean.Coder.May.2011.www.EBooksWorld.ir.jpg",
    },
    {
        "title": "Things Fall Apart",
        "author": "Chinua Achebe",
        "country": "Nigeria",
        "description": (
            "A landmark novel about Okonkwo, his community, and the upheaval caused by colonial rule."
        ),
        "language": "English",
        "pages": 209,
        "published_year": 1958,
        "isbn": "9780385474542",
        "source_url": "https://en.wikipedia.org/wiki/Things_Fall_Apart",
        "image": "books/things-fall-apart.png",
    },
    {
        "title": "Fairy Tales",
        "author": "Hans Christian Andersen",
        "country": "Denmark",
        "description": (
            "A collection of enduring fairy tales filled with wonder, wit, melancholy, and imagination."
        ),
        "language": "Danish",
        "pages": 784,
        "published_year": 1836,
        "isbn": "9781000000023",
        "source_url": "https://en.wikipedia.org/wiki/Fairy_Tales_Told_for_Children._First_Collection",
        "image": "books/fairy-tales.png",
    },
    {
        "title": "The Divine Comedy",
        "author": "Dante Alighieri",
        "country": "Italy",
        "description": (
            "Dante's monumental journey through Inferno, Purgatorio, and Paradiso."
        ),
        "language": "Italian",
        "pages": 928,
        "published_year": 1321,
        "isbn": "9781000000030",
        "source_url": "https://en.wikipedia.org/wiki/Divine_Comedy",
        "image": "books/divine-comedy.png",
    },
    {
        "title": "The Epic of Gilgamesh",
        "author": "Maureen Gallery Kovacs",
        "country": "Sumer and Akkadian Empire",
        "description": (
            "An ancient epic of friendship, glory, grief, mortality, and the search for meaning."
        ),
        "language": "Akkadian",
        "pages": 160,
        "published_year": -1700,
        "isbn": "9781000000047",
        "source_url": "https://en.wikipedia.org/wiki/Epic_of_Gilgamesh",
        "image": "books/epic-of-gilgamesh.png",
    },
    {
        "title": "The Book of Job",
        "author": "Ricardo Graham",
        "country": "Achaemenid Empire",
        "description": (
            "A profound poetic meditation on suffering, faith, silence, justice, and endurance."
        ),
        "language": "Hebrew",
        "pages": 176,
        "published_year": -600,
        "isbn": "9781000000054",
        "source_url": "https://en.wikipedia.org/wiki/Book_of_Job",
        "image": "books/book-of-job.png",
    },
    {
        "title": "One Thousand and One Nights",
        "author": "Hanan Al-Shaykh",
        "country": "Middle East and South Asia",
        "description": (
            "A vivid world of nested tales, clever voices, impossible turns, and night-by-night suspense."
        ),
        "language": "Arabic",
        "pages": 288,
        "published_year": 1200,
        "isbn": "9781000000061",
        "source_url": "https://en.wikipedia.org/wiki/One_Thousand_and_One_Nights",
        "image": "books/one-thousand-and-one-nights.png",
    },
    {
        "title": "Njal's Saga",
        "author": "Robert Cook",
        "country": "Iceland",
        "description": (
            "An Icelandic saga of honor, feud, loyalty, law, and far-reaching consequences."
        ),
        "language": "Old Norse",
        "pages": 384,
        "published_year": 1280,
        "isbn": "9781000000078",
        "source_url": "https://en.wikipedia.org/wiki/Nj%C3%A1ls_saga",
        "image": "books/njals-saga.png",
    },
    {
        "title": "Pride and Prejudice",
        "author": "Jane Austen",
        "country": "United Kingdom",
        "description": (
            "A sharp and elegant novel of manners, first impressions, wit, and emotional growth."
        ),
        "language": "English",
        "pages": 226,
        "published_year": 1813,
        "isbn": "9781000000085",
        "source_url": "https://en.wikipedia.org/wiki/Pride_and_Prejudice",
        "image": "books/pride-and-prejudice.png",
    },
    {
        "title": "Le Pere Goriot",
        "author": "Honore de Balzac",
        "country": "France",
        "description": (
            "A Parisian study of ambition, money, sacrifice, family, and social hunger."
        ),
        "language": "French",
        "pages": 443,
        "published_year": 1835,
        "isbn": "9781000000092",
        "source_url": "https://en.wikipedia.org/wiki/Le_P%C3%A8re_Goriot",
        "image": "books/le-pere-goriot.png",
    },
    {
        "title": "Molloy, Malone Dies, The Unnamable",
        "author": "Samuel Beckett",
        "country": "Republic of Ireland",
        "description": (
            "Three spare, strange, darkly funny novels that challenge identity, narrative, and certainty."
        ),
        "language": "French",
        "pages": 256,
        "published_year": 1952,
        "isbn": "9781000000108",
        "source_url": "https://en.wikipedia.org/wiki/Molloy_(novel)",
        "image": "books/molloy-malone-dies.png",
    },
]


def seed_books(apps, schema_editor):
    Book = apps.get_model("books", "Book")

    for book_data in BOOKS:
        existing_book = Book.objects.filter(
            title__iexact=book_data["title"],
        ).first()

        if existing_book is None and book_data["title"] == "The Clean Coder":
            existing_book = Book.objects.filter(title__iexact="clean coder").first()

        if existing_book is None:
            Book.objects.create(**book_data)
            continue

        for field, value in book_data.items():
            setattr(existing_book, field, value)
        existing_book.save()


class Migration(migrations.Migration):
    dependencies = [
        ("books", "0002_book_country_book_source_url_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_books, migrations.RunPython.noop),
    ]
