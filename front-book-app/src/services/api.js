const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000';
const AUTH_TOKEN_KEY = 'book-app-auth-token';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '');

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

	return payload.detail || payload.message || payload.error || 'Server request failed.';
};

const getNestedValue = (payload, keys) => keys.reduce((value, key) => value?.[key], payload);

export const apiUrl = (path = '') => {
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;

	return `${API_BASE_URL}${normalizedPath}`;
};

export const getStoredAuthToken = () => {
	if (typeof window === 'undefined') return '';

	return window.localStorage.getItem(AUTH_TOKEN_KEY) || '';
};

export const saveAuthToken = (token) => {
	if (typeof window === 'undefined' || !token) return;

	window.localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearAuthToken = () => {
	if (typeof window === 'undefined') return;

	window.localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const apiRequest = async (path, options = {}) => {
	const { body, headers = {}, method = 'GET', token = getStoredAuthToken() } = options;
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

	if (!response.ok) {
		const error = new Error(getErrorMessage(payload));
		error.status = response.status;
		error.payload = payload;
		throw error;
	}

	return payload;
};

export const extractAuthToken = (payload) => {
	const tokenCandidates = [
		payload?.token,
		payload?.access,
		payload?.access_token,
		payload?.authToken,
		payload?.auth_token,
		payload?.jwt,
		getNestedValue(payload, ['data', 'token']),
		getNestedValue(payload, ['data', 'access']),
		getNestedValue(payload, ['data', 'access_token']),
		getNestedValue(payload, ['data', 'auth_token']),
		getNestedValue(payload, ['user', 'token']),
	];

	return tokenCandidates.find(Boolean) || '';
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
	if (/^(https?:|data:|blob:)/i.test(path)) return path;

	return apiUrl(path);
};
