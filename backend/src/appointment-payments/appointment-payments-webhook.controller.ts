import { Controller, Post, Req, HttpCode, RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { AppointmentPaymentsService } from './appointment-payments.service';
import { Public } from '../common/decorators/public.decorator';

// REQ040/F-07 -- plain REST endpoint, not GraphQL: Razorpay calls this
// server-to-server with no JWT at all, so it needs @Public() the same as
// any anonymous GraphQL mutation -- confirmed live (not just inferred from
// account.controller.ts's comment) that the global GqlAuthGuard genuinely
// 401s an unauthenticated REST request before it reaches the controller,
// same as a GraphQL one, and only lets a request through once a *valid*
// bearer token is presented. This route's real authentication is the
// Razorpay signature check inside the service, not a JWT.
//
// Returns 200 once the signature check passes, even for an event type this
// codebase doesn't act on -- a non-2xx makes Razorpay retry the delivery,
// which is only correct when something genuinely failed, not when we've
// deliberately chosen not to handle a given event type yet. A genuine
// failure (missing config, bad signature, unparseable body) throws
// BadRequestException instead of silently answering 200 -- see the
// service's own comment for why that distinction matters.
@Controller('webhooks')
export class AppointmentPaymentsWebhookController {
  constructor(private readonly appointmentPaymentsService: AppointmentPaymentsService) {}

  @Public()
  @Post('razorpay')
  @HttpCode(200)
  async handleRazorpayWebhook(@Req() req: RawBodyRequest<Request>) {
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const rawBody = req.rawBody ?? Buffer.from('');
    return this.appointmentPaymentsService.handleRazorpayWebhook(rawBody, signature);
  }
}
