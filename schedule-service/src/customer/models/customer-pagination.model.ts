import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Customer } from './customer.model';

@ObjectType({ description: 'Paginated customer list' })
export class CustomerPagination {
  @Field(() => [Customer], { description: 'List of customers' })
  items: Customer[];

  @Field(() => Int, { description: 'Total number of customers' })
  total: number;

  @Field(() => Int, { description: 'Current skip offset' })
  skip: number;

  @Field(() => Int, { description: 'Page limit / take' })
  take: number;
}
