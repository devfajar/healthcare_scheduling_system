import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CustomerService', () => {
  let service: CustomerService;
  let prismaService: any;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
  });

  describe('createCustomer', () => {
    it('should successfully create a customer', async () => {
      prismaService.customer.findUnique.mockResolvedValue(null);
      prismaService.customer.create.mockResolvedValue(mockCustomer);

      const result = await service.createCustomer({
        name: 'Teddy',
        email: 'teddy@test.com',
      });

      expect(prismaService.customer.findUnique).toHaveBeenCalledWith({
        where: { email: 'teddy@test.com' },
      });
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
    it('should successfully update customer details', async () => {
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
    it('should return paginated customers list', async () => {
      prismaService.customer.findMany.mockResolvedValue([mockCustomer]);
      prismaService.customer.count.mockResolvedValue(1);

      const result = await service.customers({ skip: 0, take: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(10);
    });
  });

  describe('customer', () => {
    it('should return customer by ID', async () => {
      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      const result = await service.customer(mockCustomer.id);
      expect(result).toEqual(mockCustomer);
    });

    it('should throw NotFoundException if customer is not found', async () => {
      prismaService.customer.findUnique.mockResolvedValue(null);

      await expect(service.customer('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteCustomer', () => {
    it('should successfully delete customer', async () => {
      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      prismaService.customer.delete.mockResolvedValue(mockCustomer);

      const result = await service.deleteCustomer(mockCustomer.id);
      expect(result).toEqual(mockCustomer);
    });

    it('should throw NotFoundException when deleting non-existent customer', async () => {
      prismaService.customer.findUnique.mockResolvedValue(null);

      await expect(service.deleteCustomer('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
