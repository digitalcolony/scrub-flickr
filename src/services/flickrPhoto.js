import { flickrApiClient } from "./flickrApiClient.js";
import { rateLimiter } from "./rateLimiter.js";

/**
 * FlickrPhotoService handles fetching and managing photos from Flickr API
 * Provides photo data for the triage functionality
 */
export class FlickrPhotoService {
	constructor() {
		this.apiClient = flickrApiClient;
		this.baseUrl = "https://www.flickr.com/services/rest/";

		if (!this.apiClient.apiKey) {
			console.warn("FlickrPhotoService: API key not configured - using mock data");
		}
	}

	/**
	 * Fetch user's photos from Flickr
	 * @param {Object} options - Fetch options
	 * @param {string} options.userId - Flickr user ID
	 * @param {string} options.accessToken - OAuth access token
	 * @param {string} options.accessTokenSecret - OAuth access token secret
	 * @param {number} options.page - Page number (default: 1)
	 * @param {number} options.perPage - Photos per page (default: 50)
	 * @param {string} options.sort - Sort order (default: 'date-posted-desc')
	 * @returns {Promise<Object>} Photos response with photos array and pagination info
	 */
	async getUserPhotos(options = {}) {
		try {
			const {
				userId,
				accessToken,
				accessTokenSecret,
				page = 1,
				perPage = 50,
				sort = "date-posted-desc",
			} = options;

			console.log("🔍 [PHOTO DEBUG] getUserPhotos called with:", {
				userId,
				hasAccessToken: !!accessToken,
				hasAccessTokenSecret: !!accessTokenSecret,
				accessTokenType: typeof accessToken,
				accessTokenPrefix: accessToken?.substring(0, 10) + "...",
				page,
				perPage,
				isDev: import.meta.env.DEV,
			});

			// DEV MODE: Return mock photos for testing
			if (import.meta.env.DEV && (!accessToken || accessToken.startsWith("mock_"))) {
				console.log("🔄 [PHOTO DEBUG] Using mock photos (dev mode)");
				return this.generateMockPhotos({ page, perPage });
			}

			// Validate required parameters
			if (!userId || !accessToken || !accessTokenSecret) {
				throw new Error("Missing required parameters: userId, accessToken, or accessTokenSecret");
			}

			// PRODUCTION: Make actual Flickr API call with rate limiting
			const apiParams = {
				user_id: userId,
				page: page.toString(),
				per_page: perPage.toString(),
				extras: "date_taken,date_upload,url_m,url_z,url_l,url_o,tags,machine_tags,views,media",
				sort: sort,
			};

			const response = await rateLimiter.makeRequest(async () => {
				return await this.apiClient.makeAuthenticatedRequest(
					"flickr.people.getPhotos",
					apiParams,
					accessToken,
					accessTokenSecret
				);
			});

			if (!response.photos) {
				throw new Error("Invalid API response structure");
			}

			return this.normalizePhotosResponse(response.photos);
		} catch (error) {
			console.error("FlickrPhotoService: Error fetching photos:", error);
			throw new Error(`Failed to fetch photos: ${error.message}`);
		}
	}

	/**
	 * Generate mock photos for development/testing
	 * @param {Object} options - Mock options
	 * @param {number} options.page - Current page
	 * @param {number} options.perPage - Photos per page
	 * @returns {Object} Mock photos response
	 * @private
	 */
	generateMockPhotos({ page, perPage }) {
		const totalPhotos = 247; // Simulate realistic photo count
		const totalPages = Math.ceil(totalPhotos / perPage);
		const startIndex = (page - 1) * perPage;

		const photos = [];
		for (let i = 0; i < perPage && startIndex + i < totalPhotos; i++) {
			const photoIndex = startIndex + i + 1;
			const photoId = `mock_photo_${photoIndex.toString().padStart(3, "0")}`;

			photos.push({
				id: photoId,
				title: `Photo ${photoIndex}`,
				url: `https://picsum.photos/800/600?random=${photoIndex}`,
				thumbnailUrl: `https://picsum.photos/300/200?random=${photoIndex}`,
				dateUploaded: Date.now() - photoIndex * 24 * 60 * 60 * 1000, // Spread over days
				dateTaken: Date.now() - photoIndex * 24 * 60 * 60 * 1000,
				tags:
					photoIndex % 3 === 0 ? ["nature", "landscape"] : photoIndex % 2 === 0 ? ["portrait"] : [],
				status: "untagged", // Default status for new photos
			});
		}

		return {
			photos,
			pagination: {
				page,
				pages: totalPages,
				perPage,
				total: totalPhotos,
			},
		};
	}

