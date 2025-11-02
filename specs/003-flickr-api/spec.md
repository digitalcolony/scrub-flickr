# 003-flickr-api: Real Flickr API Integration

## Overview

Replace mock photo service with real Flickr API integration to fetch actual user photos and enable production functionality.

## Current State

- ✅ Authentication system working with mock flow
- ✅ Photo triage UI complete with mock photos (247 photos)
- ✅ Delete queue functionality implemented
- ❌ Using mock photo data instead of real Flickr photos
- ❌ No actual photo deletion capability

## Goals

1. **Replace mock photo service** with real Flickr API calls
2. **Implement real photo fetching** from user's Flickr account
3. **Add real photo deletion** capability via Flickr API
4. **Handle API rate limiting** and error scenarios
5. **Maintain existing UI/UX** while switching to real data

## Technical Requirements

### 1. Environment Configuration

- Set up real Flickr API credentials
- Configure OAuth callback URLs for production
- Add environment variable validation

### 2. Flickr API Client

- Implement `flickr.people.getPhotos` for fetching user photos
- Implement `flickr.photos.delete` for actual deletion
- Add proper OAuth 1.0a signing for authenticated requests
- Handle API pagination (user may have thousands of photos)
- Implement rate limiting (3600 requests/hour)

### 3. Photo Service Updates

- Replace `generateMockPhotos()` with real API calls
- Update photo data structure to match Flickr API response
- Add error handling for network issues
- Implement retry logic with exponential backoff

### 4. Authentication Updates

- Replace mock OAuth flow with real Flickr OAuth
- Update token exchange to use real Flickr endpoints
- Add token validation using real Flickr API

### 5. Delete Queue Implementation

- Implement sequential photo deletion with status tracking
- Add real-time progress updates during bulk deletion
- Handle deletion failures and retry mechanisms
- Respect Flickr API rate limits during bulk operations

## API Integration Details

### Required Flickr API Methods

- `flickr.auth.oauth.getRequestToken`
- `flickr.auth.oauth.getAccessToken`
- `flickr.people.getPhotos` or `flickr.photos.search`
- `flickr.photos.delete`
- `flickr.auth.oauth.checkToken` (for validation)

### Authentication Flow

1. Generate request token from Flickr
2. Redirect user to Flickr authorization page
3. Handle callback with verifier
4. Exchange for access token
5. Store token for API calls

### Photo Fetching Strategy

- Fetch photos in batches (50-100 per request)
- Implement lazy loading for large libraries
- Cache photo metadata in localStorage
- Handle users with 10,000+ photos efficiently

### Rate Limiting Strategy

- Track API calls per hour (3600 limit)
- Queue deletion requests to stay under limits
- Show estimated time for large deletion batches
- Implement pause/resume for long operations

## File Changes Required

### New Files

- `src/services/flickrApiClient.js` - Core API client
- `src/utils/oauth.js` - OAuth 1.0a signing utilities
- `src/services/rateLimiter.js` - API rate limiting logic

### Modified Files

- `src/services/flickrAuth.js` - Remove mock logic, add real OAuth
- `src/services/flickrPhoto.js` - Replace mock with real API calls
- `src/stores/photoTriageStore.js` - Add real deletion logic
- `src/components/triage/DeleteQueueScreen.jsx` - Real deletion flow

### Environment Setup

- `.env.local` - Real Flickr API credentials
- Update callback URLs in Flickr app settings

## Success Criteria

- ✅ User can authenticate with real Flickr account
- ✅ App loads user's actual Flickr photos (not mock data)
- ✅ Photo triage workflow works with real photos
- ✅ Delete queue can actually delete photos from Flickr
- ✅ Rate limiting prevents API quota exceeded errors
- ✅ Error handling works for network/API failures
- ✅ UI remains smooth and responsive

## Testing Strategy

- Test with small photo libraries first (10-50 photos)
- Verify deletion actually removes photos from Flickr
- Test rate limiting with bulk deletions
- Test error scenarios (network failures, invalid tokens)
- Verify OAuth flow works end-to-end

## Risks & Mitigations

- **API Rate Limits**: Implement queuing and pause/resume
- **Large Photo Libraries**: Add pagination and lazy loading
- **Network Failures**: Robust retry logic with exponential backoff
- **Authentication Issues**: Clear error messages and re-auth flow
- **Accidental Deletions**: Confirmation modals and status tracking

## Timeline

- **Week 1**: Environment setup and API client
- **Week 2**: Photo fetching and authentication
- **Week 3**: Delete functionality and rate limiting
- **Week 4**: Testing and error handling

## Dependencies

- Real Flickr API credentials from user
- Flickr app configured with correct callback URLs
- Network connectivity for API calls
- User Flickr account with photos to test

## Next Steps After Completion

- Step 4: Advanced features (bulk operations, filters)
- Step 5: UI/UX polish and mobile optimization
- Step 6: Deployment and production setup
