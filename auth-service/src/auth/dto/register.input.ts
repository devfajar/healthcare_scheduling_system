import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

@InputType({ description: 'Input data for user registration' })
export class RegisterInput {
  @Field(() => String, { description: 'User valid email address' })
  @IsEmail({}, { message: 'Please give a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @Field(() => String, { description: 'User password (minimum 6 characters)' })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(64, { message: 'Password cannot exceed 64 characters' })
  password: string;
}
