import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { ClinicianTypeInfoType } from '../../auth/entities/user.entity';
import { ClinicType } from '../../clinics/entities/clinic.entity';

@ObjectType('ClinicianServiceItem')
export class ClinicianServiceItemType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field(() => Int, { nullable: true }) duration_minutes?: number;
  @Field(() => Float, { nullable: true }) price?: number;
}

// Registered 'Clinician' — matches CLINICIAN_FIELDS fragment (frontend/src/graphql/queries.js).
@ObjectType('Clinician')
export class ClinicianType {
  @Field(() => ID) id: string;
  @Field() first_name: string;
  @Field() last_name: string;
  @Field() full_name: string;
  @Field({ nullable: true }) bio?: string;
  @Field({ nullable: true }) avatar_url?: string;
  @Field(() => Float, { nullable: true }) consultation_fee?: number; // rupees — paise at rest, see clinicians.service.ts
  @Field() is_active: boolean;
  @Field({ nullable: true }) gender?: string;
  @Field(() => [String]) languages: string[];
  @Field(() => ClinicianTypeInfoType, { nullable: true }) clinician_type?: ClinicianTypeInfoType;
  // Clinicians.clinic_id is singular in the schema; wrapped in a 0-or-1-element
  // array to match the frontend's plural `clinics{}` field shape without
  // inventing multi-clinic-clinician modeling nothing else needs yet.
  @Field(() => [ClinicType]) clinics: ClinicType[];
  @Field(() => [ClinicianServiceItemType]) services: ClinicianServiceItemType[];
}

@ObjectType('ClinicianPaginatorInfo')
export class ClinicianPaginatorInfoType {
  @Field(() => Int) count: number;
  @Field(() => Int) currentPage: number;
  @Field() hasMorePages: boolean;
  @Field(() => Int) lastPage: number;
  @Field(() => Int) perPage: number;
  @Field(() => Int) total: number;
}

@ObjectType('ClinicianPaginated')
export class ClinicianPaginatedType {
  @Field(() => [ClinicianType]) data: ClinicianType[];
  @Field(() => ClinicianPaginatorInfoType) paginatorInfo: ClinicianPaginatorInfoType;
}
