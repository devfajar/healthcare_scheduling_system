import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailProducerService } from '../mail/mail-producer.service';
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
  }

  /**
   * List schedules with optional filters and pagination
   */
  async schedules(
    filter?: ScheduleFilterInput,
    pagination?: PaginationInput,
  ): Promise<SchedulePagination> {
    const skip = pagination?.skip ?? 0;
    const take = pagination?.take ?? 10;

    const where: any = {};

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

    return {
      items,
      total,
      skip,
      take,
    };
  }

  /**
   * Get single schedule by ID
   */
  async schedule(id: string): Promise<Schedule> {
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

    const deleted = await this.prisma.schedule.delete({
      where: { id },
      include: {
        customer: true,
        doctor: true,
      },
    });

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
  }
}
