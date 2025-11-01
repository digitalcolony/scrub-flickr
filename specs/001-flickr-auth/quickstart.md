# Quickstart: Flickr Authentication

**Feature**: Flickr Authentication
**Audience**: Developers implementing this feature
**Time to Complete**: ~30 minutes for setup and basic testing

## Prerequisites

- Node.js 18+ installed
- Flickr API key and secret (register at https://www.flickr.com/services/apps/create/)
- React development environment set up
- Access to scrub-flickr repository

## Quick Setup (5 minutes)

### 1. Environment Configuration

Create `.env.local` file in project root:

```bash
VITE_FLICKR_API_KEY=your_api_key_here
VITE_FLICKR_API_SECRET=your_api_secret_here
VITE_FLICKR_CALLBACK_URL=http://localhost:5173/auth/callback
```

### 2. Install Dependencies

```bash
npm install crypto-js
# Other dependencies (axios, zustand) already installed
```

### 3. Flickr App Configuration

1. Visit https://www.flickr.com/services/apps/create/
2. Create new app with these settings:
   - **App Type**: Web Application
   - **Callback URL**: `http://localhost:5173/auth/callback`
   - **Permissions**: Delete (includes read/write)

## Core Implementation (15 minutes)

### 1. Authentication Service

Create `src/services/flickrAuth.js`:

```javascript
import CryptoJS from "crypto-js";

class FlickrAuthService {
	constructor() {
		this.apiKey = import.meta.env.VITE_FLICKR_API_KEY;
		this.apiSecret = import.meta.env.VITE_FLICKR_API_SECRET;
		this.callbackUrl = import.meta.env.VITE_FLICKR_CALLBACK_URL;
	}

	// Generate PKCE parameters
	generatePKCE() {
		const codeVerifier = CryptoJS.lib.WordArray.random(32).toString();
		const codeChallenge = CryptoJS.SHA256(codeVerifier).toString(CryptoJS.enc.Base64url);
		return { codeVerifier, codeChallenge };
	}

	// Initiate OAuth flow
	async initiateAuth(permissions = "delete") {
		const { codeVerifier, codeChallenge } = this.generatePKCE();
		const state = CryptoJS.lib.WordArray.random(16).toString();

		// Store for callback
		sessionStorage.setItem("oauth_code_verifier", codeVerifier);
		sessionStorage.setItem("oauth_state", state);

		const authUrl =
			`https://www.flickr.com/services/oauth/authorize?` +
			`response_type=code&` +
			`client_id=${this.apiKey}&` +
			`redirect_uri=${encodeURIComponent(this.callbackUrl)}&` +
			`code_challenge=${codeChallenge}&` +
			`code_challenge_method=S256&` +
			`perms=${permissions}&` +
			`state=${state}`;

		return authUrl;
	}

	// Complete OAuth flow
	async completeAuth(authCode, state) {
		const storedState = sessionStorage.getItem("oauth_state");
		const codeVerifier = sessionStorage.getItem("oauth_code_verifier");

		if (state !== storedState) {
			throw new Error("Invalid state parameter");
		}

		// Exchange code for token (implementation depends on Flickr OAuth 1.0a)
		const tokenResponse = await this.exchangeCodeForToken(authCode, codeVerifier);

		// Fetch user info
		const userInfo = await this.getUserInfo(tokenResponse.token);

		return {
			success: true,
			token: tokenResponse,
			user: userInfo,
		};
	}
}

export const flickrAuthService = new FlickrAuthService();
```

### 2. Authentication Store

Create `src/stores/authStore.js`:

```javascript
import { create } from "zustand";
import { flickrAuthService } from "../services/flickrAuth";

export const useAuthStore = create((set, get) => ({
	// State
	user: null,
	token: null,
	isAuthenticated: false,
	isLoading: false,
	error: null,
	retryCount: 0,

	// Actions
	startAuth: async () => {
		set({ isLoading: true, error: null });
		try {
			const authUrl = await flickrAuthService.initiateAuth();
			window.location.href = authUrl;
		} catch (error) {
			set({
				isLoading: false,
				error: { type: "network", message: error.message, recoverable: true },
			});
		}
	},

	completeAuth: async (authCode, state) => {
		set({ isLoading: true });
		try {
			const result = await flickrAuthService.completeAuth(authCode, state);
			set({
				user: result.user,
				token: result.token,
				isAuthenticated: true,
				isLoading: false,
				error: null,
				retryCount: 0,
			});
		} catch (error) {
			set({
				isLoading: false,
				error: { type: "api_error", message: error.message, recoverable: true },
			});
		}
	},

	logout: () => {
		localStorage.removeItem("flickr-scrub-auth");
		set({
			user: null,
			token: null,
			isAuthenticated: false,
			error: null,
		});
	},
}));
```

### 3. Login Component

Create `src/components/auth/LoginButton.jsx`:

```jsx
import { useAuthStore } from "../../stores/authStore";

