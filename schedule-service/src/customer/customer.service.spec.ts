import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import { CACHE_PREFIX, CACHE_TTL } from '../cache/cache.constants';

describe('CustomerService', () => {
  let service: CustomerService;
  let prismaService: any;
  let cacheService: any;

  const mockCustomer = {
    id: 'c1111111-1111-1111-1111-111111111111',
    name: 'Teddy',
    email: 'teddy@test.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaService = {
      customer: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      delByPattern: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: PrismaService, useValue: prismaService },
        { provide: RedisCacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
  });

  describe('createCustomer', () => {
    it('should successfully create a customer and invalidate list cache', async () => {
      prismaService.customer.findUnique.mockResolvedValue(null);
      prismaService.customer.create.mockResolvedValue(mockCustomer);

      const result = await service.createCustomer({
        name: 'Teddy',
        email: 'teddy@test.com',
      });

      expect(prismaService.customer.findUnique).toHaveBeenCalledWith({
        where: { email: 'teddy@test.com' },
      });
      expect(cacheService.delByPattern).toHaveBeenCalledWith(`${CACHE_PREFIX.CUSTOMERS_LIST}:*`);
      expect(result).toEqual(mockCustomer);
    });

    it('should throw ConflictException if customer email already exists', async () => {
      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      await expect(
        service.createCustomer({
          name: 'Teddy',
          email: 'teddy@test.com',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateCustomer', () => {
    it('should successfully update customer details and invalidate cache', async () => {
      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      prismaService.customer.update.mockResolvedValue({
        ...mockCustomer,
        name: 'Teddy',
      });

      const result = await service.updateCustomer({
        id: mockCustomer.id,
        name: 'Teddy',
      });

      expect(result.name).toBe('Teddy');
      expect(cacheService.delByPattern).toHaveBeenCalledWith(`${CACHE_PREFIX.CUSTOMERS_LIST}:*`);
      expect(cacheService.del).toHaveBeenCalledWith(`${CACHE_PREFIX.CUSTOMER}:${mockCustomer.id}`);
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      prismaService.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCustomer({
          id: 'non-existent-id',
          name: 'Teddy',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('customers', () => {
    it('should return cached data if available (Cache Hit)', async () => {
      const cachedData = {
        items: [mockCustomer],
        total: 1,
        skip: 0,
        take: 10,
      };
      cacheService.get.mockResolvedValue(cachedData);

      const result = await service.customers({ skip: 0, take: 10 });

      expect(result).toEqual(cachedData);
      expect(cacheService.get).toHaveBeenCalledWith(`${CACHE_PREFIX.CUSTOMERS_LIST}:0:10`);
      expect(prismaService.customer.findMany).not.toHaveBeenCalled();
    });

    it('should query DB and populate cache on Cache Miss', async () => {
      cacheService.get.mockResolvedValue(null);
      prismaService.customer.findMany.mockResolvedValue([mockCustomer]);
      prismaService.customer.count.mockResolvedValue(1);

      const result = await service.customers({ skip: 0, take: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${CACHE_PREFIX.CUSTOMERS_LIST}:0:10`,
        expect.objectContaining({ total: 1 }),
        CACHE_TTL.CUSTOMERS,
      );
    });
  });

  describe('customer', () => {
    it('should return cached customer if available (Cache Hit)', async () => {
      cacheService.get.mockResolvedValue(mockCustomer);

      const result = await service.customer(mockCustomer.id);
      expect(result).toEqual(mockCustomer);
      expect(cacheService.get).toHaveBeenCalledWith(`${CACHE_PREFIX.CUSTOMER}:${mockCustomer.id}`);
      expect(prismaService.customer.findUnique).not.toHaveBeenCalled();
    });

    it('should query DB and store in cache on Cache Miss', async () => {
      cacheService.get.mockResolvedValue(null);
      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      const result = await service.customer(mockCustomer.id);
      expect(result).toEqual(mockCustomer);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${CACHE_PREFIX.CUSTOMER}:${mockCustomer.id}`,
        mockCustomer,
        CACHE_TTL.CUSTOMER_DETAIL,
      );
    });

    it('should throw NotFoundException if customer is not found', async () => {
      cacheService.get.mockResolvedValue(null);
      prismaService.customer.findUnique.mockResolvedValue(null);

      await expect(service.customer('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteCustomer', () => {
    it('should successfully delete customer and invalidate cache', async () => {
      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      prismaService.customer.delete.mockResolvedValue(mockCustomer);

      const result = await service.deleteCustomer(mockCustomer.id);
      expect(result).toEqual(mockCustomer);
      expect(cacheService.delByPattern).toHaveBeenCalledWith(`${CACHE_PREFIX.CUSTOMERS_LIST}:*`);
      expect(cacheService.del).toHaveBeenCalledWith(`${CACHE_PREFIX.CUSTOMER}:${mockCustomer.id}`);
    });

    it('should throw NotFoundException when deleting non-existent customer', async () => {
      prismaService.customer.findUnique.mockResolvedValue(null);

      await expect(service.deleteCustomer('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
