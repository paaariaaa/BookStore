# Bookstore

A full-stack bookstore application with a Django REST API and a React client. The platform covers catalogue browsing, reviews, favorites, carts, mock checkout, reader profiles, book administration, and role-based user management.

## Repository layout

```text
BookStore/
├── account/                 Authentication, profiles, and user management
├── books/                   Catalogue, reviews, favorites, carts, and orders
├── bookstore/               Django settings and root URL configuration
├── front-book-app/          React and Vite frontend
├── media/books/             Uploaded and default book covers
├── manage.py                Django command entry point
├── requirements.txt         Locked backend dependencies
└── backend.env.example      Production environment reference
```

Frontend-specific setup and architecture are documented in the [frontend README](front-book-app/README.md).

## Technology

### Backend

- Python 3.12
- Django 6
- Django REST Framework
- Simple JWT with rotation and token blacklisting
- drf-spectacular with bundled Swagger and Redoc assets
- SQLite
- Pillow for book-cover uploads
- django-cors-headers

### Frontend

- React 19
- Vite 8
- CSS Modules
- Centralized JWT-aware API client

## Backend requirements

- Python 3.12 or newer in the Django 6 supported range
- pip
- A virtual environment is strongly recommended

All direct Python dependencies are pinned in `requirements.txt`:

```text
Django
django-cors-headers
djangorestframework
djangorestframework-simplejwt
drf-spectacular
drf-spectacular-sidecar
Pillow
```

Do not install frontend packages with pip. The React dependency manifest is `front-book-app/package.json` and its reproducible lockfile is `front-book-app/package-lock.json`.

## Backend local setup

Run these commands from the repository root.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The API is available at:

```text
http://127.0.0.1:8000
```

Development defaults require no environment variables. With `DJANGO_DEBUG=true`, Django accepts `localhost` and `127.0.0.1`, serves media locally, and allows local Vite origins on any port.

## Environment variables

Django reads operating-system or deployment-platform environment variables directly. `backend.env.example` is a reference file; it is not loaded automatically by the application.

| Variable | Development default | Production guidance |
| --- | --- | --- |
| `DJANGO_DEBUG` | `true` | Set to `false` |
| `DJANGO_SECRET_KEY` | Local development fallback | Required when debug is disabled |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated API hosts |
| `CORS_ALLOWED_ORIGINS` | Localhost regexes | Comma-separated exact frontend origins |
| `SECURE_SSL_REDIRECT` | `false` | Usually `true` |
| `SECURE_HSTS_SECONDS` | `0` | Commonly `31536000` after HTTPS is verified |
| `SECURE_HSTS_INCLUDE_SUBDOMAINS` | `false` | Enable only when all subdomains use HTTPS |
| `SECURE_HSTS_PRELOAD` | `false` | Enable only after validating preload requirements |
| `SESSION_COOKIE_SECURE` | `false` | Set to `true` over HTTPS |
| `CSRF_COOKIE_SECURE` | `false` | Set to `true` over HTTPS |
| `USE_X_FORWARDED_PROTO` | `false` | Enable behind a trusted TLS-terminating proxy |

Example PowerShell development override:

```powershell
$env:DJANGO_DEBUG = "true"
$env:CORS_ALLOWED_ORIGINS = "http://127.0.0.1:5173"
python manage.py runserver
```

## API documentation

| URL | Purpose |
| --- | --- |
| `/api/schema/` | OpenAPI schema |
| `/api/docs/` | Swagger UI |
| `/api/redoc/` | Redoc |
| `/admin/` | Django administration site |

Swagger and Redoc assets are served locally by `drf-spectacular-sidecar`; the documentation UI does not depend on a public CDN.

## Authentication

Authenticated requests use:

```http
Authorization: Bearer <access_token>
```

JWT policy:

- Access token lifetime: 15 minutes
- Refresh token lifetime: 7 days
- Refresh tokens rotate on every successful refresh
- The previous refresh token is blacklisted after rotation
- Logout blacklists the submitted refresh token
- Changing a password blacklists all outstanding tokens for that user

Login and registration return:

```json
{
  "user": {
    "id": 1,
    "username": "ali",
    "email": "ali@example.com",
    "first_name": "Ali",
    "last_name": "Ahmadi",
    "is_staff": true
  },
  "access": "...",
  "refresh": "..."
}
```

## Roles and permissions

| Capability | Guest | Customer | Admin (`is_staff`) | Superadmin (`is_superuser`) |
| --- | ---: | ---: | ---: | ---: |
| Browse books and reviews | Yes | Yes | Yes | Yes |
| Create a review | No | Yes | Yes | Yes |
| Edit own review | No | Yes | Yes | Yes |
| Delete own review | No | Yes | Yes | Yes |
| Delete another user's review | No | No | Yes | Yes |
| Use favorites, server cart, and checkout | No | Yes | Yes | Yes |
| Create, edit, or delete books | No | No | Yes | Yes |
| Read the user directory | No | No | Yes | Yes |
| Change user roles or active status | No | No | No | Yes |

