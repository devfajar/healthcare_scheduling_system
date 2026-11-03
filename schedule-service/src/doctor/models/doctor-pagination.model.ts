import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Doctor } from './doctor.model';

@ObjectType({ description: 'Paginated doctor list' })
export class DoctorPagination {
  @Field(() => [Doctor], { description: 'List of doctors' })
  items: Doctor[];

  @Field(() => Int, { description: 'Total number of doctors' })
  total: number;

  @Field(() => Int, { description: 'Current skip offset' })
  skip: number;

  @Field(() => Int, { description: 'Page limit / take' })
  take: number;
}
