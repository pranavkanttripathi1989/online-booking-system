---
id: TS031
type: test-suggestion
feature: reviews
created: 2026-03-19
updated: 2026-08-17
status: done
parent: unknown
related: [TP031, TR030]
---

# Reviews Page — Test Suggestions (v2.0)

**Module:** Platform Reviews (`/reviews`) — `frontend/src/pages/reviews/index.jsx`
**Updated:** 2026-03-31 (Session QA v2.0)

---

## 🔴 High Priority — COMPLETED (Session)

### SUG-REV-001 — Persist delete via backend mutation
```
Suggestion: Connect handleDelete to DELETE mutation (backend) instead of local React state
Status: COMPLETED (partial — mock persistence implemented)
Notes: handleDelete now calls MockStore.deleteReview(id) + setReviews(MockStore.getReviews()).
       This makes deletes consistent with replies — both persisted to in-memory MockStore.
       Full backend DELETE mutation wiring is a backend integration task (PENDING).
Files: mocks/store.js (deleteReview added), reviews/index.jsx (handleDelete updated)
```

### SUG-REV-002 — Null guard for missing created_at
```
Suggestion: review.created_at=undefined → "Invalid Date" bug — add null guard
Status: COMPLETED
Notes: Ternary guard: review.created_at ? new Date(...).toLocaleDateString(...) : 'Date unknown'
       TC-REV-23 PASS.
Files: reviews/index.jsx
```

### SUG-REV-003 — Fix delete/reply MockStore inconsistency
```
Suggestion: handleDelete should call MockStore like respondToReview does (symmetric persistence)
Status: COMPLETED
Notes: Added export function deleteReview(id) { store.reviews = store.reviews.filter(r => r.id !== id); notify() }
       handleDelete now: MockStore.deleteReview(id); setReviews(MockStore.getReviews()); setConfirmDeleteId(null)
       TC-REV-21, TC-REV-24 PASS.
Files: mocks/store.js, reviews/index.jsx
```

---

## 🟡 Medium Priority — COMPLETED (Session)

### SUG-REV-004 — Add confirmation dialog before deleting a review
```
Suggestion: Confirm before delete — prevent accidental removals
Status: COMPLETED
Notes: Added confirmDeleteId state. Delete icon sets confirmDeleteId instead of calling handleDelete.
       <Dialog open={Boolean(confirmDeleteId)}> with "Delete Review?" title + Cancel + red Delete buttons.
       TC-REV-19, TC-REV-20 PASS.
Files: reviews/index.jsx
```

### SUG-REV-005 — Add clear (×) button in search field
```
Suggestion: endAdornment × button to clear search without manual backspace
Status: COMPLETED
Notes: Added CloseRoundedIcon import. endAdornment: search ? <IconButton onClick={() => setSearch('')}> : null
       aria-label="Clear search" for accessibility.
       TC-REV-10 PASS.
Files: reviews/index.jsx
```

---

## 🟡 Medium Priority — Pending

### SUG-REV-006 — Allow editing/deleting an existing response
```
Status: COMPLETED
Notes: Added Edit IconButton next to "Manager Response" that reopens the reply dialog
       pre-filled with review.response (replyDialog.editing=true). Dialog title/submit label
       switch to "Edit Response"/"Save Changes". handleReply still calls MockStore.respondToReview,
       which overwrites in place — no separate edit path needed. Delete of an individual response
       (as opposed to deleting the whole review) was not implemented — not described by the
       original suggestion text, and there's no MockStore API for it.
Files: reviews/index.jsx
```

### SUG-REV-007 — Add pagination or load-more for large datasets
```
Status: COMPLETED
Notes: Added PAGE_SIZE=10, page state (reset to 1 on filter/search change via useEffect),
       and paged = filtered.slice(0, page * PAGE_SIZE) rendered instead of the full filtered list.
       "Load more (N remaining)" button appears when paged.length < filtered.length.
Files: reviews/index.jsx
```

---

## 🟢 Low Priority — Pending

### SUG-REV-008 — Add date range filter
```
Status: PENDING
Notes: "Last 30 days / Last 3 months / All time" select would help triage recent feedback.
Priority: Low (feature request)
```

### SUG-REV-009 — Add clinician dropdown filter
```
Status: PENDING
Notes: Dedicated clinician dropdown (separate from search) for manager to view all reviews per clinician.
Priority: Low (feature request)
```

---

## New Suggestions (Session)

### SUG-REV-010 — aria-label on Reply button
```
Status: PENDING
Notes: Reply IconButton has no aria-label — only Tooltip title (not accessible to screen readers).
       Fix: aria-label={`Reply to review by ${review.patient_name}`}
Priority: Low (accessibility)
```

### SUG-REV-011 — Password helper text: update stars filter label for accessibility
```
Status: PENDING
Notes: Star filter Chip has no aria-label. Fix: aria-label={f === 'all' ? 'All Stars' : `${f} stars filter`}
Priority: Low (accessibility)
```

---

## Summary Table

| ID | Description | Status |
|----|-------------|--------|
| SUG-REV-001 | Persist delete via backend | ✅ COMPLETED (mock layer done) |
| SUG-REV-002 | created_at null guard | ✅ COMPLETED |
| SUG-REV-003 | MockStore delete consistency | ✅ COMPLETED |
| SUG-REV-004 | Confirm dialog before delete | ✅ COMPLETED |
| SUG-REV-005 | Search clear × button | ✅ COMPLETED |
| SUG-REV-006 | Edit/delete existing response | ✅ COMPLETED |
| SUG-REV-007 | Pagination/load-more | ✅ COMPLETED |
| SUG-REV-008 | Date range filter | ⏳ PENDING |
| SUG-REV-009 | Clinician dropdown filter | ⏳ PENDING |
| SUG-REV-010 | aria-label on Reply button | ⏳ PENDING |
| SUG-REV-011 | aria-label on star chips | ⏳ PENDING |
