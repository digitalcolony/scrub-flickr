import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { flickrPhotoService } from "../services/flickrPhoto.js";

/**
 * Photo Triage Store - Manages photo loading, tagging, and triage workflow
 * Uses Zustand with localStorage persistence for tag decisions
 */
export const usePhotoTriageStore = create(
	persist(
		(set, get) => ({
			// Photo data
			photos: [],
			currentPhotoIndex: 0,
			totalPhotos: 0,
			hasMorePhotos: true,
			isLoadingPhotos: false,
			loadingError: null,

			// Tagging data (persisted)
			photoTags: {}, // { photoId: 'keep' | 'delete-pending' | 'delete-completed' | 'delete-failed' }
			deleteErrors: {}, // { photoId: { error: string, attempts: number } }

			// UI state
			currentPage: 1,
			photosPerPage: 50,

			// Filter/Sort state (persisted)
			filters: {
				query: "", // text in title
				hasTags: false,
				sortBy: "dateUploaded", // dateUploaded | title | views
				sortOrder: "desc", // asc | desc
			},

			/**
			 * Load initial batch of photos
			 * @param {string} userId - Flickr user ID
			 * @param {Object} token - Authentication token with accessToken and accessTokenSecret
			 */
			async loadPhotos(userId, token = null) {
				const state = get();
				if (state.isLoadingPhotos) return;

				console.log("📸 [STORE DEBUG] loadPhotos called with:", {
					userId,
					token: token
						? {
								hasAccessToken: !!token.accessToken,
								hasAccessTokenSecret: !!token.accessTokenSecret,
								accessTokenType: typeof token.accessToken,
								accessTokenPrefix: token.accessToken?.substring(0, 10) + "...",
						  }
						: null,
				});

				set({ isLoadingPhotos: true, loadingError: null });

				try {
					const response = await flickrPhotoService.getUserPhotos({
						userId,
						accessToken: token?.accessToken,
						accessTokenSecret: token?.accessTokenSecret,
						page: 1,
						perPage: state.photosPerPage,
					});

					const untaggedPhotos = response.photos.filter((photo) => !state.photoTags[photo.id]);

					set({
						photos: response.photos,
						totalPhotos: response.pagination.total,
						hasMorePhotos: response.pagination.page < response.pagination.pages,
						currentPhotoIndex: 0,
						isLoadingPhotos: false,
						currentPage: 1,
					});

					// If all photos are tagged, load more
					if (untaggedPhotos.length === 0 && response.pagination.page < response.pagination.pages) {
						get().loadMorePhotos(userId, token);
					}
				} catch (error) {
					console.error("Error loading photos:", error);
					set({
						isLoadingPhotos: false,
						loadingError: error.message,
					});
				}
			},

			/**
			 * Load more photos from next page
			 * @param {string} userId - Flickr user ID
			 * @param {Object} token - Authentication token with accessToken and accessTokenSecret
			 */
			async loadMorePhotos(userId, token = null) {
				const state = get();

				console.log("📚 [STORE DEBUG] loadMorePhotos called with:", {
					userId,
					isLoadingPhotos: state.isLoadingPhotos,
					hasMorePhotos: state.hasMorePhotos,
					currentPage: state.currentPage,
					totalPhotos: state.totalPhotos,
					loadedPhotos: state.photos.length,
					token: token
						? {
								hasAccessToken: !!token.accessToken,
								hasAccessTokenSecret: !!token.accessTokenSecret,
								accessTokenType: typeof token.accessToken,
								accessTokenPrefix: token.accessToken?.substring(0, 10) + "...",
						  }
						: null,
				});

				if (state.isLoadingPhotos || !state.hasMorePhotos) {
					console.log("⏹️ [STORE DEBUG] loadMorePhotos aborted:", {
						isLoadingPhotos: state.isLoadingPhotos,
						hasMorePhotos: state.hasMorePhotos,
					});
					return;
				}

				set({ isLoadingPhotos: true });

				try {
					const response = await flickrPhotoService.getUserPhotos({
						userId,
						accessToken: token?.accessToken,
						accessTokenSecret: token?.accessTokenSecret,
						page: state.currentPage + 1,
						perPage: state.photosPerPage,
					});

					const allPhotos = [...state.photos, ...response.photos];

					set({
						photos: allPhotos,
						hasMorePhotos: response.pagination.page < response.pagination.pages,
						currentPage: response.pagination.page,
						isLoadingPhotos: false,
					});
				} catch (error) {
					console.error("Error loading more photos:", error);
					set({
						isLoadingPhotos: false,
						loadingError: error.message,
					});
				}
			},

			/**
			 * Get current photo for triage
			 * @returns {Object|null} Current photo or null if none available
			 */
			getCurrentPhoto() {
				const state = get();
				// If filters are active, prefer filtered untagged list
				const filtered = get().getFilteredUntaggedPhotos();
				const untaggedPhotos =
					filtered.length > 0
						? filtered
						: state.photos.filter((photo) => !state.photoTags[photo.id]);

				if (untaggedPhotos.length === 0) {
					return null;
				}

				return untaggedPhotos[0];
			},

			/**
			 * Tag a photo with keep/delete decision
			 * @param {string} photoId - Photo ID
			 * @param {string} tag - Tag value ('keep' | 'delete-pending')
			 */
			tagPhoto(photoId, tag) {
				const state = get();

				set({
					photoTags: {
						...state.photoTags,
						[photoId]: tag,
					},
				});

				// If we're running low on untagged photos, try to load more
				const untaggedCount = state.photos.filter(
					(photo) => !state.photoTags[photo.id] && photo.id !== photoId
				).length;

				if (untaggedCount < 5 && state.hasMorePhotos && !state.isLoadingPhotos) {
					// We'll need the userId here - for now just log
					console.log("Running low on photos, need to load more");
				}
			},

			/**
			 * Move to next photo (keyboard navigation)
			 */
			nextPhoto() {
				const state = get();
				const untaggedPhotos = state.photos.filter((photo) => !state.photoTags[photo.id]);

				if (state.currentPhotoIndex < untaggedPhotos.length - 1) {
					set({ currentPhotoIndex: state.currentPhotoIndex + 1 });
				}
			},

			/**
			 * Move to previous photo (keyboard navigation)
			 */
			previousPhoto() {
				const state = get();
				if (state.currentPhotoIndex > 0) {
					set({ currentPhotoIndex: state.currentPhotoIndex - 1 });
				}
			},

			/**
			 * Get photos tagged for deletion
			 * @returns {Array} Photos with delete-pending status
			 */
			getPhotosToDelete() {
				const state = get();
				return state.photos.filter((photo) => state.photoTags[photo.id] === "delete-pending");
			},

			/**
			 * Get count of photos tagged for deletion (works without loaded photos)
			 * @returns {number} Count of photos tagged for deletion
			 */
			getDeletedPhotoCount() {
				const state = get();
				return Object.values(state.photoTags).filter((tag) => tag === "delete-pending").length;
			},

			/**
			 * Get photos tagged to keep
			 * @returns {Array} Photos with keep status
			 */
			getPhotosToKeep() {
				const state = get();
				return state.photos.filter((photo) => state.photoTags[photo.id] === "keep");
			},

			/**
			 * Update filters
			 * @param {Object} next - Partial filters
			 */
			setFilters(next) {
				const state = get();
				set({ filters: { ...state.filters, ...next } });
			},

			/**
			 * Get untagged photos after applying filters and sorting
			 * @returns {Array} filtered and sorted untagged photos
			 */
			getFilteredUntaggedPhotos() {
				const { photos, photoTags, filters } = get();
				let list = photos.filter((p) => !photoTags[p.id]);

				// Apply text query on title
				if (filters.query && filters.query.trim().length > 0) {
					const q = filters.query.trim().toLowerCase();
					list = list.filter((p) => (p.title || "").toLowerCase().includes(q));
				}

				// Has any tags
				if (filters.hasTags) {
					list = list.filter((p) => Array.isArray(p.tags) && p.tags.length > 0);
				}

				// Sorting
				const dir = filters.sortOrder === "asc" ? 1 : -1;
				list = [...list].sort((a, b) => {
					switch (filters.sortBy) {
						case "title":
							return (a.title || "").localeCompare(b.title || "") * dir;
						case "views":
							return ((a.views || 0) - (b.views || 0)) * dir;
						case "dateUploaded":
						default:
							return ((a.dateUploaded || 0) - (b.dateUploaded || 0)) * dir;
					}
				});

				return list;
			},

			/**
			 * Get triage statistics
			 * @returns {Object} Statistics about photo triage progress
			 */
			getTriageStats() {
				const state = get();
				const totalLoaded = state.photos.length;
				const tags = Object.values(state.photoTags);
				const keepCount = tags.filter((tag) => tag === "keep").length;
				const deletePendingCount = tags.filter((tag) => tag === "delete-pending").length;
				const deleteCompletedCount = tags.filter((tag) => tag === "delete-completed").length;
				const deleteFailedCount = tags.filter((tag) => tag === "delete-failed").length;
				const reviewedCount =
					keepCount + deletePendingCount + deleteCompletedCount + deleteFailedCount;
				const untaggedCount = totalLoaded - reviewedCount;

				return {
					totalLoaded,
					totalPhotos: state.totalPhotos,
					keepCount,
					// For UI queue badges, use pending deletions only
					deleteCount: deletePendingCount,
					deletePendingCount,
					deleteCompletedCount,
					deleteFailedCount,
					deleteTotalCount: deletePendingCount + deleteCompletedCount + deleteFailedCount,
					untaggedCount,
					hasMorePhotos: state.hasMorePhotos,
					progressPercent:
						state.totalPhotos > 0 ? Math.round((reviewedCount / state.totalPhotos) * 100) : 0,
				};
			},

			/**
			 * Actually delete a photo from Flickr
			 * @param {string} photoId - Photo ID to delete
			 * @param {Object} token - Authentication token with accessToken and accessTokenSecret
			 * @returns {Promise<boolean>} Success status
			 */
			async deletePhoto(photoId, token) {
				try {
					const success = await flickrPhotoService.deletePhoto(
						photoId,
						token.accessToken,
						token.accessTokenSecret
					);

					if (success) {
						get().updatePhotoStatus(photoId, "delete-completed");
						return true;
					} else {
						get().updatePhotoStatus(photoId, "delete-failed", {
							error: "Deletion failed",
							attempts: (get().deleteErrors[photoId]?.attempts || 0) + 1,
						});
						return false;
					}
				} catch (error) {
					console.error(`Error deleting photo ${photoId}:`, error);
					get().updatePhotoStatus(photoId, "delete-failed", {
						error: error.message,
						attempts: (get().deleteErrors[photoId]?.attempts || 0) + 1,
					});
					return false;
				}
			},

			/**
			 * Update photo tag status (for deletion flow)
			 * @param {string} photoId - Photo ID
			 * @param {string} status - New status
			 * @param {Object} errorInfo - Error information if status is failed
			 */
			updatePhotoStatus(photoId, status, errorInfo = null) {
				const state = get();

				const newTags = { ...state.photoTags, [photoId]: status };
				const newErrors = { ...state.deleteErrors };

				if (status === "delete-failed" && errorInfo) {
					newErrors[photoId] = errorInfo;
				} else if (status !== "delete-failed") {
					delete newErrors[photoId];
				}

				set({
					photoTags: newTags,
					deleteErrors: newErrors,
				});
			},

			/**
			 * Untag a photo (remove from delete queue)
			 * @param {string} photoId - Photo ID to untag
			 */
			untagPhoto(photoId) {
				const state = get();
				const newTags = { ...state.photoTags };
				const newErrors = { ...state.deleteErrors };

				delete newTags[photoId];
				delete newErrors[photoId];

				set({
					photoTags: newTags,
					deleteErrors: newErrors,
				});
			},

			/**
			 * Reset all photo tags (start fresh)
			 */
			resetAllTags() {
				set({
					photoTags: {},
					deleteErrors: {},
					currentPhotoIndex: 0,
				});
			},

			/**
			 * Clear loading error
			 */
			clearError() {
				set({ loadingError: null });
			},
		}),
		{
			name: "photo-triage-storage",
			storage: createJSONStorage(() => localStorage),
			// Persist tagging decisions and filters, not the photo data
			partialize: (state) => ({
				photoTags: state.photoTags,
				deleteErrors: state.deleteErrors,
				filters: state.filters,
			}),
		}
	)
);
