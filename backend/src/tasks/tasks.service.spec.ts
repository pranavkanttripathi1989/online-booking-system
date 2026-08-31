import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: any;

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['staff'], client_org_id: 'org-a' } as JwtPayload;
  const platformUser: JwtPayload = { sub: 'u3', roles: ['admin'], client_org_id: null } as JwtPayload;

  const assigneeA = { id: 'assignee-a', client_org_id: 'org-a', is_deleted: false };
  const patientA = { id: 'patient-a', client_org_id: 'org-a' };
  const taskA = {
    id: 'task-a1', client_org_id: 'org-a', subject: 'Call patient', task_type: 'General',
    priority: 'Medium', status: 'Open', due_date: null, assigned_to_user_id: null,
    patient_id: null, created_by_user_id: 'u1', is_deleted: false, created_at: new Date(),
    assigned_to: null, patient: null,
  };
  const taskB = { ...taskA, id: 'task-b1', client_org_id: 'org-b' };

  beforeEach(async () => {
    prisma = {
      tasks: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      userProfiles: { findFirst: jest.fn() },
      patients: { findUnique: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(TasksService);
  });

  describe('list', () => {
    it('scopes to the caller\'s own org', async () => {
      prisma.tasks.findMany.mockResolvedValue([taskA]);
      const result = await service.list(undefined, orgAUser);
      expect(prisma.tasks.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ client_org_id: 'org-a' }),
      }));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('task-a1');
    });

    it('a platform operator sees every org (no filter)', async () => {
      prisma.tasks.findMany.mockResolvedValue([taskA, taskB]);
      await service.list(undefined, platformUser);
      const where = prisma.tasks.findMany.mock.calls[0][0].where;
      expect(where.client_org_id).toBeUndefined();
    });

    it('applies the status filter', async () => {
      prisma.tasks.findMany.mockResolvedValue([]);
      await service.list({ status: 'Done' } as any, orgAUser);
      expect(prisma.tasks.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ status: 'Done' }),
      }));
    });

    it('orders by due_date ascending with nulls first, matching the mock page it replaces', async () => {
      prisma.tasks.findMany.mockResolvedValue([]);
      await service.list(undefined, orgAUser);
      expect(prisma.tasks.findMany).toHaveBeenCalledWith(expect.objectContaining({
        orderBy: [{ due_date: { sort: 'asc', nulls: 'first' } }],
      }));
    });
  });

  describe('create', () => {
    it('stamps client_org_id from the caller and created_by_user_id from the JWT sub', async () => {
      prisma.tasks.create.mockResolvedValue(taskA);
      await service.create({ subject: 'Call patient' } as any, orgAUser);
      expect(prisma.tasks.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ client_org_id: 'org-a', created_by_user_id: 'u1' }),
      }));
    });

    it('rejects a true org-less platform operator with a clear error, not a raw Prisma crash', async () => {
      await expect(service.create({ subject: 'X' } as any, platformUser)).rejects.toThrow(BadRequestException);
      expect(prisma.tasks.create).not.toHaveBeenCalled();
    });

    it('rejects an assignee from a different org', async () => {
      prisma.userProfiles.findFirst.mockResolvedValue({ ...assigneeA, client_org_id: 'org-b' });
      await expect(
        service.create({ subject: 'X', assigned_to_user_id: 'assignee-a' } as any, orgAUser),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.tasks.create).not.toHaveBeenCalled();
    });

    it('accepts an assignee in the same org', async () => {
      prisma.userProfiles.findFirst.mockResolvedValue(assigneeA);
      prisma.tasks.create.mockResolvedValue(taskA);
      await service.create({ subject: 'X', assigned_to_user_id: 'assignee-a' } as any, orgAUser);
      expect(prisma.tasks.create).toHaveBeenCalled();
    });

    it('rejects a patient from a different org', async () => {
      prisma.patients.findUnique.mockResolvedValue({ ...patientA, client_org_id: 'org-b' });
      await expect(
        service.create({ subject: 'X', patient_id: 'patient-a' } as any, orgAUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('accepts a patient in the same org', async () => {
      prisma.patients.findUnique.mockResolvedValue(patientA);
      prisma.tasks.create.mockResolvedValue(taskA);
      await service.create({ subject: 'X', patient_id: 'patient-a' } as any, orgAUser);
      expect(prisma.tasks.create).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('rejects an invalid status value', async () => {
      await expect(service.updateStatus('task-a1', 'Cancelled', orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects a cross-org task with NotFoundException, not Forbidden', async () => {
      prisma.tasks.findUnique.mockResolvedValue(taskB);
      await expect(service.updateStatus('task-b1', 'Done', orgAUser)).rejects.toThrow(NotFoundException);
    });

    it('updates status for a task in the caller\'s own org', async () => {
      prisma.tasks.findUnique.mockResolvedValue(taskA);
      prisma.tasks.update.mockResolvedValue({ ...taskA, status: 'In Progress' });
      const result = await service.updateStatus('task-a1', 'In Progress', orgAUser);
      expect(result.status).toBe('In Progress');
    });
  });

  describe('remove', () => {
    it('rejects a cross-org task', async () => {
      prisma.tasks.findUnique.mockResolvedValue(taskB);
      await expect(service.remove('task-b1', orgAUser)).rejects.toThrow(NotFoundException);
      expect(prisma.tasks.update).not.toHaveBeenCalled();
    });

    it('soft-deletes a task in the caller\'s own org', async () => {
      prisma.tasks.findUnique.mockResolvedValue(taskA);
      prisma.tasks.update.mockResolvedValue({ ...taskA, is_deleted: true });
      const result = await service.remove('task-a1', orgAUser);
      expect(result).toBe(true);
      expect(prisma.tasks.update).toHaveBeenCalledWith({ where: { id: 'task-a1' }, data: { is_deleted: true } });
    });
  });
});
