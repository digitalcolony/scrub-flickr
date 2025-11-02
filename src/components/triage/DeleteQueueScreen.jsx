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
		deletePhoto,
		photos,
		isLoadingPhotos,
	} = usePhotoTriageStore();
	const { user, token } = useAuthStore();

	const [isDeleting, setIsDeleting] = useState(false);
	const [deletionProgress, setDeletionProgress] = useState({ current: 0, total: 0 });

	const photosToDelete = getPhotosToDelete();
	const deletedPhotoCount = getDeletedPhotoCount();

	// Load photos if we have tags but no photos loaded
	useEffect(() => {
		if (user && token && deletedPhotoCount > 0 && photos.length === 0 && !isLoadingPhotos) {
			loadPhotos(user.userId, token);
		}
	}, [user, token, deletedPhotoCount, photos.length, isLoadingPhotos, loadPhotos]);

	const handleRemoveFromQueue = (photoId) => {
		untagPhoto(photoId);
	};

	const handleDeleteAll = async () => {
		if (!user || !token || photosToDelete.length === 0) return;

		setIsDeleting(true);
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
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		setDeletionProgress({ current: photosToDelete.length, total: photosToDelete.length });
		setIsDeleting(false);
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white shadow-sm border-b">
				<div className="max-w-6xl mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<h1 className="text-2xl font-bold text-gray-900">Delete Queue</h1>
						<div className="flex items-center space-x-4">
							<span className="text-sm text-gray-600">
								{isLoadingPhotos
									? "Loading..."
									: isDeleting
									? `Deleting ${deletionProgress.current}/${deletionProgress.total}...`
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
				{isLoadingPhotos ? (
					<div className="text-center py-12">
						<div className="bg-white rounded-lg shadow p-8">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
							<p className="text-gray-600">Loading photos...</p>
						</div>
					</div>
				) : photosToDelete.length === 0 && deletedPhotoCount === 0 ? (
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
				) : photosToDelete.length === 0 && deletedPhotoCount > 0 ? (
					<div className="text-center py-12">
						<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
							<h2 className="text-xl font-semibold text-yellow-800 mb-2">Loading Tagged Photos</h2>
							<p className="text-yellow-700 mb-4">
								Found {deletedPhotoCount} photos tagged for deletion. Loading photo details...
							</p>
							<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mx-auto"></div>
						</div>
					</div>
				) : (
					<div>
						{/* Stats */}
						<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
							<h3 className="font-semibold text-yellow-800 mb-2">⚠️ Coming Soon: Bulk Deletion</h3>
							<p className="text-yellow-700 text-sm">
								The ability to delete photos from Flickr will be implemented in the next phase. For
								now, you can review and manage your delete queue.
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
										<button
											onClick={() => handleRemoveFromQueue(photo.id)}
											className="px-2 py-1 bg-white text-red-600 text-xs rounded hover:bg-gray-100"
										>
											Remove
										</button>
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
									This feature will be available in the next update. You can review your selections
									above.
								</p>
								<div className="space-x-4">
									<button
										disabled
										className="px-6 py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed"
									>
										Delete All (Coming Soon)
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
