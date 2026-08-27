import { Body, Controller, Logger, Post, HttpCode } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { WebVitalDto } from './dto/web-vital.dto';

// P1-18 (PERF-5) — real-user Web Vitals, logged structurally so they can
// be aggregated by whatever log pipeline reads this process's stdout
// (this environment has no APM/RUM vendor account — see
// PLAN### for the honest "not live-verified against a real dashboard"
// note). @Public(): a patient on the public booking flow, logged out, is
// exactly the visitor whose real-world performance matters most here.
@Controller('observability')
export class WebVitalsController {
  private readonly logger = new Logger('WebVitals');

  @Public()
  @Post('web-vitals')
  @HttpCode(204)
  report(@Body() vital: WebVitalDto) {
    // A structured log line, not a DB write -- Web Vitals are
    // high-volume, ephemeral-value telemetry (SURF-8/analytics
    // conventions elsewhere in this codebase reserve real tables for
    // data someone queries later, not a firehose like this).
    this.logger.log(JSON.stringify({ metric: vital.name, value: vital.value, id: vital.id, page: vital.page }));
  }
}
