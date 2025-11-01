/**
 * API Helpers for Authentication
 * Utility functions for API interactions and authentication flow
 */

import { AuthErrorType, createStandardError, getRetryDelay } from "./authTypes.js";

/**
 * HTTP status codes and their meanings
 */
export const HttpStatus = {
	OK: 200,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	TOO_MANY_REQUESTS: 429,
	INTERNAL_SERVER_ERROR: 500,
	BAD_GATEWAY: 502,
	SERVICE_UNAVAILABLE: 503,
};

/**
 * Check if HTTP response indicates a network error
 * @param {Response} response - Fetch response object
 * @returns {boolean} True if network-related error
 */
export function isNetworkError(response) {
	return !response || response.status >= 500 || response.status === HttpStatus.BAD_GATEWAY;
}

/**
 * Check if HTTP response indicates authentication error
 * @param {Response} response - Fetch response object
 * @returns {boolean} True if authentication-related error
 */
export function isAuthError(response) {
	return (
		response &&
		(response.status === HttpStatus.UNAUTHORIZED || response.status === HttpStatus.FORBIDDEN)
	);
}

/**
 * Check if HTTP response indicates rate limiting
 * @param {Response} response - Fetch response object
 * @returns {boolean} True if rate limited
 */
export function isRateLimited(response) {
	return response && response.status === HttpStatus.TOO_MANY_REQUESTS;
}

/**
 * Create standardized error from HTTP response
 * @param {Response} response - Fetch response object
 * @param {string} operation - Operation that failed (for context)
 * @returns {Object} Standardized error object
 */
export async function createErrorFromResponse(response, operation = "request") {
	if (!response) {
		return createStandardError(AuthErrorType.NETWORK, `Network error during ${operation}`);
	}

	let errorDetails = `HTTP ${response.status}`;
	try {
		const responseText = await response.text();
		if (responseText) {
			errorDetails += `: ${responseText}`;
		}
	} catch {
		// Ignore errors reading response body
	}

	if (isNetworkError(response)) {
		return createStandardError(AuthErrorType.NETWORK, errorDetails);
	}

	if (isAuthError(response)) {
		return createStandardError(AuthErrorType.TOKEN_INVALID, errorDetails);
	}

	if (isRateLimited(response)) {
		const retryAfter = response.headers.get("Retry-After");
		const error = createStandardError(AuthErrorType.API_ERROR, errorDetails);
		if (retryAfter) {
			error.retryAfter = parseInt(retryAfter, 10);
		}
		return error;
	}

	return createStandardError(AuthErrorType.API_ERROR, errorDetails);
}

/**
 * Retry mechanism with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Result of successful function call
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
	let lastError;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			// Don't retry on the last attempt
			if (attempt === maxRetries) {
				break;
			}

			// Don't retry non-recoverable errors
			if (error.recoverable === false) {
				break;
			}

			// Calculate delay for exponential backoff
			const delay = getRetryDelay(attempt, baseDelay / 1000) * 1000;
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError;
}

/**
 * Make authenticated API request with automatic retry
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @param {Object} token - Authentication token
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<Response>} Fetch response
 */
export async function makeAuthenticatedRequest(url, options = {}, token = null, maxRetries = 3) {
	const requestOptions = {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options.headers,
		},
	};

	// Add authentication header if token provided
	if (token && token.accessToken) {
		requestOptions.headers.Authorization = `Bearer ${token.accessToken}`;
	}

	return retryWithBackoff(async () => {
		const response = await fetch(url, requestOptions);

		if (!response.ok) {
			const error = await createErrorFromResponse(response, "API request");
			throw error;
		}

		return response;
	}, maxRetries);
}

/**
 * Parse URL parameters from query string or hash
 * @param {string} url - URL to parse (defaults to current location)
 * @returns {Object} Parsed parameters
 */
export function parseUrlParams(url = window.location.href) {
	const urlObj = new URL(url);
	const params = {};

	// Parse query parameters
	for (const [key, value] of urlObj.searchParams.entries()) {
		params[key] = value;
	}

	// Parse hash parameters (for OAuth callbacks)
	if (urlObj.hash) {
		const hashParams = new URLSearchParams(urlObj.hash.substring(1));
		for (const [key, value] of hashParams.entries()) {
			params[key] = value;
		}
	}

	return params;
}

/**
 * Validate OAuth callback parameters
 * @param {Object} params - URL parameters from callback
 * @returns {Object} Validation result with isValid flag and errors
 */
