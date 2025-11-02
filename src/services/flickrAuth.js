import { flickrApiClient } from "./flickrApiClient.js";

/**
 * FlickrAuthService handles OAuth 1.0a authentication for Flickr API
 * Implements the complete OAuth flow with proper error handling
 */
export class FlickrAuthService {
	constructor() {
		this.apiClient = flickrApiClient;
		this.permissions = import.meta.env.VITE_OAUTH_PERMISSIONS || "delete";
	}

	/**
	 * Initiate OAuth 1.0a authentication flow
	 * @param {Object} options - Authentication options
	 * @param {string} options.permissions - Flickr permission level ('read', 'write', 'delete')
	 * @returns {Promise<string>} Authorization URL for redirect
	 */
	async initiateAuth(options = {}) {
		try {
			const permissions = options.permissions || this.permissions;

			// DEV MODE: Use mock authentication for development
			if (import.meta.env.DEV && window.location.hostname === "localhost") {
				const mockState = this.generateState();
				const mockAuthCode = `mock_auth_code_${Date.now()}`;

				// Store mock state for validation
				sessionStorage.setItem("oauth_state", mockState);
				sessionStorage.setItem("oauth_timestamp", Date.now().toString());

				const callbackUrl = `${this.apiClient.callbackUrl}?oauth_token=${mockAuthCode}&oauth_verifier=mock_verifier&state=${mockState}`;
				console.log("🔧 [DEV MODE] Using mock OAuth flow");
				return callbackUrl;
			}

			// PRODUCTION: Real OAuth 1.0a flow
			// Step 1: Get request token
			const requestToken = await this.apiClient.getRequestToken();

			// Store request token data for step 3
			sessionStorage.setItem("oauth_request_token", requestToken.token);
			sessionStorage.setItem("oauth_request_token_secret", requestToken.tokenSecret);
			sessionStorage.setItem("oauth_timestamp", Date.now().toString());

			// Step 2: Generate authorization URL
			const authUrl = this.apiClient.getAuthorizationUrl(requestToken.token, permissions);

			return authUrl;
		} catch (error) {
			throw new Error(`Failed to initiate authentication: ${error.message}`);
		}
	}

	/**
	 * Complete OAuth 1.0a authentication flow
	 * @param {string} oauthToken - OAuth token from callback
	 * @param {string} oauthVerifier - OAuth verifier from callback
	 * @param {string} state - State parameter from callback (for mock flow)
	 * @returns {Promise<Object>} Authentication result with user and token data
	 */
	async completeAuth(oauthToken, oauthVerifier, state = null) {
		try {
			// Check timestamp to prevent replay attacks (30 minute window)
			const timestamp = sessionStorage.getItem("oauth_timestamp");
			if (!timestamp || Date.now() - parseInt(timestamp) > 30 * 60 * 1000) {
				throw new Error("Authentication session expired");
			}

			// DEV MODE: Handle mock authentication
			if (import.meta.env.DEV && oauthToken.startsWith("mock_")) {
				// Validate mock state if provided
				if (state) {
					const storedState = sessionStorage.getItem("oauth_state");
					if (!storedState || state !== storedState) {
						throw new Error("Invalid state parameter - possible CSRF attack");
					}
				}

				// Return mock authentication result
				const mockResult = {
					success: true,
					token: {
						accessToken: `mock_access_${Date.now()}`,
						accessTokenSecret: `mock_secret_${Date.now()}`,
						permissions: "delete",
						issuedAt: Date.now(),
						expiresAt: null, // OAuth 1.0a tokens don't typically expire
					},
					user: {
						userId: "mock_user_12345@N67",
						username: "test_user",
						fullName: "Test User",
						profileUrl: "https://www.flickr.com/people/test_user",
						authenticatedAt: Date.now(),
					},
				};

				this.clearSessionStorage();
				return mockResult;
			}

			// PRODUCTION: Real OAuth 1.0a flow
			// Get stored request token data
			const requestToken = sessionStorage.getItem("oauth_request_token");
			const requestTokenSecret = sessionStorage.getItem("oauth_request_token_secret");

			if (!requestToken || !requestTokenSecret) {
				throw new Error("Missing request token data - invalid authentication state");
			}

			// Verify the returned token matches our stored request token
			if (oauthToken !== requestToken) {
				throw new Error("OAuth token mismatch - possible security issue");
			}

			// Step 3: Exchange request token for access token
			const accessTokenData = await this.apiClient.getAccessToken(
				requestToken,
				requestTokenSecret,
				oauthVerifier
			);

			// Clean up session storage
			this.clearSessionStorage();

			return {
				success: true,
				token: {
					accessToken: accessTokenData.accessToken,
					accessTokenSecret: accessTokenData.accessTokenSecret,
					permissions: "delete",
					issuedAt: Date.now(),
					expiresAt: null, // OAuth 1.0a tokens don't typically expire
				},
				user: {
					userId: accessTokenData.userId,
					username: accessTokenData.username,
					fullName: accessTokenData.fullname || accessTokenData.username,
					profileUrl: `https://www.flickr.com/people/${accessTokenData.userId}`,
					authenticatedAt: Date.now(),
				},
			};
		} catch (error) {
			// Clean up session storage on error
			this.clearSessionStorage();
			throw error;
		}
	}

	/**
	 * Validate if stored token is still valid
	 * @param {Object} token - Token to validate
	 * @returns {Promise<boolean>} True if token is valid
	 */
	async validateToken(token) {
		try {
			if (!token || !token.accessToken || !token.accessTokenSecret) {
				return false;
			}

			// Check token expiration if available
			if (token.expiresAt && Date.now() > token.expiresAt) {
				return false;
			}

			// For mock tokens in development, assume they're valid
			if (import.meta.env.DEV && token.accessToken.startsWith("mock_")) {
				return true;
			}

			// Test token with real API call
			return await this.apiClient.testToken(token.accessToken, token.accessTokenSecret);
		} catch {
			return false;
		}
	}

	/**
	 * Generate cryptographically secure state parameter for CSRF protection (used in dev mode)
	 * @returns {string} Random state string
	 */
	generateState() {
		return Array.from(crypto.getRandomValues(new Uint8Array(16)))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
	}

	/**
	 * Clean up OAuth session storage
	 * @private
	 */
	clearSessionStorage() {
		sessionStorage.removeItem("oauth_request_token");
		sessionStorage.removeItem("oauth_request_token_secret");
		sessionStorage.removeItem("oauth_state");
		sessionStorage.removeItem("oauth_timestamp");
	}

	/**
	 * Logout and clean up authentication state
	 * @returns {Promise<void>}
	 */
	async logout() {
		try {
			// Clear session storage
			this.clearSessionStorage();

			// TODO: Revoke token with Flickr API if supported
			// Flickr OAuth 1.0a may not support token revocation

			return Promise.resolve();
		} catch {
			// Log error but don't throw - logout should always succeed locally
			console.warn("Error during logout: Logout cleanup failed but continuing");
		}
	}
}

// Export singleton instance
export const flickrAuthService = new FlickrAuthService();
