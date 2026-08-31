import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { orgScope, orgIdForWrite } from '../common/scoping/tenant-scope';
import { CreateTaskInput, TaskFilterInput, TASK_STATUSES } from './dto/task.input';

const INCLUDE = {
  assigned_to: { include: { userProfiles: true } },
  patient: true,
} as const;

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  private toGraphQL(row: any) {
    return {
      id: row.id,
      subject: row.subject,
      task_type: row.task_type,
      priority: row.priority,
      status: row.status,
      due_date: row.due_date ?? undefined,
      assigned_to: row.assigned_to?.userProfiles
        ? { id: row.assigned_to.id, name: `${row.assigned_to.userProfiles.first_name} ${row.assigned_to.userProfiles.last_name}` }
        : undefined,
      patient_id: row.patient_id ?? undefined,
      patient_name: row.patient ? `${row.patient.first_name} ${row.patient.last_name}` : undefined,
      created_by_user_id: row.created_by_user_id,
      created_at: row.created_at,
    };
  }

  // Org-wide shared visibility (every staff/clinician/manager/admin in the
  // caller's org sees every task, not just their own) -- matches the
  // internal-coordination-board pattern the queue board already uses,
  // and the mock page this replaces had no "my tasks" filter to begin with.
  async list(filter: TaskFilterInput | undefined, user: JwtPayload) {
    const rows = await this.prisma.tasks.findMany({
      where: {
        is_deleted: false,
        ...orgScope(user),
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.priority ? { priority: filter.priority } : {}),
        ...(filter?.assigned_to_user_id ? { assigned_to_user_id: filter.assigned_to_user_id } : {}),
      },
      include: INCLUDE,
      orderBy: [{ due_date: { sort: 'asc', nulls: 'first' } }],
    });
    return rows.map((r) => this.toGraphQL(r));
  }

  private async findOwned(id: string, user: JwtPayload) {
    const existing = await this.prisma.tasks.findUnique({ where: { id }, include: INCLUDE });
    if (!existing || existing.is_deleted) return null;
    if (user.client_org_id && existing.client_org_id !== user.client_org_id) return null;
    return existing;
  }

  async create(input: CreateTaskInput, user: JwtPayload) {
    const orgId = orgIdForWrite(user, 'Task');
    // A task belongs to one org's coordination board. orgIdForWrite returns
    // undefined only for a true org-less platform operator (admin/
    // super_admin with no client_org_id of their own, e.g. this codebase's
    // own unlinked admin@medibook.dev seed account) -- reject explicitly
    // rather than let a required-column NOT NULL violation surface as a
    // raw Prisma error (the same bug class departments.service.ts hit,
    // per CLAUDE.md's own account).
    if (!orgId) {
      throw new BadRequestException('Select an organization before creating a task');
    }

    if (input.assigned_to_user_id) {
      const assignee = await this.prisma.userProfiles.findFirst({ where: { id: input.assigned_to_user_id, is_deleted: false } });
      if (!assignee || (user.client_org_id && assignee.client_org_id !== user.client_org_id)) {
        throw new NotFoundException('Assignee not found');
      }
    }
    if (input.patient_id) {
      const patient = await this.prisma.patients.findUnique({ where: { id: input.patient_id } });
      if (!patient || (user.client_org_id && patient.client_org_id && patient.client_org_id !== user.client_org_id)) {
        throw new NotFoundException('Patient not found');
      }
    }

    const row = await this.prisma.tasks.create({
      data: {
        client_org_id: orgId,
        subject: input.subject,
        task_type: input.task_type ?? 'General',
        priority: input.priority ?? 'Medium',
        due_date: input.due_date ? new Date(input.due_date) : null,
        assigned_to_user_id: input.assigned_to_user_id ?? null,
        patient_id: input.patient_id ?? null,
        created_by_user_id: user.sub,
      },
      include: INCLUDE,
    });
    return this.toGraphQL(row);
  }

  async updateStatus(id: string, status: string, user: JwtPayload) {
    if (!TASK_STATUSES.includes(status)) {
      throw new BadRequestException(`status must be one of: ${TASK_STATUSES.join(', ')}`);
    }
    const existing = await this.findOwned(id, user);
    if (!existing) throw new NotFoundException('Task not found');
    const row = await this.prisma.tasks.update({ where: { id }, data: { status }, include: INCLUDE });
    return this.toGraphQL(row);
  }

  async remove(id: string, user: JwtPayload) {
    const existing = await this.findOwned(id, user);
    if (!existing) throw new NotFoundException('Task not found');
    await this.prisma.tasks.update({ where: { id }, data: { is_deleted: true } });
    return true;
  }
}
