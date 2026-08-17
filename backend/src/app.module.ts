import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { ClinicsModule } from './clinics/clinics.module';
import { RoomsModule } from './rooms/rooms.module';
import { LookupsModule } from './lookups/lookups.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { RolesGuard } from './common/guards/roles.guard';
import { GqlThrottlerGuard } from './common/guards/gql-throttler.guard';
import { GqlAuthGuard } from './common/guards/gql-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      introspection: process.env.NODE_ENV !== 'production',
      context: ({ req }: { req: Express.Request }) => ({ req }),
      // context/backend-hard-rules.md Rule 4: strip stack traces / raw Prisma
      // internals from GraphQL responses in production — added at the point
      // Phase 4 ships the first non-Auth resolvers, per that rule's own note.
      formatError: (formattedError) => {
        if (process.env.NODE_ENV === 'production') {
          const { extensions, ...rest } = formattedError;
          const { exception, ...safeExtensions } = (extensions ?? {}) as Record<string, unknown>;
          return { ...rest, extensions: safeExtensions };
        }
        return formattedError;
      },
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    ClinicsModule,
    RoomsModule,
    LookupsModule,
    OrganizationsModule,
  ],
  providers: [
    // Order matters — NestJS runs APP_GUARD providers in this array order,
    // and always before any per-handler @UseGuards(): throttle first (cheapest,
    // no DB/user needed), then auth (populates req.user or rejects/short-circuits
    // via @Public()), then role-check (now guaranteed a populated req.user).
    { provide: APP_GUARD, useClass: GqlThrottlerGuard },
    { provide: APP_GUARD, useClass: GqlAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
