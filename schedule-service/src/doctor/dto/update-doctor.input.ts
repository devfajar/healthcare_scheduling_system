import { Field, ID, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

@InputType({ description: 'Input data for updating doctor' })
export class UpdateDoctorInput {
  @Field(() => ID, { description: 'Doctor UUID' })
  @IsUUID('all', { message: 'Doctor ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Doctor ID is required' })
  id: string;

  @Field(() => String, { nullable: true, description: 'Updated doctor name' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Doctor name must be at least 2 characters' })
  name?: string;
}
