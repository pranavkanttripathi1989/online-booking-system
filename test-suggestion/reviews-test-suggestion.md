# Reviews Page — Test Suggestions

**Derived from:** [reviews-test-results.md](../test-result/reviews-test-results.md)  
**Source File:** `frontend/src/pages/reviews/index.jsx`  
**Date:** 2026-03-17

---

## 🔴 High Priority — Bug Fixes

### SUG-REV-001 — Persist Delete via Backend Mutation (OBS-2)

**Problem:** Deleting a review uses only `setReviews(prev.filter(...))` — local React state. On page refresh, the deleted review reappears from `MockStore.getReviews()`. The source even comments `// BACKEND SWAP: call DELETE mutation`.

**Fix:**
```jsx
const handleDelete = async (id) => {
  // Optimistic update
  setReviews(prev => prev.filter(r => r.id !== id));
  // Backend mutation:
  await deleteReview({ variables: { id } });
  // On error, revert: setReviews(MockStore.getReviews())
};
```

**Priority:** 🔴 High | **Effort:** ~10 lines

---

### SUG-REV-002 — Add Null Guard for `created_at` (Edge Case E3)

**Problem:** `new Date(undefined).toLocaleDateString()` → **"Invalid Date"** shown. No null check on `review.created_at`.

**Fix:**
```jsx
{review.created_at
  ? new Date(review.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : 'Date unknown'}
```

**Priority:** 🔴 High | **Effort:** 3 lines

---

### SUG-REV-003 — Fix Delete/Reply Persistence Inconsistency (OBS-3)

**Problem:** `MockStore.respondToReview()` mutates the in-memory store so replies survive refresh. But `handleDelete` only modifies React state, so deletes don't survive refresh. This is a data-layer inconsistency.

**Fix Options:**
1. Make `handleDelete` also call `MockStore.deleteReview(id)` (add function to MockStore) so both are consistent during development.
2. Connect both operations to the same Apollo mutation-based backend in production.

```js
// In MockStore:
export function deleteReview(id) {
  REVIEWS = REVIEWS.filter(r => r.id !== id);
}
// In component:
const handleDelete = (id) => {
  MockStore.deleteReview(id);
  setReviews(MockStore.getReviews());
};
```

**Priority:** 🔴 High | **Effort:** ~5 lines

---

## 🟡 Medium Priority — UX Improvements

### SUG-REV-004 — Add Confirmation Dialog Before Deleting Review

**Problem:** Clicking the red delete button instantly removes a review with no warning. There is no undo mechanism or confirmation step, making accidental deletions possible.

**Fix:**
```jsx
const [confirmDeleteId, setConfirmDeleteId] = useState(null);

// On delete icon click: setConfirmDeleteId(review.id)
// Dialog: "Are you sure you want to delete this review? This action cannot be undone."
// Confirm → handleDelete(confirmDeleteId); setConfirmDeleteId(null)
```

**Priority:** 🟡 Medium | **Effort:** ~20 lines

---

### SUG-REV-005 — Add Clear (✕) Button in Search Field

**Problem:** No way to clear the search input other than manual backspacing. For long search terms, this is inconvenient.

**Fix:**
```jsx
InputProps={{
  startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment>,
  endAdornment: search ? (
    <InputAdornment position="end">
      <IconButton size="small" onClick={() => setSearch('')}><CloseIcon fontSize="small" /></IconButton>
    </InputAdornment>
  ) : null,
}}
```

**Priority:** 🟡 Medium | **Effort:** ~6 lines

---

### SUG-REV-006 — Allow Editing/Deleting an Existing Response

**Problem:** Once a manager submits a response, there is no way to edit or remove it. The `handleReply` function only adds new responses.

**Fix:** Add an edit icon next to "Manager Response", re-opening the dialog pre-filled with the current response text. On submit, call `MockStore.respondToReview(id, newText)`.

**Priority:** 🟡 Medium | **Effort:** ~15 lines

---

### SUG-REV-007 — Add Pagination or Infinite Scroll (OBS — Scalability)

**Problem:** All reviews render at once (`filtered.map(...)`). With 100+ reviews, this will cause layout jank and slow render.

**Fix — Virtual list or pagination:**
```jsx
const PAGE_SIZE = 10;
const [page, setPage] = useState(1);
const paged = filtered.slice(0, page * PAGE_SIZE);
// Show "Load more" button when paged.length < filtered.length
```

**Priority:** 🟡 Medium

---

## 🟢 Low Priority — Test Plan Enhancements

### SUG-REV-008 — Add Date Range Filter

**Enhancement:** Reviews don't have a date filter. A "Last 30 days / Last 3 months / All time" dropdown would help managers triage recent feedback.

