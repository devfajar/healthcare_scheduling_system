import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailProducerService } from '../mail/mail-producer.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import { CACHE_PREFIX, CACHE_TTL } from '../cache/cache.constants';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let prismaService: any;
  let mailProducerService: any;
  let cacheService: any;

  const mockCustomer = {
    id: 'c1111111-1111-1111-1111-111111111111',
    name: 'Customer Teddy',
    email: 'teddy@test.com',
  };

  const mockDoctor = {
    id: 'd1111111-1111-1111-1111-111111111111',
    name: 'Doctor Lukman',
  };

  const scheduledDate = new Date('2026-12-01T10:00:00.000Z');

  const mockSchedule = {
    id: 's1111111-1111-1111-1111-111111111111',
    objective: 'Consultation Doctor Lukman and Customer Teddy',
    customerId: mockCustomer.id,
    doctorId: mockDoctor.id,
    scheduledAt: scheduledDate,
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: mockCustomer,
    doctor: mockDoctor,
  };

  beforeEach(async () => {
    prismaService = {
      customer: {
        findUnique: jest.fn(),
      },
      doctor: {
        findUnique: jest.fn(),
      },
      schedule: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    mailProducerService = {
      queueScheduleCreated: jest.fn().mockResolvedValue(undefined),
      queueScheduleCancelled: jest.fn().mockResolvedValue(undefined),
    };

    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      delByPattern: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        { provide: PrismaService, useValue: prismaService },
        { provide: MailProducerService, useValue: mailProducerService },
        { provide: RedisCacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
  });

  describe('createSchedule', () => {
    it('should successfully create schedule, invalidate cache, and enqueue email', async () => {
      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      prismaService.doctor.findUnique.mockResolvedValue(mockDoctor);
      // No conflict
      prismaService.schedule.findUnique.mockResolvedValue(null);
      prismaService.schedule.create.mockResolvedValue(mockSchedule);

      const result = await service.createSchedule({
        objective: 'Consultation Doctor Lukman and Customer Teddy',
        customerId: mockCustomer.id,
        doctorId: mockDoctor.id,
        scheduledAt: scheduledDate,
      });

      expect(prismaService.customer.findUnique).toHaveBeenCalledWith({
        where: { id: mockCustomer.id },
      });
      expect(prismaService.doctor.findUnique).toHaveBeenCalledWith({
        where: { id: mockDoctor.id },
      });
      expect(prismaService.schedule.findUnique).toHaveBeenCalledWith({
        where: {
          doctor_schedule_unique: {
            doctorId: mockDoctor.id,
            scheduledAt: scheduledDate,
          },
        },
      });
      expect(cacheService.delByPattern).toHaveBeenCalledWith(`${CACHE_PREFIX.SCHEDULES_LIST}:*`);
      expect(result).toEqual(mockSchedule);

      // Verify email job is queued to Bull Queue
      expect(mailProducerService.queueScheduleCreated).toHaveBeenCalledWith({
        scheduleId: mockSchedule.id,
        customerName: mockCustomer.name,
        customerEmail: mockCustomer.email,
        doctorName: mockDoctor.name,
        scheduledAt: mockSchedule.scheduledAt,
        objective: mockSchedule.objective,
      });
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      prismaService.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.createSchedule({
          objective: 'Consultation',
          customerId: 'invalid-customer-id',
          doctorId: mockDoctor.id,
          scheduledAt: scheduledDate,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mailProducerService.queueScheduleCreated).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if doctor does not exist', async () => {
      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      prismaService.doctor.findUnique.mockResolvedValue(null);

      await expect(
        service.createSchedule({
          objective: 'Consultation',
          customerId: mockCustomer.id,
          doctorId: 'invalid-doctor-id',
          scheduledAt: scheduledDate,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mailProducerService.queueScheduleCreated).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if doctor has conflicting schedule at the same time', async () => {
      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      prismaService.doctor.findUnique.mockResolvedValue(mockDoctor);
      // Conflicting schedule exists
      prismaService.schedule.findUnique.mockResolvedValue(mockSchedule);

      await expect(
        service.createSchedule({
          objective: 'Conflicting Schedule with Customer Dani',
          customerId: mockCustomer.id,
          doctorId: mockDoctor.id,
          scheduledAt: scheduledDate,
        }),
      ).rejects.toThrow(ConflictException);

      expect(mailProducerService.queueScheduleCreated).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when race condition triggers Prisma P2002 unique constraint error on insert', async () => {
      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      prismaService.doctor.findUnique.mockResolvedValue(mockDoctor);
      // findUnique passes for both concurrent requests
      prismaService.schedule.findUnique.mockResolvedValue(null);
      // But concurrent insert triggers DB unique constraint violation
      prismaService.schedule.create.mockRejectedValue({
        code: 'P2002',
        message: 'Unique constraint failed on the fields: (`doctorId`,`scheduledAt`)',
      });

      await expect(
        service.createSchedule({
          objective: 'Concurrent booking attempt',
          customerId: mockCustomer.id,
          doctorId: mockDoctor.id,
          scheduledAt: scheduledDate,
        }),
      ).rejects.toThrow(ConflictException);

      expect(mailProducerService.queueScheduleCreated).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when race condition triggers Prisma P2003 foreign key error on insert', async () => {
      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      prismaService.doctor.findUnique.mockResolvedValue(mockDoctor);
      prismaService.schedule.findUnique.mockResolvedValue(null);
      // Concurrent deletion of doctor or customer triggers foreign key error
      prismaService.schedule.create.mockRejectedValue({
        code: 'P2003',
        message: 'Foreign key constraint failed on the field: `doctorId`',
      });

      await expect(
        service.createSchedule({
          objective: 'Concurrent booking attempt',
          customerId: mockCustomer.id,
          doctorId: mockDoctor.id,
          scheduledAt: scheduledDate,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mailProducerService.queueScheduleCreated).not.toHaveBeenCalled();
    });
  });

  describe('schedules', () => {
    it('should return cached schedules if available (Cache Hit)', async () => {
      const cachedData = {
        items: [mockSchedule],
        total: 1,
        skip: 0,
        take: 10,
      };
      cacheService.get.mockResolvedValue(cachedData);

      const result = await service.schedules();

      expect(result).toEqual(cachedData);
      expect(cacheService.get).toHaveBeenCalledWith(`${CACHE_PREFIX.SCHEDULES_LIST}:all:all:all:all:0:10`);
      expect(prismaService.schedule.findMany).not.toHaveBeenCalled();
    });

    it('should query DB and populate cache on Cache Miss', async () => {
      cacheService.get.mockResolvedValue(null);
      prismaService.schedule.findMany.mockResolvedValue([mockSchedule]);
      prismaService.schedule.count.mockResolvedValue(1);

      const result = await service.schedules();

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${CACHE_PREFIX.SCHEDULES_LIST}:all:all:all:all:0:10`,
        expect.objectContaining({ total: 1 }),
        CACHE_TTL.SCHEDULES,
      );
    });

    it('should apply doctor and customer filters when provided', async () => {
      prismaService.schedule.findMany.mockResolvedValue([mockSchedule]);
      prismaService.schedule.count.mockResolvedValue(1);

      await service.schedules(
        {
          doctorId: mockDoctor.id,
          customerId: mockCustomer.id,
        },
        { skip: 0, take: 5 },
      );

      expect(prismaService.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            doctorId: mockDoctor.id,
            customerId: mockCustomer.id,
          },
          skip: 0,
          take: 5,
        }),
      );
    });

    it('should apply date range filters when provided', async () => {
      prismaService.schedule.findMany.mockResolvedValue([mockSchedule]);
      prismaService.schedule.count.mockResolvedValue(1);

      const from = new Date('2026-12-01T00:00:00.000Z');
      const to = new Date('2026-12-02T00:00:00.000Z');

      await service.schedules({ startDate: from, endDate: to });

      expect(prismaService.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            scheduledAt: {
              gte: from,
              lte: to,
            },
          },
        }),
      );
    });
  });

  describe('schedule', () => {
    it('should return cached schedule if available (Cache Hit)', async () => {
      cacheService.get.mockResolvedValue(mockSchedule);

      const result = await service.schedule(mockSchedule.id);
      expect(result).toEqual(mockSchedule);
      expect(cacheService.get).toHaveBeenCalledWith(`${CACHE_PREFIX.SCHEDULE}:${mockSchedule.id}`);
      expect(prismaService.schedule.findUnique).not.toHaveBeenCalled();
    });

    it('should query DB and store in cache on Cache Miss', async () => {
      cacheService.get.mockResolvedValue(null);
      prismaService.schedule.findUnique.mockResolvedValue(mockSchedule);

      const result = await service.schedule(mockSchedule.id);
      expect(result).toEqual(mockSchedule);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${CACHE_PREFIX.SCHEDULE}:${mockSchedule.id}`,
        mockSchedule,
        CACHE_TTL.SCHEDULE_DETAIL,
      );
    });

    it('should throw NotFoundException when schedule is not found', async () => {
      prismaService.schedule.findUnique.mockResolvedValue(null);

      await expect(service.schedule('non-existent-schedule')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteSchedule', () => {
    it('should successfully delete schedule, invalidate cache, and enqueue email', async () => {
      prismaService.schedule.findUnique.mockResolvedValue(mockSchedule);
      prismaService.schedule.delete.mockResolvedValue(mockSchedule);

      const result = await service.deleteSchedule(mockSchedule.id);
      expect(result).toEqual(mockSchedule);
      expect(cacheService.delByPattern).toHaveBeenCalledWith(`${CACHE_PREFIX.SCHEDULES_LIST}:*`);
      expect(cacheService.del).toHaveBeenCalledWith(`${CACHE_PREFIX.SCHEDULE}:${mockSchedule.id}`);

      // Verify cancellation email job is queued to Bull Queue
      expect(mailProducerService.queueScheduleCancelled).toHaveBeenCalledWith({
        scheduleId: mockSchedule.id,
        customerName: mockCustomer.name,
        customerEmail: mockCustomer.email,
        doctorName: mockDoctor.name,
        scheduledAt: mockSchedule.scheduledAt,
        objective: mockSchedule.objective,
      });
    });

    it('should throw NotFoundException if schedule to delete is not found', async () => {
      prismaService.schedule.findUnique.mockResolvedValue(null);

      await expect(service.deleteSchedule('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );

      expect(mailProducerService.queueScheduleCancelled).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when race condition triggers Prisma P2025 record not found on delete', async () => {
      // Passes initial check
      prismaService.schedule.findUnique.mockResolvedValue(mockSchedule);
      // But concurrent delete deleted it first
      prismaService.schedule.delete.mockRejectedValue({
        code: 'P2025',
        message: 'An operation failed because it depends on one or more records that were required but not found.',
      });

      await expect(service.deleteSchedule(mockSchedule.id)).rejects.toThrow(
        NotFoundException,
      );

      expect(mailProducerService.queueScheduleCancelled).not.toHaveBeenCalled();
    });
  });
});
