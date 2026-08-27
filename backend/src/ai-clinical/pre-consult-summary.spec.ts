import { buildPreConsultSummary } from './pre-consult-summary';

describe('buildPreConsultSummary', () => {
  it('always includes an active allergy first, even with many other events competing for the cap', () => {
    const timeline = Array.from({ length: 10 }, (_, i) => ({
      type: 'diagnosis',
      date: new Date(Date.now() - i * 86400000),
      title: `Diagnosis ${i}`,
    }));
    const bullets = buildPreConsultSummary(timeline, [{ text: 'Penicillin' }]);
    expect(bullets[0]).toBe('Allergies: Penicillin');
  });

  it('combines multiple allergies into one bullet, not one per allergy', () => {
    const bullets = buildPreConsultSummary([], [{ text: 'Penicillin' }, { text: 'Peanuts' }]);
    expect(bullets).toEqual(['Allergies: Penicillin, Peanuts']);
  });

  it('includes the most recent diagnosis', () => {
    const timeline = [
      { type: 'diagnosis', date: new Date(), title: 'Type 2 Diabetes' },
      { type: 'diagnosis', date: new Date(Date.now() - 100000), title: 'Old diagnosis' },
    ];
    const bullets = buildPreConsultSummary(timeline, []);
    expect(bullets).toContain('Recent diagnosis: Type 2 Diabetes');
  });

  it('includes the last visit with its chief complaint and relative recency', () => {
    const timeline = [
      { type: 'encounter', date: new Date(Date.now() - 3 * 86400000), title: 'Consultation (signed)', summary: 'Fever and cough' },
    ];
    const bullets = buildPreConsultSummary(timeline, []);
    expect(bullets).toContain('Last visit (3 days ago): Fever and cough');
  });

  it('says "today" and "yesterday" for very recent visits, not "0 days ago"', () => {
    const todayBullets = buildPreConsultSummary([{ type: 'encounter', date: new Date(), title: 'x', summary: 'checkup' }], []);
    expect(todayBullets[0]).toContain('(today)');
    const yesterdayBullets = buildPreConsultSummary(
      [{ type: 'encounter', date: new Date(Date.now() - 86400000 - 1000), title: 'x', summary: 'checkup' }],
      [],
    );
    expect(yesterdayBullets[0]).toContain('(yesterday)');
  });

  it('flags a pending (non-completed) test result', () => {
    const timeline = [{ type: 'test_result', date: new Date(), title: 'CBC', summary: 'pending' }];
    expect(buildPreConsultSummary(timeline, [])).toContain('Test result pending: CBC');
  });

  it('does not flag a completed test result as pending', () => {
    const timeline = [{ type: 'test_result', date: new Date(), title: 'CBC', summary: 'completed' }];
    expect(buildPreConsultSummary(timeline, []).some((b) => b.includes('CBC'))).toBe(false);
  });

  it('never exceeds 5 bullets, even with every category represented', () => {
    const timeline = [
      { type: 'diagnosis', date: new Date(), title: 'Diabetes' },
      { type: 'encounter', date: new Date(), title: 'x', summary: 'checkup' },
      { type: 'test_result', date: new Date(), title: 'CBC', summary: 'pending' },
      { type: 'attachment', date: new Date(), title: 'scan.pdf' },
    ];
    const bullets = buildPreConsultSummary(timeline, [{ text: 'Penicillin' }, { text: 'Sulfa' }]);
    expect(bullets.length).toBeLessThanOrEqual(5);
  });

  it('returns an empty array for a patient with no history at all — a real, honest empty state', () => {
    expect(buildPreConsultSummary([], [])).toEqual([]);
  });
});
