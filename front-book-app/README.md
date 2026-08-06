# Bookstore Frontend

The React client for the Bookstore platform. It provides the public catalogue, book details, reviews, favorites, guest and authenticated carts, mock checkout, reader profiles, book administration, and user access management.

## Technology

- React 19
- Vite 8
- CSS Modules
- React Icons
- PropTypes
- JWT authentication through the Django REST API

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- npm
- The Bookstore backend running locally or available through a public URL

Frontend dependencies are defined in `package.json` and locked in `package-lock.json`. Use `npm install` to install the exact locked dependency tree.

## Local setup

From `front-book-app`:

```powershell
npm install
npm run dev
```

The development server is available at:

```text
http://127.0.0.1:5173
```

By default, Vite proxies `/api` and `/media` requests to:

```text
http://127.0.0.1:8000
```

Start the Django backend before using API-backed features.

## Environment configuration

Copy the example file when a custom backend origin is needed:

```powershell
Copy-Item .env.example .env
```

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Optional | Public backend origin without a trailing slash, for example `https://api.example.com` |

Leave `VITE_API_BASE_URL` empty during local development to use the Vite proxy. Set it in production when the backend is served from a different origin. Vite environment values are embedded at build time, so production values must be set before `npm run build`.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run lint` | Run ESLint across JavaScript and JSX files |
| `npm run build` | Create the production bundle in `dist/` |
| `npm run preview` | Preview the production bundle locally |

## Application routes

Routing is handled manually with the browser History API.

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Book catalogue and storefront |
| `/books/:id` | Public | Book details, ratings, and reviews |
| `/login` | Public | User login |
| `/register` | Public | Customer registration |
| `/admin/books` | Staff | Book catalogue management |
| `/admin/users` | Staff | User directory; changes require superadmin access |

Production hosting must return `index.html` for unknown application routes so direct navigation and browser refreshes work correctly.

## Authentication and session behavior

- Login and registration responses provide the initial user profile plus access and refresh tokens.
- The application requests `GET /api/auth/profile/` during startup to refresh user data, including `is_staff`.
- Tokens are stored by the centralized API service.
- Components send requests through `apiRequest`; they do not call the refresh endpoint directly.
- On `401`, `apiRequest` refreshes the access token and retries the original request once.
- Refresh tokens rotate on the backend and the new token pair replaces the previous pair.
- If refresh fails, stored authentication data is cleared and the application redirects to `/login`.
- Staff routes are protected in the UI, while authorization remains enforced by the backend.

## Main capabilities

### Storefront

- Public book catalogue and book details
- Responsive book cards and stock-aware cart controls
- Authenticated favorites
- Public review list with rating summary
- One review per user and book
- Owner edit/delete actions and staff delete permission

### Cart and checkout

- Guest cart persistence in `localStorage`
- Guest-cart synchronization after login
- Server-authoritative prices, stock, subtotal, and order totals
- Exact quantity updates through cart item PATCH requests
- Mock payment with an idempotency key to prevent duplicate orders
- Paid, failed, retry, stock-conflict, and order-summary states

### Reader profile

- Fresh profile retrieval whenever the profile drawer opens
- Display of account identity and staff status
- Secure logout and session-expiry handling

### Administration

- Staff-only book management route
- Book create, edit, and delete actions using `FormData`
- Cover preview, drag-and-drop upload, validation, search, and stock filters
- Staff-readable user directory
- Superadmin-only role and account-status controls
- Protected superadmin rows and confirmation before deactivation

## API conventions

All application requests must use `src/services/api.js`.

- JSON bodies are serialized automatically.
- `FormData` bodies are sent without manually setting `Content-Type`.
- Bearer tokens are attached automatically when available.
- Relative media paths are resolved through the configured backend origin.
- A `403` response is converted to the user-facing access-denied message.

Do not call `fetch` directly from components and do not duplicate refresh-token logic outside the API service.

## Project structure

```text
src/
├── Components/       Feature components and CSS Modules
├── Layout/           Shared header, navigation, and footer
├── constants/        Static application data
├── services/api.js   API, JWT, refresh, media, and formatting helpers
├── App.jsx           State, manual routing, cart, and session orchestration
├── global.css        Global styles
└── main.jsx          React entry point
```

## Production build

Set the production backend origin and create the bundle:

```powershell
$env:VITE_API_BASE_URL = "https://api.example.com"
npm run build
```

Deploy the generated `dist/` directory to a static host. Configure the backend `CORS_ALLOWED_ORIGINS` value with the exact public frontend origin.

## Backend documentation

Backend setup, permissions, API endpoints, environment variables, and test commands are documented in the [project README](../README.md).
