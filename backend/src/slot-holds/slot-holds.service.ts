import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

// P1-05 (BOOK-2) — a slot hold is UX, not the correctness backstop: the
// Appointments table's own Postgres EXCLUDE constraint is what actually
// makes "is this slot free" atomic (see appointments.service.ts's own
// comment, and test/integration/booking-concurrency.int-spec.ts, which
// already proves two concurrent bookings for one slot cannot both land).
// A hold's only job is to stop a SECOND patient from spending three
// minutes filling in the rest of the wizard for a slot the FIRST patient
// is already mid-booking on — reducing how often anyone hits that
// EXCLUDE-constraint rejection, not preventing it structurally.
//
// Redis, not Postgres: a hold is inherently ephemeral (TTL is the whole
// point) and losing one on a Redis restart just means the next patient can
// try that slot a little early — never a correctness problem, unlike the
// idempotency key (AppointmentIdempotencyKeys, a real table) which must
// survive to guarantee exactly-once booking.
const HOLD_TTL_SECONDS = 600; // 10 minutes — matches FRONTEND_RULES.md BOOK-2's own "Slot held for 9:45" example

export interface SlotHold {
  holdToken: string;
  expiresAt: Date;
}

@Injectable()
export class SlotHoldsService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private key(clinicianId: string, startIso: string): string {
    return `slot-hold:${clinicianId}:${startIso}`;
  }

  async holdSlot(clinicianId: string, startIso: string): Promise<SlotHold> {
    const holdToken = randomUUID();
    // SET ... NX is the atomic "acquire iff absent" primitive — two
    // concurrent hold requests for the same slot can never both succeed,
    // the same class of guarantee the EXCLUDE constraint gives the booking
    // itself, just enforced in Redis instead of Postgres.
    const set = await this.redis.set(this.key(clinicianId, startIso), holdToken, 'EX', HOLD_TTL_SECONDS, 'NX');
    if (set !== 'OK') {
      throw new BadRequestException('This slot is currently held by another patient — try another time or wait a moment');
    }
    return { holdToken, expiresAt: new Date(Date.now() + HOLD_TTL_SECONDS * 1000) };
  }

  // Safe release: only clears the key if it still holds THIS token, so a
  // late release after the TTL already expired and someone else acquired
  // the same key can never steal back a slot out from under them.
  async releaseSlot(clinicianId: string, startIso: string, holdToken: string): Promise<void> {
    const key = this.key(clinicianId, startIso);
    const current = await this.redis.get(key);
    if (current === holdToken) {
      await this.redis.del(key);
    }
  }

  // Called on a successful booking to tidy up the hold that led to it.
  // Deliberately silent/no-op on a missing or already-expired token — the
  // booking itself already succeeded (the EXCLUDE constraint is what
  // matters), so there is nothing left to guard by this point.
  async consumeIfOwned(clinicianId: string, startIso: string, holdToken: string | null | undefined): Promise<void> {
    if (!holdToken) return;
    await this.releaseSlot(clinicianId, startIso, holdToken);
  }

  // Backs the availability read path: a slot actively held by ANYONE
  // (including the caller's own in-flight hold, which the caller already
  // knows about locally) is surfaced as unavailable to every other reader,
  // the same way an already-booked appointment is.
  async listHeldStartTimesForDay(clinicianId: string, dayStartIso: string, dayEndIso: string): Promise<string[]> {
    const held: string[] = [];
    let cursor = '0';
    const prefix = this.key(clinicianId, '');
    do {
      // SCAN, never KEYS — this is a single-threaded server and KEYS blocks
      // it for the duration of a full keyspace walk under real load.
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
      cursor = next;
      for (const k of keys) {
        const iso = k.slice(prefix.length);
        if (iso >= dayStartIso && iso <= dayEndIso) held.push(iso);
      }
    } while (cursor !== '0');
    return held;
  }
}
