import { BadRequestException, Controller, Post, Req, HttpCode, RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { PlatformBillingService } from './platform-billing.service';
import { Public } from '../common/decorators/public.decorator';
import { getProvider } from './providers/registry';

// REQ178/180 — mirrors appointment-payments/gateway-webhooks.controller.ts's
// exact shape. @Public() for the identical reason: each gateway calls
// this server-to-server with no JWT, so the vendor's own signature check
// is the real authentication. Simpler than the per-clinic patient-payment
// webhook path (verifyAndApplyGatewayEvent): platform billing has
// exactly ONE credential per gateway (env vars, not per-tenant), so
// there is no "which clinic's credentials" lookup to do before
// verifying -- the signature is checked directly against the platform's
// own single credential for that gateway.
@Controller('platform-webhooks')
export class PlatformBillingWebhooksController {
  constructor(private readonly platformBillingService: PlatformBillingService) {}

  @Public()
  @Post('razorpay')
  @HttpCode(200)
  async handleRazorpay(@Req() req: RawBodyRequest<Request>) {
    return this.handle('razorpay', req);
  }

  @Public()
  @Post('stripe')
  @HttpCode(200)
  async handleStripe(@Req() req: RawBodyRequest<Request>) {
    return this.handle('stripe', req);
  }

  private async handle(gatewayId: string, req: RawBodyRequest<Request>) {
    const provider = getProvider(gatewayId);
    if (!provider) throw new BadRequestException(`Unknown gateway "${gatewayId}"`);
    const rawBody = req.rawBody ?? Buffer.from('');
    const headers = req.headers as Record<string, string | string[] | undefined>;

    const credentials = this.platformBillingService.getCredentials(gatewayId);
    let valid: boolean;
    try {
      valid = provider.verifyWebhookSignature(credentials, rawBody, headers);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }
    if (!valid) throw new BadRequestException('Invalid webhook signature');

    let event;
    try {
      event = provider.parseWebhookEvent(rawBody);
    } catch {
      throw new BadRequestException('Unparseable webhook body');
    }
    return this.platformBillingService.applyBillingEvent(gatewayId, event);
  }
}
