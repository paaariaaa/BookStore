import { useCallback, useEffect, useRef, useState } from "react";

import AuthBook from "./Components/AuthBook";
import AdminBooks, { AdminAccessGate } from "./Components/AdminBooks";
import AdminUsers from "./Components/AdminUsers";
import Book from "./Components/Book";
import BookDetails from "./Components/BookDetails";
import CartDrawer from "./Components/CartDrawer";
import ProfileDrawer from "./Components/ProfileDrawer";
import Layout from "./Layout/Layout";
import {
  apiRequest,
  clearAuthToken,
  getSinglePayload,
  getStoredAuthToken,
  getStoredRefreshToken,
  getStoredUser,
  saveAuthTokens,
  saveStoredUser,
} from "./services/api";

const getCurrentPath = () => {
  if (typeof window === "undefined") return "/";

  return window.location.pathname;
};

const getProfileSource = (payload) =>
  getSinglePayload(payload)?.user ||
  getSinglePayload(payload)?.profile ||
  getSinglePayload(payload);

const createUserProfile = (payload, fallback = {}) => {
  const profile = getProfileSource(payload) || {};
  const firstname =
    profile.firstname || profile.first_name || fallback.firstname || "";
  const lastname =
    profile.lastname || profile.last_name || fallback.lastname || "";
  const username = profile.username || fallback.username || "";
  const fullName =
    profile.full_name || profile.name || `${firstname} ${lastname}`.trim();
  const displayName = fullName || fallback.displayName || username || "Reader";

  return {
    ...profile,
    displayName,
    email: profile.email || fallback.email || "",
    firstname,
    is_staff: Boolean(profile.is_staff ?? fallback.is_staff ?? false),
    lastname,
    shelfCode: (username || displayName).slice(0, 2).toUpperCase(),
    username,
  };
};

const getFavoriteStatus = (book = {}) => book.isFavorite ?? book.is_favorite;
const GUEST_CART_KEY = "book-app-guest-cart";

const getGuestCart = () => {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(GUEST_CART_KEY));
    return Array.isArray(value)
      ? value.filter((item) => item?.id && item?.quantity > 0)
      : [];
  } catch {
    window.localStorage.removeItem(GUEST_CART_KEY);
    return [];
  }
};

const saveGuestCart = (cart) => {
  window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
};
const normalizeCart = (payload = {}) =>
  (payload.items || []).map((item) => ({
    ...item.book,
    lineTotal: String(item.line_total ?? "0.00"),
    quantity: item.quantity,
  }));

const createPaymentAttemptKey = () => window.crypto.randomUUID();

const getCheckoutError = (error) => {
  const stockErrors = error?.payload?.stock;

  if (stockErrors) {
    const messages = (Array.isArray(stockErrors) ? stockErrors : [stockErrors])
      .filter((message) => typeof message === "string")
      .join(" ");

    return messages || "Some books no longer have enough stock. Update your basket and try again.";
  }

  if (!error?.status) {
    return "We could not confirm the payment result. Retry safely to check the same payment attempt.";
  }

  return error.message || "Payment could not be completed.";
};

const syncGuestCart = async () => {
  const guestCart = getGuestCart();

  if (!guestCart.length) {
    return apiRequest("/api/books/cart/");
  }

  return apiRequest("/api/books/cart/sync/", {
    method: "POST",
    body: {
      items: guestCart.map((item) => ({
        book_id: item.id,
        quantity: item.quantity,
      })),
    },
  });
};

