import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore.js";
import { parseUrlParams, validateCallbackParams } from "../../utils/apiHelpers.js";

/**
 * AuthCallback component handles the OAuth redirect from Flickr
 * Processes authorization code and completes authentication flow
 */
export function AuthCallback() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { completeAuth, isLoading, error, isAuthenticated } = useAuthStore();
	const [callbackError, setCallbackError] = useState(null);

	useEffect(() => {
		const handleCallback = async () => {
			try {
				// Parse URL parameters
				const params = parseUrlParams(window.location.href);

				// Validate callback parameters
				const validation = validateCallbackParams(params);

				if (!validation.isValid) {
					setCallbackError({
						type: "validation_error",
						message: "Invalid callback parameters",
						details: validation.errors.join(", "),
					});
					return;
				}

				if (validation.hasError) {
					// Handle OAuth error response
					let errorMessage = "Authentication was cancelled or failed.";

					if (params.error === "access_denied") {
						errorMessage = "Access was denied. Please grant permissions to continue.";
					} else if (params.error === "invalid_request") {
						errorMessage = "Invalid authentication request. Please try again.";
					} else if (params.error_description) {
						errorMessage = params.error_description;
					}

					setCallbackError({
						type: "oauth_error",
						message: errorMessage,
						details: `Error: ${params.error}`,
					});
					return;
				}

				if (validation.hasAuthCode) {
					// Handle OAuth 1.0a vs OAuth 2.0 flow
					if (validation.isOAuth1) {
						// OAuth 1.0a: complete authentication with oauth_token and oauth_verifier
						await completeAuth(params.oauth_token, params.oauth_verifier, params.state);
					} else if (validation.isOAuth2) {
						// OAuth 2.0: complete authentication with code and state
						await completeAuth(params.code, params.oauth_verifier, params.state);
					} else {
						throw new Error("Unable to determine OAuth flow type");
					}
				} else {
					setCallbackError({
						type: "missing_code",
						message: "No authorization code or token received from Flickr.",
						details: "The callback did not include the required authorization parameters.",
					});
				}
			} catch (error) {
				console.error("Callback handling error:", error);
				setCallbackError({
					type: "processing_error",
					message: "Failed to process authentication callback.",
					details: error.message,
				});
			}
		};

		// Only process callback if we're not already authenticated
		if (!isAuthenticated()) {
			handleCallback();
		} else {
			// Already authenticated, redirect to home
			navigate("/", { replace: true });
		}
	}, [searchParams, completeAuth, navigate, isAuthenticated]);

	// Redirect to home on successful authentication
	useEffect(() => {
		if (isAuthenticated()) {
			const timer = setTimeout(() => {
				// Try multiple navigation methods for maximum reliability
				try {
					// Method 1: React Router navigate
					navigate("/", { replace: true });

					// Method 2: Fallback to window.location if navigate doesn't work
					setTimeout(() => {
						if (window.location.pathname === "/auth/callback") {
							window.location.href = "/";
						}
					}, 500);
				} catch (error) {
					// Method 3: Direct window.location as last resort
					console.warn("Navigation failed, using window.location:", error);
					window.location.href = "/";
				}
			}, 1500); // Reduced from 2000ms to 1500ms

			return () => clearTimeout(timer);
		}
	}, [isAuthenticated, navigate]);

	// Show loading state
	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="max-w-md mx-auto text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<h2 className="text-xl font-semibold text-gray-800 mb-2">Completing authentication...</h2>
					<p className="text-gray-600">Please wait while we connect to your Flickr account.</p>
				</div>
			</div>
		);
	}

	// Show success state
	if (isAuthenticated()) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="max-w-md mx-auto text-center">
					<div className="mb-4">
						<svg
							className="mx-auto h-12 w-12 text-green-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5 13l4 4L19 7"
							/>
						</svg>
					</div>
					<h2 className="text-xl font-semibold text-gray-800 mb-2">Authentication successful!</h2>
					<p className="text-gray-600 mb-4">
						You're now connected to Flickr. Redirecting automatically...
					</p>
					<div className="w-full bg-gray-200 rounded-full h-2 mb-4">
						<div
							className="bg-blue-600 h-2 rounded-full animate-pulse"
							style={{ width: "100%" }}
						></div>
					</div>

					{/* Manual continue button as fallback */}
					<button
						onClick={() => {
							try {
								navigate("/", { replace: true });
							} catch {
								window.location.href = "/";
							}
						}}
						className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
					>
						Continue to App
					</button>
					<p className="text-xs text-gray-500 mt-2">Not redirecting? Click the button above.</p>
				</div>
			</div>
		);
	}

	// Show error state
	const displayError = error || callbackError;
	if (displayError) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="max-w-md mx-auto text-center">
					<div className="mb-4">
						<svg
							className="mx-auto h-12 w-12 text-red-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.884-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
							/>
						</svg>
					</div>
					<h2 className="text-xl font-semibold text-gray-800 mb-2">Authentication failed</h2>
					<p className="text-gray-600 mb-4">{displayError.message}</p>

					{/* Show technical details in development */}
					{import.meta.env.DEV && displayError.details && (
						<div className="mb-4 p-3 bg-gray-100 rounded text-sm text-left">
							<strong>Debug info:</strong> {displayError.details}
						</div>
					)}

					<div className="space-y-2">
						<button
							onClick={() => navigate("/", { replace: true })}
							className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
						>
							Return to App
						</button>

						{displayError.type !== "oauth_error" && (
							<button
								onClick={() => window.location.reload()}
								className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
							>
								Try Again
							</button>
						)}
					</div>
				</div>
			</div>
		);
	}

	// Fallback loading state
	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center">
			<div className="max-w-md mx-auto text-center">
				<div className="animate-pulse">
					<div className="h-12 w-12 bg-gray-300 rounded-full mx-auto mb-4"></div>
					<div className="h-4 bg-gray-300 rounded w-3/4 mx-auto mb-2"></div>
					<div className="h-4 bg-gray-300 rounded w-1/2 mx-auto"></div>
				</div>
			</div>
		</div>
	);
}
