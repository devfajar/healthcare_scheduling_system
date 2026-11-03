import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Schedule } from './schedule.model';

@ObjectType({ description: 'Paginated schedule list' })
export class SchedulePagination {
  @Field(() => [Schedule], { description: 'List of schedules' })
  items: Schedule[];

  @Field(() => Int, { description: 'Total number of schedules' })
  total: number;

  @Field(() => Int, { description: 'Current skip offset' })
  skip: number;

  @Field(() => Int, { description: 'Page limit / take' })
  take: number;
}
