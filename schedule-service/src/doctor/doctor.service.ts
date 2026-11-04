import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import { CACHE_PREFIX, CACHE_TTL } from '../cache/cache.constants';
import { CreateDoctorInput } from './dto/create-doctor.input';
import { UpdateDoctorInput } from './dto/update-doctor.input';
import { PaginationInput } from '../common/dto/pagination.input';
import { Doctor } from './models/doctor.model';
import { DoctorPagination } from './models/doctor-pagination.model';

@Injectable()
export class DoctorService {
  private readonly logger = new Logger(DoctorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: RedisCacheService,
  ) {}

  /**
   * Create a new doctor
   */
  async createDoctor(input: CreateDoctorInput): Promise<Doctor> {
    const doctor = await this.prisma.doctor.create({
      data: {
        name: input.name.trim(),
      },
    });

    // Invalidate doctors list cache
    await this.cacheService.delByPattern(`${CACHE_PREFIX.DOCTORS_LIST}:*`);

    this.logger.log(`Created doctor: ${doctor.id}`);
    return doctor;
  }

  /**
   * Update doctor details
   */
  async updateDoctor(input: UpdateDoctorInput): Promise<Doctor> {
    const existing = await this.prisma.doctor.findUnique({
      where: { id: input.id },
    });

    if (!existing) {
      throw new NotFoundException(`Doctor with ID "${input.id}" not found`);
    }

    const updated = await this.prisma.doctor.update({
      where: { id: input.id },
      data: {
        name: input.name ? input.name.trim() : existing.name,
      },
    });

    // Invalidate caches
    await Promise.all([
      this.cacheService.delByPattern(`${CACHE_PREFIX.DOCTORS_LIST}:*`),
      this.cacheService.del(`${CACHE_PREFIX.DOCTOR}:${input.id}`),
    ]);

    return updated;
  }

  /**
   * List doctors with pagination (Redis Cached for high-concurrency patient access)
   * High-traffic catalog: Cached for 15 minutes (900 seconds)
   */
  async doctors(pagination?: PaginationInput): Promise<DoctorPagination> {
    const skip = pagination?.skip ?? 0;
    const take = pagination?.take ?? 10;
    const cacheKey = `${CACHE_PREFIX.DOCTORS_LIST}:${skip}:${take}`;

    // 1. Try Cache Hit
    const cached = await this.cacheService.get<DoctorPagination>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for doctors catalog: ${cacheKey}`);
      return cached;
    }

    // 2. Cache Miss - Query Database
    const [items, total] = await Promise.all([
      this.prisma.doctor.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.doctor.count(),
    ]);

    const result: DoctorPagination = {
      items,
      total,
      skip,
      take,
    };

    // 3. Store in Redis Cache (TTL: 900s / 15 minutes)
    await this.cacheService.set(cacheKey, result, CACHE_TTL.DOCTORS);
    return result;
  }

  /**
   * Get doctor by ID (Redis Cached for fast profile lookups)
   */
  async doctor(id: string): Promise<Doctor> {
    const cacheKey = `${CACHE_PREFIX.DOCTOR}:${id}`;

    // 1. Try Cache Hit
    const cached = await this.cacheService.get<Doctor>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for doctor profile: ${cacheKey}`);
      return cached;
    }

    // 2. Cache Miss - Query Database
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID "${id}" not found`);
    }

    // 3. Store in Redis Cache (TTL: 900s / 15 minutes)
    await this.cacheService.set(cacheKey, doctor, CACHE_TTL.DOCTOR_DETAIL);
    return doctor;
  }

  /**
   * Delete doctor by ID
   */
  async deleteDoctor(id: string): Promise<Doctor> {
    const existing = await this.prisma.doctor.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Doctor with ID "${id}" not found`);
    }

    const deleted = await this.prisma.doctor.delete({
      where: { id },
    });

    // Invalidate caches
    await Promise.all([
      this.cacheService.delByPattern(`${CACHE_PREFIX.DOCTORS_LIST}:*`),
      this.cacheService.del(`${CACHE_PREFIX.DOCTOR}:${id}`),
    ]);

    return deleted;
  }
}
