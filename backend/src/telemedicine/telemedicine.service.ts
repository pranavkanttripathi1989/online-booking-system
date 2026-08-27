import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncountersService } from '../encounters/encounters.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { dailyProvider } from './providers/daily.provider';

// P1-16 (REQ026) — real teleconsultation sessions. Every access check
// reuses EncountersService.encounter()'s own self/org-scoping rather than
// re-deriving it (a patient must be the patient on the encounter, a
// clinician must be its treating clinician) — the same "reuse, don't
// re-derive" pattern ai-clinical.service.ts established for the identical
// problem.

// US-TEL-02 — a join window, not an open-ended link: opens 10 minutes
// before the appointment's own start, closes at start + duration + a
// 15-minute grace period for a running-late consult.
const JOIN_WINDOW_BEFORE_MINUTES = 10;
const JOIN_WINDOW_AFTER_MINUTES = 15;

@Injectable()
export class TelemedicineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encountersService: EncountersService,
  ) {}

  private toGraphQL(session: any, roomUrl: string, token: string) {
    return {
      id: session.id,
      encounter_id: session.encounter_id,
      status: session.status,
      valid_from: session.valid_from,
      valid_to: session.valid_to,
      recording_consent_at: session.recording_consent_at,
      room_url: roomUrl,
      token,
    };
  }

  // Loads the encounter via the real self/org-scoping check, then a
  // second cheap lookup for the appointment timing + client_org_id --
  // encounter()'s own toGraphQL() strips client_org_id, and no query
  // here needs the full appointment record, just its own start/duration.
  private async loadEncounterAndAppointment(encounterId: string, user: JwtPayload) {
    const encounter = await this.encountersService.encounter(encounterId, user); // throws NotFoundException if inaccessible
    if (encounter.consultation_mode === 'in_person') {
      throw new BadRequestException('This appointment is in-person -- no video session applies');
    }
    const raw = await this.prisma.encounters.findUniqueOrThrow({
      where: { id: encounterId },
      select: { client_org_id: true, appointment: { select: { appointment_time: true, duration_minutes: true } } },
    });
    return { encounter, clientOrgId: raw.client_org_id, appointmentTime: raw.appointment.appointment_time, durationMinutes: raw.appointment.duration_minutes };
  }

  // Idempotent per encounter (one TelemedicineSessions row, @@unique on
  // encounter_id) -- find-then-create with the identical race guard
  // getOrCreateEncounter() already established (a genuine double-click or
  // two tabs opening the same video page can both pass the "no session
  // yet" check before either insert commits).
  async joinSession(encounterId: string, user: JwtPayload) {
    const { clientOrgId, appointmentTime, durationMinutes } = await this.loadEncounterAndAppointment(encounterId, user);

    let session = await this.prisma.telemedicineSessions.findUnique({ where: { encounter_id: encounterId } });
    if (!session) {
      const validFrom = new Date(appointmentTime.getTime() - JOIN_WINDOW_BEFORE_MINUTES * 60_000);
      const validTo = new Date(appointmentTime.getTime() + durationMinutes * 60_000 + JOIN_WINDOW_AFTER_MINUTES * 60_000);
      const roomName = `encounter-${encounterId}`;
      const room = await dailyProvider.createRoom(roomName, validTo);
      try {
        session = await this.prisma.telemedicineSessions.create({
          data: { client_org_id: clientOrgId, encounter_id: encounterId, room_name: room.name, room_url: room.url, valid_from: validFrom, valid_to: validTo },
        });
      } catch (e: any) {
        if (e.code === 'P2002') {
          session = await this.prisma.telemedicineSessions.findUnique({ where: { encounter_id: encounterId } });
          if (!session) throw e;
        } else {
          throw e;
        }
      }
    }

    const now = new Date();
    if (now < session.valid_from) {
      throw new BadRequestException(`This consultation opens at ${session.valid_from.toISOString()}`);
    }
    if (now > session.valid_to) {
      throw new BadRequestException('This consultation window has closed');
    }

    const isClinician = user.roles.includes('clinician');
    const token = await dailyProvider.createMeetingToken(session.room_name, isClinician ? 'Clinician' : 'Patient', isClinician, session.valid_to);

    if (session.status === 'pending') {
      session = await this.prisma.telemedicineSessions.update({ where: { id: session.id }, data: { status: 'active' } });
    }

    return this.toGraphQL(session, session.room_url, token);
  }

  // FR-TEL-03 -- recording is opt-in, per-session, clinician-initiated
  // only. Setting this flag is the durable compliance record; actually
  // starting the vendor's own cloud recording is a client-side SDK call
  // the frontend makes once this returns success (Daily's own recording
  // controls run inside its embedded call UI, not via a separate REST
  // trigger this backend would otherwise have to proxy).
  async consentToRecording(encounterId: string, user: JwtPayload) {
    if (!user.roles.includes('clinician')) {
      throw new ForbiddenException('Only the treating clinician can consent to recording');
    }
    await this.encountersService.encounter(encounterId, user); // self/org-scope check
    const session = await this.prisma.telemedicineSessions.findUnique({ where: { encounter_id: encounterId } });
    if (!session) throw new NotFoundException('No video session exists for this encounter yet');
    const updated = await this.prisma.telemedicineSessions.update({
      where: { id: session.id },
      data: { recording_consent_at: new Date(), recording_consent_by_user_id: user.sub },
    });
    return { success: true, recording_consent_at: updated.recording_consent_at };
  }
}
