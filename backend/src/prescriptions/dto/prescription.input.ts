import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsIn, IsBoolean, IsInt, Min, ValidateNested, IsArray, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

const FREQUENCIES = ['OD', 'BD', 'TDS', 'QID', 'HS', 'SOS'];

@InputType()
export class PrescriptionItemInput {
  @Field(() => ID)
  @IsNotEmpty()
  drug_id: string;

  @Field()
  @IsNotEmpty()
  dose: string;

  @Field()
  @IsIn(FREQUENCIES)
  frequency: string;

  @Field({ nullable: true })
  @IsOptional()
  route?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration_days?: number;

  @Field({ nullable: true })
  @IsOptional()
  instructions?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  substitutable?: boolean;
}

@InputType()
export class CreatePrescriptionInput {
  @Field(() => ID)
  @IsNotEmpty()
  encounter_id: string;

  @Field({ nullable: true })
  @IsOptional()
  language?: string;

  // Set when this prescription was created via "repeat from history"
  // (US-RX-05) -- the original's reprint_count is not touched by creating a
  // new prescription from it, only by re-fetching the original itself for
  // print (see PrescriptionsService.printPrescription).
  @Field(() => ID, { nullable: true })
  @IsOptional()
  repeated_from_id?: string;

  @Field(() => [PrescriptionItemInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemInput)
  items: PrescriptionItemInput[];
}

@InputType()
export class CreatePrescriptionSetInput {
  @Field({ nullable: true })
  @IsOptional()
  specialty?: string;

  @Field()
  @IsNotEmpty()
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  org_shared?: boolean;

  @Field(() => [PrescriptionItemInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemInput)
  items: PrescriptionItemInput[];
}
