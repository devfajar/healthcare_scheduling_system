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

  @Mutation(() => Customer, { description: 'Create a new customer' })
  async createCustomer(
    @Args('input') input: CreateCustomerInput,
  ): Promise<Customer> {
    return this.customerService.createCustomer(input);
  }

  @Mutation(() => Customer, { description: 'Update customer details' })
  async updateCustomer(
    @Args('input') input: UpdateCustomerInput,
  ): Promise<Customer> {
    return this.customerService.updateCustomer(input);
  }

  @Query(() => CustomerPagination, { description: 'List customers with pagination' })
  async customers(
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
  ): Promise<CustomerPagination> {
    return this.customerService.customers(pagination);
  }

  @Query(() => Customer, { description: 'Get customer by ID' })
  async customer(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Customer> {
    return this.customerService.customer(id);
  }

  @Mutation(() => Customer, { description: 'Delete customer by ID' })
  async deleteCustomer(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Customer> {
    return this.customerService.deleteCustomer(id);
  }
}
