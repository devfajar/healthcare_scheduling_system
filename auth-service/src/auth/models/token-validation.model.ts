import { Field, ObjectType } from '@nestjs/graphql';
import { User } from './user.model';

@ObjectType({ description: 'Token validation response for inter-service communication' })
export class TokenValidationResponse {
  @Field(() => Boolean, { description: 'Whether the token is valid, unexpired, and user exists' })
  isValid: boolean;

  @Field(() => User, { nullable: true, description: 'User info if token is valid' })
  user?: User | null;

  @Field(() => String, { nullable: true, description: 'Status or error message' })
  message?: string;
}
