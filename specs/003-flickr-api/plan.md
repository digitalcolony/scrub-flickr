# Step 3: Real Flickr API Integration - Implementation Plan

## Phase 1: Environment & Setup ⚙️

### 1.1 Flickr App Configuration
- [ ] Create Flickr app at https://www.flickr.com/services/apps/create/
- [ ] Get API Key and Secret
- [ ] Configure callback URLs
- [ ] Set app permissions to "Delete" level

### 1.2 Environment Setup  
- [ ] Update `.env.local` with real Flickr credentials
- [ ] Add environment validation
- [ ] Update callback URL configuration
- [ ] Test environment variable loading

### 1.3 Dependencies
- [ ] Install OAuth 1.0a signing library (`crypto-js` already installed)
- [ ] Add any additional HTTP/API utilities
- [ ] Update package.json if needed

## Phase 2: Core API Client 🔧

### 2.1 Flickr API Client
- [ ] Create `src/services/flickrApiClient.js`
- [ ] Implement OAuth 1.0a signature generation
- [ ] Add base API request methods
- [ ] Implement error handling and retry logic
- [ ] Add rate limiting tracking

### 2.2 OAuth Authentication
- [ ] Update `flickrAuth.js` to use real OAuth endpoints
- [ ] Implement request token generation
- [ ] Add access token exchange
- [ ] Update token validation logic
- [ ] Remove mock authentication code

### 2.3 API Method Implementation
- [ ] Implement `flickr.people.getPhotos` 
- [ ] Implement `flickr.photos.delete`
- [ ] Add `flickr.auth.oauth.checkToken`
- [ ] Handle API pagination
- [ ] Add request/response logging (dev mode)

## Phase 3: Photo Service Integration 📸

### 3.1 Replace Mock Photo Service
- [ ] Update `flickrPhoto.js` to use real API
- [ ] Remove `generateMockPhotos()` function
- [ ] Implement real photo fetching with pagination
- [ ] Update photo data structure for Flickr API response
- [ ] Add photo caching strategy

### 3.2 Photo Data Handling
- [ ] Map Flickr API response to app photo model
- [ ] Handle photo URLs (thumbnail and full size)
- [ ] Process photo metadata (title, date, tags)
- [ ] Implement photo filtering (exclude already tagged)
- [ ] Add error handling for missing/invalid photos

### 3.3 Performance Optimization
- [ ] Implement lazy loading for large photo libraries
- [ ] Add photo thumbnail caching
- [ ] Optimize API calls for better UX
- [ ] Add loading states for real API delays
- [ ] Handle slow network conditions

## Phase 4: Delete Queue Implementation 🗑️

### 4.1 Real Photo Deletion
- [ ] Implement sequential photo deletion
- [ ] Add real-time status updates during deletion
- [ ] Handle deletion failures with proper error messages
- [ ] Implement retry logic for failed deletions
- [ ] Add progress tracking for bulk operations

### 4.2 Rate Limiting
- [ ] Create `rateLimiter.js` service
- [ ] Track API calls per hour (3600 limit)
- [ ] Queue deletion requests to stay under limits
- [ ] Add pause/resume for rate limit exceeded
- [ ] Show estimated time for large batches

### 4.3 Error Handling
- [ ] Handle network timeouts
- [ ] Process Flickr API error responses
- [ ] Add user-friendly error messages
- [ ] Implement exponential backoff for retries
- [ ] Handle authentication expiration

## Phase 5: UI Updates & Testing 🎨

### 5.1 UI Adjustments
- [ ] Update loading states for real API delays
- [ ] Add progress indicators for photo fetching
- [ ] Update error messages for real API errors
- [ ] Add network status indicators
- [ ] Update confirmation dialogs for real deletions

### 5.2 State Management Updates
- [ ] Update `photoTriageStore.js` for real API integration
- [ ] Handle async photo loading in store
- [ ] Add API status tracking in store
- [ ] Update localStorage strategy for real data
- [ ] Add photo caching in store

