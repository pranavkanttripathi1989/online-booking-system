---
id: TP031
type: test-plan
feature: reviews
created: 2026-04-02
updated: 2026-04-02
status: approved
parent: unknown
related: [TR030, TS031]
---

# Reviews Page — Test Plan (v2.0)

**Module:** Platform Reviews (`/reviews`)
**Source:** `frontend/src/pages/reviews/index.jsx`
**MockStore:** `mocks/store.js` — `getReviews()`, `respondToReview()`, `deleteReview()`
**Updated:** 2026-03-31 (Session QA v2.0)

---

## Feature Overview

Single-page reviews moderation view. Star filter chips (All Stars, 5★–1★) + search field with clear button. Rating Average card + Rating Breakdown bars. Review cards with avatar, patient→clinician name, date, stars, comment, Manager Response. Reply Dialog (new response only). Delete Confirm Dialog (new v2.0). MockStore-backed — fully offline.

---

## 1. Page Load & Stats

### TC-REV-01 — Page load with mock data
**Steps:** Navigate to `/reviews`.
**Expected:** "Reviews" h4. Subtitle "Platform-wide patient feedback — 15 total". Platform Average card (4.3, gold stars, "Based on 15 reviews"). Rating Breakdown card (5 bars, correct percentages). 15 review cards. No errors.

---

### TC-REV-02 — Average rating calculation
**Steps:** View Platform Average card.
**Expected:** `avgRating = (sum / total).toFixed(1)`. Based on 15 reviews label.

---

### TC-REV-03 — Rating breakdown bars
**Steps:** View Rating Breakdown card.
**Expected:** 5★ green bar (53%), 4★ green (27%), 3★ amber (13%), 2★ red (7%), 1★ empty (0%). 0.6s width transition. Count in parentheses per row.

---

### TC-REV-04 — Zero reviews → average 0.0
**Steps:** Delete all reviews or apply star filter with 0 matches.
**Expected:** avgRating = "0.0". "0 total" in subtitle. Breakdown all 0%.

---

## 2. Star Filter

### TC-REV-05 — "All Stars" chip default active
**Steps:** Page load.
**Expected:** "All Stars" chip: #E8F0FE bg, #1A73E8 text, #AECBFA border. All 15 reviews shown.

---

### TC-REV-06 — 5★ filter
**Steps:** Click "5 ★" chip.
**Expected:** 8 reviews shown (53%). Each has 5 filled gold stars. Chip turns active.

---

### TC-REV-07 — 1★ filter → empty state
**Steps:** Click "1 ★" chip.
**Expected:** 0 reviews → empty state: grey StarRoundedIcon + "No reviews found".

---

### TC-REV-08 — Multiple filter switches (no stale state)
**Steps:** Click "5★" → "3★" → "2★" → "All Stars" rapidly.
**Expected:** Correct reviews shown for each. No stale state between clicks.

---

### TC-REV-09 — All same-star reviews calculation
**Steps:** Filter "5★" (8 reviews, all 5★).
**Expected:** Breakdown still computed from full dataset. avgRating still 4.3 (not 5.0).

---

## 3. Search

### TC-REV-10 — Search by patient name (case-insensitive)
**Steps:** Type "john" (lowercase).
**Expected:** Reviews with "john" in patient_name (case-insensitive) shown. Others hidden.

---

### TC-REV-11 — Search by clinician name (OR logic)
**Steps:** Type a clinician's name.
**Expected:** Reviews by that clinician shown regardless of patient name.

---

### TC-REV-12 — Search no match → empty state
**Steps:** Type "zzz123".
**Expected:** filtered.length=0 → "No reviews found" empty state.

---

### TC-REV-13 — Search clear × button
**Steps:** Type "alice"; click × button at end of search field.
**Expected:** × appears when search non-empty. Click clears search (sets ''). All 15 reviews return. × hidden when empty.

---

### TC-REV-14 — Search uppercase vs lowercase
**Steps:** Type "GEORGE" → "george" → "George".
**Expected:** Identical results for all 3 inputs (q=search.toLowerCase()).

---

