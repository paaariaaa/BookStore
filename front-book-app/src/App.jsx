import { useEffect, useState } from 'react';

import AuthBook from './Components/AuthBook';
import Book from './Components/Book';
import BookDetails from './Components/BookDetails';
import { books as bookData } from './constants/mockData';
import Layout from './Layout/Layout';
import {
  apiRequest,
  clearAuthToken,
  extractAuthToken,
  getSinglePayload,
  getStoredAuthToken,
  saveAuthToken,
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
  const [currentUser, setCurrentUser] = useState(null);
  const [favoriteOverrides, setFavoriteOverrides] = useState({});

  const isAuthRoute = route === '/login' || route === '/register';
  const isBookDetailsRoute = route.startsWith('/books/');
  const authMode = route === '/register' ? 'register' : 'login';
  const bookId = isBookDetailsRoute ? route.replace('/books/', '') : '';
  const selectedBook = bookData.find((book) => String(book.id) === bookId);

  useEffect(() => {
    const token = getStoredAuthToken();
    let isActive = true;

    if (!token) return undefined;

    apiRequest('/api/auth/profile')
      .then((profile) => {
        if (isActive) setCurrentUser(createUserProfile(profile));
      })
      .catch(() => clearAuthToken());

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const popStateHandler = () => {
      setRoute(getCurrentPath());
    }

    window.addEventListener('popstate', popStateHandler);

    return () => window.removeEventListener('popstate', popStateHandler);
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

  const toggleFavorite = (book = {}) => {
    const bookKey = String(book.id || '');

    if (!bookKey) return;

    setFavoriteOverrides((currentOverrides) => ({
      ...currentOverrides,
      [bookKey]: Object.prototype.hasOwnProperty.call(currentOverrides, bookKey)
        ? !currentOverrides[bookKey]
        : !Boolean(getFavoriteStatus(book)),
    }));
  }

  const loginHandler = async (credentials) => {
    const response = await apiRequest('/api/auth/login', {
      body: credentials,
      method: 'POST',
    });
    const token = extractAuthToken(response);
    let profile = response;

    if (token) {
      saveAuthToken(token);

      try {
        profile = await apiRequest('/api/auth/profile');
      } catch {
        profile = response;
      }
    }

    setCurrentUser(createUserProfile(profile, credentials));
    navigate('/');
  }

  const registerHandler = async (registerData) => {
    const response = await apiRequest('/api/auth/register', {
      body: registerData,
      method: 'POST',
    });
    const token = extractAuthToken(response);
    let profile = response;

    if (token) {
      saveAuthToken(token);

      try {
        profile = await apiRequest('/api/auth/profile');
      } catch {
        profile = response;
      }
    }

    setCurrentUser(createUserProfile(profile, registerData));
    navigate('/');
  }

  const logoutHandler = () => {
    clearAuthToken();
    setCurrentUser(null);
    navigate('/');
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
          book={selectedBook}
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
