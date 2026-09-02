import { Module } from '@nestjs/common';
import { OperationTheatresService } from './operation-theatres.service';
import { OtBookingsService } from './ot-bookings.service';
import { OtChecklistsService } from './ot-checklists.service';
import { OtNotesService } from './ot-notes.service';
import { OtConsumablesService } from './ot-consumables.service';
import { OperationTheatreResolver } from './operation-theatre.resolver';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { IpdBillingModule } from '../ipd-billing/ipd-billing.module';

// REQ179 (IPD slice 3). EntitlementsModule for EntitlementGuard's own
// dependency, applied per-handler in the resolver (the wards.module.ts /
// admissions.module.ts / nursing.module.ts precedent). No notification
// integration this slice, deliberately -- see PLAN250's own scope note.
// IpdBillingModule (REQ179 slice 4) for OtBookingsService's/
// OtConsumablesService's own usage/consumable charge posting.
@Module({
  imports: [EntitlementsModule, IpdBillingModule],
  providers: [
    OperationTheatresService,
    OtBookingsService,
    OtChecklistsService,
    OtNotesService,
    OtConsumablesService,
    OperationTheatreResolver,
  ],
  exports: [OperationTheatresService, OtBookingsService],
})
export class OperationTheatreModule {}
