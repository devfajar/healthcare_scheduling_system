import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

@InputType({ description: 'Input data for user login' })
export class LoginInput {
  @Field(() => String, { description: 'Registered user email address' })
  @IsEmail({}, { message: 'Please give a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @Field(() => String, { description: 'User password' })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
