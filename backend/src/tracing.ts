// P1-18 — OpenTelemetry distributed tracing.
//
// Wiring: imported as the literal FIRST line of main.ts (before even
// 'reflect-metadata'), not loaded via `-r`/NODE_OPTIONS. Auto-
// instrumentation patches modules (http, pg, ioredis, graphql, etc.) at
// require() time, so it must run before anything it instruments is first
// required -- importing it after other imports is the single most common
// way this silently produces zero spans despite the SDK reporting a clean
// start. A `-r` require flag was the original plan, but `nest-cli.json`
// here has no `webpack: true`, so `nest start --watch` and `start:prod`
// both compile straight to CommonJS with tsc and run `node dist/main.js`
// -- no bundler reordering to worry about, so a plain first-line import
// gives the same require-order guarantee as `-r` without the cross-script
// NODE_OPTIONS plumbing. Live-verified 2026-08-27: a real `curl` to
// /health produced a real exported span tree in `docker logs
// medibook_backend` via the console exporter below.
//
// Gated on OTEL_ENABLED (or a real collector endpoint) rather than always
// running, matching this codebase's own "unconfigured = clean no-op"
// convention (Sentry, the OTP-provider registry) -- unset, dev and test
// runs stay exactly as quiet as before this slice.
//
// No collector is deployed in this environment -- OTEL_EXPORTER_OTLP_ENDPOINT
// unset means every span is still genuinely created and processed, just
// exported to the console instead of a real backend (Jaeger/Grafana
// Tempo/a vendor).
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const enabled = process.env.OTEL_ENABLED === 'true' || !!otlpEndpoint;

if (enabled) {
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'medibook-backend' }),
    traceExporter: otlpEndpoint ? new OTLPTraceExporter({ url: otlpEndpoint }) : new ConsoleSpanExporter(),
    instrumentations: [
      getNodeAutoInstrumentations({
        // File-system instrumentation is extremely noisy (every module
        // require(), every static asset read) and adds real overhead for
        // no diagnostic value here -- disabled, matching the standard
        // recommendation for this instrumentation specifically.
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk.shutdown().catch(() => undefined);
  });
}
