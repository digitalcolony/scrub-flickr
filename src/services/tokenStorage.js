/**
 * TokenStorageService handles secure storage and retrieval of authentication tokens
 * Provides encryption, automatic expiration handling, and data validation
 */
export class TokenStorageService {
	constructor() {
		this.storageKey = "flickr-scrub-auth";
		this.version = "1.0.0";
	}

	/**
	 * Store authentication token and user data securely
	 * @param {Object} token - OAuth token data
	 * @param {Object} user - User session data
	 */
	storeToken(token, user) {
		try {
			// Normalize token secret key: accept either token.accessTokenSecret or token.tokenSecret
			const normalizedSecret = token.accessTokenSecret || token.tokenSecret || null;

			const authData = {
				version: this.version,
				timestamp: Date.now(),
				token: {
					accessToken: token.accessToken,
					// Store both keys for backward/forward compatibility
					accessTokenSecret: normalizedSecret,
					tokenSecret: normalizedSecret,
					permissions: token.permissions,
					issuedAt: token.issuedAt || Date.now(),
					expiresAt: token.expiresAt || null,
				},
				user: {
					userId: user.userId,
					username: user.username,
					fullName: user.fullName || null,
					profileUrl: user.profileUrl || null,
					authenticatedAt: user.authenticatedAt || Date.now(),
				},
			};

			// Store in localStorage (could be enhanced with encryption)
			localStorage.setItem(this.storageKey, JSON.stringify(authData));

			// Set up automatic cleanup for expired tokens
			this.scheduleCleanup(authData.token.expiresAt);
		} catch (error) {
			throw new Error(`Failed to store authentication data: ${error.message}`);
		}
	}

	/**
	 * Retrieve stored authentication data
	 * @returns {Object|null} Object with token and user data, or null if not found/expired
	 */
	retrieveToken() {
		try {
			const storedData = localStorage.getItem(this.storageKey);

			if (!storedData) {
				return { token: null, user: null };
			}

			const authData = JSON.parse(storedData);

			// Validate data format and version
			if (!this.isValidAuthData(authData)) {
				this.clearToken();
				return { token: null, user: null };
			}

			// Backfill secret key if older records used tokenSecret only
			if (authData.token && !authData.token.accessTokenSecret && authData.token.tokenSecret) {
				authData.token.accessTokenSecret = authData.token.tokenSecret;
				// Persist the backfill to keep future reads consistent
				try {
					localStorage.setItem(this.storageKey, JSON.stringify(authData));
				} catch {
					// Non-fatal if we can't write back
				}
			}

			// Check token expiration
			if (this.isTokenExpired(authData.token)) {
				this.clearToken();
				return { token: null, user: null };
			}

			// Check session age (24 hour maximum)
			if (this.isSessionExpired(authData.user)) {
				this.clearToken();
				return { token: null, user: null };
			}

			return {
				token: authData.token,
				user: authData.user,
			};
		} catch {
			// If there's any error parsing stored data, clear it
			this.clearToken();
			return { token: null, user: null };
		}
	}

	/**
	 * Remove all stored authentication data
	 */
	clearToken() {
		try {
			localStorage.removeItem(this.storageKey);
			this.clearScheduledCleanup();
		} catch {
			console.warn("Error clearing token storage: Storage cleanup failed");
		}
	}

	/**
	 * Update user activity timestamp for session management
	 */
	updateLastActivity() {
		try {
			const authData = this.getStoredAuthData();
			if (authData && authData.user) {
				authData.user.lastActivity = Date.now();
				localStorage.setItem(this.storageKey, JSON.stringify(authData));
			}
		} catch {
			console.warn("Error updating last activity: Failed to parse stored data");
		}
	}

	/**
	 * Check if stored token exists and is valid
	 * @returns {boolean} True if valid token exists
	 */
	hasValidToken() {
		const { token } = this.retrieveToken();
		return token !== null;
	}

	/**
	 * Get current storage version for migration compatibility
	 * @returns {string} Storage format version
	 */
	getStorageVersion() {
		try {
			const authData = this.getStoredAuthData();
			return authData ? authData.version : null;
		} catch {
			return null;
		}
	}

	/**
	 * Validate authentication data structure
	 * @param {Object} authData - Data to validate
	 * @returns {boolean} True if data is valid
	 * @private
	 */
	isValidAuthData(authData) {
		if (!authData || typeof authData !== "object") {
			return false;
		}

		// Check required top-level properties
		if (!authData.version || !authData.token || !authData.user) {
			return false;
		}

		// Check token structure
		const token = authData.token;
		if (!token.accessToken || !token.issuedAt) {
			return false;
		}

		// Check user structure
		const user = authData.user;
		if (!user.userId || !user.username || !user.authenticatedAt) {
			return false;
		}

		return true;
	}

	/**
	 * Check if token has expired
	 * @param {Object} token - Token data
	 * @returns {boolean} True if token is expired
	 * @private
	 */
	isTokenExpired(token) {
		if (!token.expiresAt) {
			return false; // No expiration set
		}

		return Date.now() > token.expiresAt;
	}

	/**
	 * Check if user session has expired (24 hour limit)
	 * @param {Object} user - User data
	 * @returns {boolean} True if session is expired
	 * @private
	 */
	isSessionExpired(user) {
		const sessionMaxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
		const sessionAge = Date.now() - user.authenticatedAt;

		return sessionAge > sessionMaxAge;
	}

	/**
	 * Get raw stored authentication data
	 * @returns {Object|null} Raw auth data or null
	 * @private
	 */
	getStoredAuthData() {
		try {
			const storedData = localStorage.getItem(this.storageKey);
			return storedData ? JSON.parse(storedData) : null;
		} catch {
			return null;
		}
	}

	/**
	 * Schedule automatic cleanup for expired tokens
	 * @param {number|null} expiresAt - Token expiration timestamp
	 * @private
	 */
	scheduleCleanup(expiresAt) {
		this.clearScheduledCleanup();

		if (expiresAt && expiresAt > Date.now()) {
			const timeUntilExpiry = expiresAt - Date.now();
			this.cleanupTimer = setTimeout(() => {
				this.clearToken();
			}, timeUntilExpiry);
		}
	}

	/**
	 * Clear any scheduled cleanup timers
	 * @private
	 */
	clearScheduledCleanup() {
		if (this.cleanupTimer) {
			clearTimeout(this.cleanupTimer);
			this.cleanupTimer = null;
		}
	}

	/**
	 * Encrypt sensitive data before storage (placeholder for future enhancement)
	 * @param {string} data - Data to encrypt
	 * @returns {string} Encrypted data
	 * @private
	 */
	encrypt(data) {
		// TODO: Implement encryption for sensitive token data
		// For now, return data as-is (stored in plain text)
		return data;
	}

	/**
	 * Decrypt sensitive data after retrieval (placeholder for future enhancement)
	 * @param {string} encryptedData - Data to decrypt
	 * @returns {string} Decrypted data
	 * @private
	 */
	decrypt(encryptedData) {
		// TODO: Implement decryption for sensitive token data
		// For now, return data as-is (assuming plain text)
		return encryptedData;
	}
}

// Export singleton instance
export const tokenStorageService = new TokenStorageService();
