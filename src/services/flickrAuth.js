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
	async initiateAuth(_options = {}) {
		try {
			// const permissions = options.permissions || this.permissions; // not currently used

			// Check if we have real API credentials
			const hasRealCredentials =
				this.apiClient.apiKey &&
				this.apiClient.apiSecret &&
				!this.apiClient.apiKey.includes("your_") &&
				this.apiClient.apiKey.length > 10;

			// DEV MODE: Use mock authentication only if we don't have real credentials
			if (import.meta.env.DEV && window.location.hostname === "localhost" && !hasRealCredentials) {
				const mockState = this.generateState();
				const mockAuthCode = `mock_auth_code_${Date.now()}`;

				// Store mock state for validation
				sessionStorage.setItem("oauth_state", mockState);
				sessionStorage.setItem("oauth_timestamp", Date.now().toString());

				const callbackUrl = `${this.apiClient.callbackUrl}?oauth_token=${mockAuthCode}&oauth_verifier=mock_verifier&state=${mockState}`;
				console.log("🔧 [DEV MODE] Using mock OAuth flow");
				return callbackUrl;
			}

			// PRODUCTION or DEV with real credentials: Real OAuth 1.0a flow
			console.log("🔐 [REAL API] Starting OAuth 1.0a flow with Flickr");

			// Step 1: Get request token
			const requestToken = await this.apiClient.getRequestToken();

			// Store request token data for step 3
			sessionStorage.setItem("oauth_request_token", requestToken.token);
			sessionStorage.setItem("oauth_request_token_secret", requestToken.tokenSecret);
			sessionStorage.setItem("oauth_timestamp", Date.now().toString());

			console.log("🔐 [REAL API] Request token obtained, redirecting to Flickr authorization");

			// Step 2: Use authorization URL from server response
			return requestToken.authorizeUrl;
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
			// Check timestamp to prevent replay attacks (2 hour window for testing)
			const timestamp = sessionStorage.getItem("oauth_timestamp");
			const sessionAge = timestamp ? Date.now() - parseInt(timestamp) : null;
			const maxAge = 2 * 60 * 60 * 1000; // 2 hours instead of 30 minutes

			console.log("🔐 [AUTH] Completing authentication...", {
				hasTimestamp: !!timestamp,
				sessionAge: sessionAge ? Math.round(sessionAge / 1000) + "s" : "unknown",
				maxAge: Math.round(maxAge / 1000) + "s",
				oauthToken: oauthToken?.substring(0, 10) + "...",
				hasVerifier: !!oauthVerifier,
			});

			if (!timestamp || sessionAge > maxAge) {
				throw new Error(
					`Authentication session expired (age: ${
						sessionAge ? Math.round(sessionAge / 60000) + "m" : "unknown"
					})`
				);
			}

			// Check if we have real API credentials
			const hasRealCredentials =
				this.apiClient.apiKey &&
				this.apiClient.apiSecret &&
				!this.apiClient.apiKey.includes("your_") &&
				this.apiClient.apiKey.length > 10;

			// DEV MODE: Handle mock authentication only if no real credentials
			if (import.meta.env.DEV && oauthToken.startsWith("mock_") && !hasRealCredentials) {
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

			// PRODUCTION or DEV with real credentials: Real OAuth 1.0a flow
			console.log("🔐 [REAL API] Processing real OAuth callback");

			// Get stored request token data
			const requestToken = sessionStorage.getItem("oauth_request_token");
			const requestTokenSecret = sessionStorage.getItem("oauth_request_token_secret");

			console.log("🔐 [AUTH] Token validation:", {
				hasRequestToken: !!requestToken,
				hasRequestTokenSecret: !!requestTokenSecret,
				requestTokenMatch: requestToken === oauthToken,
				storedToken: requestToken?.substring(0, 10) + "...",
				receivedToken: oauthToken?.substring(0, 10) + "...",
			});

			if (!requestToken || !requestTokenSecret) {
				throw new Error("Missing request token data - invalid authentication state");
			}

			// Verify the returned token matches our stored request token
			if (oauthToken !== requestToken) {
				throw new Error(
					`OAuth token mismatch - stored: ${requestToken?.substring(
						0,
						10
					)}..., received: ${oauthToken?.substring(0, 10)}...`
				);
			}

			console.log("🔐 [REAL API] Exchanging request token for access token...");

			// Step 3: Exchange request token for access token
			const accessTokenData = await this.apiClient.getAccessToken(
				requestToken,
				requestTokenSecret,
				oauthVerifier
			);

			console.log("🔐 [REAL API] Access token obtained successfully");

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
