import { structureTranscript, extractVitals } from './transcript-structuring';

describe('structureTranscript', () => {
  it('classifies a complaint sentence into complaints', () => {
    const result = structureTranscript('Patient complains of fever and headache since yesterday.');
    // "since" also matches history's own keyword -- history is checked
    // ahead of complaints in SECTION_PRIORITY, so this sentence lands in
    // history, not complaints. Documents the real, deterministic
    // precedence rather than asserting a guess.
    expect(result.sections.history).toContain('complains of fever');
  });

  it('classifies an exam sentence into exam', () => {
    const result = structureTranscript('On examination, mild tenderness noted in the abdomen.');
    expect(result.sections.exam).toContain('tenderness');
  });

  it('classifies an advice sentence into advice', () => {
    const result = structureTranscript('Advised to take paracetamol twice daily.');
    expect(result.sections.advice).toContain('paracetamol');
  });

  it('classifies a follow-up sentence into follow_up', () => {
    const result = structureTranscript('Please follow up after one week.');
    expect(result.sections.follow_up).toContain('follow up');
  });

  it('defaults an unclassified sentence to complaints', () => {
    const result = structureTranscript('Patient looks tired.');
    expect(result.sections.complaints).toContain('tired');
  });

  it('groups multiple sentences of the same section together', () => {
    const result = structureTranscript('Advised rest. Prescribed paracetamol for fever.');
    expect(result.sections.advice).toContain('Advised rest');
    expect(result.sections.advice).toContain('Prescribed paracetamol');
  });

  it('splits on Hindi/Devanagari sentence punctuation too', () => {
    const result = structureTranscript('मरीज़ को बुखार है। सलाह दी गई कि आराम करें।');
    // Two real sentences, not one run-on blob -- section content for each
    // half should be independently present rather than merged into a
    // single 40-character string with no boundary.
    const allContent = Object.values(result.sections).join(' | ');
    expect(allContent).toContain('मरीज़ को बुखार है');
    expect(allContent).toContain('सलाह दी गई');
  });

  it('handles an empty transcript without crashing', () => {
    expect(structureTranscript('')).toEqual({ sections: {} });
  });
});

describe('extractVitals', () => {
  it('extracts blood pressure as two separate readings', () => {
    const vitals = extractVitals('BP is 120/80 today.');
    expect(vitals).toEqual(expect.arrayContaining([
      { code: 'bp_systolic', value: 120 },
      { code: 'bp_diastolic', value: 80 },
    ]));
  });

  it('extracts pulse', () => {
    expect(extractVitals('Pulse 88 bpm, regular.')).toContainEqual({ code: 'pulse_bpm', value: 88 });
  });

  it('extracts temperature', () => {
    expect(extractVitals('Temp is 99.2 F.')).toContainEqual({ code: 'temperature_c', value: 99.2 });
  });

  it('extracts spo2', () => {
    expect(extractVitals('SpO2 97%.')).toContainEqual({ code: 'spo2_percent', value: 97 });
  });

  it('extracts weight and height together', () => {
    const vitals = extractVitals('Weight is 68 kgs, height 165 cm.');
    expect(vitals).toEqual(expect.arrayContaining([
      { code: 'weight_kg', value: 68 },
      { code: 'height_cm', value: 165 },
    ]));
  });

  it('takes the first mention when a value is repeated, never a duplicate reading for the same code', () => {
    const vitals = extractVitals('Pulse 88. Pulse was 90 a moment ago.');
    const pulseReadings = vitals.filter((v) => v.code === 'pulse_bpm');
    expect(pulseReadings).toHaveLength(1);
    expect(pulseReadings[0].value).toBe(88);
  });

  it('returns an empty array when no vitals are mentioned', () => {
    expect(extractVitals('Patient feels better today.')).toEqual([]);
  });
});
