import PropTypes from "prop-types";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  IoArrowForwardOutline,
  IoBookOutline,
  IoCheckmarkCircleOutline,
  IoCloseOutline,
  IoFingerPrintOutline,
  IoIdCardOutline,
  IoLibraryOutline,
  IoLogOutOutline,
  IoMailOutline,
  IoPersonOutline,
  IoRefreshOutline,
  IoShieldCheckmarkOutline,
  IoSparklesOutline,
} from "react-icons/io5";

import { apiRequest, getSinglePayload } from "../services/api";
import styles from "./ProfileDrawer.module.css";

const getProfileSource = (payload) => {
  const source = getSinglePayload(payload) || {};

  return source.user || source.profile || source;
};

const normalizeProfile = (payload, fallback = {}) => {
  const profile = getProfileSource(payload);
  const firstName =
    profile.first_name ??
    profile.firstname ??
    fallback.first_name ??
    fallback.firstname ??
    "";
  const lastName =
    profile.last_name ??
    profile.lastname ??
    fallback.last_name ??
    fallback.lastname ??
    "";
  const username = profile.username ?? fallback.username ?? "";
  const displayName =
    profile.full_name ||
    profile.name ||
    `${firstName} ${lastName}`.trim() ||
    fallback.displayName ||
    username ||
    "Reader";

  return {
    ...fallback,
    ...profile,
    displayName,
    email: profile.email ?? fallback.email ?? "",
    first_name: firstName,
    firstname: firstName,
    id: profile.id ?? fallback.id,
    is_staff: Boolean(profile.is_staff ?? fallback.is_staff ?? false),
    last_name: lastName,
    lastname: lastName,
    username,
  };
};

const getInitials = (profile = {}) => {
  const value = profile.displayName || profile.username || "Reader";
  const initials = value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials.toUpperCase() || "R";
};

const getMemberNumber = (id) => {
  if (id === undefined || id === null || id === "") return "PENDING";

  return String(id).padStart(4, "0");
};

const getAccountRole = (profile = {}) => {
  if (profile.is_superuser) return "Superadmin";
  if (profile.is_staff) return "Bookstore staff";

  return "Reader member";
};

