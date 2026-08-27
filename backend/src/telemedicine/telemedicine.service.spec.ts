import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TelemedicineService } from './telemedicine.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncountersService } from '../encounters/encounters.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// P1-16 (REQ026) — real teleconsultation sessions. Access control is
// entirely reused from EncountersService.encounter() (mocked here,
// exercised for real in encounters.service.spec.ts), not re-derived --
// these tests only prove telemedicine.service.ts's own logic: session
// idempotency, the join window, and the recording-consent gate.
describe('TelemedicineService', () => {
  let service: TelemedicineService;
  let prisma: any;
  let encountersService: { encounter: jest.Mock };

  const clinicianA: JwtPayload = { sub: 'clin-a', roles: ['clinician'], client_org_id: 'org-a', patient_id: null, clinician_id: 'clin-a' } as JwtPayload;
  const patientA: JwtPayload = { sub: 'pat-a', roles: ['patient'], client_org_id: 'org-a', patient_id: 'pat-a', clinician_id: null } as JwtPayload;

  const videoEncounter = { id: 'enc-1', patient_id: 'pat-a', clinician_id: 'clin-a', consultation_mode: 'video' };
  // Anchored to Date.now() (not a fixed calendar date) so the join-window
  // math below always lands "now" inside the open window, regardless of
  // when this suite actually runs.
  const appointmentTime = new Date(Date.now());

  const existingSession = {
    id: 'sess-1',
    client_org_id: 'org-a',
    encounter_id: 'enc-1',
    room_name: 'encounter-enc-1',
    room_url: 'https://medibook.daily.co/encounter-enc-1',
    status: 'pending',
    valid_from: new Date(appointmentTime.getTime() - 10 * 60_000),
    valid_to: new Date(appointmentTime.getTime() + 30 * 60_000 + 15 * 60_000),
    recording_consent_at: null,
  };

  beforeEach(async () => {
    prisma = {
      encounters: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          client_org_id: 'org-a',
          appointment: { appointment_time: appointmentTime, duration_minutes: 30 },
        }),
      },
      telemedicineSessions: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockImplementation((args) => Promise.resolve({ ...existingSession, ...args.data })),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemedicineService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncountersService, useValue: (encountersService = { encounter: jest.fn().mockResolvedValue(videoEncounter) }) },
      ],
    }).compile();
    service = module.get(TelemedicineService);
    process.env.DAILY_API_KEY = 'test-key';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete process.env.DAILY_API_KEY;
    jest.restoreAllMocks();
  });

  describe('joinSession', () => {
    it('rejects an in-person encounter -- no video session applies', async () => {
      encountersService.encounter.mockResolvedValue({ ...videoEncounter, consultation_mode: 'in_person' });
      await expect(service.joinSession('enc-1', clinicianA)).rejects.toThrow(BadRequestException);
      expect(prisma.telemedicineSessions.findUnique).not.toHaveBeenCalled();
    });

    it('reuses EncountersService.encounter() for access control, never re-derives it', async () => {
      encountersService.encounter.mockRejectedValue(new NotFoundException('Encounter not found'));
      await expect(service.joinSession('enc-1', patientA)).rejects.toThrow(NotFoundException);
    });

    it('creates a real room via the video provider on first join, and a durable session row', async () => {
      prisma.telemedicineSessions.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      prisma.telemedicineSessions.create.mockResolvedValue(existingSession);
      prisma.telemedicineSessions.update.mockResolvedValue({ ...existingSession, status: 'active' });
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ name: 'encounter-enc-1', url: 'https://medibook.daily.co/encounter-enc-1' }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ token: 'jwt-token-123' }) });

      const result = await service.joinSession('enc-1', clinicianA);

      expect(global.fetch).toHaveBeenNthCalledWith(1, 'https://api.daily.co/v1/rooms', expect.objectContaining({ method: 'POST' }));
      expect(prisma.telemedicineSessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ client_org_id: 'org-a', encounter_id: 'enc-1', room_name: 'encounter-enc-1' }) }),
      );
      expect(result.token).toBe('jwt-token-123');
      expect(result.room_url).toBe('https://medibook.daily.co/encounter-enc-1');
    });

    it('does not create a second room/session on a repeat join -- idempotent per encounter', async () => {
      prisma.telemedicineSessions.findUnique.mockResolvedValue(existingSession);
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ token: 'jwt-token-456' }) });

      await service.joinSession('enc-1', clinicianA);

      expect(prisma.telemedicineSessions.create).not.toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledTimes(1); // only the meeting-token call, no room-create call
    });

    it('rejects joining before the window opens', async () => {
      prisma.telemedicineSessions.findUnique.mockResolvedValue({ ...existingSession, valid_from: new Date(Date.now() + 60 * 60_000) });
      await expect(service.joinSession('enc-1', clinicianA)).rejects.toThrow(/opens at/);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('rejects joining after the window has closed', async () => {
      prisma.telemedicineSessions.findUnique.mockResolvedValue({ ...existingSession, valid_from: new Date(Date.now() - 60 * 60_000), valid_to: new Date(Date.now() - 30 * 60_000) });
      await expect(service.joinSession('enc-1', clinicianA)).rejects.toThrow(/window has closed/);
    });

    it('issues an owner token for the clinician and a non-owner token for the patient', async () => {
      prisma.telemedicineSessions.findUnique.mockResolvedValue(existingSession);
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => Promise.resolve({ token: 't' }) });

      await service.joinSession('enc-1', clinicianA);
      let body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.properties.is_owner).toBe(true);

      (global.fetch as jest.Mock).mockClear();
      await service.joinSession('enc-1', patientA);
      body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body.properties.is_owner).toBe(false);
    });

    it('surfaces a clean error, not a raw 500, when the video provider is not configured', async () => {
      delete process.env.DAILY_API_KEY;
      prisma.telemedicineSessions.findUnique.mockResolvedValue(null);
      await expect(service.joinSession('enc-1', clinicianA)).rejects.toThrow(/not configured/);
    });
  });

  describe('consentToRecording', () => {
    it('rejects a non-clinician caller', async () => {
      await expect(service.consentToRecording('enc-1', patientA)).rejects.toThrow(ForbiddenException);
    });

    it('rejects when no session exists yet for this encounter', async () => {
      prisma.telemedicineSessions.findUnique.mockResolvedValue(null);
      await expect(service.consentToRecording('enc-1', clinicianA)).rejects.toThrow(NotFoundException);
    });

    it('records who consented and when, on the real session row', async () => {
      prisma.telemedicineSessions.findUnique.mockResolvedValue(existingSession);
      prisma.telemedicineSessions.update.mockResolvedValue({ ...existingSession, recording_consent_at: new Date('2026-09-01T10:05:00.000Z') });

      const result = await service.consentToRecording('enc-1', clinicianA);

      expect(prisma.telemedicineSessions.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ recording_consent_by_user_id: 'clin-a' }) }),
      );
      expect(result.success).toBe(true);
    });
  });
});
