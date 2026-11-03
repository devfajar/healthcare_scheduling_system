import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType({ description: 'Input data for token validation' })
export class ValidateTokenInput {
  @Field(() => String, { description: 'JWT Access Token string to validate' })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  token: string;
}
