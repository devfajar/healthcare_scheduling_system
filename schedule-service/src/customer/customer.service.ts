import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import { CACHE_PREFIX, CACHE_TTL } from '../cache/cache.constants';
import { isPrismaErrorWithCode } from '../common/prisma-error.util';
import { CreateCustomerInput } from './dto/create-customer.input';
import { UpdateCustomerInput } from './dto/update-customer.input';
import { PaginationInput } from '../common/dto/pagination.input';
import { Customer } from './models/customer.model';
import { CustomerPagination } from './models/customer-pagination.model';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: RedisCacheService,
  ) {}

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

    try {
      const customer = await this.prisma.customer.create({
        data: {
          name: input.name.trim(),
          email,
        },
      });

      // Invalidate list caches
      await this.cacheService.delByPattern(`${CACHE_PREFIX.CUSTOMERS_LIST}:*`);

      this.logger.log(`Created customer: ${customer.id}`);
      return customer;
    } catch (error: unknown) {
      // Handle race condition: concurrent registration colliding on unique email
      if (isPrismaErrorWithCode(error, 'P2002')) {
        throw new ConflictException(`Customer with email "${email}" already exists`);
      }
      throw error;
    }
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

    try {
      const updated = await this.prisma.customer.update({
        where: { id: input.id },
        data: {
          name: input.name ? input.name.trim() : existing.name,
          email,
        },
      });

      // Invalidate caches
      await Promise.all([
        this.cacheService.delByPattern(`${CACHE_PREFIX.CUSTOMERS_LIST}:*`),
        this.cacheService.del(`${CACHE_PREFIX.CUSTOMER}:${input.id}`),
      ]);

      return updated;
    } catch (error: unknown) {
      // Handle race condition: concurrent update colliding on unique email
      if (isPrismaErrorWithCode(error, 'P2002')) {
        throw new ConflictException(`Customer with email "${email}" already exists`);
      }
      // Handle race condition: customer deleted concurrently
      if (isPrismaErrorWithCode(error, 'P2025')) {
        throw new NotFoundException(`Customer with ID "${input.id}" not found`);
      }
      throw error;
    }
  }

  /**
   * List customers with pagination (Redis Cached)
   */
  async customers(pagination?: PaginationInput): Promise<CustomerPagination> {
    const skip = pagination?.skip ?? 0;
    const take = pagination?.take ?? 10;
    const cacheKey = `${CACHE_PREFIX.CUSTOMERS_LIST}:${skip}:${take}`;

    // 1. Try Cache Hit
    const cached = await this.cacheService.get<CustomerPagination>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for customers query: ${cacheKey}`);
      return cached;
    }

    // 2. Cache Miss - Query Database
    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count(),
    ]);

    const result: CustomerPagination = {
      items,
      total,
      skip,
      take,
    };

    // 3. Store in Redis Cache (TTL: 300s)
    await this.cacheService.set(cacheKey, result, CACHE_TTL.CUSTOMERS);
    return result;
  }

  /**
   * Get single customer by ID (Redis Cached)
   */
  async customer(id: string): Promise<Customer> {
    const cacheKey = `${CACHE_PREFIX.CUSTOMER}:${id}`;

    // 1. Try Cache Hit
    const cached = await this.cacheService.get<Customer>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for customer: ${cacheKey}`);
      return cached;
    }

    // 2. Cache Miss - Query Database
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    // 3. Store in Redis Cache (TTL: 300s)
    await this.cacheService.set(cacheKey, customer, CACHE_TTL.CUSTOMER_DETAIL);
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

    try {
      const deleted = await this.prisma.customer.delete({
        where: { id },
      });

      // Invalidate caches
      await Promise.all([
        this.cacheService.delByPattern(`${CACHE_PREFIX.CUSTOMERS_LIST}:*`),
        this.cacheService.del(`${CACHE_PREFIX.CUSTOMER}:${id}`),
      ]);

      return deleted;
    } catch (error: unknown) {
      // Handle race condition: customer deleted concurrently
      if (isPrismaErrorWithCode(error, 'P2025')) {
        throw new NotFoundException(`Customer with ID "${id}" not found`);
      }
      throw error;
    }
  }
}
