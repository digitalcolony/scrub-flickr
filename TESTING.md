# Photo Triage Feature Testing Guide

## Quick Start

1. `npm run dev` - Start development server
2. Open http://localhost:5173 (or check console for actual port)
3. Click "Login with Flickr" (uses mock auth)
4. Click "Start Photo Triage" from home screen

## Manual Testing Checklist

### ✅ Authentication Flow

- [ ] Home page loads correctly
- [ ] "Login with Flickr" button works
- [ ] Mock authentication succeeds
- [ ] User profile shows "test_user"
- [ ] "Start Photo Triage" button appears after login

### ✅ Photo Triage Screen

- [ ] Photo loads with proper image, title, date, tags
- [ ] Progress indicators show correct counts
- [ ] "Keep" button (✅) works correctly
- [ ] "Delete" button (🗑️) works correctly
- [ ] Photos advance automatically after tagging
- [ ] Counts update in real-time (Keep/Delete/Remaining)

### ✅ Keyboard Shortcuts

- [ ] Press 'K' to keep current photo
- [ ] Press 'D' to delete current photo
- [ ] Press '←' (left arrow) to keep photo
- [ ] Press '→' (right arrow) to delete photo
- [ ] Press 'R' to refresh (if implemented)

### ✅ Delete Queue Screen

- [ ] "Delete Queue" button appears when photos are tagged for deletion
- [ ] Queue shows correct count (e.g., "Delete Queue (2)")
- [ ] Navigate to delete queue shows tagged photos
- [ ] Each photo shows "DELETE" badge
- [ ] "Remove" button works on hover
- [ ] "Back to Triage" navigation works
- [ ] Counts update correctly after removing photos

### ✅ State Persistence

- [ ] Refresh page - tagged photos remain tagged
- [ ] Navigate between screens - state persists
- [ ] Close/reopen browser - localStorage works
- [ ] Check browser DevTools > Application > Local Storage > photo-triage-storage

### ✅ Edge Cases

- [ ] No internet connection (should work with mock data)
- [ ] Tag all 50 photos in current batch
- [ ] Remove all photos from delete queue
- [ ] Multiple rapid button clicks
- [ ] Window resize/responsive behavior

## Browser DevTools Testing

### Console Commands

```javascript
// Check localStorage state
JSON.parse(localStorage.getItem("photo-triage-storage"));

// Check authentication state
JSON.parse(localStorage.getItem("flickr-scrub-auth"));

// Clear all data to restart
localStorage.clear();
```

### Network Tab

- Should see no API calls (using mock data)
- Static assets load correctly

## Expected Mock Data

- **Total Photos**: 247 mock photos
- **Photo Format**: "Photo X" with realistic titles/dates
- **Tags**: Various combinations (nature, landscape, portrait, etc.)
- **Images**: Placeholder images from picsum.photos

## Known Limitations (Phase 1)

- Uses mock Flickr data (no real API calls)
- Delete queue shows "Coming Soon" for actual deletion
- No real photo upload/management
- Mock authentication only

## Performance Testing

- [ ] Page load time < 2 seconds
- [ ] Photo switching is smooth/instant
- [ ] No memory leaks during extended use
- [ ] Responsive on mobile devices

## Success Criteria

✅ User can tag 20+ photos in under 2 minutes
✅ All state persists across page refreshes
✅ Delete queue accurately reflects tagged photos
✅ Keyboard shortcuts work intuitively
✅ No console errors or warnings
✅ Clean, professional UI/UX

## Automated Testing Commands

```bash
# Code quality
npm run lint

# Production build
npm run build

# Development server
npm run dev
```

## After Testing

This feature is complete and in its final state. No follow-up steps are required.
