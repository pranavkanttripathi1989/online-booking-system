import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';
import { ClinicianTypeInfoType } from '../../auth/entities/user.entity';
import { ClinicType } from '../../clinics/entities/clinic.entity';
import { RoomType } from '../../rooms/entities/room.entity';
import { DepartmentType } from '../../departments/entities/department.entity';

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
  // REQ014 (US-ORG-03) — optional specialty grouping.
  @Field(() => ID, { nullable: true }) department_id?: string;
  @Field(() => DepartmentType, { nullable: true }) department?: DepartmentType;
  // REQ015 (US-SEC-07) — only 'verified' renders the public-profile badge.
  @Field({ nullable: true }) registration_number?: string;
  @Field({ nullable: true }) medical_council?: string;
  // REQ021/REQ170 -- the printed-prescription letterhead's degree line and
  // (new) bulleted sub-specialty/fellowship lines.
  @Field({ nullable: true }) qualifications?: string;
  @Field({ nullable: true }) specialty_highlights?: string;
  @Field() verification_status: string;
  @Field({ nullable: true }) verified_at?: Date;
}

// components/Clinicians/ClinicianProfileDrawer.jsx's real CLINICIAN_DETAIL_QUERY
// contract (context/frontend-integration-audit.md) -- backed by the same
// ClinicianAvailability table as the canonical manager/Availability.jsx
// contract (availability/entities/availability.entity.ts's camelCase
// 'Availability' type), but this page's own query is snake_case with
// differently-named fields (effective_from/to vs valid_from/until) and a
// `room{id name}` shape rather than AvailabilityRoomType's `roomNumber` --
// given its own type name rather than overloading either existing one.
// slot_duration_minutes/buffer_minutes were dropped from the original
// broken query: no such columns exist on ClinicianAvailability, and nothing
// in manager/Availability.jsx's create/edit form collects them either, so
// adding empty-always columns would be a schema change with no real data
// behind it -- see the ClinicianProfileDrawer.jsx fix in the same commit.
@ObjectType('ClinicianAvailabilityTemplate')
export class ClinicianAvailabilityTemplateType {
  @Field(() => ID) id: string;
  @Field(() => Int, { nullable: true }) day_of_week?: number;
  @Field() start_time: string;
  @Field() end_time: string;
  @Field() is_active: boolean;
  @Field() effective_from: Date;
  @Field({ nullable: true }) effective_to?: Date;
  @Field(() => ClinicType) clinic: ClinicType;
  @Field(() => RoomType, { nullable: true }) room?: RoomType;
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
