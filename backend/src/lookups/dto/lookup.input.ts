import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

// Shared shape for ClinicianType/RoomType — both are simple name+description
// lookup tables with identical create/update needs (schema.prisma clinician_types/room_types).
// Four distinct GraphQL type names below (not one shared `LookupInput`) because
// admin/RoomTypes.jsx and admin/ClinicianTypes.jsx (frontend/src/pages/admin/)
// each hard-code their own Create*Input/Update*Input type name in their inline
// gql`` operations — context/backend-hard-rules.md Rule 9, discovered via a real
// live 400 (GRAPHQL_VALIDATION_FAILED: "Unknown type CreateRoomTypeInput") while
// browser-testing this page, not assumed.
@InputType('CreateRoomTypeInput')
export class CreateRoomTypeInput {
  @Field() @IsNotEmpty() name: string;
  @Field({ nullable: true }) @IsOptional() description?: string;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
}

@InputType('UpdateRoomTypeInput')
export class UpdateRoomTypeInput {
  @Field({ nullable: true }) @IsOptional() @IsNotEmpty() name?: string;
  @Field({ nullable: true }) @IsOptional() description?: string;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
}

@InputType('CreateClinicianTypeInput')
export class CreateClinicianTypeInput {
  @Field() @IsNotEmpty() name: string;
  @Field({ nullable: true }) @IsOptional() description?: string;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
}

@InputType('UpdateClinicianTypeInput')
export class UpdateClinicianTypeInput {
  @Field({ nullable: true }) @IsOptional() @IsNotEmpty() name?: string;
  @Field({ nullable: true }) @IsOptional() description?: string;
  @Field({ nullable: true }) @IsOptional() @IsBoolean() is_active?: boolean;
}
