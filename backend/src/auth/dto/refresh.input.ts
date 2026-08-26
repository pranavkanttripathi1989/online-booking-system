import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsNotEmpty } from 'class-validator';

// P1-02/SEC-2 — refresh_token is now optional: the frontend never holds it
// as a JS-readable value (it lives only in the httpOnly mb_refresh_token
// cookie, auth-cookies.util.ts), so apollo/client.js's silent-refresh-on-401
// calls this mutation with an empty input and relies entirely on the
// resolver's own cookie fallback (auth.resolver.ts#refresh). The field
// stays present, not removed, for any non-browser caller that still wants
// to pass one explicitly.
@InputType()
export class RefreshInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsNotEmpty()
  refresh_token?: string;
}