**Priority:** 🟢 Low (feature request)

---

### SUG-REV-009 — Add Clinician Dropdown Filter

**Enhancement:** The search works for both patient and clinician (OR logic). A dedicated clinician dropdown separate from the search bar would let managers specifically view all reviews for a given clinician.

**Priority:** 🟢 Low (feature request)

---

## Additional Test Cases

### SUG-REV-PLAN-001 — TC: Delete All Reviews → Empty State

> **TC-REV-22** — Delete all reviews + verify empty state  
> Delete all review cards one by one (or use mock with 1 review).  
> Expected: `filtered.length = 0` → empty state ("No reviews found").  
> avgRating → "0.0". Total → "0 total". Breakdown bars all 0%.

### SUG-REV-PLAN-002 — TC: created_at Missing → "Invalid Date" (Bug Repro)

> **TC-REV-23** — Review with no `created_at` date  
> Inject a mock review with `created_at: undefined`.  
> Expected (current bug): **"Invalid Date"** shown in top-right of card.  
> Expected (after SUG-002 fix): **"Date unknown"** shown.

### SUG-REV-PLAN-003 — TC: Refresh After Delete (Persistence Bug)

> **TC-REV-24** — Delete review + page refresh  
> Delete 1 review. Refresh (`F5`).  
> Expected (current bug): Deleted review **reappears** from `MockStore.getReviews()`.  
> Expected (after SUG-001/003 fix): Review stays deleted.

### SUG-REV-PLAN-004 — TC: Refresh After Reply (Persistence — Works)

> **TC-REV-25** — Submit reply + page refresh  
> Submit a reply on a review. Refresh.  
> Expected: Response persists (MockStore mutated in-place via `respondToReview`).  
> This documents the asymmetric persistence behaviour of replies vs. deletes.

### SUG-REV-PLAN-005 — TC: Rating Calculation with All Same Stars

> **TC-REV-26** — All reviews same star rating  
> Mock 5 reviews all with stars=4.  
> Expected: `avgRating = "4.0"`. Breakdown: 4★ row = 100%, all others 0%.

### SUG-REV-PLAN-006 — TC: Search is Case-Insensitive

> **TC-REV-27** — Search uppercase vs lowercase  
> Type "GEORGE" → same results as "george" → same results as "George".  
> Source: `.toLowerCase().includes(q)` where `q = search.toLowerCase()`.

### SUG-REV-PLAN-007 — TC: Reply with Only Spaces (E4 — Already Tested)

> **TC-REV-28** — Whitespace-only reply disabled  
> Type "   " (3+ spaces) in reply textarea.  
> Expected: Submit button **DISABLED**. `.trim()` = `""` → `!""` = true.  
> *Already confirmed as PASS in live testing.*

### SUG-REV-PLAN-008 — TC: Very Long Comment Text (E5)

> **TC-REV-29** — Review with 500+ character comment  
> Inject mock review with 500-char comment.  
> Expected: Text wraps inside card body. No overflow. No truncation (no WebkitLineClamp).  
> Source line 156: `<Typography variant="body2" lineHeight={1.7}>{review.comment}</Typography>`.

### SUG-REV-PLAN-009 — TC: Multiple Filter Switches

> **TC-REV-30** — Switch filter rapidly (5★ → 3★ → 2★)  
> Verify no stale filter state between clicks.  
> Each switch should immediately update `filter` state and recompute `filtered`.

---

## Summary Table

| ID | Suggestion | Category | Priority |
|----|-----------|----------|----------|
| SUG-REV-001 | Persist delete via backend mutation | 🐛 Bug Fix | 🔴 High |
| SUG-REV-002 | Null guard for missing created_at | 🛡 Guard | 🔴 High |
| SUG-REV-003 | Fix delete/reply MockStore inconsistency | 🐛 Bug Fix | 🔴 High |
| SUG-REV-004 | Confirm dialog before delete | ✨ UX | 🟡 Medium |
| SUG-REV-005 | Clear button in search field | ✨ UX | 🟡 Medium |
| SUG-REV-006 | Edit/delete existing response | ✨ Feature | 🟡 Medium |
| SUG-REV-007 | Pagination / virtual scroll | ⚡ Performance | 🟡 Medium |
| SUG-REV-008 | Date range filter | ✨ Feature | 🟢 Low |
| SUG-REV-009 | Clinician dropdown filter | ✨ Feature | 🟢 Low |

### Quick Wins (1–3 lines):
- **SUG-REV-002**: Add `review.created_at ? new Date(...) : 'Date unknown'` guard (3 lines)
- **SUG-REV-003**: Add `MockStore.deleteReview(id)` and call it in `handleDelete` (5 lines)