function ProfileDrawer({
  currentUser,
  isOpen,
  onAdminClick,
  onClose,
  onLogout,
  onProfileLoaded,
}) {
  const closeButtonRef = useRef(null);
  const currentUserRef = useRef(currentUser);
  const drawerRef = useRef(null);
  const previousFocusRef = useRef(null);
  const requestRef = useRef(0);
  const [profile, setProfile] = useState(() =>
    normalizeProfile(currentUser || {}, currentUser || {}),
  );
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState("");

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const loadProfile = useCallback(async () => {
    const requestId = ++requestRef.current;
    setIsRefreshing(true);
    setError("");

    try {
      const payload = await apiRequest("/api/auth/profile/");
      const freshProfile = normalizeProfile(
        payload,
        currentUserRef.current || {},
      );

      if (requestRef.current !== requestId) return;

      setProfile(freshProfile);
      setLastSyncedAt(
        new Intl.DateTimeFormat("en", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date()),
      );
      onProfileLoaded(freshProfile);
    } catch (requestError) {
      if (requestRef.current !== requestId) return;

      setError(
        requestError?.status === 403
          ? "You do not have access to this profile."
          : requestError?.message || "Your profile could not be refreshed.",
      );
    } finally {
      if (requestRef.current === requestId) setIsRefreshing(false);
    }
  }, [onProfileLoaded]);

  useEffect(() => {
    if (!isOpen) {
      requestRef.current += 1;
      return undefined;
    }

    setProfile(
      normalizeProfile(
        currentUserRef.current || {},
        currentUserRef.current || {},
      ),
    );
    loadProfile();

    const previousOverflow = document.body.style.overflow;
    previousFocusRef.current = document.activeElement;
    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
    const keydownHandler = (event) => {
      if (event.key === "Escape") onClose();

      if (event.key === "Tab") {
        const focusableElements = Array.from(
          drawerRef.current?.querySelectorAll("button:not([disabled])") || [],
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements.at(-1);

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", keydownHandler);

    return () => {
      requestRef.current += 1;
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", keydownHandler);
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen, loadProfile, onClose]);

  const detailItems = [
    {
      icon: IoPersonOutline,
      label: "First name",
      value: profile.first_name || "Not provided",
    },
    {
      icon: IoPersonOutline,
      label: "Last name",
      value: profile.last_name || "Not provided",
    },
    {
      icon: IoMailOutline,
      label: "Email address",
      value: profile.email || "Not provided",
      wide: true,
    },
    {
      icon: IoFingerPrintOutline,
      label: "Username",
      value: profile.username ? `@${profile.username}` : "Not provided",
      wide: true,
    },
  ];

  const handleAdminClick = () => {
    onClose();
    onAdminClick();
  };

  const handleLogout = () => {
    onClose();
    onLogout();
  };

  return (
    <div
      className={`${styles.layer} ${isOpen ? styles.layerOpen : ""}`}
      aria-hidden={!isOpen}
    >
      <button
        className={styles.backdrop}
        type="button"
        aria-label="Close reader profile"
        onClick={onClose}
        tabIndex={isOpen ? 0 : -1}
      />

      <aside
        ref={drawerRef}
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reader-profile-title"
        aria-busy={isRefreshing}
      >
        <div className={styles.pageEdges} aria-hidden="true">
          <i />
          <i />
          <i />
        </div>

        <header className={styles.toolbar}>
          <div className={styles.toolbarTitle}>
            <span className={styles.toolbarIcon}>
              <IoLibraryOutline />
            </span>
            <span>
              <small>THE READING ROOM</small>
              <strong id="reader-profile-title">Reader profile</strong>
            </span>
          </div>

          <div className={styles.toolbarActions}>
            <button
              className={styles.iconButton}
              type="button"
              onClick={loadProfile}
              disabled={isRefreshing}
              aria-label="Refresh profile"
            >
              <IoRefreshOutline
                className={isRefreshing ? styles.spinning : ""}
              />
            </button>
            <button
              ref={closeButtonRef}
              className={styles.closeButton}
              type="button"
              onClick={onClose}
              aria-label="Close reader profile"
            >
              <IoCloseOutline />
            </button>
          </div>
        </header>

        <div className={styles.scrollArea}>
          <section className={styles.bookCover}>
            <div className={styles.coverSpine} aria-hidden="true">
              <span>BOOK APP</span>
            </div>
            <div className={styles.coverGlow} aria-hidden="true" />
            <div className={styles.coverEdition}>
              <IoSparklesOutline />
              <span>PERSONAL READER PASSPORT</span>
            </div>

            <div className={styles.identity}>
              <div className={styles.avatarWrap}>
                <div className={styles.avatar}>{getInitials(profile)}</div>
                <span className={styles.verifiedBadge} title="Authenticated">
                  <IoCheckmarkCircleOutline />
                </span>
              </div>

              <div className={styles.identityCopy}>
                <span className={styles.identityKicker}>This volume belongs to</span>
                <h2>{profile.displayName}</h2>
                <p>{profile.username ? `@${profile.username}` : "Reader account"}</p>
              </div>
            </div>

            <div className={styles.coverFooter}>
              <span className={styles.roleBadge}>
                {profile.is_staff ? <IoShieldCheckmarkOutline /> : <IoBookOutline />}
                {getAccountRole(profile)}
              </span>
              <span className={styles.volumeNumber}>
                VOL. {getMemberNumber(profile.id)}
              </span>
            </div>
          </section>

          {error && (
            <div className={styles.errorCard} role="alert">
              <div>
                <strong>Profile refresh paused</strong>
                <span>{error}</span>
              </div>
              <button type="button" onClick={loadProfile}>
                Try again
              </button>
            </div>
          )}

          <section className={styles.libraryCard}>
            <div className={styles.cardPunch} aria-hidden="true" />
            <div className={styles.cardHeading}>
              <div>
                <span>PRIVATE CATALOGUE</span>
                <h3>Library membership card</h3>
              </div>
              <IoIdCardOutline />
            </div>

            <div className={styles.memberStrip}>
              <span>
                <small>MEMBER NO.</small>
                <strong>#{getMemberNumber(profile.id)}</strong>
              </span>
              <span>
                <small>ACCOUNT TYPE</small>
                <strong>{profile.is_superuser ? "SUPERADMIN" : profile.is_staff ? "STAFF" : "READER"}</strong>
              </span>
              <span className={styles.activeStamp}>
                <IoCheckmarkCircleOutline /> ACTIVE
              </span>
            </div>

            <div className={styles.detailsGrid}>
              {detailItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    className={`${styles.detailItem} ${item.wide ? styles.detailItemWide : ""}`}
                    key={item.label}
                  >
                    <span className={styles.detailIcon}>
                      <Icon />
                    </span>
                    <span>
                      <small>{item.label}</small>
                      <strong title={item.value}>{item.value}</strong>
                    </span>
                  </div>
                );
              })}
            </div>

            <div className={styles.syncLine}>
              <span className={isRefreshing ? styles.syncPulse : ""} />
              {isRefreshing
                ? "Checking the library record…"
                : lastSyncedAt
                  ? `Synced with the library at ${lastSyncedAt}`
                  : "Saved profile ready"}
            </div>
          </section>

          {profile.is_staff && (
            <button
              className={styles.adminPass}
              type="button"
              onClick={handleAdminClick}
            >
              <span className={styles.adminBook}>
                <IoBookOutline />
              </span>
              <span>
                <small>STAFF COLLECTION</small>
                <strong>Open the admin desk</strong>
                <em>Manage books, members and access</em>
              </span>
              <IoArrowForwardOutline />
            </button>
          )}

          <section className={styles.securityNote}>
            <span className={styles.securityIcon}>
              <IoShieldCheckmarkOutline />
            </span>
            <div>
              <strong>Your private shelf is protected</strong>
              <p>
                Profile details are refreshed securely from your signed-in
                bookstore account.
              </p>
            </div>
          </section>

          <button
            className={styles.logoutAction}
            type="button"
            onClick={handleLogout}
          >
            <IoLogOutOutline />
            <span>
              <strong>Close this reading session</strong>
              <small>Sign out of Book app</small>
            </span>
            <IoArrowForwardOutline />
          </button>
        </div>
      </aside>
    </div>
  );
}

ProfileDrawer.propTypes = {
  currentUser: PropTypes.shape({
    displayName: PropTypes.string,
    email: PropTypes.string,
    first_name: PropTypes.string,
    firstname: PropTypes.string,
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    is_staff: PropTypes.bool,
    is_superuser: PropTypes.bool,
    last_name: PropTypes.string,
    lastname: PropTypes.string,
    username: PropTypes.string,
  }),
  isOpen: PropTypes.bool.isRequired,
  onAdminClick: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
  onProfileLoaded: PropTypes.func.isRequired,
};

export default ProfileDrawer;
