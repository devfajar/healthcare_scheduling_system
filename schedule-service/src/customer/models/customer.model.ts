import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Healthcare Customer / Patient' })
export class Customer {
  @Field(() => ID, { description: 'Customer UUID' })
  id: string;

  @Field(() => String, { description: 'Customer full name' })
  name: string;

  @Field(() => String, { description: 'Customer unique email address' })
  email: string;

  @Field(() => Date, { description: 'Record creation timestamp' })
  createdAt: Date;

  @Field(() => Date, { description: 'Last update timestamp' })
  updatedAt: Date;
}
