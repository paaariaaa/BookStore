import { useCallback, useEffect, useState } from 'react';

import AuthBook from './Components/AuthBook';
import Book from './Components/Book';
import BookDetails from './Components/BookDetails';
import CartDrawer from './Components/CartDrawer';
import Layout from './Layout/Layout';
import {
  apiRequest,
  clearAuthToken,
  getSinglePayload,
  getStoredAuthToken,
  getStoredRefreshToken,
  getStoredUser,
  saveAuthTokens,
  saveStoredUser,
} from './services/api';

const getCurrentPath = () => {
  if (typeof window === 'undefined') return '/';

  return window.location.pathname;
};

const getProfileSource = (payload) => getSinglePayload(payload)?.user || getSinglePayload(payload)?.profile || getSinglePayload(payload);

const createUserProfile = (payload, fallback = {}) => {
  const profile = getProfileSource(payload) || {};
  const firstname = profile.firstname || profile.first_name || fallback.firstname || '';
  const lastname = profile.lastname || profile.last_name || fallback.lastname || '';
  const username = profile.username || fallback.username || '';
  const fullName = profile.full_name || profile.name || `${firstname} ${lastname}`.trim();
  const displayName = fullName || fallback.displayName || username || 'Reader';

  return {
    ...profile,
    displayName,
    email: profile.email || fallback.email || '',
    firstname,
    lastname,
    shelfCode: (username || displayName).slice(0, 2).toUpperCase(),
    username,
  };
};

const getFavoriteStatus = (book = {}) => book.isFavorite ?? book.is_favorite;
const GUEST_CART_KEY = 'book-app-guest-cart';

const getGuestCart = () => {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(GUEST_CART_KEY));
    return Array.isArray(value) ? value.filter((item) => item?.id && item?.quantity > 0) : [];
  } catch {
    window.localStorage.removeItem(GUEST_CART_KEY);
    return [];
  }
};

const saveGuestCart = (cart) => {
  window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
};
const normalizeCart = (payload = {}) => (payload.items || []).map((item) => ({
  ...item.book,
  lineTotal: String(item.line_total ?? '0.00'),
  quantity: item.quantity,
}));

