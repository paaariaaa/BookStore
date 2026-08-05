const DEFAULT_API_BASE_URL = '';
const ACCESS_TOKEN_KEY = 'book-app-auth-token';
const REFRESH_TOKEN_KEY = 'book-app-refresh-token';
const AUTH_USER_KEY = 'book-app-auth-user';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/+$/, '');
let refreshRequest = null;

const notifySessionExpired = () => {
	clearAuthToken();
	if (typeof window !== 'undefined') window.dispatchEvent(new Event('book-app:session-expired'));
};

const parseResponse = async (response) => {
	const text = await response.text();

	if (!text) return null;

	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
};

const getErrorMessage = (payload) => {
	if (!payload) return 'Server request failed.';
	if (typeof payload === 'string') return payload;

	const fieldLabels = {
		email: 'Email',
		first_name: 'First name',
		last_name: 'Last name',
		password: 'Password',
		password_confirm: 'Confirm password',
		username: 'Username',
	};
	const fieldEntry = Object.entries(payload).find(([, value]) => {
		const messages = Array.isArray(value) ? value : [value];
		return messages.some((message) => typeof message === 'string');
	});
	const fieldError = fieldEntry
		? `${fieldLabels[fieldEntry[0]] || fieldEntry[0]}: ${(Array.isArray(fieldEntry[1]) ? fieldEntry[1] : [fieldEntry[1]]).filter((message) => typeof message === 'string').join(' ')}`
		: '';

	return payload.detail || payload.message || payload.error || fieldError || 'Server request failed.';
};

export const apiUrl = (path = '') => {
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;

	return `${API_BASE_URL}${normalizedPath}`;
};

export const getStoredAuthToken = () => {
	if (typeof window === 'undefined') return '';

	return window.localStorage.getItem(ACCESS_TOKEN_KEY) || '';
};

export const getStoredRefreshToken = () => {
	if (typeof window === 'undefined') return '';

	return window.localStorage.getItem(REFRESH_TOKEN_KEY) || '';
};

export const saveAuthTokens = ({ access, refresh }) => {
	if (typeof window === 'undefined' || !access || !refresh) return false;

	window.localStorage.setItem(ACCESS_TOKEN_KEY, access);
	window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
	return true;
};

export const getStoredUser = () => {
	if (typeof window === 'undefined') return null;

	try {
		return JSON.parse(window.localStorage.getItem(AUTH_USER_KEY)) || null;
	} catch {
		window.localStorage.removeItem(AUTH_USER_KEY);
		return null;
	}
};

export const saveStoredUser = (user) => {
	if (typeof window === 'undefined' || !user) return;

	window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const clearAuthToken = () => {
	if (typeof window === 'undefined') return;

	window.localStorage.removeItem(ACCESS_TOKEN_KEY);
	window.localStorage.removeItem(REFRESH_TOKEN_KEY);
	window.localStorage.removeItem(AUTH_USER_KEY);
};

const refreshAccessToken = async () => {
	if (refreshRequest) return refreshRequest;

	const currentRefresh = getStoredRefreshToken();
	if (!currentRefresh) throw new Error('Your session has expired. Please sign in again.');

	refreshRequest = (async () => {
		const response = await fetch(apiUrl('/api/auth/refresh/'), {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ refresh: currentRefresh }),
		});
		const payload = await parseResponse(response);

		if (!response.ok || !payload?.access || !payload?.refresh) {
			throw new Error(getErrorMessage(payload) || 'Your session has expired.');
		}

		saveAuthTokens(payload);
		return payload.access;
	})().catch((error) => {
		notifySessionExpired();
		throw error;
	}).finally(() => {
		refreshRequest = null;
	});

	return refreshRequest;
};

export const apiRequest = async (path, options = {}) => {
	const {
		body,
		headers = {},
		method = 'GET',
		retryOnUnauthorized = true,
		token = getStoredAuthToken(),
	} = options;
	const isFormData = body instanceof FormData;
	const requestHeaders = {
		Accept: 'application/json',
		...headers,
	};

	if (body !== undefined && !isFormData) {
		requestHeaders['Content-Type'] = 'application/json';
	}

	if (token) {
		requestHeaders.Authorization = `Bearer ${token}`;
	}

	const response = await fetch(apiUrl(path), {
		body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
		headers: requestHeaders,
		method,
	});
	const payload = await parseResponse(response);

	if (response.status === 401 && retryOnUnauthorized && getStoredRefreshToken()) {
		const freshAccess = await refreshAccessToken();

		return apiRequest(path, {
			...options,
			retryOnUnauthorized: false,
			token: freshAccess,
		});
	}

	if (!response.ok) {
		const error = new Error(getErrorMessage(payload));
		error.status = response.status;
		error.payload = payload;
		throw error;
	}

	return payload;
};

export const getArrayPayload = (payload) => {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.results)) return payload.results;
	if (Array.isArray(payload?.data)) return payload.data;
	if (Array.isArray(payload?.books)) return payload.books;

	return [];
};

export const getSinglePayload = (payload) => {
	if (Array.isArray(payload)) return payload[0] || null;

	return payload?.book || payload?.data?.book || payload?.data || payload || null;
};

export const resolveMediaUrl = (path) => {
	if (!path) return '';

	const normalizedPath = String(path).trim();
	const markdownUrl = normalizedPath.match(/^\[[^\]]*\]\((https?:\/\/[^)]+)\)$/i)?.[1];
	const mediaPath = markdownUrl || normalizedPath;

	if (/^(https?:|data:|blob:)/i.test(mediaPath)) return mediaPath;

	return apiUrl(mediaPath);
};

export const formatToman = (value) => `${new Intl.NumberFormat('en-US').format(Number(value || 0))} T`;
