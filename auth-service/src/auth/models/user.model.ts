import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Healthcare System User' })
export class User {
  @Field(() => ID, { description: 'Unique user identifier (UUID)' })
  id: string;

  @Field(() => String, { description: 'User unique email address' })
  email: string;

  @Field(() => Date, { description: 'Account creation timestamp' })
  createdAt: Date;

  @Field(() => Date, { description: 'Last account update timestamp' })
  updatedAt: Date;
}
