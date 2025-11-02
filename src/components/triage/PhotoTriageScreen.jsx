import { useEffect, useCallback, useState } from "react";
import { usePhotoTriageStore } from "../../stores/photoTriageStore.js";
import { useAuthStore } from "../../stores/authStore.js";

/**
 * PhotoTriageScreen - Main screen for photo keep/delete decisions
 * Features keyboard shortcuts, progress tracking, and responsive design
 */
export function PhotoTriageScreen() {
	const { user, token } = useAuthStore();
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

	const currentPhoto = getCurrentPhoto();
	const stats = getTriageStats();

	// Load photos when component mounts
	useEffect(() => {
		if (user?.userId && token && stats.totalLoaded === 0) {
			loadPhotos(user.userId, token);
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
							{stats.hasMorePhotos && (
								<button
									onClick={() => user?.userId && token && loadMorePhotos(user.userId, token)}
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