export function validateCallbackParams(params) {
	const errors = [];

	if (!params.code && !params.error) {
		errors.push("Missing authorization code or error parameter");
	}

	if (params.error) {
		errors.push(
			`OAuth error: ${params.error}${
				params.error_description ? ` - ${params.error_description}` : ""
			}`
		);
	}

	if (!params.state) {
		errors.push("Missing state parameter");
	}

	return {
		isValid: errors.length === 0,
		errors,
		hasAuthCode: !!params.code,
		hasError: !!params.error,
	};
}

/**
 * Generate secure random string for OAuth state parameter
 * @param {number} length - Length of random string
 * @returns {string} Random string
 */
export function generateSecureRandom(length = 32) {
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Check if current environment is development
 * @returns {boolean} True if in development mode
 */
export function isDevelopment() {
	return import.meta.env.DEV;
}

/**
 * Log debug information in development mode
 * @param {string} message - Debug message
 * @param {*} data - Additional data to log
 */
export function debugLog(message, data = null) {
	if (isDevelopment()) {
		console.log(`[Auth Debug] ${message}`, data);
	}
}

/**
 * Log error information
 * @param {string} message - Error message
 * @param {Error|Object} error - Error object
 */
export function errorLog(message, error = null) {
	console.error(`[Auth Error] ${message}`, error);
}

/**
 * Format timestamp for display
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted date string
 */
export function formatTimestamp(timestamp) {
	if (!timestamp) return "Never";

	const date = new Date(timestamp);
	const now = new Date();
	const diff = now - date;

	// Less than a minute ago
	if (diff < 60 * 1000) {
		return "Just now";
	}

	// Less than an hour ago
	if (diff < 60 * 60 * 1000) {
		const minutes = Math.floor(diff / (60 * 1000));
		return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
	}

	// Less than a day ago
	if (diff < 24 * 60 * 60 * 1000) {
		const hours = Math.floor(diff / (60 * 60 * 1000));
		return `${hours} hour${hours > 1 ? "s" : ""} ago`;
	}

	// More than a day ago
	return date.toLocaleDateString();
}

/**
 * Check if URL is safe for redirect
 * @param {string} url - URL to validate
 * @param {string[]} allowedDomains - List of allowed domains
 * @returns {boolean} True if URL is safe
 */
export function isSafeRedirectUrl(url, allowedDomains = ["localhost", "127.0.0.1"]) {
	try {
		const urlObj = new URL(url);

		// Allow relative URLs
		if (!urlObj.hostname) {
			return true;
		}

		// Check against allowed domains
		return allowedDomains.some(
			(domain) => urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
		);
	} catch {
		return false;
	}
}

/**
 * Sanitize user input for display
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input) {
	if (typeof input !== "string") {
		return "";
	}

	return input.replace(/[<>&"']/g, (char) => {
		const htmlEntities = {
			"<": "&lt;",
			">": "&gt;",
			"&": "&amp;",
			'"': "&quot;",
			"'": "&#x27;",
		};
		return htmlEntities[char];
	});
}

/**
 * Storage utilities for development and testing
 */
export const StorageUtils = {
	/**
	 * Clear all authentication-related storage
	 */
	clearAll() {
		if (typeof localStorage !== "undefined") {
			Object.keys(localStorage).forEach((key) => {
				if (key.startsWith("flickr-") || key.includes("auth")) {
					localStorage.removeItem(key);
				}
			});
		}

		if (typeof sessionStorage !== "undefined") {
			Object.keys(sessionStorage).forEach((key) => {
				if (key.startsWith("oauth_") || key.includes("auth")) {
					sessionStorage.removeItem(key);
				}
			});
		}
	},

	/**
	 * Get all authentication-related storage items
	 * @returns {Object} Storage contents
	 */
	getAll() {
		const storage = {};

		if (typeof localStorage !== "undefined") {
			Object.keys(localStorage).forEach((key) => {
				if (key.startsWith("flickr-") || key.includes("auth")) {
					try {
						storage[`localStorage.${key}`] = JSON.parse(localStorage.getItem(key));
					} catch {
						storage[`localStorage.${key}`] = localStorage.getItem(key);
					}
				}
			});
		}

		if (typeof sessionStorage !== "undefined") {
			Object.keys(sessionStorage).forEach((key) => {
				if (key.startsWith("oauth_") || key.includes("auth")) {
					storage[`sessionStorage.${key}`] = sessionStorage.getItem(key);
				}
			});
		}

		return storage;
	},
};
