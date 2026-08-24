import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

// REQ015 (US-SEC-08, scoped down) — org-scoped API keys, issuance/list/
// revoke only. No scoped-permission model yet (the requirement doc's own
// "scoped to exactly the operations it was granted" is deferred — this
// slice issues an org-wide key, not a per-operation-scoped one; logged as
// open, not silently narrowed without saying so).
@InputType('ApiKeyInput')
export class ApiKeyInput {
  @Field() @IsNotEmpty() name: string;
}
