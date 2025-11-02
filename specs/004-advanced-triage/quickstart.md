# Step 4 Quickstart

## Create a branch

```bash
git switch -c 004-advanced-triage
```

## Where to start

- Store: `src/stores/photoTriageStore.js`
  - Add filter/sort state and memoized selectors
  - Add persistent deletion session state (pause/resume, progress)
- Rate limiting: `src/services/rateLimiter.js`
  - Export metrics and next reset estimation
- UI: `src/components/triage/PhotoTriageScreen.jsx`
  - Add filter/sort controls and apply selectors
- Delete Queue: `src/components/triage/DeleteQueueScreen.jsx`
  - Add counts, bulk actions, progress, pause/resume, retry failed
- Modal/Components: add a simple confirmation modal component in `src/components/common/`

## Run it

```bash
npm run dev
```

## Safety
- Keep bulk delete confirm modal mandatory
- Start with small batches in real accounts
- Provide clear messaging for rate limit pauses
