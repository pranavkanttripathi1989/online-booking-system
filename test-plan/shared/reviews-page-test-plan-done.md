# Reviews Page — Test Plan

**Route:** `/reviews`
**File:** `frontend/src/pages/reviews/index.jsx`
**Status:** ⚠️ NOT DONE — Test has not been executed yet.

---

## Feature Overview

Platform-wide review moderation. Shows average rating with breakdown chart and a filterable/searchable list of review cards. Each card supports a reply (opens dialog) and delete (local state). Reply submitted via `MockStore.respondToReview`. Star filter (All/5/4/3/2/1) and search by patient/clinician name.

---

## Test Cases

### TC-REV-01 — Page Load
**Steps:** Navigate to `/reviews`. **Expected:** Title "Reviews", subtitle "Platform-wide patient feedback — {N} total". Average rating card + breakdown chart + review cards shown.

### TC-REV-02 — Average Rating Card
**Steps:** View rating card. **Expected:** Computed `avgRating` shown as large number (e.g., "4.3"). MUI `Rating` with star icons shown. "Based on {N} reviews" text below.

### TC-REV-03 — Rating Breakdown Chart
**Steps:** View breakdown section. **Expected:** 5 rows (5★–1★) each with: count, percentage bar, "{pct}% ({count})" label. Bars: ≥4★ green, 3★ amber, ≤2★ red.

### TC-REV-04 — Star Filter: All (Default)
**Steps:** Page loads. **Expected:** "All Stars" chip active (blue border); all reviews shown.

### TC-REV-05 — Star Filter: 5 Stars
**Steps:** Click "5 ★" chip. **Expected:** Only 5-star reviews shown; others hidden.

### TC-REV-06 — Star Filter: 1 Star
**Steps:** Click "1 ★" chip. **Expected:** Only 1-star reviews shown. If none exist, empty state.

### TC-REV-07 — Search: By Patient Name
**Steps:** Type "John". **Expected:** Only John Doe's review shown (case-insensitive).

### TC-REV-08 — Search: By Clinician Name
**Steps:** Type "Smith". **Expected:** Reviews for Dr. Smith shown.

### TC-REV-09 — Search: No Results
**Steps:** Type "zzz". **Expected:** "No reviews found" empty state with large star icon.

### TC-REV-10 — Review Card: Border Colour by Stars
**Steps:** View cards. **Expected:** ≤2★ → 1.5px solid #F5C6C2 (red-ish); 3★ → #FDD663 (yellow); others → #E8EAED (grey).

### TC-REV-11 — Review Card: Hover Effect
**Steps:** Hover over a card. **Expected:** Box shadow increases; card moves up `translateY(-2px)`.

### TC-REV-12 — Review Card: Star Rating
**Steps:** View stars on each card. **Expected:** Filled gold stars matching `review.stars` value.

### TC-REV-13 — Review Card: Existing Response
**Steps:** View a review with a `response` field set. **Expected:** Blue-bordered response box shown with "Manager Response" label and response text. No "Reply" button.

### TC-REV-14 — Review Card: No Reply Button When Response Exists
**Steps:** View reviewed card with existing response. **Expected:** Reply icon button NOT shown (`!review.response` check).

### TC-REV-15 — Reply Button: Opens Dialog
**Steps:** Click reply icon on a review without a response. **Expected:** Dialog opens titled "Reply to Review"; 4-row multiline textarea; Submit disabled when empty.

### TC-REV-16 — Reply Dialog: Submit Enabled
**Steps:** Type a non-empty response; check Submit button. **Expected:** Submit button enabled (`!replyDialog.text.trim()` = false).

### TC-REV-17 — Reply Dialog: Submit Response
**Steps:** Type "Thank you for your feedback"; click "Submit Response". **Expected:** `MockStore.respondToReview(id, text)` called; reviews refreshed; reply box appears on the card; dialog closes.

### TC-REV-18 — Reply Dialog: Cancel
**Steps:** Click "Cancel". **Expected:** Dialog closes; state reset; no change to review.

### TC-REV-19 — Delete Review
**Steps:** Click delete icon on any review. **Expected:** Review removed from local state (`setReviews(prev => prev.filter(...))`); card disappears.

### TC-REV-20 — Delete Updates Average
**Steps:** Delete a high-rating review. **Expected:** `avgRating` and breakdown recompute via `useMemo`; breakdown bars update.

### TC-REV-21 — Combined Filter + Search
**Steps:** Set filter="5" AND search="Emma". **Expected:** Only 5-star reviews from Emma shown.

---

## Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E1 | 0 reviews after all deleted | avgRating = "0.0"; empty state shown |
| E2 | `patient_name` or `clinician_name` undefined | `initials('')` → empty string; avatar empty but no crash |
| E3 | `created_at` missing | `new Date(undefined).toLocaleDateString()` → "Invalid Date" shown |
| E4 | Reply with only spaces | `!text.trim()` = true; Submit still disabled |
| E5 | Very long review comment | Wraps inside card; no line clamp |
