import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Healthcare Doctor / Specialist' })
export class Doctor {
  @Field(() => ID, { description: 'Doctor UUID' })
  id: string;

  @Field(() => String, { description: 'Doctor full name with title' })
  name: string;

  @Field(() => Date, { description: 'Record creation timestamp' })
  createdAt: Date;

  @Field(() => Date, { description: 'Last update timestamp' })
  updatedAt: Date;
}
