import { useAuthStore } from "../../stores/authStore.js";
import { AuthErrorType, formatAuthError } from "../../utils/authTypes.js";

/**
 * AuthError component displays authentication errors with recovery options
 * Provides user-friendly error messages and retry functionality
 */
export function AuthError({ error: propError, onRetry, onDismiss, className = "" }) {
	const { error: storeError, startAuth, clearError, canRetry } = useAuthStore();

	// Use prop error or fallback to store error
	const error = propError || storeError;

	if (!error) {
		return null;
	}

	const handleRetry = async () => {
		try {
			if (onRetry) {
				onRetry();
			} else {
				// Default retry action - restart authentication
				await startAuth();
			}
		} catch (retryError) {
			console.error("Retry error:", retryError);
		}
	};

	const handleDismiss = () => {
		if (onDismiss) {
			onDismiss();
		} else {
			clearError();
		}
	};

	const getErrorIcon = () => {
		switch (error.type) {
			case AuthErrorType.NETWORK:
				return (
					<svg
						className="w-6 h-6 text-red-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				);
			case AuthErrorType.PERMISSION_DENIED:
				return (
					<svg
						className="w-6 h-6 text-yellow-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
						/>
					</svg>
				);
			case AuthErrorType.TOKEN_INVALID:
				return (
					<svg
						className="w-6 h-6 text-orange-600"
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
				);
			default:
				return (
					<svg
						className="w-6 h-6 text-red-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				);
		}
	};

	const getBgColor = () => {
		switch (error.type) {
			case AuthErrorType.NETWORK:
				return "bg-red-50 border-red-200";
			case AuthErrorType.PERMISSION_DENIED:
				return "bg-yellow-50 border-yellow-200";
			case AuthErrorType.TOKEN_INVALID:
				return "bg-orange-50 border-orange-200";
			default:
				return "bg-red-50 border-red-200";
		}
	};

	const getTextColor = () => {
		switch (error.type) {
			case AuthErrorType.NETWORK:
				return "text-red-700";
			case AuthErrorType.PERMISSION_DENIED:
				return "text-yellow-700";
			case AuthErrorType.TOKEN_INVALID:
				return "text-orange-700";
			default:
				return "text-red-700";
		}
	};

	const getButtonColor = () => {
		switch (error.type) {
			case AuthErrorType.NETWORK:
				return "bg-red-600 hover:bg-red-700 focus:ring-red-500";
			case AuthErrorType.PERMISSION_DENIED:
				return "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500";
			case AuthErrorType.TOKEN_INVALID:
				return "bg-orange-600 hover:bg-orange-700 focus:ring-orange-500";
			default:
				return "bg-red-600 hover:bg-red-700 focus:ring-red-500";
		}
	};

	return (
		<div className={`rounded-lg border p-4 ${getBgColor()} ${className}`}>
			<div className="flex items-start">
				<div className="flex-shrink-0">{getErrorIcon()}</div>

				<div className="ml-3 flex-1">
					<h3 className={`text-sm font-medium ${getTextColor()}`}>Authentication Error</h3>

					<div className={`mt-2 text-sm ${getTextColor()}`}>
						<p>{formatAuthError(error)}</p>
					</div>

					{/* Show technical details in development */}
					{import.meta.env.DEV && error.details && (
						<div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-700">
							<strong>Debug info:</strong> {error.details}
						</div>
					)}

					{/* Show retry countdown */}
					{error.retryAfter && (
						<div className={`mt-2 text-xs ${getTextColor()}`}>
							Please wait {error.retryAfter} seconds before trying again.
						</div>
					)}

					<div className="mt-4 flex space-x-3">
						{error.recoverable && canRetry() && (
							<button
								onClick={handleRetry}
								className={`
                  px-3 py-2 text-sm font-medium text-white rounded-md
                  ${getButtonColor()}
                  focus:outline-none focus:ring-2 focus:ring-offset-2
                  transition-colors duration-200
                `}
							>
								{error.type === AuthErrorType.PERMISSION_DENIED ? "Grant Permissions" : "Try Again"}
							</button>
						)}

						<button
							onClick={handleDismiss}
							className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
						>
							Dismiss
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * Compact version of AuthError for inline display
 */
export function AuthErrorCompact({ className = "", showIcon = true }) {
	const { error } = useAuthStore();

	if (!error) {
		return null;
	}

	return (
		<div className={`flex items-center space-x-2 text-sm text-red-700 ${className}`}>
			{showIcon && (
				<svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			)}
			<span>{error.message}</span>
		</div>
	);
}

/**
 * AuthError banner for top-of-page display
 */
export function AuthErrorBanner({ className = "" }) {
	const { error, clearError } = useAuthStore();

	if (!error) {
		return null;
	}

	return (
		<div className={`bg-red-50 border-l-4 border-red-400 p-4 ${className}`}>
			<div className="flex justify-between">
				<div className="flex">
					<div className="flex-shrink-0">
						<svg
							className="h-5 w-5 text-red-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<div className="ml-3">
						<p className="text-sm text-red-700">{error.message}</p>
					</div>
				</div>
				<div className="ml-auto pl-3">
					<div className="-mx-1.5 -my-1.5">
						<button
							onClick={clearError}
							className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
						>
							<span className="sr-only">Dismiss</span>
							<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
