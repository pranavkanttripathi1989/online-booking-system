import { IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator';

// P1-18 (PERF-5) — the five Core Web Vitals the `web-vitals` package
// reports. Deliberately no page/user-identifying content beyond the
// route path (no query string, no patient/appointment ids) -- this
// payload must never carry PHI (SEC-5), and route path alone is enough
// to answer "which screens are slow for real users".
const METRIC_NAMES = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as const;

export class WebVitalDto {
  @IsIn(METRIC_NAMES) name: (typeof METRIC_NAMES)[number];
  @IsNumber() value: number;
  @IsString() @IsNotEmpty() id: string;
  // The route pattern (e.g. "/appointments/:id"), not the resolved URL --
  // a resolved URL for a patient/appointment detail page would embed a
  // real record id, which this endpoint must never log.
  @IsString() @IsNotEmpty() page: string;
}
