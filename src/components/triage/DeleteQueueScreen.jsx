import { usePhotoTriageStore } from "../../stores/photoTriageStore.js";
import { useAuthStore } from "../../stores/authStore.js";
import { useEffect, useState } from "react";

/**
 * DeleteQueueScreen - Shows photos tagged for deletion
 * This is a placeholder implementation that will be expanded later
 */
export function DeleteQueueScreen() {
	const {
		getPhotosToDelete,
		getDeletedPhotoCount,
		untagPhoto,
		loadPhotos,
		loadMorePhotos,
		deletePhoto,
		photos,
		isLoadingPhotos,
		hasMorePhotos,
	} = usePhotoTriageStore();
	const { user, token } = useAuthStore();

	const [isDeleting, setIsDeleting] = useState(false);
	const [deletingIds, setDeletingIds] = useState(new Set());
	const [deletionProgress, setDeletionProgress] = useState({ current: 0, total: 0 });
	const [attemptedReload, setAttemptedReload] = useState(false);
	const [didStartDeletion, setDidStartDeletion] = useState(false);
	const [didAutoRedirect, setDidAutoRedirect] = useState(false);

	const photosToDelete = getPhotosToDelete();
	const deletedPhotoCount = getDeletedPhotoCount();

	// Only treat as "loading" when we actually have pending tags to resolve
	const isQueueLoading = isLoadingPhotos && deletedPhotoCount > 0;
	const isEmptyQueue = photosToDelete.length === 0;

	// Ensure we have photo details for tagged items
	useEffect(() => {
		if (!user || !token || isLoadingPhotos) return;

		// If there are pending tags but no matching photo objects, fetch details
		if (deletedPhotoCount > 0 && photosToDelete.length === 0) {
			// If no photos loaded at all, start from page 1
			if (photos.length === 0) {
				loadPhotos(user.userId, token);
				return;
			}

			// If more pages are available, load next page to try to find tagged items
			if (hasMorePhotos) {
				loadMorePhotos(user.userId, token);
				return;
			}

			// If we've exhausted pages and still have tagged IDs without details, attempt one reload
			if (!hasMorePhotos && !attemptedReload) {
				setAttemptedReload(true);
				loadPhotos(user.userId, token);
			}
		}
	}, [
		user,
		token,
		isLoadingPhotos,
		deletedPhotoCount,
		photosToDelete.length,
		photos.length,
		hasMorePhotos,
		loadPhotos,
		loadMorePhotos,
		attemptedReload,
	]);

	const handleRemoveFromQueue = (photoId) => {
		untagPhoto(photoId);
	};

	const handleDeleteOne = async (photoId) => {
		if (!user || !token) return;
		setDidStartDeletion(true);
		setDeletingIds((prev) => new Set(prev).add(photoId));
		try {
			await deletePhoto(photoId, token);
		} catch (error) {
			console.error(`Failed to delete photo ${photoId}:`, error);
		} finally {
			setDeletingIds((prev) => {
				const next = new Set(prev);
				next.delete(photoId);
				return next;
			});
		}
	};

	const handleDeleteAll = async () => {
		if (!user || !token || photosToDelete.length === 0) return;

		setIsDeleting(true);
		setDidStartDeletion(true);
		setDeletionProgress({ current: 0, total: photosToDelete.length });

		for (let i = 0; i < photosToDelete.length; i++) {
			const photo = photosToDelete[i];
			setDeletionProgress({ current: i, total: photosToDelete.length });

			try {
				await deletePhoto(photo.id, token);
			} catch (error) {
				console.error(`Failed to delete photo ${photo.id}:`, error);
			}

			// Small delay to prevent overwhelming the API
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		setDeletionProgress({ current: photosToDelete.length, total: photosToDelete.length });
		setIsDeleting(false);
	};

	// After a deletion session, auto-redirect to triage when the queue is empty
	useEffect(() => {
		if (
			didStartDeletion &&
			!didAutoRedirect &&
			!isDeleting &&
			photosToDelete.length === 0 &&
			deletedPhotoCount === 0
		) {
			setDidAutoRedirect(true);
			// Use hard navigation for simplicity/consistency with existing buttons
			window.location.href = "/triage";
		}
	}, [didStartDeletion, didAutoRedirect, isDeleting, photosToDelete.length, deletedPhotoCount]);

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white shadow-sm border-b">
				<div className="max-w-6xl mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<h1 className="text-2xl font-bold text-gray-900">Delete Queue</h1>
						<div className="flex items-center space-x-4">
							<span className="text-sm text-gray-600">
								{isEmptyQueue
									? `${photosToDelete.length} photos tagged for deletion`
									: isDeleting
									? `Deleting ${deletionProgress.current}/${deletionProgress.total}...`
									: isQueueLoading
									? "Loading..."
									: `${photosToDelete.length} photos tagged for deletion`}
							</span>
							{photosToDelete.length > 0 && !isDeleting && (
								<button
									onClick={handleDeleteAll}
									className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
								>
									Delete All ({photosToDelete.length})
								</button>
							)}
							<button
								onClick={() => (window.location.href = "/triage")}
								className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
							>
								Back to Triage
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="max-w-6xl mx-auto px-4 py-8">
				{/* Prefer empty-queue view over any loading when there are no visible items */}
				{isEmptyQueue ? (
					<div className="text-center py-12">
						<div className="bg-gray-100 rounded-lg p-8">
							<h2 className="text-xl font-semibold text-gray-700 mb-2">
								No Photos in Delete Queue
							</h2>
							<p className="text-gray-600 mb-4">Photos you tag for deletion will appear here.</p>
							<button
								onClick={() => (window.location.href = "/triage")}
								className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
							>
								Start Triaging Photos
							</button>
						</div>
					</div>
				) : (
					<div>
						{/* Stats */}
						<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
							<h3 className="font-semibold text-blue-800 mb-2">Manage Delete Queue</h3>
							<p className="text-blue-700 text-sm">
								Select individual photos to delete immediately, or use "Delete All" to process the
								entire queue.
							</p>
						</div>

						{/* Photo grid */}
						<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
							{photosToDelete.map((photo) => (
								<div key={photo.id} className="relative group">
									<img
										src={photo.thumbnailUrl}
										alt={photo.title}
										className="w-full h-32 object-cover rounded-lg shadow"
									/>
									<div className="absolute inset-0 bg-red-500 bg-opacity-20 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
										<div className="flex space-x-2">
											<button
												onClick={() => handleRemoveFromQueue(photo.id)}
												className="px-2 py-1 bg-white text-red-600 text-xs rounded hover:bg-gray-100"
											>
												Remove
											</button>
											<button
												onClick={() => handleDeleteOne(photo.id)}
												disabled={deletingIds.has(photo.id) || isDeleting}
												className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
											>
												{deletingIds.has(photo.id) ? "Deleting…" : "Delete Now"}
											</button>
										</div>
									</div>
									<div className="absolute top-2 right-2">
										<span className="inline-block px-2 py-1 bg-red-600 text-white text-xs rounded">
											DELETE
										</span>
									</div>
								</div>
							))}
						</div>

						{/* Actions */}
						<div className="mt-8 text-center">
							<div className="bg-white rounded-lg shadow p-6">
								<h3 className="text-lg font-semibold text-gray-900 mb-2">
									Ready to Delete {photosToDelete.length} Photos?
								</h3>
								<p className="text-gray-600 mb-4">
									This will permanently delete the selected photos.
								</p>
								<div className="space-x-4">
									<button
										onClick={handleDeleteAll}
										disabled={isDeleting || photosToDelete.length === 0 || !user || !token}
										className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
									>
										{isDeleting
											? `Deleting ${deletionProgress.current}/${deletionProgress.total}…`
											: `Delete All (${photosToDelete.length})`}
									</button>
									<button
										onClick={() => (window.location.href = "/triage")}
										className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
									>
										Continue Triaging
									</button>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
