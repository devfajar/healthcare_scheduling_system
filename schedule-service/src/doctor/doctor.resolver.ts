import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { Doctor } from './models/doctor.model';
import { DoctorPagination } from './models/doctor-pagination.model';
import { CreateDoctorInput } from './dto/create-doctor.input';
import { UpdateDoctorInput } from './dto/update-doctor.input';
import { PaginationInput } from '../common/dto/pagination.input';
import { AuthGuard } from '../auth/auth.guard';

@Resolver(() => Doctor)
@UseGuards(AuthGuard)
export class DoctorResolver {
  constructor(private readonly doctorService: DoctorService) {}

  @Mutation(() => Doctor, { description: 'Create a new doctor' })
  async createDoctor(
    @Args('input') input: CreateDoctorInput,
  ): Promise<Doctor> {
    return this.doctorService.createDoctor(input);
  }

  @Mutation(() => Doctor, { description: 'Update doctor details' })
  async updateDoctor(
    @Args('input') input: UpdateDoctorInput,
  ): Promise<Doctor> {
    return this.doctorService.updateDoctor(input);
  }

  @Query(() => DoctorPagination, { description: 'List doctors with pagination' })
  async doctors(
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
  ): Promise<DoctorPagination> {
    return this.doctorService.doctors(pagination);
  }

  @Query(() => Doctor, { description: 'Get doctor by ID' })
  async doctor(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Doctor> {
    return this.doctorService.doctor(id);
  }

  @Mutation(() => Doctor, { description: 'Delete doctor by ID' })
  async deleteDoctor(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Doctor> {
    return this.doctorService.deleteDoctor(id);
  }
}
