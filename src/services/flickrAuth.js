import CryptoJS from "crypto-js";

/**
 * FlickrAuthService handles OAuth 2.0 authentication with PKCE for Flickr API
 * Implements secure authentication flow with proper error handling
 */
export class FlickrAuthService {
	constructor() {
		this.apiKey = import.meta.env.VITE_FLICKR_API_KEY;
		this.apiSecret = import.meta.env.VITE_FLICKR_API_SECRET;
		this.callbackUrl = import.meta.env.VITE_FLICKR_CALLBACK_URL;
		this.permissions = import.meta.env.VITE_OAUTH_PERMISSIONS || "delete";

		// Validate required environment variables
		if (!this.apiKey || !this.apiSecret || !this.callbackUrl) {
			throw new Error("Missing required Flickr API configuration. Check your .env.local file.");
		}
	}

	/**
	 * Generate PKCE (Proof Key for Code Exchange) parameters for secure OAuth flow
	 * @returns {Object} Object containing codeVerifier and codeChallenge
	 */
	generatePKCE() {
		// Generate cryptographically secure random string for code verifier
		const codeVerifier = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Base64url);

		// Create SHA256 hash of code verifier for challenge
		const codeChallenge = CryptoJS.SHA256(codeVerifier).toString(CryptoJS.enc.Base64url);

		return { codeVerifier, codeChallenge };
	}

	/**
	 * Generate cryptographically secure state parameter for CSRF protection
	 * @returns {string} Random state string
	 */
	generateState() {
		return CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
	}

	/**
	 * Initiate OAuth authentication flow
	 * @param {Object} options - Authentication options
	 * @param {string} options.permissions - Flickr permission level ('read', 'write', 'delete')
	 * @returns {Promise<string>} Authorization URL for redirect
	 */
	async initiateAuth(options = {}) {
		try {
			const permissions = options.permissions || this.permissions;

			// Generate PKCE parameters
			const { codeVerifier, codeChallenge } = this.generatePKCE();
			const state = this.generateState();

			// Store parameters for callback verification
			sessionStorage.setItem("oauth_code_verifier", codeVerifier);
			sessionStorage.setItem("oauth_state", state);
			sessionStorage.setItem("oauth_timestamp", Date.now().toString());

			// DEV MODE: Simulate OAuth flow locally for testing
			if (import.meta.env.DEV && window.location.hostname === "localhost") {
				// Simulate the OAuth flow by redirecting to our callback with mock parameters
				const mockAuthCode = `mock_auth_code_${Date.now()}`;
				const callbackUrl = `${this.callbackUrl}?code=${mockAuthCode}&state=${state}`;

				console.log("🔧 [DEV MODE] Simulating OAuth redirect with mock auth code");
				return callbackUrl;
			}

			// PRODUCTION: Build real Flickr authorization URL
			const authParams = new URLSearchParams({
				response_type: "code",
				client_id: this.apiKey,
				redirect_uri: this.callbackUrl,
				code_challenge: codeChallenge,
				code_challenge_method: "S256",
				perms: permissions,
				state: state,
				scope: "read", // Flickr specific scope
			});

			const authUrl = `https://www.flickr.com/services/oauth/authorize?${authParams.toString()}`;

			return authUrl;
		} catch (error) {
			throw new Error(`Failed to initiate authentication: ${error.message}`);
		}
	}

	/**
	 * Complete OAuth authentication flow by exchanging code for token
	 * @param {string} authCode - Authorization code from callback
	 * @param {string} state - State parameter from callback
	 * @returns {Promise<Object>} Authentication result with user and token data
	 */
	async completeAuth(authCode, state) {
		try {
			// Validate state parameter (CSRF protection)
			const storedState = sessionStorage.getItem("oauth_state");
			if (!storedState || state !== storedState) {
				throw new Error("Invalid state parameter - possible CSRF attack");
			}

			// Check timestamp to prevent replay attacks (30 minute window)
			const timestamp = sessionStorage.getItem("oauth_timestamp");
			if (!timestamp || Date.now() - parseInt(timestamp) > 30 * 60 * 1000) {
				throw new Error("Authentication session expired");
			}

			// Get stored code verifier
			const codeVerifier = sessionStorage.getItem("oauth_code_verifier");
			if (!codeVerifier) {
				throw new Error("Missing code verifier - invalid authentication state");
			}

			// Exchange authorization code for access token
			const tokenResponse = await this.exchangeCodeForToken(authCode, codeVerifier);

			// Fetch user profile information
			const userInfo = await this.getUserInfo(tokenResponse);

			// Clean up session storage
			this.clearSessionStorage();

			return {
				success: true,
				token: tokenResponse,
				user: userInfo,
			};
		} catch (error) {
			// Clean up session storage on error
			this.clearSessionStorage();
			throw error;
		}
	}

	/**
	 * Exchange authorization code for access token
	 * @param {string} authCode - Authorization code
	 * @param {string} codeVerifier - PKCE code verifier
	 * @returns {Promise<Object>} Token response object
	 * @private
	 */
	async exchangeCodeForToken(AUTH_CODE, CODE_VERIFIER) {
		// Note: Flickr uses OAuth 1.0a, not OAuth 2.0 with PKCE
		// This is a MOCK implementation for testing purposes

		// Simulate API call delay
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// For testing: simulate successful token exchange
		if (import.meta.env.DEV) {
			return {
				accessToken: `mock_token_${Date.now()}`,
				tokenSecret: `mock_secret_${Date.now()}`,
				permissions: "delete",
				issuedAt: Date.now(),
				expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
			};
		}

		// TODO: Implement actual Flickr OAuth 1.0a token exchange
		// This would involve creating OAuth signatures and making the proper API call
		// Parameters would include: AUTH_CODE, CODE_VERIFIER, this.apiKey, this.callbackUrl
		throw new Error("Token exchange not yet implemented - requires Flickr OAuth 1.0a integration");
	}

	/**
	 * Fetch user information from Flickr API
	 * @param {Object} tokenData - Token information
	 * @returns {Promise<Object>} User profile data
	 * @private
	 */
	async getUserInfo(TOKEN_DATA) {
		// MOCK implementation for testing purposes

		// Simulate API call delay
		await new Promise((resolve) => setTimeout(resolve, 500));

		// For testing: return mock user data
		if (import.meta.env.DEV) {
			return {
				userId: "mock_user_12345@N67",
				username: "test_user",
				fullName: "Test User",
				profileUrl: "https://www.flickr.com/people/test_user",
				authenticatedAt: Date.now(),
				lastActivity: Date.now(),
			};
		}

		// TODO: Implement user info fetching using Flickr API
		// This would make a call to flickr.people.getInfo or similar
		throw new Error("User info fetching not yet implemented");
	}

	/**
	 * Validate if stored token is still valid
	 * @param {Object} token - Token to validate
	 * @returns {Promise<boolean>} True if token is valid
	 */
	async validateToken(token) {
		try {
			if (!token || !token.accessToken) {
				return false;
			}

			// Check token expiration if available
			if (token.expiresAt && Date.now() > token.expiresAt) {
				return false;
			}

			// TODO: Make test API call to verify token is still active
			// For now, assume token is valid if it exists and hasn't expired
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Clean up OAuth session storage
	 * @private
	 */
	clearSessionStorage() {
		sessionStorage.removeItem("oauth_code_verifier");
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
