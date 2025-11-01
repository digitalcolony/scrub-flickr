# Flickr-Scrub PRD

## Product Overview

**Product Name:** Flickr-Scrub

**Version:** 1.0

**Last Updated:** November 1, 2025

### Executive Summary

Flickr-Scrub is a web application designed to streamline the process of curating Flickr photo libraries. The app enables users to quickly triage their photos by tagging them as "keep" or "delete", then batch delete unwanted images—solving the time-consuming problem of managing large photo collections on Flickr.

**Key Value Proposition**: Reduce photo curation time by 70% through streamlined one-photo-at-a-time decisions and safe bulk deletion with real-time status tracking.

### Problem Statement

Flickr users with large photo libraries struggle to efficiently review and remove unwanted photos. The current Flickr interface requires multiple clicks and page loads to delete photos individually, making library curation a tedious and time-consuming task.

**Market Context**: Flickr has over 100 million users with billions of photos. Power users often accumulate 10,000+ photos, spending hours manually curating their collections. The native interface can take 30+ seconds per photo deletion due to navigation overhead.

### Solution

A streamlined interface that presents one photo at a time with simple keep/delete decisions, followed by a bulk deletion capability with real-time status tracking for all photos tagged for removal.

---

## Goals & Success Metrics

### Primary Goals

1. Enable rapid photo triage (target: 5-10 seconds per photo decision)
2. Provide safe, reversible tagging before permanent deletion
3. Reduce time spent curating Flickr libraries by 70%+
4. Provide clear visibility into deletion status and progress

### Success Metrics

- **Speed**: Average time per photo decision (target: 5-10 seconds vs 30+ seconds in native Flickr)
- **Volume**: Number of photos processed per session (target: 100+ photos per 15-minute session)
- **Completion**: Percentage of users who complete bulk deletion after tagging (target: 85%+)
- **Reliability**: Success rate of deletion operations (target: 99%+ excluding rate limits)
- **Satisfaction**: User satisfaction score (target: 4.5/5 stars)
- **Retention**: Weekly active users returning (target: 60%+ weekly retention)

---

## User Personas

### Primary Persona: The Photo Curator

- **Demographics**: Age 25-55, photography enthusiasts and professionals
- **Behavior**: Has 500+ photos on Flickr, actively manages their collection
- **Pain Points**: Wants to clean up old, duplicate, or low-quality photos
- **Motivations**: Values speed and simplicity over advanced features
- **Needs**: Confidence before permanently deleting photos, progress tracking
- **Quote**: _"I have thousands of photos but hate spending hours clicking delete one by one"_

### User Research Insights

- **Survey findings** (to be conducted): 73% of users have 1,000+ photos, 45% have attempted mass cleanup but gave up
- **Interview insights** (planned): Users want "Netflix-style" quick decisions rather than complex organization
- **Validation needed**: Confirm 5-10 second decision time is realistic for photo judgment

---

## Features & Requirements

### Phase 1: MVP Features

#### 1. Flickr Authentication

**Priority:** P0 (Must Have)

**Requirements:**

- OAuth 2.0 integration with Flickr API
- Secure token storage
- Session management
- Clear authentication flow with user consent

**User Flow:**

1. User clicks "Connect to Flickr"
2. Redirected to Flickr authorization page
3. User grants permissions
4. Redirected back to app with access token
5. App fetches user's photo library

#### 2. Photo Triage Screen (Main Screen)

**Priority:** P0 (Must Have)

**Requirements:**

- Display single photo at medium size (centered)
- Two prominent action buttons below image:
  - **Keep** (green, left position)
  - **Delete** (red, right position)
- Keyboard shortcuts:
  - Left arrow or 'K' = Keep
  - Right arrow or 'D' = Delete
- Photo metadata display (optional, minimal):
  - Photo title
  - Upload date
- Progress indicator showing:
  - Photos remaining to review
  - Photos tagged as keep
  - Photos tagged as delete
- Auto-advance to next untagged photo after action
- Skip functionality for undecided photos

**UI Specifications:**

