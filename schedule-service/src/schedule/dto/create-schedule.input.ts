import { Field, ID, InputType } from '@nestjs/graphql';
import { IsDate, IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

@InputType({ description: 'Input data for creating a new schedule' })
export class CreateScheduleInput {
  @Field(() => String, { description: 'Consultation objective / purpose' })
  @IsString()
  @IsNotEmpty({ message: 'Objective is required' })
  @MinLength(3, { message: 'Objective must be at least 3 characters' })
  objective: string;

  @Field(() => ID, { description: 'Customer UUID' })
  @IsUUID('all', { message: 'Customer ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Customer ID is required' })
  customerId: string;

  @Field(() => ID, { description: 'Doctor UUID' })
  @IsUUID('all', { message: 'Doctor ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Doctor ID is required' })
  doctorId: string;

  @Field(() => Date, { description: 'Scheduled appointment date and time' })
  @Type(() => Date)
  @IsDate({ message: 'Scheduled date must be a valid ISO DateTime' })
  @IsNotEmpty({ message: 'Scheduled date is required' })
  scheduledAt: Date;
}
