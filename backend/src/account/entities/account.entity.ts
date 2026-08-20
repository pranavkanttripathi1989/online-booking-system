import { ObjectType, Field, ID } from '@nestjs/graphql';

// settings/index.jsx's Profile tab. Deliberately narrow -- only fields with a
// real backing UserProfiles column AND coverage in REQ005's stated acceptance
// criteria (name, phone). DOB/Gender/Address/Bio/Avatar are UI-only for now;
// see context/open-questions.md.
@ObjectType('MyProfile')
export class MyProfileType {
  @Field(() => ID) id: string;
  @Field() first_name: string;
  @Field() last_name: string;
  @Field() email: string;
  @Field({ nullable: true }) phone?: string;
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
