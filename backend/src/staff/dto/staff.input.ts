import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsEmail, MinLength } from 'class-validator';

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
  @Field({ nullable: true }) @IsOptional() address?: string;
  @Field({ nullable: true }) @IsOptional() notes?: string;
  @Field() @MinLength(8) password: string;
}

@InputType('UpdateStaffInput')
export class UpdateStaffInput {
  @Field({ nullable: true }) @IsOptional() name?: string;
  @Field({ nullable: true }) @IsOptional() @IsEmail() email?: string;
  @Field({ nullable: true }) @IsOptional() phone?: string;
  @Field({ nullable: true }) @IsOptional() role?: string;
  @Field({ nullable: true }) @IsOptional() department?: string;
  @Field({ nullable: true }) @IsOptional() status?: string;
  @Field({ nullable: true }) @IsOptional() address?: string;
  @Field({ nullable: true }) @IsOptional() notes?: string;
}