### 5.3 Component Updates
- [ ] Update `PhotoTriageScreen.jsx` for real photos
- [ ] Update `DeleteQueueScreen.jsx` for real deletion
- [ ] Add error boundaries for API failures
- [ ] Update `AuthCallback.jsx` for real OAuth
- [ ] Add loading spinners where needed

## Phase 6: Testing & Validation ✅

### 6.1 Authentication Testing
- [ ] Test real Flickr OAuth flow end-to-end
- [ ] Verify token storage and validation
- [ ] Test authentication error scenarios
- [ ] Verify callback URL handling
- [ ] Test token expiration and refresh

### 6.2 Photo Fetching Testing
- [ ] Test with small photo libraries (10-50 photos)
- [ ] Test with large libraries (1000+ photos)
- [ ] Verify photo metadata accuracy
- [ ] Test pagination and lazy loading
- [ ] Test network failure scenarios

### 6.3 Deletion Testing
- [ ] Test single photo deletion
- [ ] Test bulk deletion (10-50 photos)
- [ ] Verify photos actually deleted from Flickr
- [ ] Test deletion failure handling
- [ ] Test rate limiting with large batches

### 6.4 Error Scenario Testing
- [ ] Test network disconnection
- [ ] Test invalid API credentials
- [ ] Test expired authentication
- [ ] Test API rate limit exceeded
- [ ] Test malformed API responses

## Success Metrics 📊

### Technical Metrics
- [ ] All mock data replaced with real API calls
- [ ] Authentication success rate > 95%
- [ ] Photo loading time < 3 seconds for 50 photos
- [ ] Deletion success rate > 99% (excluding rate limits)
- [ ] Zero crashes from API errors

### User Experience Metrics  
- [ ] Photo triage workflow remains smooth
- [ ] Error messages are clear and actionable
- [ ] Loading states provide good feedback
- [ ] Bulk deletion provides clear progress
- [ ] No data loss during failures

## Risk Mitigation 🛡️

### High Priority Risks
- **API Rate Limits**: Implement queuing and show progress
- **Network Failures**: Robust retry with exponential backoff
- **Authentication Issues**: Clear error messages and re-auth flow
- **Large Photo Libraries**: Pagination and lazy loading
- **Accidental Deletions**: Multiple confirmations and status tracking

### Testing Strategy
1. Start with test Flickr account with 10-20 photos
2. Test all error scenarios in controlled environment
3. Gradually test with larger photo libraries
4. Verify actual photo deletion (use test photos only!)
5. Test rate limiting with bulk operations

## Environment Requirements 🔧

### Development Setup
```bash
# Required environment variables
VITE_FLICKR_API_KEY=your_api_key
VITE_FLICKR_API_SECRET=your_api_secret  
VITE_FLICKR_CALLBACK_URL=http://localhost:5173/auth/callback

# For production
VITE_FLICKR_CALLBACK_URL=https://yourdomain.com/auth/callback
```

### Flickr App Permissions
- **Permission Level**: Delete
- **Callback URLs**: 
  - Development: `http://localhost:5173/auth/callback`
  - Production: `https://yourdomain.com/auth/callback`

## Timeline Estimate ⏱️

- **Phase 1 (Setup)**: 1-2 days
- **Phase 2 (API Client)**: 2-3 days  
- **Phase 3 (Photo Service)**: 2-3 days
- **Phase 4 (Delete Queue)**: 2-3 days
- **Phase 5 (UI Updates)**: 1-2 days
- **Phase 6 (Testing)**: 2-3 days

**Total Estimate**: 10-16 days

## Getting Started 🚀

1. **First Priority**: Set up real Flickr app and get API credentials
2. **Second Priority**: Create API client with basic OAuth flow
3. **Third Priority**: Replace mock photo fetching
4. **Fourth Priority**: Implement real photo deletion

Ready to begin implementation! 🎯