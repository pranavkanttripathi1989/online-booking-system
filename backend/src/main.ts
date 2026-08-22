import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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
