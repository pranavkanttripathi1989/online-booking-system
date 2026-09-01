import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { PaymentGatewayConfigService } from './payment-gateway-config.service';
import {
  PaymentGatewayOptionType,
  PaymentGatewayConfigType,
  PaymentGatewayConfigResultType,
  UpdatePaymentGatewayConfigInput,
} from './entities/payment-gateway.entity';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver()
export class PaymentGatewayConfigResolver {
  constructor(private readonly paymentGatewayConfigService: PaymentGatewayConfigService) {}

  // Read access matches the registry catalog's own no-@Auth()-needed
  // precedent (notificationProviders) — the global guard already requires
  // auth, and this is just the list of available gateways, not a secret.
  @Query(() => [PaymentGatewayOptionType])
  paymentGatewayProviders() {
    return this.paymentGatewayConfigService.providers();
  }

  @Auth('manager', 'admin', 'super_admin')
  @Query(() => PaymentGatewayConfigType, { nullable: true })
  clinicPaymentGatewayConfig(@Args('clinic_id', { type: () => ID }) clinicId: string, @CurrentUser() user: JwtPayload) {
    return this.paymentGatewayConfigService.myClinicConfig(clinicId, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => PaymentGatewayConfigResultType)
  updatePaymentGatewayConfig(@Args('input') input: UpdatePaymentGatewayConfigInput, @CurrentUser() user: JwtPayload) {
    return this.paymentGatewayConfigService.updateConfig(input, user);
  }
}
