import { Test, TestingModule } from '@nestjs/testing';
import { NotificationPreferencesService } from './notification-preferences.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('NotificationPreferencesService', () => {
  let service: NotificationPreferencesService;
  let prisma: {
    notificationPreferences: { findMany: jest.Mock; createMany: jest.Mock };
    $transaction: jest.Mock;
  };

  const user: JwtPayload = { sub: 'user-1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;

  beforeEach(async () => {
    prisma = {
      notificationPreferences: { findMany: jest.fn(), createMany: jest.fn() },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationPreferencesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(NotificationPreferencesService);
  });

  describe('myPreferences', () => {
    it('returns existing rows scoped to the caller only, without reseeding', async () => {
      prisma.notificationPreferences.findMany.mockResolvedValue([{ id: 'p1', event_type: 'new_appointment' }]);
      const result = await service.myPreferences(user);
      expect(result).toHaveLength(1);
      expect(prisma.notificationPreferences.createMany).not.toHaveBeenCalled();
      expect(prisma.notificationPreferences.findMany).toHaveBeenCalledWith({ where: { user_id: 'user-1' } });
    });

    it('lazily seeds all 7 default rows for the caller on first read', async () => {
      prisma.notificationPreferences.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(Array(7).fill({}));
      await service.myPreferences(user);
      expect(prisma.notificationPreferences.createMany).toHaveBeenCalledTimes(1);
      const seedData = prisma.notificationPreferences.createMany.mock.calls[0][0].data;
      expect(seedData).toHaveLength(7);
      expect(seedData.every((row: any) => row.user_id === 'user-1')).toBe(true);
      const appointmentCancelled = seedData.find((r: any) => r.event_type === 'appointment_cancelled');
      expect(appointmentCancelled).toEqual(
        expect.objectContaining({ email_enabled: true, sms_enabled: false, app_enabled: true, whatsapp_enabled: false }),
      );
      // REQ025 — new_appointment defaults whatsapp_enabled true, matching
      // its own sms_enabled default (WhatsApp is the PRD's top-priority
      // channel, so it's on wherever SMS already is).
      const newAppointment = seedData.find((r: any) => r.event_type === 'new_appointment');
      expect(newAppointment).toEqual(expect.objectContaining({ whatsapp_enabled: true }));
    });
  });

  describe('updateMyPreferences', () => {
    it('upserts every row scoped to the caller\'s own user_id', async () => {
      const input = [{ event_type: 'new_message', email_enabled: true, sms_enabled: true, app_enabled: true }] as any;
      const upsertMock = jest.fn().mockResolvedValue({});
      (prisma as any).notificationPreferences.upsert = upsertMock;
      const result = await service.updateMyPreferences(input, user);
      expect(result.success).toBe(true);
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id_event_type: { user_id: 'user-1', event_type: 'new_message' } },
        }),
      );
    });

    it('returns {success:false} instead of throwing on a DB error', async () => {
      (prisma as any).notificationPreferences.upsert = jest.fn();
      prisma.$transaction.mockRejectedValue(new Error('db exploded'));
      const result = await service.updateMyPreferences([{ event_type: 'new_message', email_enabled: true, sms_enabled: true, app_enabled: true }] as any, user);
      expect(result.success).toBe(false);
      expect(result.message).toBe('db exploded');
    });

    // REQ025 (US-NOT-04) — a single-sided quiet-hours window is meaningless.
    it('rejects a quiet_hours_start set without a matching quiet_hours_end', async () => {
      const upsertMock = jest.fn();
      (prisma as any).notificationPreferences.upsert = upsertMock;
      const result = await service.updateMyPreferences(
        [{ event_type: 'new_message', email_enabled: true, sms_enabled: true, app_enabled: true, whatsapp_enabled: true, quiet_hours_start: '21:00' }] as any,
        user,
      );
      expect(result.success).toBe(false);
      expect(upsertMock).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('accepts a fully-set quiet_hours pair and persists whatsapp_enabled', async () => {
      const upsertMock = jest.fn().mockResolvedValue({});
      (prisma as any).notificationPreferences.upsert = upsertMock;
      const result = await service.updateMyPreferences(
        [{ event_type: 'new_message', email_enabled: true, sms_enabled: true, app_enabled: true, whatsapp_enabled: false, quiet_hours_start: '21:00', quiet_hours_end: '08:00' }] as any,
        user,
      );
      expect(result.success).toBe(true);
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ whatsapp_enabled: false, quiet_hours_start: '21:00', quiet_hours_end: '08:00' }),
        }),
      );
    });
  });
});