- Clean, modern design with ample whitespace
- Image max-width: 800px, max-height: 600px, centered
- Buttons: Large touch targets (min 120px wide, 50px tall)
- Color scheme: Green (#10B981), Red (#EF4444), Neutral grays
- Mobile responsive

**Business Logic:**

- Photos tagged "keep" or "delete-pending" are excluded from main screen queue
- Tags are stored in app state (localStorage)
- No photos deleted at this stage—only tagged
- Decisions persist across page refreshes

#### 3. Delete Queue & Status Screen

**Priority:** P0 (Must Have)

**Requirements:**

- Grid view of all photos tagged for deletion
- **Real-time status indicator for each photo:**
  - **Pending** (gray badge): Tagged for deletion, not yet processed
  - **Deleting** (yellow badge, spinner): Delete request in progress
  - **Completed** (green badge, checkmark): Successfully deleted from Flickr
  - **Failed** (red badge, error icon): Deletion failed, with error message
- Photo count by status displayed prominently at top:
  - Pending count
  - Deleting count
  - Completed count
  - Failed count
- Thumbnail images (150x150px) with status overlay
- Individual photo actions:
  - Remove from queue (untag) - only for pending photos
  - Retry - only for failed photos
  - View error details - only for failed photos
- Bulk actions:
  - "Select All Pending" functionality
  - "Delete Selected" button (initiates deletion process)
  - "Retry All Failed" button
  - "Clear Completed" button (removes successfully deleted photos from view)
- Progress indicator during bulk deletion:
  - Progress bar showing X of Y photos deleted
  - Current photo being deleted
  - Estimated time remaining
  - Pause/Cancel options
- Return to triage screen button

**UI Layout:**

```
┌─────────────────────────────────────────────────────┐
│  Delete Queue                                       │
│  ─────────────────────────────────────────────────  │
│  📊 Pending: 45  |  ⏳ Deleting: 3  |  ✅ Done: 12  │
│      ❌ Failed: 2                                    │
│                                                      │
│  [Delete All Pending]  [Retry Failed]  [Clear Done] │
│  ─────────────────────────────────────────────────  │
│                                                      │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐   │
│  │ [img]  │  │ [img]  │  │ [img]  │  │ [img]  │   │
│  │ PENDING│  │DELETING│  │ DONE ✓ │  │ FAILED │   │
│  │  [×]   │  │   ⟳    │  │        │  │ [Retry]│   │
│  └────────┘  └────────┘  └────────┘  └────────┘   │
└─────────────────────────────────────────────────────┘
```

**Status Badge Colors:**

- Pending: Gray background (#E5E7EB), dark text
- Deleting: Yellow background (#FCD34D), dark text, animated spinner
- Completed: Green background (#10B981), white text, checkmark icon
- Failed: Red background (#EF4444), white text, warning icon

**Confirmation Modal for Bulk Delete:**

- Clear warning message: "You are about to permanently delete [X] photos from Flickr. This action cannot be undone."
- Two options:
  - "Cancel" (gray, default focused)
  - "Delete Permanently" (red, requires explicit click)

**Business Logic:**

- Photos start in "delete-pending" status when tagged
- When "Delete Selected" clicked, photos move to "delete-deleting" status sequentially
- Flickr API deletion calls are processed with proper error handling
- On success: Photo moves to "delete-completed" status
- On failure: Photo moves to "delete-failed" status with error message stored
- Completed photos removed from localStorage after user clicks "Clear Completed"
- Failed photos can be retried individually or in bulk
- Process can be paused/resumed if user navigates away and returns
- If browser closes during deletion, "deleting" status photos revert to "pending" on next load

#### 4. Navigation

**Priority:** P0 (Must Have)

**Requirements:**

- Simple two-screen navigation:
  - Main triage screen (default) - `/`
  - Delete queue screen - `/delete-queue`
- Badge indicator on delete queue nav showing count:
  - Gray badge: Pending only
  - Yellow badge: Deletion in progress
  - Red badge: Has failures
- Breadcrumb or clear indication of current screen

---

## Technical Specifications

### Frontend Stack

- **Framework:** React 19.1.1
- **Bundler:** Vite 7.1.7
- **Styling:** Tailwind CSS 3.4.18
- **State Management:** Zustand 5.0.8
- **HTTP Client:** Axios 1.12.2

### Flickr API Integration

**Required API Methods:**

- `flickr.photos.search` - Fetch user's photos
- `flickr.photos.delete` - Permanently delete photos

**Required Permissions:**

- Read access to user's photos
- Delete access to remove photos

**API Considerations:**

- Rate limiting: Respect Flickr's API rate limits (3600 requests/hour)
- Pagination: Handle photo sets larger than API page size
- Error handling: Network failures, permission errors, quota exceeded
- Sequential deletion with small delays (100ms) to avoid rate limit issues

### Data Persistence Strategy

**Tag Storage:** App State + localStorage

**Implementation:**

- Decisions stored in browser localStorage as key-value pairs
- Zustand state hydrated from localStorage on app load
- Photos with existing decisions filtered from triage queue
- Only bulk deletion operation interacts with Flickr API
- Deletion status tracked in localStorage for session persistence

**localStorage Structure:**

```javascript
{
  "flickr-scrub-tags": {
    "photo123": "keep",
    "photo456": "delete-pending",
    "photo789": "delete-completed"
  },
  "flickr-scrub-delete-errors": {
    "photo999": {
      error: "Network timeout",
      attempts: 2,
      lastAttempt: timestamp
    }
  }
}
```

**User Communication:**

- Show banner on first use: "Your decisions are saved in this browser. Use the same browser to continue where you left off."
- "Reset All Tags" button in settings to start fresh

**Trade-offs:**

- ✅ Instant response (no API delay on each decision)
- ✅ Preserves rate limit for actual deletions
- ✅ Cleaner Flickr account (no scrub-specific tags)
- ✅ Session persistence via localStorage
- ❌ Tags lost if browser data cleared
- ❌ Doesn't sync across devices

### State Management

**Zustand Store Structure:**

```javascript
{
  user: {
    id: string,
    username: string,
    isAuthenticated: boolean
  },
  photos: {
    untagged: Photo[],
    keep: Photo[],
    deleteQueue: Photo[],
    currentIndex: number
  },
  ui: {
    isLoading: boolean,
    error: string | null,
    currentScreen: 'triage' | 'deleteQueue',
    isDeletionInProgress: boolean,
    deletionProgress: {
      current: number,
      total: number,
      currentPhotoId: string | null
    }
  }
}
```

### Data Models

**Photo Object:**

```javascript
{
  id: string,
  title: string,
  url: string,
  thumbnailUrl: string,
  dateUploaded: timestamp,
  tags: string[],
  status: 'untagged' | 'keep' | 'delete-pending' | 'delete-deleting' | 'delete-completed' | 'delete-failed',
  deleteError?: string, // Only present if status is 'delete-failed'
  deleteAttempts?: number // Track retry attempts
}
```

### Deletion Flow Logic

**Sequential Deletion Process:**

```javascript
async function processDeletionQueue(photos) {
	const pendingPhotos = photos.filter((p) => p.status === "delete-pending");

	for (let i = 0; i < pendingPhotos.length; i++) {
		const photo = pendingPhotos[i];

		// Update UI: show as deleting
		updatePhotoStatus(photo.id, "delete-deleting");
		updateProgress(i + 1, pendingPhotos.length);

		try {
			await flickrAPI.deletePhoto(photo.id);

			// Success: mark completed
			updatePhotoStatus(photo.id, "delete-completed");
		} catch (error) {
			// Failure: mark failed with error
			updatePhotoStatus(photo.id, "delete-failed", {
				error: error.message,
				attempts: (photo.deleteAttempts || 0) + 1,
			});
		}

		// Small delay to respect rate limits
		await delay(100);
	}
}
```

---

## User Experience

### Happy Path Flow

1. User lands on app → sees "Connect to Flickr" button
2. User authenticates with Flickr
3. App loads untagged photos → displays first photo
4. User presses Keep or Delete
5. Photo is tagged and next photo appears
6. User continues until satisfied
7. User navigates to Delete Queue screen
8. User sees all pending deletions with status: pending
9. User clicks "Delete All Pending"
10. App processes deletions sequentially, showing real-time progress
11. Photos update from "deleting" to "completed" status
12. User clicks "Clear Completed" to remove successfully deleted photos
13. If any failures, user can retry or investigate errors

### Edge Cases & Error States

**No Photos Available:**

- Show message: "No photos to review! All photos have been tagged."
- Option to view keep/delete tagged photos
- Option to reset all tags

**API Errors:**

- Network failure: Retry mechanism with user notification
- Rate limit exceeded: Pause deletion, show estimated wait time, auto-resume
- Authentication expired: Prompt re-authentication
- Photo not found: Mark as completed (already deleted elsewhere)

**User Closes Browser During Deletion:**

- Deletion stops immediately
- Photos in "delete-deleting" status revert to "delete-pending" on next load
- User can resume deletion process from Delete Queue screen

**Partial Deletion with Failures:**

- Completed photos remain in "delete-completed" status
- Failed photos show in "delete-failed" status with error message and retry option
- User can clear completed while keeping failed in queue
- "Retry All Failed" button processes only failed photos

**Rate Limit Hit During Deletion:**

- Show message: "Rate limit reached. Pausing for X minutes..."
- Auto-resume when rate limit window resets
- Option to cancel and resume later
- Progress preserved in localStorage

---

## Design Guidelines

### Visual Design Principles

- **Simplicity:** Minimal UI elements, focus on the photo
- **Speed:** Fast load times, instant feedback on actions
- **Safety:** Clear confirmation before destructive actions
- **Transparency:** Real-time status updates during deletion
- **Responsiveness:** Works seamlessly on desktop and mobile

---

## Business Model & Monetization

### Initial Strategy: Free Tool

- **Launch as free tool** to build user base and validate market
- **Focus on user acquisition** and product-market fit
- **Gather usage data** to inform future monetization decisions

### Future Monetization Options (Post-MVP)

1. **Freemium Model**: Free for basic use, premium for advanced features
   - Free: Up to 1,000 photos processed per month
   - Premium ($5/month): Unlimited photos, AI suggestions, cross-device sync
2. **One-time Purchase**: $19.99 for lifetime access to all features
3. **Enterprise/Pro Features**: Bulk organization tools for professional photographers

### Revenue Projections (Year 1)

- **Months 1-6**: $0 (free tool, focus on adoption)
- **Months 7-12**: $500-2000/month (premium features for power users)
- **Target**: 1,000 free users, 100 premium users by end of year 1

---

### Color Palette

- **Primary Green (Keep):** #10B981
- **Primary Red (Delete):** #EF4444
- **Primary Yellow (In Progress):** #FCD34D
- **Background:** #F9FAFB
- **Text Primary:** #111827
- **Text Secondary:** #6B7280
- **Border:** #E5E7EB

### Typography

- **Font Family:** System font stack (SF Pro, Segoe UI, Roboto)
- **Heading:** 24px, semibold
- **Body:** 16px, regular
- **Button:** 16px, medium

### Status Indicators

**Status Badge Component:**

```
Pending:   [  PENDING  ]  (gray, no icon)
Deleting:  [ ⟳ DELETING... ]  (yellow, spinner animation)
Completed: [ ✓ DELETED ]  (green, checkmark)
Failed:    [ ⚠ FAILED - Retry ]  (red, warning icon, clickable)
```

**Progress Bar During Bulk Deletion:**

```
Deleting photos... 23 of 45

[████████████░░░░░░░░░░░░░░] 51%

Currently deleting: IMG_2024_0842.jpg

[Pause] [Cancel]
```

---

## Future Enhancements (Post-MVP)

### Phase 2 Features

- **Undo functionality:** Reverse last action
- **Batch operations:** Tag multiple photos at once in grid view
- **Smart filters:** Auto-suggest duplicates or low-quality photos
- **Export lists:** Download list of kept/deleted photos
- **Album support:** Organize decisions by album
- **Search & filter:** Find specific photos by date, title, tags
- **Optional Flickr tag sync:** Cross-device support for decisions

### Phase 3 Features

- **AI-powered suggestions:** ML model suggests photos to delete based on quality, duplicates
- **Statistics dashboard:** Visualize photo library cleanup progress over time
- **Scheduled cleanup reminders:** Periodic prompts to review new photos
- **Deletion history:** View audit log of all deleted photos
- **Backup before delete:** Optional automatic download of photos before deletion

---

## Security & Privacy

### Data Handling

- OAuth tokens stored securely (httpOnly cookies or secure localStorage)
- No photo data stored on servers (client-side only)
- All Flickr API calls authenticated with user's token
- Session timeout after 24 hours
- localStorage data is browser-specific and not transmitted

### Permissions

- Request minimal Flickr permissions required (read + delete)
- Clear privacy policy explaining data usage
- Option to revoke access at any time
- No analytics or tracking without user consent

---

## Development Phases

### Phase 1: Foundation (Weeks 1-2)

- Flickr OAuth integration
- Basic photo fetch and display
- Zustand state management setup
- localStorage integration

### Phase 2: Core Features (Weeks 3-4)

- Triage screen implementation
- Tagging functionality
- Keyboard shortcuts
- Progress indicators

### Phase 3: Deletion Flow (Week 5)

- Delete queue screen
- Status tracking (pending/deleting/completed/failed)
- Bulk deletion with confirmation
- Error handling and retry logic

### Phase 4: Polish & Testing (Week 6)

- UI refinement
- Mobile responsiveness
- User testing and bug fixes
- Performance optimization
- Rate limiting handling

---

## Dependencies & Risks

### Technical Dependencies

- Flickr API availability and stability
- OAuth provider uptime
- Browser compatibility (modern browsers only)
- localStorage availability (required)

### Risks & Mitigation

| Risk                             | Impact | Mitigation                                                       |
| -------------------------------- | ------ | ---------------------------------------------------------------- |
| Flickr API changes               | High   | Monitor API updates, version API calls                           |
| Rate limiting during bulk delete | Medium | Implement request queuing, show user progress, auto-pause/resume |
| Data loss during deletion        | High   | Confirmation modal, status tracking, retry mechanism             |
| Poor mobile experience           | Medium | Mobile-first design, touch-optimized buttons                     |
| localStorage cleared by user     | Medium | Clear messaging, "Reset All Tags" option                         |
| Browser closes mid-deletion      | Medium | Status persistence, resume capability                            |

---

## Open Questions - RESOLVED

1. ~~Should we support "maybe" or "review later" category?~~ **No**
2. ~~Should tags be stored only in app or also in Flickr photo tags?~~ **App + localStorage only**
3. ~~Do we need an admin panel for monitoring API usage?~~ **No**
4. ~~Should there be a limit on photos per session?~~ **No**
5. ~~What happens if user closes browser mid-session?~~ **localStorage persists decisions; deletion status reverts pending photos on reload**

---

## Appendix

### Flickr API Endpoints

- Base URL: `https://www.flickr.com/services/rest/`
- Auth URL: `https://www.flickr.com/services/oauth/authorize`
- Documentation: `https://www.flickr.com/services/api/`

### Key API Methods

- `flickr.auth.oauth.getRequestToken`
- `flickr.auth.oauth.getAccessToken`
- `flickr.people.getPhotos` or `flickr.photos.search`
- `flickr.photos.delete`

### Competitive Analysis

- **Flickr native interface:** Slow, requires multiple clicks per deletion
- **Opportunity:** Streamlined, focused tool beats general-purpose interface
- **Unique value:** Real-time status tracking and batch operations with error handling

### Technical Notes

- Consider implementing request debouncing for rapid keyboard inputs
- Implement exponential backoff for retry logic
- Cache photo thumbnails for better performance
- Consider lazy loading for large photo sets
- Monitor localStorage size limits (typically 5-10MB)

---

## Success Criteria for Launch

### Must Have (MVP Launch Blockers)

- ✅ Flickr OAuth authentication working
- ✅ Photo triage screen functional with keyboard shortcuts
- ✅ localStorage persistence working reliably
- ✅ Delete queue with real-time status tracking
- ✅ Bulk deletion with progress indicator
- ✅ Error handling and retry mechanism
- ✅ Mobile responsive design
- ✅ Rate limit handling

### Nice to Have (Post-Launch)

- Advanced filtering options
- Cross-device sync via Flickr tags
- Undo functionality
- Statistics and reporting

---

## Revision History

| Version | Date        | Changes                                       | Author |
| ------- | ----------- | --------------------------------------------- | ------ |
| 1.0     | Nov 1, 2025 | Initial PRD with delete queue status tracking | -      |
