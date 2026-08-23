import { clampTakeMiddleware, DEFAULT_MAX_TAKE } from './clamp-take.middleware';

describe('clampTakeMiddleware', () => {
  const next = jest.fn((params) => Promise.resolve(params));

  beforeEach(() => next.mockClear());

  it('clamps a findMany with no args at all', async () => {
    const middleware = clampTakeMiddleware();
    await middleware({ model: 'Patients', action: 'findMany', args: undefined, dataPath: [], runInTransaction: false }, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ args: { take: DEFAULT_MAX_TAKE } }));
  });

  it('clamps a findMany whose args omit take', async () => {
    const middleware = clampTakeMiddleware();
    await middleware(
      { model: 'Patients', action: 'findMany', args: { where: { is_deleted: false } }, dataPath: [], runInTransaction: false },
      next,
    );
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ args: { where: { is_deleted: false }, take: DEFAULT_MAX_TAKE } }),
    );
  });

  it('does not override an explicitly-set take, even a large one', async () => {
    const middleware = clampTakeMiddleware();
    await middleware(
      { model: 'Patients', action: 'findMany', args: { take: 5000 }, dataPath: [], runInTransaction: false },
      next,
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ args: { take: 5000 } }));
  });

  it('does not touch a non-findMany action (e.g. findFirst, create)', async () => {
    const middleware = clampTakeMiddleware();
    await middleware(
      { model: 'Patients', action: 'findFirst', args: { where: { id: 'p1' } }, dataPath: [], runInTransaction: false },
      next,
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ args: { where: { id: 'p1' } } }));
  });

  it('accepts a custom default max', async () => {
    const middleware = clampTakeMiddleware(50);
    await middleware({ model: 'Patients', action: 'findMany', args: {}, dataPath: [], runInTransaction: false }, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ args: { take: 50 } }));
  });
});
