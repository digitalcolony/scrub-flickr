/**
 * RateLimiter service for Flickr API requests
 * Handles the 3600 requests/hour limit with proper tracking and queuing
 */
export class RateLimiter {
	constructor() {
		this.requests = [];
		this.maxRequestsPerHour = 3600;
		this.storageKey = 'flickr_api_rate_limit';
		
		// Load existing request history from localStorage
		this.loadRequestHistory();
	}

	/**
	 * Load request history from localStorage
	 */
	loadRequestHistory() {
		try {
			const stored = localStorage.getItem(this.storageKey);
			if (stored) {
				const data = JSON.parse(stored);
				// Filter to only include requests from the last hour
				const oneHourAgo = Date.now() - (60 * 60 * 1000);
				this.requests = data.filter(timestamp => timestamp > oneHourAgo);
			}
		} catch (error) {
			console.warn('RateLimiter: Error loading request history:', error);
			this.requests = [];
		}
	}

	/**
	 * Save request history to localStorage
	 */
	saveRequestHistory() {
		try {
			localStorage.setItem(this.storageKey, JSON.stringify(this.requests));
		} catch (error) {
			console.warn('RateLimiter: Error saving request history:', error);
		}
	}

	/**
	 * Clean up old requests (older than 1 hour)
	 */
	cleanupOldRequests() {
		const oneHourAgo = Date.now() - (60 * 60 * 1000);
		this.requests = this.requests.filter(timestamp => timestamp > oneHourAgo);
		this.saveRequestHistory();
	}

	/**
	 * Check if we can make a request now
	 * @returns {boolean} True if request is allowed
	 */
	canMakeRequest() {
		this.cleanupOldRequests();
		return this.requests.length < this.maxRequestsPerHour;
	}

	/**
	 * Get the number of requests made in the current hour
	 * @returns {number} Number of requests
	 */
	getCurrentRequestCount() {
		this.cleanupOldRequests();
		return this.requests.length;
	}

	/**
	 * Get the number of requests remaining in the current hour
	 * @returns {number} Number of requests remaining
	 */
	getRemainingRequests() {
		return Math.max(0, this.maxRequestsPerHour - this.getCurrentRequestCount());
	}

	/**
	 * Get estimated time until rate limit resets
	 * @returns {number} Milliseconds until reset
	 */
	getTimeUntilReset() {
		if (this.requests.length === 0) {
			return 0;
		}

		this.cleanupOldRequests();
		
		if (this.requests.length < this.maxRequestsPerHour) {
			return 0;
		}

		// Find the oldest request and calculate when it will be outside the hour window
		const oldestRequest = Math.min(...this.requests);
		const oneHourFromOldest = oldestRequest + (60 * 60 * 1000);
		return Math.max(0, oneHourFromOldest - Date.now());
	}

	/**
	 * Get human-readable time until reset
	 * @returns {string} Formatted time string
	 */
	getFormattedTimeUntilReset() {
		const ms = this.getTimeUntilReset();
		if (ms === 0) {
			return 'Available now';
		}

		const minutes = Math.ceil(ms / (60 * 1000));
		if (minutes < 60) {
			return `${minutes} minute${minutes > 1 ? 's' : ''}`;
		}

		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;
		return `${hours} hour${hours > 1 ? 's' : ''}${remainingMinutes > 0 ? ` ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}` : ''}`;
	}

	/**
	 * Record a request being made
	 */
	recordRequest() {
		const now = Date.now();
		this.requests.push(now);
		this.saveRequestHistory();
	}

	/**
	 * Wait until a request can be made
	 * @returns {Promise<void>} Resolves when request can be made
	 */
	async waitForAvailability() {
		const timeToWait = this.getTimeUntilReset();
		if (timeToWait > 0) {
			console.log(`RateLimiter: Waiting ${this.getFormattedTimeUntilReset()} for rate limit reset`);
			await new Promise(resolve => setTimeout(resolve, timeToWait));
		}
	}

	/**
	 * Make a rate-limited request
	 * @param {Function} requestFn - Function that makes the API request
	 * @returns {Promise<any>} Result of the request function
	 */
	async makeRequest(requestFn) {
		if (!this.canMakeRequest()) {
			await this.waitForAvailability();
		}

		this.recordRequest();
		return await requestFn();
	}

	/**
	 * Get rate limit status
	 * @returns {Object} Status information
	 */
	getStatus() {
		return {
			currentRequests: this.getCurrentRequestCount(),
			maxRequests: this.maxRequestsPerHour,
			remainingRequests: this.getRemainingRequests(),
			timeUntilReset: this.getTimeUntilReset(),
			formattedTimeUntilReset: this.getFormattedTimeUntilReset(),
			canMakeRequest: this.canMakeRequest()
		};
	}

	/**
	 * Reset the rate limiter (for testing)
	 */
	reset() {
		this.requests = [];
		this.saveRequestHistory();
	}
}

// Export singleton instance
export const rateLimiter = new RateLimiter();