import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { Schedule } from './models/schedule.model';
import { SchedulePagination } from './models/schedule-pagination.model';
import { CreateScheduleInput } from './dto/create-schedule.input';
import { ScheduleFilterInput } from './dto/schedule-filter.input';
import { PaginationInput } from '../common/dto/pagination.input';
import { AuthGuard } from '../auth/auth.guard';

@Resolver(() => Schedule)
@UseGuards(AuthGuard)
export class ScheduleResolver {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Mutation(() => Schedule, { description: 'Create a new consultation schedule' })
  async createSchedule(
    @Args('input') input: CreateScheduleInput,
  ): Promise<Schedule> {
    return this.scheduleService.createSchedule(input);
  }

  @Query(() => SchedulePagination, {
    description: 'List schedules with optional filters and pagination',
  })
  async schedules(
    @Args('filter', { nullable: true }) filter?: ScheduleFilterInput,
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
  ): Promise<SchedulePagination> {
    return this.scheduleService.schedules(filter, pagination);
  }

  @Query(() => Schedule, { description: 'Get schedule by ID' })
  async schedule(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Schedule> {
    return this.scheduleService.schedule(id);
  }

  @Mutation(() => Schedule, { description: 'Delete schedule by ID' })
  async deleteSchedule(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Schedule> {
    return this.scheduleService.deleteSchedule(id);
  }
}
