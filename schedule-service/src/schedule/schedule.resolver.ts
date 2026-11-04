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

  @Mutation(() => Schedule, {
    description:
      'Membuat jadwal konsultasi dokter baru dengan validasi bentrok jadwal (conflict prevention), validasi eksistensi customer & dokter, pengiriman notifikasi email ke customer via Bull Queue, serta invalidasi Redis cache',
  })
  async createSchedule(
    @Args('input', {
      description:
        'Payload pembuatan jadwal: objective (tujuan konsultasi), customerId (UUID), doctorId (UUID), scheduledAt (ISO 8601 DateTime)',
    })
    input: CreateScheduleInput,
  ): Promise<Schedule> {
    return this.scheduleService.createSchedule(input);
  }

  @Query(() => SchedulePagination, {
    description:
      'Menampilkan daftar jadwal konsultasi dengan dukungan filter (berdasarkan doctorId, customerId, rentang tanggal) serta paginasi dan optimasi Redis Caching',
  })
  async schedules(
    @Args('filter', { nullable: true, description: 'Filter pencarian jadwal (doctorId, customerId, startDate, endDate)' })
    filter?: ScheduleFilterInput,
    @Args('pagination', { nullable: true, description: 'Parameter paginasi jadwal (skip, take)' })
    pagination?: PaginationInput,
  ): Promise<SchedulePagination> {
    return this.scheduleService.schedules(filter, pagination);
  }

  @Query(() => Schedule, {
    description:
      'Mengambil detail jadwal konsultasi lengkap beserta data relasi Customer dan Doctor berdasarkan ID jadwal (dengan optimasi Redis Caching)',
  })
  async schedule(
    @Args('id', { type: () => ID, description: 'ID unik jadwal konsultasi bertipe UUID' })
    id: string,
  ): Promise<Schedule> {
    return this.scheduleService.schedule(id);
  }

  @Mutation(() => Schedule, {
    description:
      'Menghapus jadwal konsultasi dokter, mengirim email pemberitahuan pembatalan ke customer via Bull Queue, serta menginvalidasi Redis cache terkait',
  })
  async deleteSchedule(
    @Args('id', { type: () => ID, description: 'ID unik jadwal yang akan dihapus bertipe UUID' })
    id: string,
  ): Promise<Schedule> {
    return this.scheduleService.deleteSchedule(id);
  }
}
