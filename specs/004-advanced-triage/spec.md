# 004-advanced-triage: Advanced Triage & Queue Enhancements

## Overview

Build on the working MVP by adding power-user features that improve speed, safety, and visibility during triage and deletion. Focus on filtering, smarter bulk flows, robust retry handling, and clearer rate limit UX.

## Goals

1. Faster selection with filtering and sorting (date ranges, tags, media type)
2. Safer bulk deletion with confirmation, pause/resume, and resume-after-reload
3. Clearer progress and error reporting, including retry-all-failed
4. Discoverability of queue state (pending/deleting/completed/failed) with counts
5. Optional “undo last action” to reduce costly mistakes

## Scope

- Filters: date taken, date uploaded, has tags, text search in title, media type (photo/video)
- Sorting: date uploaded (desc/asc), views, title
- Delete queue controls: Delete All Pending, Retry All Failed, Clear Completed
- Bulk deletion: progress bar, estimated time, pause/resume, persistent progress
- Rate limit UX: show current rate usage, automatic pacing, pause when exceeded
- Safety: confirmation modal for bulk delete; dry-run mode (dev only)
- Quality of life: undo last action (single-step), keyboard shortcut cheatsheet

## Non-Goals

- AI-based quality analysis (future step)
- Cross-device sync of tags (future)
- Album/collection management (future)

## Technical Requirements

- Extend `photoTriageStore` to maintain counts per status and expose selectors
- Enhance `rateLimiter` with exported metrics (calls in window, next reset ETA)
- Add persistent deletion session state: if the tab closes mid-run, restore and resume options
- Add filter state (Zustand + URL query) so filters persist on refresh and can be shared
- Provide robust retry path for failed deletions with exponential backoff per-item

## Success Criteria

- Filtered triage list responds in under 100ms for 1,000+ items loaded
- Bulk deletion can be paused/resumed without losing progress
- Clear status counts for pending/deleting/completed/failed are accurate at all times
- Hitting rate limits pauses safely and resumes automatically; UI communicates wait time

## Risks & Mitigations

- Large lists with many filters: memoized selectors and pagination
- Rate limit variability: conservative pacing and visible ETA
- Partial failures: per-item retries with backoff and a Retry All Failed action
