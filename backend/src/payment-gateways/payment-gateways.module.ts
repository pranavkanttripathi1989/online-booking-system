import { Module } from '@nestjs/common';
import { PaymentGatewayConfigService } from './payment-gateway-config.service';
import { PaymentGatewayConfigResolver } from './payment-gateway-config.resolver';

@Module({
  providers: [PaymentGatewayConfigService, PaymentGatewayConfigResolver],
  exports: [PaymentGatewayConfigService],
})
export class PaymentGatewaysModule {}
