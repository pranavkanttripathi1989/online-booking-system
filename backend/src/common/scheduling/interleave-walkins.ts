// REQ119 (REQ017 US-CAL-04 / REQ019 FR-QUE-02) — the hybrid-mode
// booked:walk-in interleaving algorithm, built once here per REQ017's own
// acceptance criterion ("this interleaving logic is shared with REQ019
// FR-QUE-02 — build it once, in the scheduling engine's queue-ordering
// function, and have queue management call it rather than reimplementing
// it"). Pure and generic: callers pass two already-priority-ordered lists,
// this only decides the merge order.
//
// A ratio of N means N booked entries, then 1 walk-in, repeating — not
// walk-ins simply appended after every booked patient. When one list runs
// out, the remainder of the other is appended so the queue never stalls
// waiting for a type that has none left.
export function interleaveByRatio<T>(booked: T[], walkIns: T[], ratio: number): T[] {
  const perGroup = Number.isInteger(ratio) && ratio >= 1 ? ratio : 1;
  const result: T[] = [];
  let bookedIndex = 0;
  let walkInIndex = 0;

  while (bookedIndex < booked.length || walkInIndex < walkIns.length) {
    for (let i = 0; i < perGroup && bookedIndex < booked.length; i++) {
      result.push(booked[bookedIndex++]);
    }
    if (walkInIndex < walkIns.length) {
      result.push(walkIns[walkInIndex++]);
    }
  }

  return result;
}
