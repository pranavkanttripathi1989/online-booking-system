import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { TasksService } from './tasks.service';
import { TaskType } from './entities/task.entity';
import { CreateTaskInput, TaskFilterInput } from './dto/task.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Matches CHECKLIST_STAFF_ROLES (checklist.resolver.ts) -- the same
// front-desk/nursing/clinician/management roles who already coordinate a
// patient's visit are the ones who create and act on internal follow-up
// tasks. Not exposed to 'patient' at all.
const TASK_STAFF_ROLES = ['manager', 'admin', 'super_admin', 'clinician', 'staff'] as const;

@Resolver()
export class TasksResolver {
  constructor(private readonly tasksService: TasksService) {}

  @Query(() => [TaskType], { name: 'tasks' })
  @Auth(...TASK_STAFF_ROLES)
  tasks(
    @Args('filter', { type: () => TaskFilterInput, nullable: true }) filter: TaskFilterInput | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.list(filter, user);
  }

  @Mutation(() => TaskType, { name: 'createTask' })
  @Auth(...TASK_STAFF_ROLES)
  createTask(@Args('input') input: CreateTaskInput, @CurrentUser() user: JwtPayload) {
    return this.tasksService.create(input, user);
  }

  @Mutation(() => TaskType, { name: 'updateTaskStatus' })
  @Auth(...TASK_STAFF_ROLES)
  updateTaskStatus(
    @Args('id', { type: () => ID }) id: string,
    @Args('status') status: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.updateStatus(id, status, user);
  }

  @Mutation(() => Boolean, { name: 'deleteTask' })
  @Auth(...TASK_STAFF_ROLES)
  deleteTask(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.tasksService.remove(id, user);
  }
}
