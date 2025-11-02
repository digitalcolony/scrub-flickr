import { useEffect, useCallback, useState } from "react";
import { usePhotoTriageStore } from "../../stores/photoTriageStore.js";
import { useAuthStore } from "../../stores/authStore.js";

/**
 * PhotoTriageScreen - Main screen for photo keep/delete decisions
 * Features keyboard shortcuts, progress tracking, and responsive design
 */
export function PhotoTriageScreen() {
	const { user, token, status, isLoading, initializeAuth, logout } = useAuthStore();
	const {
		loadPhotos,
		loadMorePhotos,
		getCurrentPhoto,
		tagPhoto,
		getTriageStats,
		isLoadingPhotos,
		loadingError,
		clearError,
		resetAllTags,
	} = usePhotoTriageStore();

	const [imageLoading, setImageLoading] = useState(false);
	const [imageError, setImageError] = useState(false);
	const [authInitialized, setAuthInitialized] = useState(false);

	const currentPhoto = getCurrentPhoto();
	const stats = getTriageStats();

	// Debug current state
	console.log("📊 [COMPONENT DEBUG] PhotoTriageScreen render:", {
		hasCurrentPhoto: !!currentPhoto,
		isLoadingPhotos,
		loadingError,
		stats: {
			totalLoaded: stats.totalLoaded,
			hasMorePhotos: stats.hasMorePhotos,
			keepCount: stats.keepCount,
			deleteCount: stats.deleteCount,
			untaggedCount: stats.untaggedCount,
		},
		user: user ? { userId: user.userId, username: user.username } : null,
		hasToken: !!token,
		authStatus: status,
		isAuthLoading: isLoading,
		authInitialized,
	});

	// Mount/unmount diagnostics
	useEffect(() => {
		console.log("🧩 [COMPONENT DEBUG] PhotoTriageScreen mounted");
		return () => console.log("🧹 [COMPONENT DEBUG] PhotoTriageScreen unmounted");
	}, []);

	// Debug localStorage
	console.log("💾 [STORAGE DEBUG] localStorage auth data:", {
		flickrScrubAuth: localStorage.getItem("flickr-scrub-auth"),
		authStorage: localStorage.getItem("auth-storage"),
		photoStorage: localStorage.getItem("photo-triage-storage"),
	});

	// Debug stored auth data in detail
	try {
		const storedAuth = localStorage.getItem("flickr-scrub-auth");
		if (storedAuth) {
			const authData = JSON.parse(storedAuth);
			console.log("🔍 [DETAILED AUTH DEBUG]", {
				version: authData.version,
				timestamp: authData.timestamp,
				timestampAge: authData.timestamp ? Date.now() - authData.timestamp : null,
				token: {
					hasAccessToken: !!authData.token?.accessToken,
					issuedAt: authData.token?.issuedAt,
					expiresAt: authData.token?.expiresAt,
					tokenAge: authData.token?.issuedAt ? Date.now() - authData.token.issuedAt : null,
				},
				user: {
					userId: authData.user?.userId,
					username: authData.user?.username,
					authenticatedAt: authData.user?.authenticatedAt,
					sessionAge: authData.user?.authenticatedAt
						? Date.now() - authData.user.authenticatedAt
						: null,
					sessionAgeHours: authData.user?.authenticatedAt
						? (Date.now() - authData.user.authenticatedAt) / (1000 * 60 * 60)
						: null,
				},
			});
		}
	} catch (e) {
		console.log("❌ [AUTH DEBUG] Error parsing stored auth:", e);
	}

	// Initialize auth on component mount if needed
	useEffect(() => {
		if (!authInitialized && !isLoading && status === "unauthenticated") {
			console.log("🔄 [AUTH DEBUG] Initializing auth on component mount...");
			initializeAuth();
			setAuthInitialized(true);
		}
	}, [authInitialized, isLoading, status, initializeAuth]);

	// Fallback: if status says token_expired but storage is empty, normalize to unauthenticated
	useEffect(() => {
		const hasStored = !!localStorage.getItem("flickr-scrub-auth");
		if (status === "token_expired" && !hasStored) {
			console.warn(
				"[AUTH DEBUG] token_expired with empty storage → normalizing to unauthenticated"
			);
			// Prefer a clean unauthenticated state
			useAuthStore.setState({
				user: null,
				token: null,
				status: "unauthenticated",
				error: null,
				isLoading: false,
			});
		}
	}, [status]);

	// Load photos when component mounts
	useEffect(() => {
		if (user?.userId && token && stats.totalLoaded === 0) {
			console.log("🎯 [COMPONENT DEBUG] Calling loadPhotos from triage mount", {
				userId: user.userId,
				hasToken: !!token,
				hasSecret: !!token?.accessTokenSecret,
				totalLoaded: stats.totalLoaded,
			});
			loadPhotos(user.userId, token);
		} else {
			console.log("⏳ [COMPONENT DEBUG] loadPhotos not called", {
				hasUserId: !!user?.userId,
				hasToken: !!token,
				totalLoaded: stats.totalLoaded,
			});
		}
	}, [user?.userId, token, loadPhotos, stats.totalLoaded]);

	// Keyboard event handler
	const handleKeyPress = useCallback(
		(event) => {
			if (!currentPhoto) return;

			// Prevent if user is typing in an input
			if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
				return;
			}

			switch (event.key.toLowerCase()) {
				case "k":
				case "arrowleft":
					event.preventDefault();
					tagPhoto(currentPhoto.id, "keep");
					break;
				case "d":
				case "arrowright":
					event.preventDefault();
					tagPhoto(currentPhoto.id, "delete-pending");
					break;
				case "r":
					event.preventDefault();
					if (user?.userId) {
						loadPhotos(user.userId);
					}
					break;
				default:
					break;
			}
		},
		[currentPhoto, tagPhoto, loadPhotos, user?.userId]
	);

	// Set up keyboard event listeners
	useEffect(() => {
		document.addEventListener("keydown", handleKeyPress);
		return () => document.removeEventListener("keydown", handleKeyPress);
	}, [handleKeyPress]);

	// Handle image loading states
	const handleImageLoad = () => {
		setImageLoading(false);
		setImageError(false);
	};

	const handleImageError = () => {
		setImageLoading(false);
		setImageError(true);
	};

	// Start loading when image src changes
	useEffect(() => {
		if (currentPhoto?.url) {
			setImageLoading(true);
			setImageError(false);
		}
	}, [currentPhoto?.url]);

	// Authentication Guard - show loading while auth initializes, then check auth status
	// Only block when not authenticated; if authenticated, don't let generic isLoading stall the screen
	if (
		status !== "authenticated" &&
		(isLoading || (!authInitialized && status === "unauthenticated"))
	) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Checking authentication...</p>
				</div>
			</div>
		);
	}

	if (!user || !token || status !== "authenticated") {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center max-w-md">
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
						<h2 className="text-lg font-semibold text-yellow-800 mb-2">Authentication Required</h2>
						<p className="text-yellow-700 mb-4">
							You need to sign in with Flickr to access photo triage.
						</p>
						<div className="text-sm text-yellow-600 mb-4">
							Status: {status} | User: {user ? "✓" : "✗"} | Token: {token ? "✓" : "✗"}
						</div>
						<div className="space-x-2">
							<button
								onClick={() => (window.location.href = "/")}
								className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
							>
								Go to Home & Sign In
							</button>
							<button
								onClick={() => {
									console.log("🔄 [AUTH DEBUG] Manual initializeAuth triggered");
									// Force clear localStorage first
									localStorage.removeItem("flickr-scrub-auth");
									// Then reinitialize auth
									initializeAuth();
								}}
								className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
							>
								Retry Auth
							</button>
							<button
								onClick={() => {
									console.log("🔨 [AUTH DEBUG] Force reset to unauthenticated state");
									// Clear all storage
									localStorage.removeItem("flickr-scrub-auth");
									// Directly set auth store state
									const authStore = useAuthStore.getState();
									authStore.user = null;
									authStore.token = null;
									authStore.status = "unauthenticated";
									authStore.isLoading = false;
									authStore.error = null;
									// Force re-render
									window.location.reload();
								}}
								className="px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600"
							>
								Force Reset
							</button>
							<button
								onClick={async () => {
									console.log("🧹 [AUTH DEBUG] Clearing expired token and resetting auth state...");
									await logout(); // This clears localStorage and resets auth state
									window.location.href = "/";
								}}
								className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
							>
								Clear & Restart
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Handle action buttons
	const handleKeepPhoto = () => {
		if (currentPhoto) {
			tagPhoto(currentPhoto.id, "keep");
		}
	};

	const handleDeletePhoto = () => {
		if (currentPhoto) {
			tagPhoto(currentPhoto.id, "delete-pending");
		}
	};

	// Loading state
	if (isLoadingPhotos && stats.totalLoaded === 0) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading your photos...</p>
				</div>
			</div>
		);
	}

	// Error state
	if (loadingError) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center max-w-md">
					<div className="bg-red-50 border border-red-200 rounded-lg p-6">
						<h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Photos</h2>
						<p className="text-red-700 mb-4">{loadingError}</p>
						<div className="space-x-2">
							<button
								onClick={() => {
									clearError();
									if (user?.userId) loadPhotos(user.userId);
								}}
								className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
							>
								Try Again
							</button>
							<button
								onClick={() => (window.location.href = "/")}
								className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
							>
								Back to Home
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// No photos available state
	if (!currentPhoto && !isLoadingPhotos) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center max-w-md">
					<div className="bg-green-50 border border-green-200 rounded-lg p-6">
						<h2 className="text-lg font-semibold text-green-800 mb-2">All Photos Reviewed!</h2>
						<p className="text-green-700 mb-4">
							You've reviewed all {stats.totalLoaded} loaded photos.
						</p>
						<div className="text-sm text-green-600 mb-4">
							<p>✅ Kept: {stats.keepCount} photos</p>
							<p>🗑️ Tagged for deletion: {stats.deleteCount} photos</p>
						</div>
						<div className="space-x-2">
							{/* Debug Authentication Button */}
							<button
								onClick={() => {
									console.log("🔍 [AUTH DEBUG] Manual auth check triggered");
									console.log("🔍 [AUTH DEBUG] Current auth state:", useAuthStore.getState());
									console.log("🔍 [AUTH DEBUG] Calling initializeAuth...");
									useAuthStore.getState().initializeAuth();
								}}
								className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
							>
								Debug Auth
							</button>

							{stats.hasMorePhotos && (
								<button
									onClick={() => {
										console.log("🔘 [BUTTON DEBUG] Load More Photos clicked", {
											hasUserId: !!user?.userId,
											hasToken: !!token,
											userId: user?.userId,
											tokenType: typeof token,
											isLoadingPhotos,
										});
										if (user?.userId && token) {
											console.log("🚀 [BUTTON DEBUG] Calling loadMorePhotos...");
											loadMorePhotos(user.userId, token);
										} else {
											console.log("❌ [BUTTON DEBUG] Missing userId or token");
										}
									}}
									className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
									disabled={isLoadingPhotos}
								>
									{isLoadingPhotos ? "Loading..." : "Load More Photos"}
								</button>
							)}
							<button
								onClick={() => (window.location.href = "/delete-queue")}
								className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
							>
								Review Delete Queue ({stats.deleteCount})
							</button>
							<button
								onClick={resetAllTags}
								className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
							>
								Start Over
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header with progress */}
			<div className="bg-white shadow-sm border-b">
				<div className="max-w-6xl mx-auto px-4 py-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4">
							<h1 className="text-xl font-semibold text-gray-900">Photo Triage</h1>
							<span className="text-sm text-gray-500">Welcome, {user?.username}</span>
						</div>

						<div className="flex items-center space-x-6">
							{/* Progress stats */}
							<div className="flex items-center space-x-4 text-sm">
								<span className="text-green-600">✅ Keep: {stats.keepCount}</span>
								<span className="text-red-600">🗑️ Delete: {stats.deleteCount}</span>
								<span className="text-gray-600">📋 Remaining: {stats.untaggedCount}</span>
								{stats.hasMorePhotos && <span className="text-blue-600">+ more available</span>}
							</div>

							{/* Navigation buttons */}
							<div className="flex items-center space-x-2">
								{stats.deleteCount > 0 && (
									<button
										onClick={() => (window.location.href = "/delete-queue")}
										className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
									>
										Delete Queue ({stats.deleteCount})
									</button>
								)}
								<button
									onClick={() => (window.location.href = "/")}
									className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
								>
									Back to Home
								</button>
							</div>
						</div>
					</div>

					{/* Progress bar */}
					{stats.totalPhotos > 0 && (
						<div className="mt-2">
							<div className="w-full bg-gray-200 rounded-full h-2">
								<div
									className="bg-blue-600 h-2 rounded-full transition-all duration-300"
									style={{ width: `${stats.progressPercent}%` }}
								/>
							</div>
							<p className="text-xs text-gray-500 mt-1">
								{stats.progressPercent}% complete ({stats.keepCount + stats.deleteCount} of{" "}
								{stats.totalPhotos} photos reviewed)
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Main photo area */}
			<div className="max-w-6xl mx-auto px-4 py-8">
				<div className="text-center">
					{/* Photo display */}
					<div className="mb-8">
						{/* Fixed container to prevent layout shift */}
						<div className="relative max-w-full min-h-[480px] flex items-center justify-center">
							{imageLoading && (
								<div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
								</div>
							)}

							{imageError ? (
								<div className="w-full max-w-2xl h-80 bg-gray-100 rounded-lg flex items-center justify-center">
									<div className="text-center">
										<p className="text-gray-500 mb-2">Failed to load image</p>
										<p className="text-sm text-gray-400">{currentPhoto?.title}</p>
									</div>
								</div>
							) : (
								<img
									src={currentPhoto?.url}
									alt={currentPhoto?.title || "Photo"}
									className="max-w-full max-h-[480px] rounded-lg shadow-lg"
									onLoad={handleImageLoad}
									onError={handleImageError}
									style={{ display: imageLoading ? "none" : "block" }}
								/>
							)}
						</div>

						{/* Photo metadata */}
						{currentPhoto && (
							<div className="mt-4 text-sm text-gray-600">
								<p className="font-medium">{currentPhoto.title}</p>
								{currentPhoto.dateUploaded && (
									<p>Uploaded: {new Date(currentPhoto.dateUploaded).toLocaleDateString()}</p>
								)}
								{currentPhoto.tags.length > 0 && <p>Tags: {currentPhoto.tags.join(", ")}</p>}
							</div>
						)}
					</div>

					{/* Action buttons */}
					<div className="flex items-center justify-center space-x-6">
						<button
							onClick={handleKeepPhoto}
							className="px-8 py-4 bg-green-600 text-white text-lg font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
							disabled={!currentPhoto}
						>
							✅ Keep
							<span className="block text-sm opacity-75">Press K or ←</span>
						</button>

						<button
							onClick={handleDeletePhoto}
							className="px-8 py-4 bg-red-600 text-white text-lg font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
							disabled={!currentPhoto}
						>
							🗑️ Delete
							<span className="block text-sm opacity-75">Press D or →</span>
						</button>
					</div>

					{/* Keyboard shortcuts help */}
					<div className="mt-8 text-sm text-gray-500">
						<p>
							Keyboard shortcuts: <kbd className="px-2 py-1 bg-gray-200 rounded">K</kbd> or{" "}
							<kbd className="px-2 py-1 bg-gray-200 rounded">←</kbd> to keep,{" "}
							<kbd className="px-2 py-1 bg-gray-200 rounded">D</kbd> or{" "}
							<kbd className="px-2 py-1 bg-gray-200 rounded">→</kbd> to delete,{" "}
							<kbd className="px-2 py-1 bg-gray-200 rounded">R</kbd> to refresh
						</p>
					</div>

					{/* Load more prompt */}
					{stats.untaggedCount < 5 && stats.hasMorePhotos && !isLoadingPhotos && (
						<div className="mt-6">
							<button
								onClick={() => user?.userId && token && loadMorePhotos(user.userId, token)}
								className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
							>
								Load More Photos
							</button>
						</div>
					)}

					{/* Loading more indicator */}
					{isLoadingPhotos && stats.totalLoaded > 0 && (
						<div className="mt-6 text-gray-600">
							<div className="inline-flex items-center">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
								Loading more photos...
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
