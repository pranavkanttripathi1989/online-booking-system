import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { assertKnownNodeEnv } from './common/utils/assert-known-node-env';

async function bootstrap() {
  assertKnownNodeEnv(process.env.NODE_ENV);

  // rawBody: true (REQ040) -- preserves req.rawBody as a Buffer alongside
  // the normally-parsed JSON body on every request. Needed by
  // appointment-payments-webhook.controller.ts: Razorpay's webhook HMAC is
  // computed over the exact raw request bytes, and re-serializing the
  // parsed object would not reliably reproduce the same byte sequence.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  // P3.7/F-09: contentSecurityPolicy is limited to production -- Apollo
  // Server's dev-only Sandbox landing page (auto-enabled whenever
  // introspection is on, see app.module.ts) loads an iframe from
  // studio.apollographql.com that helmet's strict default CSP blocks
  // outright, breaking a real, documented dev workflow for no production
  // security benefit (introspection is already off in production). HSTS
  // and helmet's other headers stay on unconditionally -- HSTS is a no-op
  // over plain HTTP, so it costs nothing in dev.
  //
  // crossOriginResourcePolicy relaxed to 'cross-origin' unconditionally --
  // the frontend and backend are two different origins (separate ports in
  // dev, likely separate subdomains in production) and org logos/user
  // avatars served from /uploads/ are genuinely meant to be embeddable from
  // the frontend's origin. Helmet's 'same-origin' default would silently
  // break every <img> tag pointing at one, in every environment.
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // PLAN016 Slice B — avatar uploads (account.controller.ts) served locally,
  // no S3 credentials exist in this environment. See that file's header
  // comment for the swap-to-S3-ap-south-1 path once credentials land.
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // F-29. Without this, Nest never listens for SIGTERM/SIGINT, so
  // onApplicationShutdown / onModuleDestroy never run on a container stop —
  // the Redis client and Prisma pool are torn down by process death rather
  // than closed. `app.close()` (which the integration harness calls) triggers
  // the same hooks; this is what wires them to real signals in production.
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`GraphQL endpoint ready at http://localhost:${port}/graphql`);
}

bootstrap();
