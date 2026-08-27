import { WebVitalsController } from './web-vitals.controller';

describe('WebVitalsController (P1-18)', () => {
  let controller: WebVitalsController;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    controller = new WebVitalsController();
    logSpy = jest.spyOn((controller as unknown as { logger: { log: (msg: string) => void } }).logger, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('logs the metric name, value, id and route pattern', () => {
    controller.report({ name: 'LCP', value: 1234.5, id: 'v1-1', page: '/dashboard' });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(logSpy.mock.calls[0][0]);
    expect(logged).toEqual({ metric: 'LCP', value: 1234.5, id: 'v1-1', page: '/dashboard' });
  });

  it('never receives a resolved URL -- the DTO field is named page and carries only a route pattern', () => {
    controller.report({ name: 'CLS', value: 0.03, id: 'v2-1', page: '/patients/:id' });

    const logged = JSON.parse(logSpy.mock.calls[0][0]);
    expect(logged.page).toBe('/patients/:id');
  });
});
