import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { TasksResolver } from './tasks.resolver';
import { TasksService } from './tasks.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

describe('TasksResolver', () => {
  let resolver: TasksResolver;
  let service: { list: jest.Mock; create: jest.Mock; updateStatus: jest.Mock; remove: jest.Mock };
  const reflector = new Reflector();

  beforeEach(async () => {
    service = { list: jest.fn(), create: jest.fn(), updateStatus: jest.fn(), remove: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksResolver, { provide: TasksService, useValue: service }],
    }).compile();
    resolver = module.get(TasksResolver);
  });

  // Not exposed to 'patient' at all -- an internal staff coordination tool.
  describe('role gating (@Auth annotations)', () => {
    const cases: [string, (...args: unknown[]) => unknown][] = [
      ['tasks', TasksResolver.prototype.tasks],
      ['createTask', TasksResolver.prototype.createTask],
      ['updateTaskStatus', TasksResolver.prototype.updateTaskStatus],
      ['deleteTask', TasksResolver.prototype.deleteTask],
    ];

    it.each(cases)('%s is gated to manager/admin/super_admin/clinician/staff, never patient', (_name, handler) => {
      const roles = reflector.get(ROLES_KEY, handler);
      expect(roles).toEqual(['manager', 'admin', 'super_admin', 'clinician', 'staff']);
    });
  });

  it('tasks delegates to the service with the filter and caller', async () => {
    const user = { sub: 'u1' } as any;
    service.list.mockResolvedValue([{ id: 't1' }]);
    const result = await resolver.tasks({ status: 'Open' } as any, user);
    expect(service.list).toHaveBeenCalledWith({ status: 'Open' }, user);
    expect(result).toEqual([{ id: 't1' }]);
  });

  it('createTask delegates to the service', async () => {
    const user = { sub: 'u1' } as any;
    service.create.mockResolvedValue({ id: 't1' });
    await resolver.createTask({ subject: 'X' } as any, user);
    expect(service.create).toHaveBeenCalledWith({ subject: 'X' }, user);
  });

  it('updateTaskStatus delegates to the service', async () => {
    const user = { sub: 'u1' } as any;
    service.updateStatus.mockResolvedValue({ id: 't1', status: 'Done' });
    await resolver.updateTaskStatus('t1', 'Done', user);
    expect(service.updateStatus).toHaveBeenCalledWith('t1', 'Done', user);
  });

  it('deleteTask delegates to the service', async () => {
    const user = { sub: 'u1' } as any;
    service.remove.mockResolvedValue(true);
    const result = await resolver.deleteTask('t1', user);
    expect(service.remove).toHaveBeenCalledWith('t1', user);
    expect(result).toBe(true);
  });
});
