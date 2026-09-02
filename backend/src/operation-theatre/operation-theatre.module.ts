import { Module } from '@nestjs/common';
import { OperationTheatresService } from './operation-theatres.service';
import { OtBookingsService } from './ot-bookings.service';
import { OtChecklistsService } from './ot-checklists.service';
import { OtNotesService } from './ot-notes.service';
import { OtConsumablesService } from './ot-consumables.service';
import { OperationTheatreResolver } from './operation-theatre.resolver';
import { EntitlementsModule } from '../entitlements/entitlements.module';

// REQ179 (IPD slice 3). EntitlementsModule for EntitlementGuard's own
// dependency, applied per-handler in the resolver (the wards.module.ts /
// admissions.module.ts / nursing.module.ts precedent). No notification
// integration this slice, deliberately -- see PLAN250's own scope note.
@Module({
  imports: [EntitlementsModule],
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