### TC-REV-15 — Search + star filter combined
**Steps:** Set filter="5★"; type partial patient name.
**Expected:** Only 5★ reviews matching search term shown.

---

## 4. Review Card UI

### TC-REV-16 — Card structure
**Steps:** View any review card.
**Expected:** Avatar (2-letter initials, blue bg). Patient name → Clinician name. Date (DD Mon YYYY). Stars. Comment text.

---

### TC-REV-17 — Card border color by stars
**Steps:** View ≤2★, 3★, ≥4★ cards.
**Expected:** ≤2★: #F5C6C2 pink; 3★: #FDD663 amber; ≥4★: #E8EAED neutral.

---

### TC-REV-18 — Manager Response shown on card
**Steps:** View review with existing response field.
**Expected:** Blue left-border box "Manager Response" + response text. Reply button hidden.

---

### TC-REV-19 — Missing created_at → "Date unknown"
**Steps:** Review with created_at=undefined.
**Expected:** "Date unknown" shown (not "Invalid Date"). Guard: review.created_at ? formatDate : 'Date unknown'.

---

### TC-REV-20 — Long comment wraps without overflow
**Steps:** Review with 500+ character comment.
**Expected:** Text wraps inside card. No horizontal scroll, no truncation.

---

## 5. Reply Flow

### TC-REV-21 — Reply button: only shown without response
**Steps:** View unresponded review.
**Expected:** Blue ReplyRoundedIcon button visible. Review with existing response: button hidden.

---

### TC-REV-22 — Reply dialog: open + empty + disabled submit
**Steps:** Click Reply icon.
**Expected:** Dialog opens. Textarea empty. "Submit Response" button disabled.

---

### TC-REV-23 — Reply dialog: whitespace-only stays disabled
**Steps:** Type "   " (spaces).
**Expected:** "Submit Response" stays disabled (.trim()='' → falsy).

---

### TC-REV-24 — Reply dialog: cancel
**Steps:** Click Reply; type text; click Cancel.
**Expected:** Dialog closes. Review unchanged (no response added).

---

### TC-REV-25 — Reply: submit response
**Steps:** Open reply; type "Thank you!"; click Submit Response.
**Expected:** Dialog closes. "Manager Response" box appears on card. Reply icon hidden. MockStore.respondToReview called.

---

### TC-REV-26 — Reply persists in MockStore
**Steps:** Submit reply; refresh/re-read store.
**Expected:** Response still present (respondToReview mutates store.reviews[i].response in-place).

---

## 6. Delete Flow

### TC-REV-27 — Delete icon opens confirm dialog
**Steps:** Click red delete icon.
**Expected:** Confirm dialog: "Delete Review?" + "Are you sure? This action cannot be undone." + Cancel + red Delete buttons. Review NOT deleted yet.

---

### TC-REV-28 — Delete confirm: cancel
**Steps:** Open delete dialog; click Cancel.
**Expected:** Dialog closes. Review still in list.

---

### TC-REV-29 — Delete confirm: confirm → review removed
**Steps:** Click delete icon; click "Delete" in dialog.
**Expected:** Dialog closes. Review removed from list. Total count decremented. avgRating recalculated.

---

### TC-REV-30 — Delete persists to MockStore
**Steps:** Delete review; call MockStore.getReviews() (implicit via setReviews).
**Expected:** Review absent in re-read (MockStore.deleteReview filters in-place). Not just local React state.

---

## Edge Cases

| # | Edge | Expected |
|---|------|----------|
| E1 | created_at=undefined | "Date unknown" shown (null guard) |
| E2 | review.response=null | Reply icon shown; no "Manager Response" box |
| E3 | initials('') → split by space | Returns '' (min 0 chars) |
| E4 | reply text="   " (spaces) | Submit disabled (.trim()='') |
| E5 | Delete last review → 0 total | "No reviews found" empty state; "0 total" subtitle; avgRating "0.0" |
| E6 | Filter "1★" + search + 0 results | Empty state shown (filter AND search) |
| E7 | Very long patient name | Typography wraps inside card (min-width: 0 on flex child) |
| E8 | Rapid star switches | No stale state — useState immediately updates filtered |

---

## Total: 30 Test Cases + 8 Edge Cases
