import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

@InputType({ description: 'Input data for creating a new customer' })
export class CreateCustomerInput {
  @Field(() => String, { description: 'Customer full name' })
  @IsString()
  @IsNotEmpty({ message: 'Customer name is required' })
  @MinLength(2, { message: 'Customer name must be at least 2 characters' })
  name: string;

  @Field(() => String, { description: 'Customer email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}