function App() {
  const [route, setRoute] = useState(getCurrentPath);
  const [currentUser, setCurrentUser] = useState(() => {
    const storedUser = getStoredUser();

    return storedUser
      ? { ...storedUser, is_staff: storedUser.is_staff === true }
      : null;
  });
  const [isAuthReady, setIsAuthReady] = useState(() => !getStoredAuthToken());
  const [favoriteOverrides, setFavoriteOverrides] = useState({});
  const [cart, setCart] = useState(getGuestCart);
  const [cartSubtotal, setCartSubtotal] = useState("0.00");
  const [cartError, setCartError] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [checkoutPhase, setCheckoutPhase] = useState("idle");
  const [checkoutOrder, setCheckoutOrder] = useState(null);
  const [catalogRevision, setCatalogRevision] = useState(0);
  const paymentAttemptKeyRef = useRef("");
  const checkoutInFlightRef = useRef(false);

  const normalizedRoute = route.length > 1 ? route.replace(/\/+$/, "") : route;
  const isAuthRoute =
    normalizedRoute === "/login" || normalizedRoute === "/register";
  const isAdminBooksRoute = normalizedRoute === "/admin/books";
  const isAdminUsersRoute = normalizedRoute === "/admin/users";
  const isAdminRoute = isAdminBooksRoute || isAdminUsersRoute;
  const isBookDetailsRoute = route.startsWith("/books/");
  const authMode = normalizedRoute === "/register" ? "register" : "login";
  const bookId = isBookDetailsRoute ? route.replace("/books/", "") : "";
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const displayedCartSubtotal = currentUser
    ? cartSubtotal
    : String(
        cart.reduce(
          (total, item) => total + Number(item.price || 0) * item.quantity,
          0,
        ),
      );
  const isPaying = checkoutPhase === "reviewing" || checkoutPhase === "processing";
  const cartMutationLocked = isPaying || checkoutPhase === "retry";
  const navigate = useCallback((nextPath) => {
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, "", nextPath);
    }

    setRoute(nextPath);
  }, []);

  const applyCartResponse = useCallback((payload) => {
    setCart(normalizeCart(payload));
    setCartSubtotal(String(payload?.subtotal ?? "0.00"));
    setCartError("");
  }, []);

  const resetCheckout = useCallback(() => {
    paymentAttemptKeyRef.current = "";
    setCheckoutOrder(null);
    setCheckoutPhase("idle");
  }, []);

  const profileLoadedHandler = useCallback((profile) => {
    const user = createUserProfile(profile);

    setCurrentUser(user);
    saveStoredUser(user);
  }, []);

  const allowCartMutation = () => {
    if (!cartMutationLocked) return true;

    setCartError(
      checkoutPhase === "retry"
        ? "Confirm the current payment attempt before changing your basket."
        : "Please wait while the current payment attempt is being processed.",
    );
    setIsCartOpen(true);
    return false;
  };

  useEffect(() => {
    let isActive = true;

    if (!currentUser) {
      setCart(getGuestCart());
      setCartSubtotal("0.00");
      return undefined;
    }

    syncGuestCart()
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

    if (!token) {
      setIsAuthReady(true);
      return undefined;
    }

    apiRequest("/api/auth/profile/")
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
      })
      .finally(() => {
        if (isActive) setIsAuthReady(true);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (
      isAdminRoute &&
      isAuthReady &&
      currentUser?.is_staff !== true
    ) {
      navigate("/");
    }
  }, [currentUser?.is_staff, isAdminRoute, isAuthReady, navigate]);

  useEffect(() => {
    const popStateHandler = () => {
      setRoute(getCurrentPath());
    };

    const sessionExpiredHandler = () => {
      setCurrentUser(null);
      setIsAuthReady(true);
      setFavoriteOverrides({});
      setCart([]);
      setIsCartOpen(false);
      setIsProfileOpen(false);
      resetCheckout();
      navigate("/login");
    };

    window.addEventListener("popstate", popStateHandler);
    window.addEventListener("book-app:session-expired", sessionExpiredHandler);

    return () => {
      window.removeEventListener("popstate", popStateHandler);
      window.removeEventListener(
        "book-app:session-expired",
        sessionExpiredHandler,
      );
    };
  }, [navigate, resetCheckout]);

  const addToCart = async (book = {}) => {
    if (!allowCartMutation()) return;
    if (!book.id || book.stock === 0) return;

    const existing = cart.find((item) => String(item.id) === String(book.id));
    const nextQuantity = existing ? existing.quantity + 1 : 1;

    if (book.stock !== undefined && nextQuantity > book.stock) {
      setCartError(
        `Only ${book.stock} copies of "${book.title}" are available.`,
      );
      return;
    }

    if (!currentUser) {
      setCart((currentCart) => {
        const nextCart = existing
          ? currentCart.map((item) =>
              String(item.id) === String(book.id)
                ? { ...item, quantity: item.quantity + 1 }
                : item,
            )
          : [...currentCart, { ...book, quantity: 1 }];
        saveGuestCart(nextCart);
        return nextCart;
      });
      setCartError("");
      resetCheckout();
      return;
    }

    try {
      const payload = existing
        ? await apiRequest(`/api/books/cart/items/${book.id}/`, {
            body: { quantity: nextQuantity },
            method: "PATCH",
          })
        : await apiRequest("/api/books/cart/items/", {
            body: { book_id: book.id, quantity: 1 },
            method: "POST",
          });
      resetCheckout();
      applyCartResponse(payload);
    } catch (error) {
      setCartError(error.message);
    }
  };

  const changeCartQuantity = async (bookIdToChange, amount) => {
    if (!allowCartMutation()) return;
    const item = cart.find(
      (entry) => String(entry.id) === String(bookIdToChange),
    );
    if (!item) return;

    const nextQuantity = item.quantity + amount;
    if (item.stock !== undefined && nextQuantity > item.stock) {
      setCartError(
        `Only ${item.stock} copies of "${item.title}" are available.`,
      );
      return;
    }

    if (nextQuantity < 1) {
      if (!currentUser) {
        const nextCart = cart.filter(
          (entry) => String(entry.id) !== String(bookIdToChange),
        );
        saveGuestCart(nextCart);
        setCart(nextCart);
        setCartError("");
        resetCheckout();
        return;
      }

      try {
        const payload = await apiRequest(
          `/api/books/cart/items/${bookIdToChange}/`,
          {
            method: "DELETE",
          },
        );
        resetCheckout();
        applyCartResponse(payload);
      } catch (error) {
        setCartError(error.message);
      }
      return;
    }

    if (!currentUser) {
      const nextCart = cart.map((entry) =>
        String(entry.id) === String(bookIdToChange)
          ? { ...entry, quantity: nextQuantity }
          : entry,
      );
      saveGuestCart(nextCart);
      setCart(nextCart);
      setCartError("");
      resetCheckout();
      return;
    }

    try {
      const payload = await apiRequest(
        `/api/books/cart/items/${bookIdToChange}/`,
        {
          body: { quantity: nextQuantity },
          method: "PATCH",
        },
      );
      resetCheckout();
      applyCartResponse(payload);
    } catch (error) {
      setCartError(error.message);
    }
  };

  const removeFromCart = async (bookIdToRemove) => {
    if (!allowCartMutation()) return;
    if (!currentUser) {
      const nextCart = cart.filter(
        (item) => String(item.id) !== String(bookIdToRemove),
      );
      saveGuestCart(nextCart);
      setCart(nextCart);
      setCartError("");
      resetCheckout();
      return;
    }

    try {
      const payload = await apiRequest(
        `/api/books/cart/items/${bookIdToRemove}/`,
        {
          method: "DELETE",
        },
      );
      resetCheckout();
      applyCartResponse(payload);
    } catch (error) {
      setCartError(error.message);
    }
  };

  const clearCart = async () => {
    if (!allowCartMutation()) return;
    if (!currentUser) {
      saveGuestCart([]);
      setCart([]);
      setCartError("");
      resetCheckout();
      return;
    }

    try {
      const payload = await apiRequest("/api/books/cart/", {
        method: "DELETE",
      });
      resetCheckout();
      applyCartResponse(payload);
    } catch (error) {
      setCartError(error.message);
    }
  };

  const checkout = async () => {
    if (checkoutInFlightRef.current) return;

    setCartError("");
    setCheckoutOrder(null);

    if (!currentUser) {
      closeCart();
      navigate("/login");
      return;
    }

    checkoutInFlightRef.current = true;
    let paymentWasSent = Boolean(paymentAttemptKeyRef.current);

    try {
      if (!paymentAttemptKeyRef.current) {
        setCheckoutPhase("reviewing");
        const serverCart = await apiRequest("/api/books/cart/");
        const serverItems = normalizeCart(serverCart);
        applyCartResponse(serverCart);

        if (!serverItems.length) {
          setCheckoutPhase("idle");
          setCartError("Your server basket is empty.");
          return;
        }

        paymentAttemptKeyRef.current = createPaymentAttemptKey();
      }

      setCheckoutPhase("processing");
      paymentWasSent = true;
      const order = await apiRequest("/api/books/cart/pay/mock/", {
        body: {
          succeed: true,
          idempotency_key: paymentAttemptKeyRef.current,
        },
        method: "POST",
      });

      if (order?.status === "paid") {
        paymentAttemptKeyRef.current = "";
        window.localStorage.removeItem(GUEST_CART_KEY);
        setCart([]);
        setCartSubtotal("0.00");
        setCheckoutOrder(order);
        setCheckoutPhase("paid");
        setCatalogRevision((revision) => revision + 1);
        return;
      }

      if (order?.status === "failed") {
        paymentAttemptKeyRef.current = "";
        setCheckoutOrder(order);
        setCheckoutPhase("failed");
        setCartError("The mock payment was declined. Your basket is unchanged and ready to retry.");
        return;
      }

      setCheckoutOrder(order || null);
      setCheckoutPhase("retry");
      setCartError("The server returned an unknown payment status. Retry safely to check this same attempt.");
    } catch (error) {
      const stockChanged = Boolean(error?.payload?.stock);
      const shouldRefreshCart = stockChanged || error?.status === 400;
      const checkoutError = paymentWasSent
        ? getCheckoutError(error)
        : error.message || "We could not refresh your basket before payment.";

      if (error?.status && error.status < 500) {
        paymentAttemptKeyRef.current = "";
      }

      if (shouldRefreshCart) {
        try {
          const refreshedCart = await apiRequest("/api/books/cart/");
          applyCartResponse(refreshedCart);
        } catch {
          setCartError(checkoutError);
        }
      }

      setCheckoutPhase(
        stockChanged || error?.status === 400
          ? "adjust"
          : paymentAttemptKeyRef.current
            ? "retry"
            : "idle",
      );
      setCartError(checkoutError);
    } finally {
      checkoutInFlightRef.current = false;
    }
  };

  const getCartQuantity = (bookIdToFind) =>
    cart.find((item) => String(item.id) === String(bookIdToFind))?.quantity ||
    0;
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const closeProfile = useCallback(() => setIsProfileOpen(false), []);
  const openCart = useCallback(() => {
    setIsProfileOpen(false);
    setIsCartOpen(true);
  }, []);
  const openProfile = useCallback(() => {
    setIsCartOpen(false);
    setIsProfileOpen(true);
  }, []);
  const openAdmin = useCallback(() => {
    setIsProfileOpen(false);
    navigate("/admin/books");
  }, [navigate]);
  const openAdminUsers = useCallback(() => {
    setIsProfileOpen(false);
    navigate("/admin/users");
  }, [navigate]);
  const currentUserResolvedHandler = useCallback((managedUser) => {
    setCurrentUser((user) => {
      if (!user || String(user.id) !== String(managedUser?.id)) return user;

      const nextUser = {
        ...user,
        is_active: Boolean(managedUser.is_active),
        is_staff: Boolean(managedUser.is_staff),
        is_superuser: Boolean(managedUser.is_superuser),
        role: managedUser.role,
      };

      saveStoredUser(nextUser);
      return nextUser;
    });
  }, []);
  const dismissOrder = useCallback(() => {
    resetCheckout();
    setCartError("");
    closeCart();
  }, [closeCart, resetCheckout]);

  const isBookFavorite = (book = {}) => {
    const bookKey = String(book.id || "");

    if (!bookKey) return false;
    if (Object.prototype.hasOwnProperty.call(favoriteOverrides, bookKey))
      return favoriteOverrides[bookKey];

    return Boolean(getFavoriteStatus(book));
  };

  const toggleFavorite = async (book = {}) => {
    const bookKey = String(book.id || "");

    if (!bookKey) return;

    if (!currentUser) {
      navigate("/login");
      return;
    }

    const wasFavorite = isBookFavorite(book);

    setFavoriteOverrides((currentOverrides) => ({
      ...currentOverrides,
      [bookKey]: !wasFavorite,
    }));

    try {
      await apiRequest(`/api/books/${bookKey}/favorite/`, {
        method: wasFavorite ? "DELETE" : "POST",
      });
    } catch {
      setFavoriteOverrides((currentOverrides) => ({
        ...currentOverrides,
        [bookKey]: wasFavorite,
      }));
    }
  };

  const loginHandler = async (credentials) => {
    const response = await apiRequest("/api/auth/login/", {
      body: credentials,
      method: "POST",
      retryOnUnauthorized: false,
      token: "",
    });

    if (!saveAuthTokens(response)) {
      throw new Error(
        "The server did not return a complete authentication session.",
      );
    }

    const user = createUserProfile(response.user, credentials);
    setCurrentUser(user);
    setIsAuthReady(true);
    saveStoredUser(user);
    navigate("/");
  };

  const registerHandler = async (registerData) => {
    const response = await apiRequest("/api/auth/register/", {
      body: registerData,
      method: "POST",
      retryOnUnauthorized: false,
      token: "",
    });

    if (!saveAuthTokens(response)) {
      throw new Error(
        "The server did not return a complete authentication session.",
      );
    }

    const user = createUserProfile(response.user, registerData);
    setCurrentUser(user);
    setIsAuthReady(true);
    saveStoredUser(user);
    navigate("/");
  };

  const logoutHandler = async () => {
    const refresh = getStoredRefreshToken();

    try {
      if (refresh) {
        await apiRequest("/api/auth/logout/", {
          body: { refresh },
          method: "POST",
          retryOnUnauthorized: false,
          token: "",
        });
      }
    } finally {
      clearAuthToken();
      setCurrentUser(null);
      setIsAuthReady(true);
      setFavoriteOverrides({});
      setCart([]);
      setCartSubtotal("0.00");
      setIsCartOpen(false);
      setIsProfileOpen(false);
      resetCheckout();
      navigate("/");
    }
  };

  return (
    <Layout
      currentUser={currentUser}
      isAdminRoute={isAdminRoute}
      isProfileOpen={isProfileOpen}
      onAdminClick={openAdmin}
      onHomeClick={() => navigate("/")}
      onLoginClick={() => navigate("/login")}
      onRegisterClick={() => navigate("/register")}
      onLogout={logoutHandler}
      onProfileClick={openProfile}
      cartCount={cartCount}
      onCartClick={openCart}
    >
      <CartDrawer
        cart={cart}
        checkoutPhase={checkoutPhase}
        isOpen={isCartOpen}
        isPaying={isPaying}
        onChangeQuantity={changeCartQuantity}
        onCheckout={checkout}
        onClose={closeCart}
        onDismissOrder={dismissOrder}
        onOpenBook={(book) => navigate(`/books/${book.id}`)}
        onRemove={removeFromCart}
        onClear={clearCart}
        order={checkoutOrder}
        error={cartError}
        subtotal={displayedCartSubtotal}
      />
      <ProfileDrawer
        currentUser={currentUser}
        isOpen={isProfileOpen && Boolean(currentUser)}
        onAdminClick={openAdmin}
        onClose={closeProfile}
        onLogout={logoutHandler}
        onProfileLoaded={profileLoadedHandler}
      />
      {isAdminRoute ? (
        isAuthReady && currentUser?.is_staff === true ? (
          isAdminUsersRoute ? (
            <AdminUsers
              currentUser={currentUser}
              onBooksClick={openAdmin}
              onCurrentUserResolved={currentUserResolvedHandler}
              onExit={() => navigate("/")}
            />
          ) : (
            <AdminBooks
              refreshKey={catalogRevision}
              onExit={() => navigate("/")}
              onManageUsers={openAdminUsers}
              onOpenBook={(book) => navigate(`/books/${book.id}`)}
            />
          )
        ) : (
          <AdminAccessGate isChecking={!isAuthReady} />
        )
      ) : isAuthRoute ? (
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
          currentUser={currentUser}
          refreshKey={catalogRevision}
          isBookFavorite={isBookFavorite}
          onBack={() => navigate("/")}
          onOpenBook={(book) => navigate(`/books/${book.id}`)}
          onLoginClick={() => navigate('/login')}
          onToggleFavorite={toggleFavorite}
          cartQuantity={getCartQuantity(bookId)}
          onAddToCart={addToCart}
          onChangeCartQuantity={changeCartQuantity}
        />
      ) : (
        <Book
          refreshKey={catalogRevision}
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