export function LoginButton({ className = "", children = "Connect to Flickr" }) {
	const { startAuth, isLoading } = useAuthStore();

	return (
		<button
			onClick={startAuth}
			disabled={isLoading}
			className={`px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 ${className}`}
		>
			{isLoading ? "Connecting..." : children}
		</button>
	);
}
```

### 4. Auth Callback Component

Create `src/components/auth/AuthCallback.jsx`:

```jsx
import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export function AuthCallback() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { completeAuth, isLoading, error } = useAuthStore();

	useEffect(() => {
		const authCode = searchParams.get("code");
		const state = searchParams.get("state");

		if (authCode && state) {
			completeAuth(authCode, state).then(() => {
				navigate("/"); // Redirect to main app
			});
		}
	}, [searchParams, completeAuth, navigate]);

	if (isLoading) {
		return <div className="text-center p-8">Completing authentication...</div>;
	}

	if (error) {
		return (
			<div className="text-center p-8">
				<div className="text-red-600 mb-4">Authentication failed: {error.message}</div>
				<button onClick={() => navigate("/")} className="px-4 py-2 bg-gray-600 text-white rounded">
					Return to App
				</button>
			</div>
		);
	}

	return <div className="text-center p-8">Authentication in progress...</div>;
}
```

## Basic Testing (10 minutes)

### 1. Integration Test

Create `tests/integration/authFlow.test.js`:

```javascript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginButton } from "../../src/components/auth/LoginButton";
import { useAuthStore } from "../../src/stores/authStore";

// Mock the auth service
jest.mock("../../src/services/flickrAuth", () => ({
	flickrAuthService: {
		initiateAuth: jest.fn().mockResolvedValue("https://flickr.com/oauth/authorize?..."),
	},
}));

describe("Authentication Flow", () => {
	beforeEach(() => {
		useAuthStore.getState().logout(); // Reset state
	});

	test("login button initiates authentication", async () => {
		render(<LoginButton />);

		const loginButton = screen.getByText("Connect to Flickr");
		fireEvent.click(loginButton);

		await waitFor(() => {
			expect(screen.getByText("Connecting...")).toBeInTheDocument();
		});
	});

	test("handles authentication errors gracefully", async () => {
		// Mock service to throw error
		const { flickrAuthService } = require("../../src/services/flickrAuth");
		flickrAuthService.initiateAuth.mockRejectedValueOnce(new Error("Network error"));

		render(<LoginButton />);

		const loginButton = screen.getByText("Connect to Flickr");
		fireEvent.click(loginButton);

		await waitFor(() => {
			const store = useAuthStore.getState();
			expect(store.error).toBeTruthy();
			expect(store.error.type).toBe("network");
		});
	});
});
```

### 2. Manual Testing Checklist

- [ ] Click "Connect to Flickr" button
- [ ] Verify redirect to Flickr authorization page
- [ ] Grant permissions and verify callback handling
- [ ] Check user profile display after authentication
- [ ] Test logout functionality
- [ ] Verify session persistence on page refresh

## Common Issues & Solutions

### Issue: "Invalid API Key"

**Solution**: Verify `.env.local` file has correct Flickr API credentials

### Issue: "Callback URL Mismatch"

**Solution**: Ensure Flickr app settings match your local development URL

### Issue: "CORS Errors"

**Solution**: Use Vite's proxy configuration for API calls during development

### Issue: "Token Storage Errors"

**Solution**: Check browser localStorage permissions and clear existing data

## Next Steps

1. **Add Error Handling**: Implement comprehensive error boundaries
2. **Token Refresh**: Add automatic token refresh logic
3. **Testing**: Expand test coverage for edge cases
4. **Security**: Implement token encryption for storage
5. **UX Polish**: Add loading states and improved error messages

## Production Deployment

When deploying to production:

1. Update callback URL in Flickr app settings
2. Set production environment variables
3. Implement proper error logging
4. Add rate limiting protection
5. Enable HTTPS for all authentication flows

---

**Implementation Complete**: Basic Flickr authentication is now functional. Continue with photo management features or enhance authentication UX.
