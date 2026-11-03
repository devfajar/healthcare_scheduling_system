import { Field, ID, InputType } from '@nestjs/graphql';
import { IsDate, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

@InputType({ description: 'Filter options for querying schedules' })
export class ScheduleFilterInput {
  @Field(() => ID, { nullable: true, description: 'Filter by Doctor UUID' })
  @IsOptional()
  @IsUUID('all', { message: 'Doctor ID must be a valid UUID' })
  doctorId?: string;

  @Field(() => ID, { nullable: true, description: 'Filter by Customer UUID' })
  @IsOptional()
  @IsUUID('all', { message: 'Customer ID must be a valid UUID' })
  customerId?: string;

  @Field(() => Date, { nullable: true, description: 'Filter from this date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Start date must be a valid ISO DateTime' })
  startDate?: Date;

  @Field(() => Date, { nullable: true, description: 'Filter up to this date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'End date must be a valid ISO DateTime' })
  endDate?: Date;
}
