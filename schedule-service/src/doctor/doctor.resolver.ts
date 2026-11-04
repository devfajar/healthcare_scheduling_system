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

  @Mutation(() => Doctor, {
    description: 'Mendaftarkan dokter baru ke dalam sistem jadwal dan menginvalidasi cache daftar dokter',
  })
  async createDoctor(
    @Args('input', { description: 'Payload data dokter baru (nama lengkap beserta gelar)' })
    input: CreateDoctorInput,
  ): Promise<Doctor> {
    return this.doctorService.createDoctor(input);
  }

  @Mutation(() => Doctor, {
    description: 'Memperbarui informasi dokter berdasarkan ID UUID dan membersihkan cache terkait',
  })
  async updateDoctor(
    @Args('input', { description: 'Payload pembaruan data dokter (ID UUID dan nama baru)' })
    input: UpdateDoctorInput,
  ): Promise<Doctor> {
    return this.doctorService.updateDoctor(input);
  }

  @Query(() => DoctorPagination, {
    description: 'Mengambil daftar dokter dengan dukungan paginasi dan optimasi Redis Caching',
  })
  async doctors(
    @Args('pagination', { nullable: true, description: 'Parameter paginasi (skip & take)' })
    pagination?: PaginationInput,
  ): Promise<DoctorPagination> {
    return this.doctorService.doctors(pagination);
  }

  @Query(() => Doctor, {
    description: 'Mengambil informasi detail dokter berdasarkan ID UUID dengan optimasi Redis Caching',
  })
  async doctor(
    @Args('id', { type: () => ID, description: 'ID unik dokter bertipe UUID' })
    id: string,
  ): Promise<Doctor> {
    return this.doctorService.doctor(id);
  }

  @Mutation(() => Doctor, {
    description: 'Menghapus data dokter berdasarkan ID UUID dan menginvalidasi cache dokter',
  })
  async deleteDoctor(
    @Args('id', { type: () => ID, description: 'ID unik dokter yang akan dihapus bertipe UUID' })
    id: string,
  ): Promise<Doctor> {
    return this.doctorService.deleteDoctor(id);
  }
}
