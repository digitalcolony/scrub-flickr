import { useAuthStore } from "../../stores/authStore.js";
import { FlickrPermissions } from "../../utils/authTypes.js";

/**
 * LoginButton component for initiating Flickr OAuth authentication
 * Provides a clean interface for starting the authentication flow
 */
export function LoginButton({
	onLoginStart,
	onLoginError,
	disabled = false,
	className = "",
	children = "Connect to Flickr",
	permissions = FlickrPermissions.DELETE,
}) {
	const { startAuth, isLoading, error, clearError } = useAuthStore();

	const handleLogin = async () => {
		try {
			// Clear any existing errors
			clearError();

			// Notify parent component
			if (onLoginStart) {
				onLoginStart();
			}

			// Start authentication flow
			await startAuth({ permissions });
		} catch (authError) {
			// Notify parent component of error
			if (onLoginError) {
				onLoginError(authError);
			}
		}
	};

	const isDisabled = disabled || isLoading;

	return (
		<div className="inline-block">
			<button
				onClick={handleLogin}
				disabled={isDisabled}
				className={`
          inline-flex items-center justify-center
          px-6 py-3
          bg-blue-600 hover:bg-blue-700
          disabled:bg-gray-400 disabled:cursor-not-allowed
          text-white font-medium
          rounded-lg
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${className}
        `}
				aria-label={isLoading ? "Connecting to Flickr..." : "Connect to Flickr account"}
			>
				{isLoading && (
					<svg
						className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						></circle>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
				)}

				{isLoading ? "Connecting..." : children}
			</button>

			{error && error.type === "network" && (
				<div className="mt-2 text-sm text-red-600">{error.message}</div>
			)}
		</div>
	);
}

/**
 * Compact version of LoginButton for use in navigation or constrained spaces
 */
export function LoginButtonCompact({ className = "", ...props }) {
	return (
		<LoginButton className={`px-4 py-2 text-sm ${className}`} {...props}>
			Sign In
		</LoginButton>
	);
}

/**
 * LoginButton with Flickr branding
 */
export function FlickrLoginButton({ className = "", ...props }) {
	return (
		<LoginButton
			className={`bg-pink-600 hover:bg-pink-700 focus:ring-pink-500 ${className}`}
			{...props}
		>
			<svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
				<path d="M5.334 6.666c-1.84 0-3.334 1.493-3.334 3.334s1.494 3.334 3.334 3.334 3.334-1.493 3.334-3.334-1.494-3.334-3.334-3.334zm8 0c-1.84 0-3.334 1.493-3.334 3.334s1.494 3.334 3.334 3.334 3.334-1.493 3.334-3.334-1.494-3.334-3.334-3.334z" />
			</svg>
			Connect with Flickr
		</LoginButton>
	);
}
