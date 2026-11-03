import { Field, ObjectType } from '@nestjs/graphql';
import { User } from './user.model';

@ObjectType({ description: 'Authentication Response Payload containing JWT and user information' })
export class AuthPayload {
  @Field(() => String, { description: 'JWT Access Token' })
  accessToken: string;

  @Field(() => User, { description: 'Authenticated user profile' })
  user: User;
}
