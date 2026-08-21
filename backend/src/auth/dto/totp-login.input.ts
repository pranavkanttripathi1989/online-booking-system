import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

// PLAN016 Slice C — code accepts either a 6-digit TOTP code or a backup
// code, verifyTotpLogin tries both (see auth.service.ts), so no separate
// "type" field is needed here.
@InputType('VerifyTotpLoginInput')
export class VerifyTotpLoginInput {
  @Field() @IsNotEmpty() challenge_token: string;
  @Field() @IsNotEmpty() code: string;
}
