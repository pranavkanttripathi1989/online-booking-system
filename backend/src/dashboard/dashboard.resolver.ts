import { Resolver, Query } from '@nestjs/graphql';
import { DashboardService } from './dashboard.service';
import { DashboardType } from './entities/dashboard.entity';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Backs frontend/src/pages/dashboard/index.jsx, restricted to exactly the
// three roles App.jsx's RoleGuard already restricts the /dashboard route to.
@Resolver()
export class DashboardResolver {
  constructor(private readonly dashboardService: DashboardService) {}

  @Auth('admin', 'super_admin', 'staff')
  @Query(() => DashboardType)
  dashboard(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getDashboard(user);
  }
}
