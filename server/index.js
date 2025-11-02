const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const crypto = require("crypto");

// Load environment variables
dotenv.config({ path: "../.env.local" });

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for frontend
app.use(
	cors({
		origin: "http://localhost:5173",
		credentials: true,
	})
);

app.use(express.json());

// Debug environment variables
console.log("🔧 Environment variables:", {
	hasApiKey: !!process.env.VITE_FLICKR_API_KEY,
	hasApiSecret: !!process.env.VITE_FLICKR_API_SECRET,
	apiKeyLength: process.env.VITE_FLICKR_API_KEY?.length,
	apiSecretLength: process.env.VITE_FLICKR_API_SECRET?.length,
	callbackUrl: process.env.VITE_FLICKR_CALLBACK_URL,
});

// OAuth 1.0a helper functions
function generateNonce() {
	return crypto.randomBytes(16).toString("hex");
}

function getTimestamp() {
	return Math.floor(Date.now() / 1000).toString();
}

function percentEncode(str) {
	return encodeURIComponent(str).replace(
		/[!'()*]/g,
		(c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
	);
}

function generateOAuthSignature(httpMethod, url, params, tokenSecret = "") {
	const sortedParams = Object.keys(params)
		.sort()
		.map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
		.join("&");

	const signatureBaseString = [
		httpMethod.toUpperCase(),
		percentEncode(url),
		percentEncode(sortedParams),
	].join("&");

	const signingKey = [
		percentEncode(process.env.VITE_FLICKR_API_SECRET),
		percentEncode(tokenSecret),
	].join("&");

	const signature = crypto
		.createHmac("sha1", signingKey)
		.update(signatureBaseString)
		.digest("base64");

	return signature;
}

// OAuth endpoints
app.get("/auth/request-token", async (req, res) => {
	try {
		console.log("🔐 [SERVER] Getting request token from Flickr...");

		const url = "https://www.flickr.com/services/oauth/request_token";
		const params = {
			oauth_nonce: generateNonce(),
			oauth_timestamp: getTimestamp(),
			oauth_consumer_key: process.env.VITE_FLICKR_API_KEY,
			oauth_signature_method: "HMAC-SHA1",
			oauth_version: "1.0",
			oauth_callback: process.env.VITE_FLICKR_CALLBACK_URL,
		};

		// Generate signature
		params.oauth_signature = generateOAuthSignature("GET", url, params);

		// Create authorization header
		const authHeader =
			"OAuth " +
			Object.keys(params)
				.map((key) => `${percentEncode(key)}="${percentEncode(params[key])}"`)
				.join(", ");

		const response = await fetch(`${url}?${new URLSearchParams(params)}`, {
			method: "GET",
			headers: {
				Authorization: authHeader,
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Request token failed: ${response.status} ${response.statusText} - ${errorText}`
			);
		}

		const responseText = await response.text();
		const responseParams = new URLSearchParams(responseText);

		const oauth_token = responseParams.get("oauth_token");
		const oauth_token_secret = responseParams.get("oauth_token_secret");

		if (!oauth_token || !oauth_token_secret) {
			throw new Error("Invalid request token response");
		}

		console.log("✅ [SERVER] Request token obtained:", {
			token: oauth_token?.substring(0, 10) + "...",
			hasSecret: !!oauth_token_secret,
		});

		// Generate authorization URL
		const authorizeUrl = `https://www.flickr.com/services/oauth/authorize?oauth_token=${oauth_token}&perms=delete`;

		res.json({
			success: true,
			oauth_token,
			oauth_token_secret,
			authorize_url: authorizeUrl,
		});
	} catch (error) {
		console.error("🚨 [SERVER] Error getting request token:", error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

app.post("/auth/access-token", async (req, res) => {
	try {
		const { oauth_token, oauth_token_secret, oauth_verifier } = req.body;

		console.log("🔐 [SERVER] Exchanging for access token...");

		const url = "https://www.flickr.com/services/oauth/access_token";
		const params = {
			oauth_nonce: generateNonce(),
			oauth_timestamp: getTimestamp(),
			oauth_consumer_key: process.env.VITE_FLICKR_API_KEY,
			oauth_token,
			oauth_verifier,
			oauth_signature_method: "HMAC-SHA1",
			oauth_version: "1.0",
		};

		// Generate signature with request token secret
		params.oauth_signature = generateOAuthSignature("GET", url, params, oauth_token_secret);

		// Create authorization header
		const authHeader =
			"OAuth " +
			Object.keys(params)
				.map((key) => `${percentEncode(key)}="${percentEncode(params[key])}"`)
				.join(", ");

		const response = await fetch(`${url}?${new URLSearchParams(params)}`, {
			method: "GET",
			headers: {
				Authorization: authHeader,
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Access token failed: ${response.status} ${response.statusText} - ${errorText}`
			);
		}

		const responseText = await response.text();
		const responseParams = new URLSearchParams(responseText);

		const access_token = responseParams.get("oauth_token");
		const access_token_secret = responseParams.get("oauth_token_secret");
		const user_nsid = responseParams.get("user_nsid");
		const username = responseParams.get("username");
		const fullname = responseParams.get("fullname");

		if (!access_token || !access_token_secret) {
			throw new Error("Invalid access token response");
		}

		console.log("✅ [SERVER] Access token obtained for user:", fullname || username);

		res.json({
			success: true,
			access_token,
			access_token_secret,
			user_nsid,
			username,
			fullname,
		});
	} catch (error) {
		console.error("🚨 [SERVER] Error getting access token:", error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

// Photo API endpoint
app.post("/api/photos", async (req, res) => {
	try {
		const { method, params, accessToken, accessTokenSecret } = req.body;

		const url = "https://www.flickr.com/services/rest/";
		const httpMethod = method === "flickr.photos.delete" ? "POST" : "GET";

		console.log(`🖼️ [SERVER] Proxy API call: ${method} via ${httpMethod}`);

		// Common params included in signature
		const baseParams = {
			method,
			format: "json",
			nojsoncallback: "1",
			...params,
		};

		// OAuth params
		const oauthParams = {
			oauth_nonce: generateNonce(),
			oauth_timestamp: getTimestamp(),
			oauth_consumer_key: process.env.VITE_FLICKR_API_KEY,
			oauth_token: accessToken,
			oauth_signature_method: "HMAC-SHA1",
			oauth_version: "1.0",
		};

		// Params to sign are union of base and oauth
		const paramsToSign = { ...baseParams, ...oauthParams };

		// Generate signature with access token secret
		const oauth_signature = generateOAuthSignature(
			httpMethod,
			url,
			paramsToSign,
			accessTokenSecret
		);

		// Authorization header uses only oauth_* keys
		const authHeader =
			"OAuth " +
			Object.entries({ ...oauthParams, oauth_signature })
				.map(([key, val]) => `${percentEncode(key)}="${percentEncode(val)}"`)
				.join(", ");

		// For GET, send all params on query string; for POST, send non-oauth params in body
		let response;
		if (httpMethod === "GET") {
			const qs = new URLSearchParams({ ...baseParams, ...oauthParams, oauth_signature });
			response = await fetch(`${url}?${qs}`, {
				method: "GET",
				headers: { Authorization: authHeader },
			});
		} else {
			const bodyParams = new URLSearchParams(baseParams);
			response = await fetch(url, {
				method: "POST",
				headers: {
					Authorization: authHeader,
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: bodyParams,
			});
		}

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`API request failed: ${response.status} ${response.statusText} - ${errorText}`
			);
		}

		const data = await response.json();

		if (data.stat === "fail") {
			throw new Error(data.message || "Flickr API error");
		}

		if (method === "flickr.photos.delete") {
			console.log(`✅ [SERVER] Delete response: ${data.stat}`);
		} else {
			console.log(`✅ [SERVER] Photos fetched: ${data.photos?.photo?.length || 0} photos`);
		}

		res.json({
			success: true,
			data,
		});
	} catch (error) {
		console.error("🚨 [SERVER] Error fetching photos:", error);
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

// Test endpoint to verify server is running
app.get("/health", (req, res) => {
	res.json({
		status: "ok",
		timestamp: new Date().toISOString(),
		env: {
			hasApiKey: !!process.env.VITE_FLICKR_API_KEY,
			hasApiSecret: !!process.env.VITE_FLICKR_API_SECRET,
			callbackUrl: process.env.VITE_FLICKR_CALLBACK_URL,
		},
	});
});

app.listen(port, () => {
	console.log(`🚀 Flickr OAuth server running on http://localhost:${port}`);
	console.log(`🔧 Environment check:`, {
		hasApiKey: !!process.env.VITE_FLICKR_API_KEY,
		hasApiSecret: !!process.env.VITE_FLICKR_API_SECRET,
		callbackUrl: process.env.VITE_FLICKR_CALLBACK_URL,
	});
});
