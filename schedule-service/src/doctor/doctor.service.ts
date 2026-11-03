import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDoctorInput } from './dto/create-doctor.input';
import { UpdateDoctorInput } from './dto/update-doctor.input';
import { PaginationInput } from '../common/dto/pagination.input';
import { Doctor } from './models/doctor.model';
import { DoctorPagination } from './models/doctor-pagination.model';

@Injectable()
export class DoctorService {
  private readonly logger = new Logger(DoctorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new doctor
   */
  async createDoctor(input: CreateDoctorInput): Promise<Doctor> {
    const doctor = await this.prisma.doctor.create({
      data: {
        name: input.name.trim(),
      },
    });

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

    return this.prisma.doctor.update({
      where: { id: input.id },
      data: {
        name: input.name ? input.name.trim() : existing.name,
      },
    });
  }

  /**
   * List doctors with pagination
   */
  async doctors(pagination?: PaginationInput): Promise<DoctorPagination> {
    const skip = pagination?.skip ?? 0;
    const take = pagination?.take ?? 10;

    const [items, total] = await Promise.all([
      this.prisma.doctor.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.doctor.count(),
    ]);

    return {
      items,
      total,
      skip,
      take,
    };
  }

  /**
   * Get doctor by ID
   */
  async doctor(id: string): Promise<Doctor> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID "${id}" not found`);
    }

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

    return this.prisma.doctor.delete({
      where: { id },
    });
  }
}