	/**
	 * Normalize Flickr API response to consistent format
	 * @param {Object} flickrPhotos - Raw Flickr photos response
	 * @returns {Object} Normalized photos response
	 * @private
	 */
	normalizePhotosResponse(flickrPhotos) {
		const photos = flickrPhotos.photo.map((photo) => ({
			id: photo.id,
			title: photo.title || `Untitled Photo ${photo.id}`,
			url:
				photo.url_o ||
				photo.url_l ||
				photo.url_z ||
				photo.url_m ||
				`https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`,
			thumbnailUrl:
				photo.url_m ||
				`https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_m.jpg`,
			dateUploaded: parseInt(photo.dateupload) * 1000, // Convert to milliseconds
			dateTaken: photo.datetaken ? new Date(photo.datetaken).getTime() : null,
			tags: photo.tags ? photo.tags.split(" ").filter(Boolean) : [],
			machineTags: photo.machine_tags ? photo.machine_tags.split(" ").filter(Boolean) : [],
			views: parseInt(photo.views) || 0,
			media: photo.media || "photo",
			status: "untagged", // Default status for new photos
			// Store original photo data for deletion
			_flickrData: {
				server: photo.server,
				secret: photo.secret,
				farm: photo.farm,
			},
		}));

		return {
			photos,
			pagination: {
				page: parseInt(flickrPhotos.page),
				pages: parseInt(flickrPhotos.pages),
				perPage: parseInt(flickrPhotos.perpage),
				total: parseInt(flickrPhotos.total),
			},
		};
	}

	/**
	 * Get next batch of untagged photos
	 * @param {Array} allPhotos - All loaded photos
	 * @param {Object} taggedPhotos - Object with tagged photo IDs as keys
	 * @param {number} batchSize - Number of photos to return
	 * @returns {Array} Array of untagged photos
	 */
	getUntaggedPhotos(allPhotos, taggedPhotos, batchSize = 10) {
		return allPhotos.filter((photo) => !taggedPhotos[photo.id]).slice(0, batchSize);
	}

	/**
	 * Delete a photo from Flickr
	 * @param {string} photoId - Photo ID to delete
	 * @param {string} accessToken - OAuth access token
	 * @param {string} accessTokenSecret - OAuth access token secret
	 * @returns {Promise<boolean>} Success status
	 */
	async deletePhoto(photoId, accessToken, accessTokenSecret) {
		try {
			// DEV MODE: Simulate deletion
			if (import.meta.env.DEV && (!accessToken || accessToken.startsWith("mock_"))) {
				console.log(`🗑️ [MOCK] Deleting photo ${photoId}`);
				// Simulate API delay
				await new Promise((resolve) => setTimeout(resolve, 500));
				return Math.random() > 0.1; // 90% success rate for testing
			}

			// Validate required parameters
			if (!photoId || !accessToken || !accessTokenSecret) {
				throw new Error("Missing required parameters: photoId, accessToken, or accessTokenSecret");
			}

			// PRODUCTION: Make actual deletion API call with rate limiting
			const response = await rateLimiter.makeRequest(async () => {
				return await this.apiClient.makeAuthenticatedRequest(
					"flickr.photos.delete",
					{ photo_id: photoId },
					accessToken,
					accessTokenSecret
				);
			});

			// Flickr returns success status in response
			return response.stat === "ok";
		} catch (error) {
			console.error(`FlickrPhotoService: Error deleting photo ${photoId}:`, error);
			throw error;
		}
	}
}

// Export singleton instance
export const flickrPhotoService = new FlickrPhotoService();
