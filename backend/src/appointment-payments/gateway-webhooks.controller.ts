import { Controller, Post, Req, HttpCode, RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { AppointmentPaymentsService } from './appointment-payments.service';
import { Public } from '../common/decorators/public.decorator';

// REQ175 -- the Cashfree/PayU/PhonePe counterpart to
// appointment-payments-webhook.controller.ts's existing Razorpay handler,
// which stays separate and untouched (a real, pre-existing, live-verified
// path). @Public() for the identical reason: each gateway calls this
// server-to-server with no JWT, so the vendor's own signature check inside
// the service (against that SPECIFIC payment's clinic-configured
// credentials, not a platform-wide secret) is the real authentication.
@Controller('webhooks')
export class GatewayWebhooksController {
  constructor(private readonly appointmentPaymentsService: AppointmentPaymentsService) {}

  @Public()
  @Post('cashfree')
  @HttpCode(200)
  async handleCashfree(@Req() req: RawBodyRequest<Request>) {
    return this.appointmentPaymentsService.verifyAndApplyGatewayEvent('cashfree', req.rawBody ?? Buffer.from(''), req.headers as Record<string, string | string[] | undefined>);
  }

  @Public()
  @Post('payu')
  @HttpCode(200)
  async handlePayU(@Req() req: RawBodyRequest<Request>) {
    return this.appointmentPaymentsService.verifyAndApplyGatewayEvent('payu', req.rawBody ?? Buffer.from(''), req.headers as Record<string, string | string[] | undefined>);
  }

  @Public()
  @Post('phonepe')
  @HttpCode(200)
  async handlePhonePe(@Req() req: RawBodyRequest<Request>) {
    return this.appointmentPaymentsService.verifyAndApplyGatewayEvent('phonepe', req.rawBody ?? Buffer.from(''), req.headers as Record<string, string | string[] | undefined>);
  }
}
