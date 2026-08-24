import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { ClinicsModule } from './clinics/clinics.module';
import { RoomsModule } from './rooms/rooms.module';
import { ResourcesModule } from './resources/resources.module';
import { DepartmentsModule } from './departments/departments.module';
import { LookupsModule } from './lookups/lookups.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { LanguagesModule } from './languages/languages.module';
import { EmailTemplatesModule } from './email-templates/email-templates.module';
import { ServicesModule } from './services/services.module';
import { CliniciansModule } from './clinicians/clinicians.module';
import { TestResultsModule } from './test-results/test-results.module';
import { PatientsModule } from './patients/patients.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AvailabilityModule } from './availability/availability.module';
import { BlocksModule } from './blocks/blocks.module';
import { CancellationRulesModule } from './cancellation-rules/cancellation-rules.module';
import { AccountModule } from './account/account.module';
import { NotificationPreferencesModule } from './notification-preferences/notification-preferences.module';
import { OrgSettingsModule } from './org-settings/org-settings.module';
import { AppointmentPaymentsModule } from './appointment-payments/appointment-payments.module';
import { UsersModule } from './users/users.module';
import { StaffModule } from './staff/staff.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReviewsModule } from './reviews/reviews.module';
import { MessagesModule } from './messages/messages.module';
import { PublicModule } from './public/public.module';
import { ProductsModule } from './products/products.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DrugsModule } from './drugs/drugs.module';
import { OrganizationOnboardingModule } from './organization-onboarding/organization-onboarding.module';
import { EncountersModule } from './encounters/encounters.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { QueueModule } from './queue/queue.module';
import { BookingWidgetModule } from './booking-widget/booking-widget.module';
import { PlansModule } from './plans/plans.module';
import { ConsentModule } from './consent/consent.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { InsuranceModule } from './insurance/insurance.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { ScheduledReportsModule } from './scheduled-reports/scheduled-reports.module';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { GqlThrottlerGuard } from './common/guards/gql-throttler.guard';
import { GqlAuthGuard } from './common/guards/gql-auth.guard';
import { IpWhitelistGuard } from './common/guards/ip-whitelist.guard';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { PubSubModule } from './common/pubsub.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      introspection: process.env.NODE_ENV !== 'production',
      // Subscriptions (appointmentUpdated, messageReceived — next-10-features-
      // implementation-plan.md #2/#10) run over graphql-ws, a separate
      // transport from the HTTP query/mutation path. The context factory
      // below is called for both: HTTP requests arrive as { req, res } and
      // already carry req.user (populated by GqlAuthGuard's passport-jwt
      // flow reading req.headers.authorization); WS connections arrive as a
      // graphql-ws Context with no req at all, so one is synthesized here
      // from connectionParams, carrying the client's token in the same
      // header shape passport-jwt already knows how to extract — this lets
      // every existing @Auth()/@Public() guard work unchanged for
      // subscriptions, with no separate WS-specific auth path to maintain.
      context: (ctxOrReq: any) => {
        if (ctxOrReq?.req) {
          return { req: ctxOrReq.req };
        }
        const token = ctxOrReq?.connectionParams?.authorization ?? ctxOrReq?.connectionParams?.Authorization;
        return { req: { headers: { authorization: token } } };
      },
      subscriptions: {
        'graphql-ws': true,
      },
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
    PubSubModule,
    AuthModule,
    ClinicsModule,
    RoomsModule,
    ResourcesModule,
    DepartmentsModule,
    LookupsModule,
    OrganizationsModule,
    OrganizationOnboardingModule,
    LanguagesModule,
    EmailTemplatesModule,
    ServicesModule,
    CliniciansModule,
    TestResultsModule,
    PatientsModule,
    AppointmentsModule,
    AvailabilityModule,
    BlocksModule,
    EncountersModule,
    PrescriptionsModule,
    QueueModule,
    CancellationRulesModule,
    AccountModule,
    NotificationPreferencesModule,
    OrgSettingsModule,
    AppointmentPaymentsModule,
    UsersModule,
    StaffModule,
    NotificationsModule,
    ReviewsModule,
    MessagesModule,
    PublicModule,
    ProductsModule,
    AnalyticsModule,
    DashboardModule,
    DrugsModule,
    BookingWidgetModule,
    PlansModule,
    ConsentModule,
    PharmacyModule,
    WebhooksModule,
    InsuranceModule,
    ApiKeysModule,
    ScheduledReportsModule,
  ],
  providers: [
    // Order matters — NestJS runs APP_GUARD providers in this array order,
    // and always before any per-handler @UseGuards(): throttle first (cheapest,
    // no DB/user needed), then auth (populates req.user or rejects/short-circuits
    // via @Public()), then role-check (now guaranteed a populated req.user).
    { provide: APP_GUARD, useClass: GqlThrottlerGuard },
    { provide: APP_GUARD, useClass: GqlAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // REQ049/REQ015 — runs after role-check (a caller who already failed
    // @Roles() never reaches here), enforces @RequirePermission() against
    // the caller's real, server-resolved permission set. A resolver with
    // neither decorator is unaffected by either guard.
    { provide: APP_GUARD, useClass: PermissionsGuard },
    // REQ012/PLAN021 — runs last (req.user and its role are already
    // verified), enforces the org's own IP whitelist for manager-role
    // callers only. See the guard's own file for the deliberate
    // self-lockout exemption on the settings mutation itself.
    { provide: APP_GUARD, useClass: IpWhitelistGuard },
    // Runs after the guards above (req.user is already populated),
    // observes every mutation's outcome without altering it.
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
