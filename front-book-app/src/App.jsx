import { useEffect, useState } from 'react';

import AuthBook from './Components/AuthBook';
import Book from './Components/Book';
import BookDetails from './Components/BookDetails';
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

function App() {
  const [route, setRoute] = useState(getCurrentPath);
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [favoriteOverrides, setFavoriteOverrides] = useState({});

  const isAuthRoute = route === '/login' || route === '/register';
  const isBookDetailsRoute = route.startsWith('/books/');
  const authMode = route === '/register' ? 'register' : 'login';
  const bookId = isBookDetailsRoute ? route.replace('/books/', '') : '';

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
    >
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
        />
      ) : (
        <Book
          isBookFavorite={isBookFavorite}
          onOpenBook={(book) => navigate(`/books/${book.id}`)}
          onToggleFavorite={toggleFavorite}
        />
      )}
    </Layout>
  );
}

export default App;
