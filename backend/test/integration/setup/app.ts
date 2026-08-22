import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
// `import request from` needs esModuleInterop, which this tsconfig does not
// enable (it sets allowSyntheticDefaultImports only — types, not runtime).
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { Actor } from './actors';

/**
 * Boots the REAL AppModule — the whole guard chain, the real GraphQL schema,
 * the real Prisma client against the real test database.
 *
 * Nothing is overridden. The existing 641 unit tests all replace PrismaService
 * with a mock and assert the shape of the `where` object they were handed; that
 * design is structurally incapable of failing an isolation test, which is why
 * F-01 shipped green. The value here comes entirely from NOT substituting
 * anything.
 */

export interface GqlResult<T = any> {
  data: T | null;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
  /** First error code, or undefined on success — the common assertion target. */
  errorCode?: string;
}

export interface Harness {
  app: INestApplication;
  prisma: PrismaClient;
  gql<T = any>(query: string, variables?: Record<string, unknown>, actor?: Actor): Promise<GqlResult<T>>;
  close(): Promise<void>;
}

export async function createHarness(): Promise<Harness> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication();
  // Mirror main.ts exactly. A ValidationPipe difference between the test app
  // and the real one would let a DTO-validation regression pass here.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();

  const prisma = new PrismaClient();

  async function gql<T = any>(
    query: string,
    variables: Record<string, unknown> = {},
    actor?: Actor,
  ): Promise<GqlResult<T>> {
    const req = request(app.getHttpServer()).post('/graphql');
    if (actor?.token) req.set('Authorization', `Bearer ${actor.token}`);
    const res = await req.send({ query, variables });
    const body = res.body ?? {};
    return {
      data: body.data ?? null,
      errors: body.errors,
      errorCode: body.errors?.[0]?.extensions?.code,
    };
  }

  return {
    app,
    prisma,
    gql,
    close: async () => {
      await prisma.$disconnect();
      await app.close();
    },
  };
}
