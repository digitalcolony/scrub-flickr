import CryptoJS from "crypto-js";

/**
 * FlickrApiClient handles OAuth 1.0a authentication and API requests to Flickr
 * Uses server proxy to avoid CORS issues with OAuth 1.0a flow
 */
export class FlickrApiClient {
	constructor() {
		this.apiKey = import.meta.env.VITE_FLICKR_API_KEY;
		this.apiSecret = import.meta.env.VITE_FLICKR_API_SECRET;
		this.callbackUrl = import.meta.env.VITE_FLICKR_CALLBACK_URL;
		this.baseUrl = "https://www.flickr.com/services/rest/";
		this.serverUrl = "http://localhost:3001"; // OAuth proxy server

		// Validate required environment variables
		if (!this.apiKey || !this.apiSecret || !this.callbackUrl) {
			throw new Error("Missing required Flickr API configuration. Check your .env.local file.");
		}
	}

	/**
	 * Generate OAuth 1.0a signature for API requests
	 * @param {string} httpMethod - HTTP method (GET, POST, etc.)
	 * @param {string} url - Full URL for the request
	 * @param {Object} params - Request parameters
	 * @param {string} tokenSecret - OAuth token secret (empty string for request token)
	 * @returns {string} OAuth signature
	 */
	generateOAuthSignature(httpMethod, url, params, tokenSecret = "") {
		// Create parameter string
		const sortedParams = Object.keys(params)
			.sort()
			.map((key) => `${this.percentEncode(key)}=${this.percentEncode(params[key])}`)
			.join("&");

		// Create signature base string
		const signatureBaseString = [
			httpMethod.toUpperCase(),
			this.percentEncode(url),
			this.percentEncode(sortedParams),
		].join("&");

		// Create signing key
		const signingKey = [this.percentEncode(this.apiSecret), this.percentEncode(tokenSecret)].join(
			"&"
		);

		// Generate HMAC-SHA1 signature
		const signature = CryptoJS.HmacSHA1(signatureBaseString, signingKey).toString(
			CryptoJS.enc.Base64
		);

		return signature;
	}

