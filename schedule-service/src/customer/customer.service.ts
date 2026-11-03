import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerInput } from './dto/create-customer.input';
import { UpdateCustomerInput } from './dto/update-customer.input';
import { PaginationInput } from '../common/dto/pagination.input';
import { Customer } from './models/customer.model';
import { CustomerPagination } from './models/customer-pagination.model';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new customer
   */
  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    const email = input.email.trim().toLowerCase();

    const existing = await this.prisma.customer.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException(`Customer with email "${email}" already exists`);
    }

    const customer = await this.prisma.customer.create({
      data: {
        name: input.name.trim(),
        email,
      },
    });

    this.logger.log(`Created customer: ${customer.id}`);
    return customer;
  }

  /**
   * Update customer information
   */
  async updateCustomer(input: UpdateCustomerInput): Promise<Customer> {
    const existing = await this.prisma.customer.findUnique({
      where: { id: input.id },
    });

    if (!existing) {
      throw new NotFoundException(`Customer with ID "${input.id}" not found`);
    }

    let email = existing.email;
    if (input.email) {
      email = input.email.trim().toLowerCase();
      if (email !== existing.email) {
        const emailTaken = await this.prisma.customer.findUnique({
          where: { email },
        });
        if (emailTaken) {
          throw new ConflictException(`Customer with email "${email}" already exists`);
        }
      }
    }

    return this.prisma.customer.update({
      where: { id: input.id },
      data: {
        name: input.name ? input.name.trim() : existing.name,
        email,
      },
    });
  }

  /**
   * List customers with pagination
   */
  async customers(pagination?: PaginationInput): Promise<CustomerPagination> {
    const skip = pagination?.skip ?? 0;
    const take = pagination?.take ?? 10;

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count(),
    ]);

    return {
      items,
      total,
      skip,
      take,
    };
  }

  /**
   * Get single customer by ID
   */
  async customer(id: string): Promise<Customer> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    return customer;
  }

  /**
   * Delete customer by ID
   */
  async deleteCustomer(id: string): Promise<Customer> {
    const existing = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    return this.prisma.customer.delete({
      where: { id },
    });
  }
}
