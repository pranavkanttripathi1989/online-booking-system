import { Test, TestingModule } from '@nestjs/testing';
import { ImmunizationReminderSweepService } from './immunization-reminder-sweep.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { ImmunizationsService } from './immunizations.service';

// REQ167 (P2-11).
describe('ImmunizationReminderSweepService', () => {
  let service: ImmunizationReminderSweepService;
  let prisma: {
    patients: { findMany: jest.Mock };
    userProfiles: { findFirst: jest.Mock };
    patientRelations: { findFirst: jest.Mock };
    notifications: { findFirst: jest.Mock };
  };
  let notificationTrigger: { dispatch: jest.Mock };
  let immunizationsService: { computePatientStatus: jest.Mock };

  beforeEach(async () => {
    prisma = {
      patients: { findMany: jest.fn().mockResolvedValue([]) },
      userProfiles: { findFirst: jest.fn().mockResolvedValue(null) },
      patientRelations: { findFirst: jest.fn().mockResolvedValue(null) },
      notifications: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    notificationTrigger = { dispatch: jest.fn().mockResolvedValue(undefined) };
    immunizationsService = { computePatientStatus: jest.fn().mockResolvedValue([]) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImmunizationReminderSweepService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationTriggerService, useValue: notificationTrigger },
        { provide: ImmunizationsService, useValue: immunizationsService },
      ],
    }).compile();
    service = module.get(ImmunizationReminderSweepService);
  });

  it('does nothing when no patient has anything overdue or due soon', async () => {
    prisma.patients.findMany.mockResolvedValue([{ id: 'pat-1', is_deleted: false }]);
    immunizationsService.computePatientStatus.mockResolvedValue([{ status: 'upcoming' }, { status: 'administered' }]);
    await service.sweep();
    expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
  });

  it('notifies the patient\'s own linked account when one exists', async () => {
    prisma.patients.findMany.mockResolvedValue([{ id: 'pat-1', is_deleted: false }]);
    immunizationsService.computePatientStatus.mockResolvedValue([{ status: 'overdue', vaccine_name: 'BCG', dose_number: 1 }]);
    prisma.userProfiles.findFirst.mockResolvedValue({ id: 'user-1' });
    await service.sweep();
    expect(notificationTrigger.dispatch).toHaveBeenCalledWith('user-1', 'immunization_due', expect.objectContaining({ title: 'Immunizations due' }));
    expect(prisma.patientRelations.findFirst).not.toHaveBeenCalled();
  });

  // The critical fix this slice makes over a plain copy of
  // appointment-reminder-sweep.service.ts's own resolvePatientUserId(): a
  // child patient has no login of their own -- the guardian's account does.
  it('falls back to the owning guardian\'s linked account when the patient has none', async () => {
    prisma.patients.findMany.mockResolvedValue([{ id: 'child-1', is_deleted: false }]);
    immunizationsService.computePatientStatus.mockResolvedValue([{ status: 'overdue', vaccine_name: 'BCG', dose_number: 1 }]);
    prisma.userProfiles.findFirst.mockImplementation(({ where }: any) =>
      Promise.resolve(where.patient_id === 'parent-1' ? { id: 'parent-user-1' } : null),
    );
    prisma.patientRelations.findFirst.mockResolvedValue({ patient_id: 'parent-1', related_patient_id: 'child-1' });
    await service.sweep();
    expect(notificationTrigger.dispatch).toHaveBeenCalledWith('parent-user-1', 'immunization_due', expect.anything());
  });

  it('silently skips when neither the patient nor a guardian has a linked account', async () => {
    prisma.patients.findMany.mockResolvedValue([{ id: 'child-1', is_deleted: false }]);
    immunizationsService.computePatientStatus.mockResolvedValue([{ status: 'overdue', vaccine_name: 'BCG', dose_number: 1 }]);
    prisma.userProfiles.findFirst.mockResolvedValue(null);
    prisma.patientRelations.findFirst.mockResolvedValue(null);
    await expect(service.sweep()).resolves.not.toThrow();
    expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
  });

  it('skips a recipient already reminded within the last 7 days', async () => {
    prisma.patients.findMany.mockResolvedValue([{ id: 'pat-1', is_deleted: false }]);
    immunizationsService.computePatientStatus.mockResolvedValue([{ status: 'overdue', vaccine_name: 'BCG', dose_number: 1 }]);
    prisma.userProfiles.findFirst.mockResolvedValue({ id: 'user-1' });
    prisma.notifications.findFirst.mockResolvedValue({ id: 'notif-1' });
    await service.sweep();
    expect(notificationTrigger.dispatch).not.toHaveBeenCalled();
  });

  it('continues to the next patient if one row throws', async () => {
    prisma.patients.findMany.mockResolvedValue([{ id: 'pat-1', is_deleted: false }, { id: 'pat-2', is_deleted: false }]);
    immunizationsService.computePatientStatus
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([{ status: 'overdue', vaccine_name: 'BCG', dose_number: 1 }]);
    prisma.userProfiles.findFirst.mockResolvedValue({ id: 'user-2' });
    await expect(service.sweep()).resolves.not.toThrow();
    expect(notificationTrigger.dispatch).toHaveBeenCalledTimes(1);
  });
});