function App() {
  const [route, setRoute] = useState(getCurrentPath);
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [favoriteOverrides, setFavoriteOverrides] = useState({});
  const [cart, setCart] = useState(getGuestCart);
  const [cartSubtotal, setCartSubtotal] = useState('0.00');
  const [cartError, setCartError] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);

  const isAuthRoute = route === '/login' || route === '/register';
  const isBookDetailsRoute = route.startsWith('/books/');
  const authMode = route === '/register' ? 'register' : 'login';
  const bookId = isBookDetailsRoute ? route.replace('/books/', '') : '';
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const displayedCartSubtotal = currentUser
    ? cartSubtotal
    : String(cart.reduce((total, item) => total + Number(item.price || 0) * item.quantity, 0));

  const applyCartResponse = useCallback((payload) => {
    setCart(normalizeCart(payload));
    setCartSubtotal(String(payload?.subtotal ?? '0.00'));
    setCartError('');
  }, []);

  useEffect(() => {
    let isActive = true;

    if (!currentUser) {
      setCart(getGuestCart());
      setCartSubtotal('0.00');
      return undefined;
    }

    const guestCart = getGuestCart();
    const request = guestCart.length
      ? apiRequest('/api/books/cart/sync/', {
          body: {
            items: guestCart.map((item) => ({ book_id: item.id, quantity: item.quantity })),
          },
          method: 'POST',
        })
      : apiRequest('/api/books/cart/');

    request
      .then((payload) => {
        if (isActive) {
          window.localStorage.removeItem(GUEST_CART_KEY);
          applyCartResponse(payload);
        }
      })
      .catch((error) => {
        if (isActive) setCartError(error.message);
      });

    return () => {
      isActive = false;
    };
  }, [applyCartResponse, currentUser]);

  useEffect(() => {
    const token = getStoredAuthToken();
    let isActive = true;

    if (!token) return undefined;

    apiRequest('/api/auth/profile/')
      .then((profile) => {
        if (isActive) {
          const user = createUserProfile(profile);
          setCurrentUser(user);
          saveStoredUser(user);
        }
      })
      .catch(() => {
        clearAuthToken();
        if (isActive) setCurrentUser(null);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const popStateHandler = () => {
      setRoute(getCurrentPath());
    }

    const sessionExpiredHandler = () => {
      setCurrentUser(null);
      setFavoriteOverrides({});
      setCart([]);
      navigate('/login');
    }

    window.addEventListener('popstate', popStateHandler);
	window.addEventListener('book-app:session-expired', sessionExpiredHandler);

	return () => {
		window.removeEventListener('popstate', popStateHandler);
		window.removeEventListener('book-app:session-expired', sessionExpiredHandler);
	};
  }, []);

  const navigate = (nextPath) => {
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }

    setRoute(nextPath);
  }

  const addToCart = async (book = {}) => {
    if (!book.id) return;

    if (!currentUser) {
      setCart((currentCart) => {
        const existing = currentCart.find((item) => String(item.id) === String(book.id));
        const nextCart = existing
          ? currentCart.map((item) => String(item.id) === String(book.id)
              ? { ...item, quantity: item.quantity + 1 }
              : item)
          : [...currentCart, { ...book, quantity: 1 }];
        saveGuestCart(nextCart);
        return nextCart;
      });
      return;
    }

    try {
      const payload = await apiRequest('/api/books/cart/items/', {
        body: { book_id: book.id, quantity: 1 },
        method: 'POST',
      });
      applyCartResponse(payload);
    } catch (error) {
      setCartError(error.message);
    }
  };

  const changeCartQuantity = async (bookIdToChange, amount) => {
    const item = cart.find((entry) => String(entry.id) === String(bookIdToChange));
    if (!item) return;
    const nextQuantity = item.quantity + amount;

    if (!currentUser) {
      const nextCart = cart
        .map((entry) => String(entry.id) === String(bookIdToChange)
          ? { ...entry, quantity: nextQuantity }
          : entry)
        .filter((entry) => entry.quantity > 0);
      saveGuestCart(nextCart);
      setCart(nextCart);
      return;
    }

    try {
      const payload = await apiRequest(`/api/books/cart/items/${bookIdToChange}/`, {
        body: nextQuantity > 0 ? { quantity: nextQuantity } : undefined,
        method: nextQuantity > 0 ? 'PATCH' : 'DELETE',
      });
      applyCartResponse(payload);
    } catch (error) {
      setCartError(error.message);
    }
  };

  const removeFromCart = async (bookIdToRemove) => {
    if (!currentUser) {
      const nextCart = cart.filter((item) => String(item.id) !== String(bookIdToRemove));
      saveGuestCart(nextCart);
      setCart(nextCart);
      return;
    }

    try {
      const payload = await apiRequest(`/api/books/cart/items/${bookIdToRemove}/`, {
        method: 'DELETE',
      });
      applyCartResponse(payload);
    } catch (error) {
      setCartError(error.message);
    }
  };

  const clearCart = async () => {
    if (!currentUser) {
      saveGuestCart([]);
      setCart([]);
      return;
    }

    try {
      const payload = await apiRequest('/api/books/cart/', { method: 'DELETE' });
      applyCartResponse(payload);
    } catch (error) {
      setCartError(error.message);
    }
  };

  const getCartQuantity = (bookIdToFind) => cart.find((item) => String(item.id) === String(bookIdToFind))?.quantity || 0;
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const isBookFavorite = (book = {}) => {
    const bookKey = String(book.id || '');

    if (!bookKey) return false;
    if (Object.prototype.hasOwnProperty.call(favoriteOverrides, bookKey)) return favoriteOverrides[bookKey];

    return Boolean(getFavoriteStatus(book));
  }

  const toggleFavorite = async (book = {}) => {
    const bookKey = String(book.id || '');

    if (!bookKey) return;

    if (!currentUser) {
      navigate('/login');
      return;
    }

    const wasFavorite = isBookFavorite(book);

    setFavoriteOverrides((currentOverrides) => ({
      ...currentOverrides,
      [bookKey]: !wasFavorite,
    }));

    try {
      await apiRequest(`/api/books/${bookKey}/favorite/`, {
        method: wasFavorite ? 'DELETE' : 'POST',
      });
    } catch {
      setFavoriteOverrides((currentOverrides) => ({
        ...currentOverrides,
        [bookKey]: wasFavorite,
      }));
    }
  }

  const loginHandler = async (credentials) => {
    const response = await apiRequest('/api/auth/login/', {
      body: credentials,
      method: 'POST',
      retryOnUnauthorized: false,
      token: '',
    });

    if (!saveAuthTokens(response)) {
      throw new Error('The server did not return a complete authentication session.');
    }

    const user = createUserProfile(response.user, credentials);
    setCurrentUser(user);
    saveStoredUser(user);
    navigate('/');
  }

  const registerHandler = async (registerData) => {
    const response = await apiRequest('/api/auth/register/', {
      body: registerData,
      method: 'POST',
      retryOnUnauthorized: false,
      token: '',
    });

    if (!saveAuthTokens(response)) {
      throw new Error('The server did not return a complete authentication session.');
    }

    const user = createUserProfile(response.user, registerData);
    setCurrentUser(user);
    saveStoredUser(user);
    navigate('/');
  }

  const logoutHandler = async () => {
    const refresh = getStoredRefreshToken();

    try {
      if (refresh) {
        await apiRequest('/api/auth/logout/', {
          body: { refresh },
          method: 'POST',
          retryOnUnauthorized: false,
          token: '',
        });
      }
    } finally {
      clearAuthToken();
      setCurrentUser(null);
      setFavoriteOverrides({});
      setCart([]);
      setCartSubtotal('0.00');
      navigate('/');
    }
  }

  return (
    <Layout
      currentUser={currentUser}
      onHomeClick={() => navigate('/')}
      onLoginClick={() => navigate('/login')}
      onRegisterClick={() => navigate('/register')}
      onLogout={logoutHandler}
      cartCount={cartCount}
      onCartClick={() => setIsCartOpen(true)}
    >
      <CartDrawer
        cart={cart}
        isOpen={isCartOpen}
        onChangeQuantity={changeCartQuantity}
        onClose={closeCart}
        onOpenBook={(book) => navigate(`/books/${book.id}`)}
        onRemove={removeFromCart}
        onClear={clearCart}
        error={cartError}
        subtotal={displayedCartSubtotal}
      />
      {isAuthRoute ? (
        <AuthBook
          authMode={authMode}
          onLogin={loginHandler}
          onNavigate={navigate}
          onRegister={registerHandler}
        />
      ) : isBookDetailsRoute ? (
        <BookDetails
          book={null}
          bookId={bookId}
          isBookFavorite={isBookFavorite}
          onBack={() => navigate('/')}
          onOpenBook={(book) => navigate(`/books/${book.id}`)}
          onToggleFavorite={toggleFavorite}
          cartQuantity={getCartQuantity(bookId)}
          onAddToCart={addToCart}
          onChangeCartQuantity={changeCartQuantity}
        />
      ) : (
        <Book
          isBookFavorite={isBookFavorite}
          onOpenBook={(book) => navigate(`/books/${book.id}`)}
          onToggleFavorite={toggleFavorite}
          getCartQuantity={getCartQuantity}
          onAddToCart={addToCart}
          onChangeCartQuantity={changeCartQuantity}
        />
      )}
    </Layout>
  );
}

export default App;
