import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsEmail, IsIn, IsDateString, MinLength } from 'class-validator';

const STAFF_STATUSES = ['active', 'on_leave', 'inactive'];

// Matches staff/new.jsx's actual submitted shape: { name, email, phone, role,
// department, status, since, address, notes, password }. `role` here is a
// granular job title (Receptionist, Nurse, ...), not an RBAC UserRoles row —
// stored in job_title; every staff-module-created account gets the coarse
// 'staff' system role for permissions (next-10-features-implementation-plan.md #7).
@InputType('CreateStaffInput')
export class CreateStaffInput {
  @Field() @IsNotEmpty() name: string;
  @Field() @IsEmail() email: string;
  @Field({ nullable: true }) @IsOptional() phone?: string;
  @Field() @IsNotEmpty() role: string;
  @Field({ nullable: true }) @IsOptional() department?: string;
  // context/open-questions.md #3 — resolved: real requirement, wired up.
  @Field({ nullable: true }) @IsOptional() @IsIn(STAFF_STATUSES) status?: string;
  @Field({ nullable: true }) @IsOptional() @IsDateString() since?: string;
  @Field({ nullable: true }) @IsOptional() address?: string;
  @Field({ nullable: true }) @IsOptional() notes?: string;
  // REQ102 — distinct from the free-text `department` field above.
  @Field(() => ID, { nullable: true }) @IsOptional() departmentId?: string;
  @Field() @MinLength(8) password: string;
}

@InputType('UpdateStaffInput')
export class UpdateStaffInput {
  @Field({ nullable: true }) @IsOptional() name?: string;
  @Field({ nullable: true }) @IsOptional() @IsEmail() email?: string;
  @Field({ nullable: true }) @IsOptional() phone?: string;
  @Field({ nullable: true }) @IsOptional() role?: string;
  @Field({ nullable: true }) @IsOptional() department?: string;
  @Field({ nullable: true }) @IsOptional() @IsIn(STAFF_STATUSES) status?: string;
  @Field({ nullable: true }) @IsOptional() @IsDateString() since?: string;
  @Field({ nullable: true }) @IsOptional() address?: string;
  @Field({ nullable: true }) @IsOptional() notes?: string;
  // REQ102 — distinct from the free-text `department` field above.
  @Field(() => ID, { nullable: true }) @IsOptional() departmentId?: string;
  // context/open-questions.md #3 — resolved: admin sets a specific password
  // directly (not an emailed reset link).
  @Field({ nullable: true }) @IsOptional() @MinLength(8) password?: string;
}
