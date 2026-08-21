import { ObjectType, Field, ID } from '@nestjs/graphql';
import { MyAddressType } from '../dto/account.input';

// settings/index.jsx's Profile tab. Extended under PLAN016 (REQ005 remainder)
// with DOB/Gender/Bio/Address/Avatar, closing context/open-questions.md #4.
@ObjectType('MyProfile')
export class MyProfileType {
  @Field(() => ID) id: string;
  @Field() first_name: string;
  @Field() last_name: string;
  @Field() email: string;
  @Field({ nullable: true }) phone?: string;
  @Field({ nullable: true }) bio?: string;
  @Field({ nullable: true }) date_of_birth?: Date;
  @Field({ nullable: true }) gender?: string;
  @Field({ nullable: true }) avatar_url?: string;
  @Field(() => MyAddressType, { nullable: true }) address?: MyAddressType;
  // PLAN016 Slice C — the Settings page needs this to render "Enable" vs
  // "Disable 2FA" correctly; no other query exposes it.
  @Field() totp_enabled: boolean;
}

@ObjectType('MyProfileUserError')
export class MyProfileUserErrorType {
  @Field() message: string;
}

@ObjectType('MyProfileMutationResult')
export class MyProfileMutationResultType {
  @Field() success: boolean;
  @Field(() => [MyProfileUserErrorType]) userErrors: MyProfileUserErrorType[];
  @Field(() => MyProfileType, { nullable: true }) profile?: MyProfileType;
}

// PLAN016 Slice C — real TOTP 2FA enrollment. qr_data_url is a base64 PNG
// data URI rendered server-side (via `qrcode`), so the frontend needs no
// new QR-rendering dependency of its own -- it just <img src={qr_data_url}>.
@ObjectType('TotpEnrollment')
export class TotpEnrollmentType {
  @Field() qr_data_url: string;
  @Field() secret: string; // shown once, for manual entry if the QR can't be scanned
}

@ObjectType('TotpConfirmResult')
export class TotpConfirmResultType {
  @Field() success: boolean;
  @Field({ nullable: true }) message?: string;
  // Shown once, immediately after confirmation -- never retrievable again,
  // matching the same "credential shown once" principle as a password.
  @Field(() => [String], { nullable: true }) backup_codes?: string[];
}

// settings/index.jsx's Active Sessions block. `id` is a SHA-256 fingerprint
// of the underlying refresh token, never the raw token itself -- handing a
// live, usable credential to the client just for viewing a settings page
// would be a real security bug, not a convenience. No `location` (no geo-IP
// infra) and no `current` flag (the frontend doesn't retain its own refresh
// token anywhere to identify itself -- see the implementation plan).
@ObjectType('Session')
export class SessionType {
  @Field(() => ID) id: string;
  @Field({ nullable: true }) device?: string;
  // Nullable: sessions issued before device-tracking shipped have no
  // recorded metadata at all -- shown as "unknown", never faked.
  @Field({ nullable: true }) created_at?: Date;
}
