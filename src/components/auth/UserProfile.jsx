import { useAuthStore } from "../../stores/authStore.js";
import { formatTimestamp } from "../../utils/apiHelpers.js";

/**
 * UserProfile component displays authenticated user information
 * Shows username, profile details, and logout functionality
 */
export function UserProfile({ user: propUser, onLogout, showFullProfile = true, className = "" }) {
	const { user: storeUser, logout, isLoading } = useAuthStore();

	// Use prop user or fallback to store user
	const user = propUser || storeUser;

	if (!user) {
		return null;
	}

	const handleLogout = async () => {
		try {
			if (onLogout) {
				onLogout();
			}
			await logout();
		} catch (error) {
			console.error("Logout error:", error);
		}
	};

	return (
		<div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
			<div className="flex items-start justify-between">
				<div className="flex items-center space-x-4">
					{/* Avatar placeholder */}
					<div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
						<svg
							className="w-6 h-6 text-gray-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
							/>
						</svg>
					</div>

					<div>
						<h3 className="text-lg font-semibold text-gray-900">
							{user.fullName || user.username}
						</h3>
						{user.fullName && <p className="text-sm text-gray-500">@{user.username}</p>}
						<p className="text-xs text-gray-400">
							Connected {formatTimestamp(user.authenticatedAt)}
						</p>
					</div>
				</div>

				<button
					onClick={handleLogout}
					disabled={isLoading}
					className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
					aria-label="Disconnect from Flickr"
				>
					{isLoading ? "Disconnecting..." : "Disconnect"}
				</button>
			</div>

			{showFullProfile && (
				<div className="mt-6 space-y-3">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
						<div>
							<span className="font-medium text-gray-700">User ID:</span>
							<span className="ml-2 text-gray-600 font-mono text-xs">{user.userId}</span>
						</div>

						{user.profileUrl && (
							<div>
								<span className="font-medium text-gray-700">Profile:</span>
								<a
									href={user.profileUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="ml-2 text-blue-600 hover:text-blue-800 underline"
								>
									View on Flickr
								</a>
							</div>
						)}

						{user.lastActivity && (
							<div>
								<span className="font-medium text-gray-700">Last active:</span>
								<span className="ml-2 text-gray-600">{formatTimestamp(user.lastActivity)}</span>
							</div>
						)}
					</div>

					{/* Connection status indicator */}
					<div className="pt-3 border-t border-gray-200">
						<div className="flex items-center space-x-2">
							<div className="w-2 h-2 bg-green-500 rounded-full"></div>
							<span className="text-sm text-gray-600">Connected to Flickr</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

/**
 * Compact version of UserProfile for use in navigation or headers
 */
export function UserProfileCompact({ className = "", showLogout = true }) {
	const { user, logout, isLoading } = useAuthStore();

	if (!user) {
		return null;
	}

	const handleLogout = async () => {
		try {
			await logout();
		} catch (error) {
			console.error("Logout error:", error);
		}
	};

	return (
		<div className={`flex items-center space-x-3 ${className}`}>
			<div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
				<svg
					className="w-4 h-4 text-gray-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
					/>
				</svg>
			</div>

			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium text-gray-900 truncate">{user.username}</p>
				<p className="text-xs text-gray-500">Flickr connected</p>
			</div>

			{showLogout && (
				<button
					onClick={handleLogout}
					disabled={isLoading}
					className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
					aria-label="Disconnect"
				>
					{isLoading ? "..." : "Disconnect"}
				</button>
			)}
		</div>
	);
}

/**
 * UserProfile dropdown menu for navigation bars
 */
export function UserProfileDropdown({ className = "" }) {
	const { user, logout, isLoading } = useAuthStore();

	if (!user) {
		return null;
	}

	const handleLogout = async () => {
		try {
			await logout();
		} catch (error) {
			console.error("Logout error:", error);
		}
	};

	return (
		<div className={`relative inline-block text-left ${className}`}>
			<div className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer">
				<div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
					<svg
						className="w-4 h-4 text-gray-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
						/>
					</svg>
				</div>
				<span className="text-sm font-medium text-gray-700">{user.username}</span>
				<svg
					className="w-4 h-4 text-gray-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			</div>

			{/* Dropdown menu - would need state management for show/hide */}
			<div className="hidden absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
				<div className="py-1">
					<div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
						<div className="font-medium">{user.fullName || user.username}</div>
						<div className="text-xs text-gray-500">@{user.username}</div>
					</div>

					{user.profileUrl && (
						<a
							href={user.profileUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
						>
							View Flickr Profile
						</a>
					)}

					<button
						onClick={handleLogout}
						disabled={isLoading}
						className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
					>
						{isLoading ? "Disconnecting..." : "Disconnect"}
					</button>
				</div>
			</div>
		</div>
	);
}
