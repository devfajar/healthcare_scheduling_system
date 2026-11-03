import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

@InputType({ description: 'Input data for creating a new doctor' })
export class CreateDoctorInput {
  @Field(() => String, { description: 'Doctor full name' })
  @IsString()
  @IsNotEmpty({ message: 'Doctor name is required' })
  @MinLength(2, { message: 'Doctor name must be at least 2 characters' })
  name: string;
}
