# Step 4: Advanced Triage & Queue Enhancements - Plan

## Phase 1: Filters & Sorting
- [ ] Add filter state to store (date taken/uploaded, tags, text, media)
- [ ] Wire filters into triage selectors (memoized)
- [ ] Add sorting controls (date, views, title)
- [ ] Sync filter/sort to URL query for persistence

## Phase 2: Queue Controls & Status
- [ ] Show counts: pending, deleting, completed, failed
- [ ] Add actions: Delete All Pending, Retry All Failed, Clear Completed
- [ ] Confirmation modal for bulk delete
- [ ] Undo last action (lightweight, one-step)

## Phase 3: Bulk Deletion UX
- [ ] Pause/Resume controls
- [ ] Persist progress (resume after refresh)
- [ ] Estimated time remaining (based on moving average)
- [ ] Better per-item error messages

## Phase 4: Rate Limit UX
- [ ] Export rate limiter metrics
- [ ] Show current usage and next reset
- [ ] Auto-pause on limit reached with visible countdown

## Phase 5: Testing & Hardening
- [ ] Test with 1k+ photo libraries (dev mock + staged real)
- [ ] Error cases: network, auth expired, rate limit, item missing
- [ ] Accessibility check for keyboard/ARIA
- [ ] Performance profiling & memoization

## Deliverables
- Store updates: selectors, persistent deletion session, filters
- Components: filter bar, modal confirmation, progress UI, pause/resume controls
- Docs: quickstart, tasks checklist, usage notes