	/**
	 * Percent encode string according to RFC 3986
	 * @param {string} str - String to encode
	 * @returns {string} Encoded string
	 */
	percentEncode(str) {
		return encodeURIComponent(str).replace(
			/[!'()*]/g,
			(c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
		);
	}

	/**
	 * Generate OAuth nonce (random string)
	 * @returns {string} Random nonce
	 */
	generateNonce() {
		return CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
	}

	/**
	 * Get current timestamp for OAuth
	 * @returns {string} Unix timestamp
	 */
	getTimestamp() {
		return Math.floor(Date.now() / 1000).toString();
	}

	/**
	 * Get request token (step 1 of OAuth flow) via server proxy
	 * @returns {Promise<Object>} Request token and secret
	 */
	async getRequestToken() {
		console.log("🌐 [CLIENT] Requesting OAuth token via server proxy...");

		try {
			const response = await fetch(`${this.serverUrl}/auth/request-token`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				const errorText = await response.text().catch(() => "Unable to read error response");
				console.error("🚨 [ERROR] Server request failed:", {
					status: response.status,
					statusText: response.statusText,
					body: errorText,
				});
				throw new Error(`Server request failed: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();

			if (!data.success) {
				console.error("🚨 [ERROR] Server returned error:", data.error);
				throw new Error(data.error || "Unknown server error");
			}

			console.log("✅ [SUCCESS] Request token obtained via server:", {
				token: data.oauth_token?.substring(0, 10) + "...",
				hasSecret: !!data.oauth_token_secret,
				authorizeUrl: data.authorize_url?.substring(0, 50) + "...",
			});

			return {
				token: data.oauth_token,
				tokenSecret: data.oauth_token_secret,
				authorizeUrl: data.authorize_url,
			};
		} catch (error) {
			console.error("🚨 [ERROR] FlickrApiClient: Error getting request token:", error);

			// Provide more specific error messages
			if (error.name === "TypeError" && error.message.includes("fetch")) {
				throw new Error(
					`Unable to connect to OAuth server. Make sure the server is running on ${this.serverUrl}. (${error.message})`
				);
			} else {
				throw new Error(`Failed to get request token: ${error.message}`);
			}
		}
	}

	/**
	 * Get authorization URL for user to approve access
	 * @param {string} requestToken - Request token from step 1
	 * @param {string} permissions - Permission level (read, write, delete)
	 * @returns {string} Authorization URL
	 */
	getAuthorizationUrl(requestToken, permissions = "delete") {
		const params = new URLSearchParams({
			oauth_token: requestToken,
			perms: permissions,
		});

		return `${this.authUrl}authorize?${params.toString()}`;
	}

	/**
	 * Exchange request token for access token (step 3 of OAuth flow) via server proxy
	 * @param {string} requestToken - Request token
	 * @param {string} requestTokenSecret - Request token secret
	 * @param {string} verifier - OAuth verifier from callback
	 * @returns {Promise<Object>} Access token and secret
	 */
	async getAccessToken(requestToken, requestTokenSecret, verifier) {
		console.log("🔐 [CLIENT] Exchanging request token for access token via server...");

		try {
			const response = await fetch(`${this.serverUrl}/auth/access-token`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					oauth_token: requestToken,
					oauth_token_secret: requestTokenSecret,
					oauth_verifier: verifier,
				}),
			});

			if (!response.ok) {
				const errorText = await response.text().catch(() => "Unable to read error response");
				console.error("🚨 [ERROR] Access token request failed:", {
					status: response.status,
					statusText: response.statusText,
					body: errorText,
				});
				throw new Error(`Access token request failed: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();

			if (!data.success) {
				console.error("🚨 [ERROR] Server returned error:", data.error);
				throw new Error(data.error || "Unknown server error");
			}

			console.log("✅ [SUCCESS] Access token obtained for user:", data.fullname);

			return {
				accessToken: data.access_token,
				accessTokenSecret: data.access_token_secret,
				userId: data.user_nsid,
				username: data.username,
				fullname: data.fullname,
			};
		} catch (error) {
			console.error("🚨 [ERROR] FlickrApiClient: Error getting access token:", error);

			// Provide more specific error messages
			if (error.name === "TypeError" && error.message.includes("fetch")) {
				throw new Error(
					`Unable to connect to OAuth server. Make sure the server is running on ${this.serverUrl}. (${error.message})`
				);
			} else {
				throw new Error(`Failed to get access token: ${error.message}`);
			}
		}
	}

	/**
	 * Make authenticated API request to Flickr via server proxy
	 * @param {string} method - Flickr API method (e.g., 'flickr.people.getPhotos')
	 * @param {Object} params - API parameters
	 * @param {string} accessToken - OAuth access token
	 * @param {string} accessTokenSecret - OAuth access token secret
	 * @returns {Promise<Object>} API response
	 */
	async makeAuthenticatedRequest(method, params = {}, accessToken, accessTokenSecret) {
		console.log("🌐 [CLIENT] Making authenticated API request via server:", method);

		try {
			const response = await fetch(`${this.serverUrl}/api/photos`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					method,
					params,
					accessToken,
					accessTokenSecret,
				}),
			});

			if (!response.ok) {
				const errorText = await response.text().catch(() => "Unable to read error response");
				console.error("🚨 [ERROR] API request failed:", {
					status: response.status,
					statusText: response.statusText,
					body: errorText,
				});
				throw new Error(`API request failed: ${response.status} ${response.statusText}`);
			}

			const result = await response.json();

			if (!result.success) {
				console.error("🚨 [ERROR] Server returned error:", result.error);
				throw new Error(result.error || "Unknown server error");
			}

			console.log("✅ [SUCCESS] API request completed via server");
			return result.data;
		} catch (error) {
			console.error("🚨 [ERROR] FlickrApiClient: Error making authenticated request:", error);

			// Provide more specific error messages
			if (error.name === "TypeError" && error.message.includes("fetch")) {
				throw new Error(
					`Unable to connect to API server. Make sure the server is running on ${this.serverUrl}. (${error.message})`
				);
			} else {
				throw new Error(`Failed to make API request: ${error.message}`);
			}
		}
	}

	/**
	 * Test token validity by making a simple API call
	 * @param {string} accessToken - OAuth access token
	 * @param {string} accessTokenSecret - OAuth access token secret
	 * @returns {Promise<boolean>} True if token is valid
	 */
	async testToken(accessToken, accessTokenSecret) {
		try {
			await this.makeAuthenticatedRequest(
				"flickr.auth.oauth.checkToken",
				{},
				accessToken,
				accessTokenSecret
			);
			return true;
		} catch (error) {
			console.warn("FlickrApiClient: Token validation failed:", error.message);
			return false;
		}
	}
}

// Export singleton instance
export const flickrApiClient = new FlickrApiClient();
