import { Field, ID, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

@InputType({ description: 'Input data for updating customer' })
export class UpdateCustomerInput {
  @Field(() => ID, { description: 'Customer UUID' })
  @IsUUID('all', { message: 'Customer ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Customer ID is required' })
  id: string;

  @Field(() => String, { nullable: true, description: 'Updated customer name' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Customer name must be at least 2 characters' })
  name?: string;

  @Field(() => String, { nullable: true, description: 'Updated customer email' })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;
}
