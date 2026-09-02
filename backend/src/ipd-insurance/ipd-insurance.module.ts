import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { IpdInsuranceService } from './ipd-insurance.service';
import { PreAuthUtilizationSweepService } from './preauth-utilization-sweep.service';
import { IpdInsuranceResolver } from './ipd-insurance.resolver';
import { IpdInsuranceAttachmentsController } from './ipd-insurance-attachments.controller';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { IpdBillingModule } from '../ipd-billing/ipd-billing.module';
import { AuthModule } from '../auth/auth.module';

// REQ179 (IPD slice 5). EntitlementsModule for EntitlementGuard's own
// dependency (the wards/admissions/nursing/operation-theatre/ipd-billing
// module.ts precedent). ScheduleModule.forRoot() is idempotent and each
// sweep-owning module registers its own (the same precedent).
// IpdBillingModule for IpdBillingService -- settleIpdClaim reuses
// recordPayment() verbatim rather than duplicating payment-posting logic.
// AuthModule for JwtService, the encounters/messages attachments-
// controller precedent (their own bare token verification needs it).
// NotificationsModule is @Global(), so it is not imported here.
@Module({
  imports: [ScheduleModule.forRoot(), EntitlementsModule, IpdBillingModule, AuthModule],
  controllers: [IpdInsuranceAttachmentsController],
  providers: [IpdInsuranceService, PreAuthUtilizationSweepService, IpdInsuranceResolver],
  exports: [IpdInsuranceService],
})
export class IpdInsuranceModule {}
