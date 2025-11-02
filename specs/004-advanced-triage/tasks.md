# Step 4 Implementation Checklist

## Status

- Current Branch: tbd (suggest `004-advanced-triage`)
- Date Started: tbd

## Tasks

### Filters & Sorting

- [ ] Add filter state (Zustand)
- [ ] Memoized filtered+sorted photo selector
- [ ] UI for filters and sorting
- [ ] URL sync for filter/sort

### Queue Controls

- [ ] Counts per status always accurate
- [ ] Delete All Pending (with confirm)
- [ ] Retry All Failed
- [ ] Clear Completed
- [ ] Undo last action (single-step)

### Bulk Deletion UX

- [ ] Pause/Resume
- [ ] Persist progress and resume after reload
- [ ] ETA based on moving average
- [ ] Better per-item error messages

### Rate Limit UX

- [ ] Expose limiter metrics
- [ ] UI for current usage and next reset
- [ ] Auto-pause and countdown on limit reached

### Testing

- [ ] Large dataset performance
- [ ] Error and edge cases
- [ ] Accessibility pass
- [ ] Documentation updates