User-management safeguards also prevent:

- assigning roles other than `admin` or `customer`;
- modifying protected superadmin accounts;
- deactivating your own account;
- removing your own administrator access;
- deactivating a superadmin through the user-management API.

An inactive user cannot log in and authenticated API access is rejected.

## API endpoints

### Authentication and profiles

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register/` | Public | Register a customer and issue JWT tokens |
| `POST` | `/api/auth/login/` | Public | Authenticate and issue JWT tokens |
| `POST` | `/api/auth/refresh/` | Public with refresh token | Rotate the refresh token and issue a new access token |
| `POST` | `/api/auth/logout/` | Public with refresh token | Blacklist a refresh token |
| `GET` | `/api/auth/profile/` | Authenticated | Retrieve the current profile |
| `PATCH` / `PUT` | `/api/auth/profile/` | Authenticated | Update the current profile |
| `POST` | `/api/auth/profile/password/` | Authenticated | Change password and revoke outstanding tokens |
| `GET` | `/api/auth/users/` | Staff | List user accounts |
| `GET` | `/api/auth/users/{id}/` | Staff | Retrieve a user account |
| `PATCH` / `PUT` | `/api/auth/users/{id}/` | Superadmin | Update role or active status |

### Books

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/books/` | Public | List books |
| `POST` | `/api/books/` | Staff | Create a book using JSON or multipart form data |
| `GET` | `/api/books/{id}/` | Public | Retrieve a book |
| `PATCH` / `PUT` | `/api/books/{id}/` | Staff | Update a book |
| `DELETE` | `/api/books/{id}/` | Staff | Delete a book |

Book fields are `title`, `author`, `description`, `country`, `language`, `pages`, `price`, `stock`, `published_year`, `isbn`, `source_url`, and `image`.

### Reviews

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/books/{book_id}/reviews/` | Public | List reviews for a book |
| `POST` | `/api/books/{book_id}/reviews/` | Authenticated | Create one rating and review for the book |
| `GET` | `/api/books/{book_id}/reviews/{review_id}/` | Public | Retrieve a review |
| `PATCH` / `PUT` | `/api/books/{book_id}/reviews/{review_id}/` | Owner | Update a review |
| `DELETE` | `/api/books/{book_id}/reviews/{review_id}/` | Owner or staff | Delete a review |

Ratings are integers from 1 to 5. Each user can create only one review per book. Review responses include `is_owner`, `can_edit`, and `can_delete`.

### Favorites

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/books/favorites/` | Authenticated | List favorite books |
| `POST` | `/api/books/{id}/favorite/` | Authenticated | Add a favorite |
| `DELETE` | `/api/books/{id}/favorite/` | Authenticated | Remove a favorite |

### Cart and payment

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/books/cart/` | Authenticated | Retrieve the current cart |
| `DELETE` | `/api/books/cart/` | Authenticated | Clear the cart |
| `POST` | `/api/books/cart/items/` | Authenticated | Add quantity to a cart item |
| `PATCH` | `/api/books/cart/items/{book_id}/` | Authenticated | Set an exact item quantity |
| `DELETE` | `/api/books/cart/items/{book_id}/` | Authenticated | Remove an item |
| `POST` | `/api/books/cart/sync/` | Authenticated | Merge a guest cart into the server cart |
| `POST` | `/api/books/cart/pay/mock/` | Authenticated | Create a paid or failed mock order |

Payment totals and stock are calculated inside a database transaction from current database values. Use a stable UUID `idempotency_key` when retrying the same payment attempt. A successful payment decrements stock and clears the cart atomically; a stock conflict rolls back the order.

The payment endpoint is a mock gateway and must be replaced before accepting real payments.

## Media files

Book covers are stored below `media/books/`. During development, Django serves media when debug mode is enabled. Production deployments must configure persistent media storage and serve `/media/` through the web server, object storage, or a dedicated media service.

The default book image is expected at:

```text
media/books/default-cover.png
```

## Tests

Run the backend test suite from the repository root:

```powershell
python manage.py test
```

The test suite covers authentication and token rotation, password changes, role permissions, books, reviews, favorites, media, cart operations, payment rollback and idempotency, CORS, and API documentation.

## Production checklist

1. Set `DJANGO_DEBUG=false`.
2. Provide a strong `DJANGO_SECRET_KEY`.
3. Configure exact allowed hosts and CORS origins.
4. Terminate HTTPS correctly before enabling HSTS and proxy headers.
5. Replace SQLite when the deployment requires concurrent or distributed workloads.
6. Configure persistent media storage and a static-file deployment strategy.
7. Replace the mock payment endpoint with a verified payment provider.
8. Run migrations and the backend test suite before deployment.
9. Build the frontend with its production `VITE_API_BASE_URL`.
