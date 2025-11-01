/**
 * Authentication Types and Interfaces
 * Centralized type definitions for the authentication system
 */

/**
 * Authentication status enumeration
 */
export const AuthStatus = {
	UNAUTHENTICATED: "unauthenticated",
	AUTHENTICATING: "authenticating",
	AUTHENTICATED: "authenticated",
	TOKEN_EXPIRED: "token_expired",
	ERROR: "error",
	LOGOUT_PENDING: "logout_pending",
};

/**
 * Authentication error types
 */
export const AuthErrorType = {
	NETWORK: "network",
	PERMISSION_DENIED: "permission_denied",
	TOKEN_INVALID: "token_invalid",
	API_ERROR: "api_error",
	USER_CANCELLED: "user_cancelled",
	SECURITY_ERROR: "security_error",
};

/**
 * Flickr permission levels
 */
export const FlickrPermissions = {
	READ: "read",
	WRITE: "write",
	DELETE: "delete",
};

/**
 * Create a standardized authentication error object
 * @param {string} type - Error type from AuthErrorType
 * @param {string} message - User-friendly error message
 * @param {string} [details] - Technical details for debugging
 * @param {boolean} [recoverable=true] - Whether the user can retry
 * @param {number} [retryAfter] - Seconds to wait before retry
 * @returns {Object} Standardized error object
 */
export function createAuthError(
	type,
	message,
	details = null,
	recoverable = true,
	retryAfter = null
) {
	return {
		type,
		message,
		details,
		recoverable,
		retryAfter,
		timestamp: Date.now(),
	};
}

/**
 * Predefined error messages for common authentication scenarios
 */
export const AuthErrorMessages = {
	[AuthErrorType.NETWORK]: {
		message: "Unable to connect to Flickr. Please check your internet connection and try again.",
		recoverable: true,
		retryAfter: 5,
	},

	[AuthErrorType.PERMISSION_DENIED]: {
		message:
			"Flickr permissions are required to access your photos. Please grant access to continue.",
		recoverable: true,
	},

	[AuthErrorType.TOKEN_INVALID]: {
		message: "Your session has expired. Please sign in again.",
		recoverable: true,
	},

	[AuthErrorType.API_ERROR]: {
		message: "Authentication failed. Please try again or contact support if the problem persists.",
		recoverable: true,
	},

	[AuthErrorType.USER_CANCELLED]: {
		message: "Authentication was cancelled. You can try again when ready.",
		recoverable: true,
	},

	[AuthErrorType.SECURITY_ERROR]: {
		message: "Security validation failed. Please try signing in again.",
		recoverable: true,
	},
};

/**
 * Create error from predefined message template
 * @param {string} type - Error type from AuthErrorType
 * @param {string} [details] - Additional technical details
 * @returns {Object} Standardized error object
 */
export function createStandardError(type, details = null) {
	const template = AuthErrorMessages[type];
	if (!template) {
		return createAuthError(
			AuthErrorType.API_ERROR,
			"An unknown error occurred during authentication.",
			details
		);
	}

	return createAuthError(
		type,
		template.message,
		details,
		template.recoverable,
		template.retryAfter
	);
}

/**
 * Validate user session object structure
 * @param {Object} user - User object to validate
 * @returns {boolean} True if user object is valid
 */
export function isValidUserSession(user) {
	if (!user || typeof user !== "object") {
		return false;
	}

	const requiredFields = ["userId", "username", "authenticatedAt"];
	return requiredFields.every((field) => user[field] !== undefined && user[field] !== null);
}

/**
 * Validate OAuth token object structure
 * @param {Object} token - Token object to validate
 * @returns {boolean} True if token object is valid
 */
export function isValidOAuthToken(token) {
	if (!token || typeof token !== "object") {
		return false;
	}

	const requiredFields = ["accessToken", "issuedAt"];
	return requiredFields.every((field) => token[field] !== undefined && token[field] !== null);
}

/**
 * Check if authentication error is recoverable
 * @param {Object} error - Error object to check
 * @returns {boolean} True if error is recoverable
 */
export function isRecoverableError(error) {
	return error && error.recoverable === true;
}

/**
 * Get retry delay for exponential backoff
 * @param {number} retryCount - Current retry attempt count
 * @param {number} baseDelay - Base delay in seconds (default: 5)
 * @param {number} maxDelay - Maximum delay in seconds (default: 60)
 * @returns {number} Delay in seconds
 */
export function getRetryDelay(retryCount, baseDelay = 5, maxDelay = 60) {
	const delay = baseDelay * Math.pow(2, retryCount);
	return Math.min(delay, maxDelay);
}

/**
 * Format authentication error for display
 * @param {Object} error - Error object to format
 * @returns {string} Formatted error message
 */
export function formatAuthError(error) {
	if (!error) {
		return "An unknown error occurred.";
	}

	let message = error.message || "An error occurred during authentication.";

	if (error.retryAfter) {
		message += ` Please wait ${error.retryAfter} seconds before trying again.`;
	}

	return message;
}

/**
 * Session timeout constants
 */
export const SessionTimeouts = {
	MAX_SESSION_AGE: 24 * 60 * 60 * 1000, // 24 hours
	ACTIVITY_TIMEOUT: 30 * 60 * 1000, // 30 minutes
	TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
};

/**
 * OAuth flow constants
 */
export const OAuthConstants = {
	CODE_VERIFIER_LENGTH: 32,
	STATE_LENGTH: 16,
	MAX_AUTH_ATTEMPTS: 3,
	AUTH_TIMEOUT: 30 * 60 * 1000, // 30 minutes
	CALLBACK_TIMEOUT: 5 * 60 * 1000, // 5 minutes
};

/**
 * Validation utilities
 */
export const ValidationUtils = {
	/**
	 * Check if string is valid Flickr user NSID
	 * @param {string} nsid - NSID to validate
	 * @returns {boolean} True if valid NSID format
	 */
	isValidFlickrNSID(nsid) {
		if (!nsid || typeof nsid !== "string") {
			return false;
		}
		// Flickr NSIDs are typically 10-11 characters, alphanumeric with @N pattern
		return /^[0-9]+@N[0-9]{2}$/.test(nsid);
	},

	/**
	 * Check if URL is valid callback URL
	 * @param {string} url - URL to validate
	 * @returns {boolean} True if valid callback URL
	 */
	isValidCallbackUrl(url) {
		if (!url || typeof url !== "string") {
			return false;
		}
		try {
			const urlObj = new URL(url);
			return ["http:", "https:"].includes(urlObj.protocol);
		} catch {
			return false;
		}
	},

	/**
	 * Check if permission level is valid
	 * @param {string} permission - Permission to validate
	 * @returns {boolean} True if valid permission
	 */
	isValidPermission(permission) {
		return Object.values(FlickrPermissions).includes(permission);
	},
};

/**
 * Default authentication options
 */
export const DEFAULT_AUTH_OPTIONS = {
	permissions: FlickrPermissions.DELETE,
	timeout: OAuthConstants.AUTH_TIMEOUT,
	maxRetries: OAuthConstants.MAX_AUTH_ATTEMPTS,
};
