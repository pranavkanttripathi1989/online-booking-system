// P1-13 (FR-AI-09) — "condense patientTimeline to <=5 bullets." Pure,
// deterministic ranking over data this codebase already computes for
// real (encounters.service.ts's own patientTimeline()/
// patientAllergyBanner()) — no external AI call at all, and none needed:
// this is a real summarization ALGORITHM (recency + clinical-safety
// ranking), not a language-generation problem, so it needed no
// "buy, don't build" vendor the way transcription genuinely does.
//
// Priority, safety before recency: an active allergy is the one thing a
// clinician must never miss walking in, so it is never bumped by the
// 5-bullet cap the way a merely-recent event could be.

export interface TimelineEventLike {
  type: string;
  date: Date | string;
  title: string;
  summary?: string;
}

export interface AllergyLike {
  text: string;
}

const MAX_BULLETS = 5;

function daysAgo(date: Date | string): number {
  const ms = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function buildPreConsultSummary(timeline: TimelineEventLike[], allergies: AllergyLike[]): string[] {
  const bullets: string[] = [];

  // 1 (always, if any) — safety-critical, never displaced.
  if (allergies.length > 0) {
    bullets.push(`Allergies: ${allergies.map((a) => a.text).join(', ')}`);
  }

  const mostRecentDiagnosis = timeline.find((e) => e.type === 'diagnosis');
  if (mostRecentDiagnosis) {
    bullets.push(`Recent diagnosis: ${mostRecentDiagnosis.title}`);
  }

  const mostRecentEncounter = timeline.find((e) => e.type === 'encounter');
  if (mostRecentEncounter) {
    const age = daysAgo(mostRecentEncounter.date);
    const recency = age === 0 ? 'today' : age === 1 ? 'yesterday' : `${age} days ago`;
    bullets.push(
      mostRecentEncounter.summary
        ? `Last visit (${recency}): ${mostRecentEncounter.summary}`
        : `Last visit: ${recency}`,
    );
  }

  const pendingTestResult = timeline.find((e) => e.type === 'test_result' && e.summary !== 'completed');
  if (pendingTestResult) {
    bullets.push(`Test result pending: ${pendingTestResult.title}`);
  }

  const recentAttachment = timeline.find((e) => e.type === 'attachment');
  if (recentAttachment && bullets.length < MAX_BULLETS) {
    bullets.push(`Recent document on file: ${recentAttachment.title}`);
  }

  return bullets.slice(0, MAX_BULLETS);
}
