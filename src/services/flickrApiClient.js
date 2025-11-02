import CryptoJS from "crypto-js";

/**
 * FlickrApiClient handles OAuth 1.0a authentication and API requests to Flickr
 * Implements the complete OAuth flow and provides methods for API calls
 */
export class FlickrApiClient {
	constructor() {
		this.apiKey = import.meta.env.VITE_FLICKR_API_KEY;
		this.apiSecret = import.meta.env.VITE_FLICKR_API_SECRET;
		this.callbackUrl = import.meta.env.VITE_FLICKR_CALLBACK_URL;
		this.baseUrl = "https://www.flickr.com/services/rest/";
		this.authUrl = "https://www.flickr.com/services/oauth/";

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
	 * Get request token (step 1 of OAuth flow)
	 * @returns {Promise<Object>} Request token and secret
	 */
	async getRequestToken() {
		const url = `${this.authUrl}request_token`;
		const params = {
			oauth_nonce: this.generateNonce(),
			oauth_timestamp: this.getTimestamp(),
			oauth_consumer_key: this.apiKey,
			oauth_signature_method: "HMAC-SHA1",
			oauth_version: "1.0",
			oauth_callback: this.callbackUrl,
		};

		// Generate signature
		params.oauth_signature = this.generateOAuthSignature("GET", url, params);

		// Create authorization header
		const authHeader =
			"OAuth " +
			Object.keys(params)
				.map((key) => `${this.percentEncode(key)}="${this.percentEncode(params[key])}"`)
				.join(", ");

		try {
			const response = await fetch(`${url}?${new URLSearchParams(params)}`, {
				method: "GET",
				headers: {
					Authorization: authHeader,
				},
			});

			if (!response.ok) {
				throw new Error(`Request token failed: ${response.status} ${response.statusText}`);
			}

			const responseText = await response.text();
			const responseParams = new URLSearchParams(responseText);

			const requestToken = responseParams.get("oauth_token");
			const requestTokenSecret = responseParams.get("oauth_token_secret");

			if (!requestToken || !requestTokenSecret) {
				throw new Error("Invalid request token response");
			}

			return {
				token: requestToken,
				tokenSecret: requestTokenSecret,
			};
		} catch (error) {
			console.error("FlickrApiClient: Error getting request token:", error);
			throw new Error(`Failed to get request token: ${error.message}`);
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
	 * Exchange request token for access token (step 3 of OAuth flow)
	 * @param {string} requestToken - Request token
	 * @param {string} requestTokenSecret - Request token secret
	 * @param {string} verifier - OAuth verifier from callback
	 * @returns {Promise<Object>} Access token and secret
	 */
	async getAccessToken(requestToken, requestTokenSecret, verifier) {
		const url = `${this.authUrl}access_token`;
		const params = {
			oauth_nonce: this.generateNonce(),
			oauth_timestamp: this.getTimestamp(),
			oauth_consumer_key: this.apiKey,
			oauth_token: requestToken,
			oauth_verifier: verifier,
			oauth_signature_method: "HMAC-SHA1",
			oauth_version: "1.0",
		};

		// Generate signature with request token secret
		params.oauth_signature = this.generateOAuthSignature("GET", url, params, requestTokenSecret);

		// Create authorization header
		const authHeader =
			"OAuth " +
			Object.keys(params)
				.map((key) => `${this.percentEncode(key)}="${this.percentEncode(params[key])}"`)
				.join(", ");

		try {
			const response = await fetch(`${url}?${new URLSearchParams(params)}`, {
				method: "GET",
				headers: {
					Authorization: authHeader,
				},
			});

			if (!response.ok) {
				throw new Error(`Access token failed: ${response.status} ${response.statusText}`);
			}

			const responseText = await response.text();
			const responseParams = new URLSearchParams(responseText);

			const accessToken = responseParams.get("oauth_token");
			const accessTokenSecret = responseParams.get("oauth_token_secret");
			const userId = responseParams.get("user_nsid");
			const username = responseParams.get("username");
			const fullname = responseParams.get("fullname");

			if (!accessToken || !accessTokenSecret) {
				throw new Error("Invalid access token response");
			}

			return {
				accessToken,
				accessTokenSecret,
				userId,
				username,
				fullname,
			};
		} catch (error) {
			console.error("FlickrApiClient: Error getting access token:", error);
			throw new Error(`Failed to get access token: ${error.message}`);
		}
	}

	/**
	 * Make authenticated API request to Flickr
	 * @param {string} method - Flickr API method (e.g., 'flickr.people.getPhotos')
	 * @param {Object} params - API parameters
	 * @param {string} accessToken - OAuth access token
	 * @param {string} accessTokenSecret - OAuth access token secret
	 * @returns {Promise<Object>} API response
	 */
	async makeAuthenticatedRequest(method, params = {}, accessToken, accessTokenSecret) {
		const url = this.baseUrl;
		const requestParams = {
			...params,
			method,
			api_key: this.apiKey,
			format: "json",
			nojsoncallback: "1",
			oauth_nonce: this.generateNonce(),
			oauth_timestamp: this.getTimestamp(),
			oauth_consumer_key: this.apiKey,
			oauth_token: accessToken,
			oauth_signature_method: "HMAC-SHA1",
			oauth_version: "1.0",
		};

		// Generate signature with access token secret
		requestParams.oauth_signature = this.generateOAuthSignature(
			"GET",
			url,
			requestParams,
			accessTokenSecret
		);

		try {
			const response = await fetch(`${url}?${new URLSearchParams(requestParams)}`, {
				method: "GET",
			});

			if (!response.ok) {
				throw new Error(`API request failed: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();

			if (data.stat === "fail") {
				throw new Error(`Flickr API error: ${data.message} (Code: ${data.code})`);
			}

			return data;
		} catch (error) {
			console.error(`FlickrApiClient: Error calling ${method}:`, error);
			throw error;
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
