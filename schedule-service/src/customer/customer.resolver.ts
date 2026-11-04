import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { Customer } from './models/customer.model';
import { CustomerPagination } from './models/customer-pagination.model';
import { CreateCustomerInput } from './dto/create-customer.input';
import { UpdateCustomerInput } from './dto/update-customer.input';
import { PaginationInput } from '../common/dto/pagination.input';
import { AuthGuard } from '../auth/auth.guard';

@Resolver(() => Customer)
@UseGuards(AuthGuard)
export class CustomerResolver {
  constructor(private readonly customerService: CustomerService) {}

  @Mutation(() => Customer, {
    description: 'Mendaftarkan data customer/pasien baru ke dalam sistem dengan validasi email unik dan invalidasi cache otomatis',
  })
  async createCustomer(
    @Args('input', { description: 'Payload data customer baru (nama lengkap dan alamat email unik)' })
    input: CreateCustomerInput,
  ): Promise<Customer> {
    return this.customerService.createCustomer(input);
  }

  @Mutation(() => Customer, {
    description: 'Memperbarui data customer yang sudah ada berdasarkan UUID dengan invalidasi cache',
  })
  async updateCustomer(
    @Args('input', { description: 'Payload data pembaruan customer (ID UUID, nama baru, dan/atau email baru)' })
    input: UpdateCustomerInput,
  ): Promise<Customer> {
    return this.customerService.updateCustomer(input);
  }

  @Query(() => CustomerPagination, {
    description: 'Mengambil daftar customer terdaftar dengan dukungan paginasi (skip & take) dan optimasi Redis Caching',
  })
  async customers(
    @Args('pagination', { nullable: true, description: 'Parameter paginasi (skip: offset data, take: jumlah data per halaman)' })
    pagination?: PaginationInput,
  ): Promise<CustomerPagination> {
    return this.customerService.customers(pagination);
  }

  @Query(() => Customer, {
    description: 'Mengambil detail data customer berdasarkan ID UUID spesifik dengan optimasi Redis Caching',
  })
  async customer(
    @Args('id', { type: () => ID, description: 'ID unik customer bertipe UUID' })
    id: string,
  ): Promise<Customer> {
    return this.customerService.customer(id);
  }

  @Mutation(() => Customer, {
    description: 'Menghapus data customer dari database berdasarkan ID UUID dan membersihkan cache terkait',
  })
  async deleteCustomer(
    @Args('id', { type: () => ID, description: 'ID unik customer yang akan dihapus bertipe UUID' })
    id: string,
  ): Promise<Customer> {
    return this.customerService.deleteCustomer(id);
  }
}
