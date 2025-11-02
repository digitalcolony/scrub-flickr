import { create } from "zustand";
import { flickrAuthService } from "../services/flickrAuth.js";
import { tokenStorageService } from "../services/tokenStorage.js";

/**
 * Authentication store using Zustand for global state management
 * Handles user session, OAuth tokens, and authentication status
 */
export const useAuthStore = create((set, get) => ({
	// State
	user: null,
	token: null,
	status: "unauthenticated", // 'unauthenticated' | 'authenticating' | 'authenticated' | 'token_expired' | 'error' | 'logout_pending'
	isLoading: false,
	error: null,
	lastAttempt: null,
	retryCount: 0,
	// Initialization guards
	hasInitialized: false,
	initInProgress: false,

	// Computed getters
	isAuthenticated: () => {
		const state = get();
		return state.status === "authenticated" && state.user && state.token;
	},

	canRetry: () => {
		const state = get();
		return state.retryCount < 3 && state.error?.recoverable;
	},

	// Actions
	/**
	 * Initialize authentication state on app startup
	 * Checks for existing valid tokens and restores session
	 */
	initializeAuth: async () => {
		const state = get();
		// Prevent duplicate concurrent inits
		if (state.initInProgress) return;
		// If already authenticated, no-op
		if (state.status === "authenticated" && state.user && state.token) {
			set({ hasInitialized: true });
			return;
		}

		try {
			console.log("[AUTH INIT] initializeAuth starting", {
				status: state.status,
				initInProgress: state.initInProgress,
				hasInitialized: state.hasInitialized,
			});
		} catch {
			/* noop */
		}

		set({ isLoading: true, initInProgress: true });

		try {
			const { token, user } = tokenStorageService.retrieveToken();

			// Debug: what did we load from storage?
			try {
				console.log("[AUTH INIT] retrieved token/user from storage:", {
					hasToken: !!token,
					hasUser: !!user,
				});
			} catch {
				// no-op logging failure
			}

			if (token && user) {
				try {
					console.log("[AUTH INIT] token & user found in storage; validating token...");
				} catch {
					/* noop */
				}

				// Validate token is still active
				let isValid = false;
				try {
					isValid = await flickrAuthService.validateToken(token);
				} catch (e) {
					// Network or server error during validation should not force token_expired
					console.warn("[AUTH INIT] validateToken threw, treating as invalid:", e?.message);
					isValid = false;
				}

				if (isValid) {
					try {
						console.log("[AUTH INIT] token valid → authenticated");
					} catch {
						/* noop */
					}
					set({
						user,
						token,
						status: "authenticated",
						isLoading: false,
						hasInitialized: true,
						initInProgress: false,
						error: null,
					});
				} else {
					// Re-check storage; if it's already empty, prefer unauthenticated over token_expired
					const stillHasToken = tokenStorageService.hasValidToken();
					if (!stillHasToken) {
						try {
							console.log("[AUTH INIT] invalid token but storage empty → unauthenticated");
						} catch {
							/* noop */
						}
						set({
							user: null,
							token: null,
							status: "unauthenticated",
							isLoading: false,
							hasInitialized: true,
							initInProgress: false,
							error: null,
						});
					} else {
						// Token invalid, clear storage and mark as expired (recoverable)
						tokenStorageService.clearToken();
						try {
							console.log("[AUTH INIT] token invalid → token_expired");
						} catch {
							/* noop */
						}
						set({
							user: null,
							token: null,
							status: "token_expired",
							isLoading: false,
							hasInitialized: true,
							initInProgress: false,
							error: {
								type: "token_invalid",
								message: "Your session has expired. Please sign in again.",
								recoverable: true,
							},
						});
					}
				}
			} else {
				try {
					console.log("[AUTH INIT] no stored token/user → unauthenticated");
				} catch {
					/* noop */
				}
				set({
					status: "unauthenticated",
					isLoading: false,
					hasInitialized: true,
					initInProgress: false,
				});
			}
		} catch (error) {
			// On unexpected errors, default to unauthenticated with recoverable error
			try {
				console.warn("[AUTH INIT] unexpected error:", error?.message);
			} catch {
				/* noop */
			}
			set({
				status: "unauthenticated",
				isLoading: false,
				hasInitialized: true,
				initInProgress: false,
				error: {
					type: "api_error",
					message: "Failed to initialize authentication. Please try again.",
					details: error.message,
					recoverable: true,
				},
			});
		}
	},

	/**
	 * Start OAuth authentication flow
	 * Redirects user to Flickr authorization page
	 */
	startAuth: async (options = {}) => {
		set({
			status: "authenticating",
			isLoading: true,
			error: null,
			lastAttempt: Date.now(),
		});

		try {
			const authUrl = await flickrAuthService.initiateAuth(options);

			// Store attempt info before redirect
			sessionStorage.setItem("auth_attempt_timestamp", Date.now().toString());

			// Redirect to Flickr OAuth page
			window.location.href = authUrl;
		} catch (error) {
			const state = get();
			set({
				status: "error",
				isLoading: false,
				retryCount: state.retryCount + 1,
				error: {
					type: "network",
					message:
						"Unable to connect to Flickr. Please check your internet connection and try again.",
					details: error.message,
					recoverable: true,
					retryAfter: Math.min(5 * Math.pow(2, state.retryCount), 60), // Exponential backoff, max 60s
				},
			});
		}
	},

	/**
	 * Complete OAuth authentication flow
	 * Called from auth callback route with authorization parameters
	 */
	completeAuth: async (authCode, oauthVerifier, state) => {
		set({ isLoading: true });

		try {
			const result = await flickrAuthService.completeAuth(authCode, oauthVerifier, state);

			if (result.success) {
				// Store token and user data
				tokenStorageService.storeToken(result.token, result.user);

				set({
					user: result.user,
					token: result.token,
					status: "authenticated",
					isLoading: false,
					error: null,
					retryCount: 0,
				});
			} else {
				throw new Error("Authentication failed");
			}
		} catch (error) {
			const state = get();

			// Determine error type based on error message
			let errorType = "api_error";
			let userMessage = "Authentication failed. Please try again.";

			if (error.message.includes("state")) {
				errorType = "api_error";
				userMessage = "Security validation failed. Please try signing in again.";
			} else if (error.message.includes("network") || error.message.includes("connect")) {
				errorType = "network";
				userMessage = "Unable to connect to Flickr. Please check your internet connection.";
			} else if (error.message.includes("permission") || error.message.includes("denied")) {
				errorType = "permission_denied";
				userMessage =
					"Flickr permissions are required to access your photos. Please grant access to continue.";
			}

			set({
				status: "error",
				isLoading: false,
				retryCount: state.retryCount + 1,
				error: {
					type: errorType,
					message: userMessage,
					details: error.message,
					recoverable: true,
				},
			});
		}
	},

	/**
	 * Update user activity timestamp for session management
	 */
	updateActivity: () => {
		const state = get();
		if (state.isAuthenticated()) {
			tokenStorageService.updateLastActivity();
		}
	},

	/**
	 * Set authentication error
	 */
	setError: (error) => {
		set({
			error,
			status: error ? "error" : get().status,
		});
	},

	/**
	 * Clear authentication error
	 */
	clearError: () => {
		set({ error: null });
	},

	/**
	 * Set loading state
	 */
	setLoading: (isLoading) => {
		set({ isLoading });
	},

	/**
	 * Increment retry counter
	 */
	incrementRetryCount: () => {
		const state = get();
		set({ retryCount: state.retryCount + 1 });
	},

	/**
	 * Reset retry counter
	 */
	resetRetryCount: () => {
		set({ retryCount: 0 });
	},

	/**
	 * Logout user and clean up authentication state
	 */
	logout: async () => {
		set({
			status: "logout_pending",
			isLoading: true,
		});

		try {
			// Clean up with auth service
			await flickrAuthService.logout();

			// Clear stored tokens
			tokenStorageService.clearToken();

			// Reset store state
			set({
				user: null,
				token: null,
				status: "unauthenticated",
				isLoading: false,
				error: null,
				retryCount: 0,
				lastAttempt: null,
			});
		} catch (error) {
			// Even if logout fails, clear local state
			tokenStorageService.clearToken();

			set({
				user: null,
				token: null,
				status: "unauthenticated",
				isLoading: false,
				error: null,
				retryCount: 0,
				lastAttempt: null,
			});

			console.warn("Error during logout, but local state cleared:", error.message);
		}
	},

	/**
	 * Force refresh authentication state
	 * Useful for manual token validation
	 */
	refreshAuth: async () => {
		const state = get();

		if (state.token) {
			set({ isLoading: true });

			try {
				const isValid = await flickrAuthService.validateToken(state.token);

				if (!isValid) {
					// Token is invalid, logout
					await get().logout();
				} else {
					set({ isLoading: false });
				}
			} catch (error) {
				set({
					isLoading: false,
					error: {
						type: "api_error",
						message: "Failed to validate session. Please try again.",
						details: error.message,
						recoverable: true,
					},
				});
			}
		}
	},
}));

// Initialize authentication on store creation
// TEMPORARILY DISABLED: useAuthStore.getState().initializeAuth();
