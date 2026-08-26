import { interleaveByRatio } from './interleave-walkins';

describe('interleaveByRatio', () => {
  it('interleaves N booked to 1 walk-in, not simply appended after all booked', () => {
    const booked = ['b1', 'b2', 'b3', 'b4', 'b5'];
    const walkIns = ['w1', 'w2'];
    expect(interleaveByRatio(booked, walkIns, 3)).toEqual(['b1', 'b2', 'b3', 'w1', 'b4', 'b5', 'w2']);
  });

  it('appends the remainder of walk-ins once booked is exhausted', () => {
    expect(interleaveByRatio(['b1'], ['w1', 'w2', 'w3'], 3)).toEqual(['b1', 'w1', 'w2', 'w3']);
  });

  it('appends the remainder of booked once walk-ins are exhausted', () => {
    expect(interleaveByRatio(['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'], ['w1'], 3)).toEqual(['b1', 'b2', 'b3', 'w1', 'b4', 'b5', 'b6', 'b7']);
  });

  it('a ratio of 1 alternates one-for-one', () => {
    expect(interleaveByRatio(['b1', 'b2'], ['w1', 'w2'], 1)).toEqual(['b1', 'w1', 'b2', 'w2']);
  });

  it('returns just the walk-ins when there are no booked entries', () => {
    expect(interleaveByRatio([], ['w1', 'w2'], 3)).toEqual(['w1', 'w2']);
  });

  it('returns just the booked entries when there are no walk-ins', () => {
    expect(interleaveByRatio(['b1', 'b2'], [], 3)).toEqual(['b1', 'b2']);
  });

  it('treats a non-positive or non-integer ratio as 1, never dividing by zero or looping forever', () => {
    expect(interleaveByRatio(['b1', 'b2'], ['w1', 'w2'], 0)).toEqual(['b1', 'w1', 'b2', 'w2']);
    expect(interleaveByRatio(['b1', 'b2'], ['w1'], -3)).toEqual(['b1', 'w1', 'b2']);
  });

  it('returns an empty array when both inputs are empty', () => {
    expect(interleaveByRatio([], [], 3)).toEqual([]);
  });
});
