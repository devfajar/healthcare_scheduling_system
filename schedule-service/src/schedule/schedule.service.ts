import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailProducerService } from '../mail/mail-producer.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import { CACHE_PREFIX, CACHE_TTL } from '../cache/cache.constants';
import { isPrismaErrorWithCode } from '../common/prisma-error.util';
import { CreateScheduleInput } from './dto/create-schedule.input';
import { ScheduleFilterInput } from './dto/schedule-filter.input';
import { PaginationInput } from '../common/dto/pagination.input';
import { Schedule } from './models/schedule.model';
import { SchedulePagination } from './models/schedule-pagination.model';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailProducerService: MailProducerService,
    private readonly cacheService: RedisCacheService,
  ) {}

  /**
   * Create a new consultation schedule
   * Validates customer & doctor existence, and prevents doctor time conflicts
   */
  async createSchedule(input: CreateScheduleInput): Promise<Schedule> {
    // 1. Validate customer existence
    const customer = await this.prisma.customer.findUnique({
      where: { id: input.customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${input.customerId}" not found`);
    }

    // 2. Validate doctor existence
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: input.doctorId },
    });
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID "${input.doctorId}" not found`);
    }

    // 3. Prevent doctor schedule conflict (same doctor at same time)
    const scheduledDate = new Date(input.scheduledAt);
    const existingConflict = await this.prisma.schedule.findUnique({
      where: {
        doctor_schedule_unique: {
          doctorId: input.doctorId,
          scheduledAt: scheduledDate,
        },
      },
    });

    if (existingConflict) {
      throw new ConflictException(
        `Doctor already has an appointment scheduled at ${scheduledDate.toISOString()}`,
      );
    }

    // 4. Create and return schedule with customer & doctor relations
    try {
      const schedule = await this.prisma.schedule.create({
        data: {
          objective: input.objective.trim(),
          customerId: input.customerId,
          doctorId: input.doctorId,
          scheduledAt: scheduledDate,
        },
        include: {
          customer: true,
          doctor: true,
        },
      });

      // Invalidate schedules cache immediately on booking
      await this.cacheService.delByPattern(`${CACHE_PREFIX.SCHEDULES_LIST}:*`);

      this.logger.log(`Created schedule: ${schedule.id} for doctor ${schedule.doctorId}`);

      // Dispatch email notification to customer via Bull Queue
      await this.mailProducerService.queueScheduleCreated({
        scheduleId: schedule.id,
        customerName: schedule.customer.name,
        customerEmail: schedule.customer.email,
        doctorName: schedule.doctor.name,
        scheduledAt: schedule.scheduledAt,
        objective: schedule.objective,
      });

      return schedule;
    } catch (error: unknown) {
      // Handle race condition: concurrent insert colliding on doctor_schedule_unique constraint
      if (isPrismaErrorWithCode(error, 'P2002')) {
        throw new ConflictException(
          `Doctor already has an appointment scheduled at ${scheduledDate.toISOString()}`,
        );
      }
      // Handle race condition: customer or doctor deleted concurrently
      if (isPrismaErrorWithCode(error, 'P2003')) {
        throw new NotFoundException('Customer or Doctor referenced in schedule no longer exists');
      }
      throw error;
    }
  }

  /**
   * List schedules with optional filters and pagination (Redis Cached for high-volume availability checks)
   * High-traffic query: Cached for 60 seconds (rapid slot booking freshness)
   */
  async schedules(
    filter?: ScheduleFilterInput,
    pagination?: PaginationInput,
  ): Promise<SchedulePagination> {
    const skip = pagination?.skip ?? 0;
    const take = pagination?.take ?? 10;
    const cacheKey = `${CACHE_PREFIX.SCHEDULES_LIST}:${filter?.doctorId || 'all'}:${filter?.customerId || 'all'}:${filter?.startDate || 'all'}:${filter?.endDate || 'all'}:${skip}:${take}`;

    // 1. Try Cache Hit
    const cached = await this.cacheService.get<SchedulePagination>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for schedules: ${cacheKey}`);
      return cached;
    }

    // 2. Cache Miss - Strongly typed Prisma query
    const where: Prisma.ScheduleWhereInput = {};

    if (filter?.doctorId) {
      where.doctorId = filter.doctorId;
    }

    if (filter?.customerId) {
      where.customerId = filter.customerId;
    }

    if (filter?.startDate || filter?.endDate) {
      where.scheduledAt = {};
      if (filter.startDate) {
        where.scheduledAt.gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        where.scheduledAt.lte = new Date(filter.endDate);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.schedule.findMany({
        where,
        skip,
        take,
        orderBy: { scheduledAt: 'asc' },
        include: {
          customer: true,
          doctor: true,
        },
      }),
      this.prisma.schedule.count({ where }),
    ]);

    const result: SchedulePagination = {
      items,
      total,
      skip,
      take,
    };

    // 3. Store in Redis Cache (TTL: 60 seconds)
    await this.cacheService.set(cacheKey, result, CACHE_TTL.SCHEDULES);
    return result;
  }

  /**
   * Get single schedule by ID (Redis Cached)
   */
  async schedule(id: string): Promise<Schedule> {
    const cacheKey = `${CACHE_PREFIX.SCHEDULE}:${id}`;

    // 1. Try Cache Hit
    const cached = await this.cacheService.get<Schedule>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for schedule: ${cacheKey}`);
      return cached;
    }

    // 2. Cache Miss - Query Database
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        customer: true,
        doctor: true,
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID "${id}" not found`);
    }

    // 3. Store in Redis Cache (TTL: 60 seconds)
    await this.cacheService.set(cacheKey, schedule, CACHE_TTL.SCHEDULE_DETAIL);
    return schedule;
  }

  /**
   * Delete schedule by ID
   */
  async deleteSchedule(id: string): Promise<Schedule> {
    const existing = await this.prisma.schedule.findUnique({
      where: { id },
      include: {
        customer: true,
        doctor: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Schedule with ID "${id}" not found`);
    }

    try {
      const deleted = await this.prisma.schedule.delete({
        where: { id },
        include: {
          customer: true,
          doctor: true,
        },
      });

      // Invalidate caches
      await Promise.all([
        this.cacheService.delByPattern(`${CACHE_PREFIX.SCHEDULES_LIST}:*`),
        this.cacheService.del(`${CACHE_PREFIX.SCHEDULE}:${id}`),
      ]);

      // Dispatch cancellation email notification to customer via Bull Queue
      await this.mailProducerService.queueScheduleCancelled({
        scheduleId: deleted.id,
        customerName: deleted.customer.name,
        customerEmail: deleted.customer.email,
        doctorName: deleted.doctor.name,
        scheduledAt: deleted.scheduledAt,
        objective: deleted.objective,
      });

      return deleted;
    } catch (error: unknown) {
      // Handle race condition: schedule deleted concurrently by another request
      if (isPrismaErrorWithCode(error, 'P2025')) {
        throw new NotFoundException(`Schedule with ID "${id}" not found`);
      }
      throw error;
    }
  }
}
