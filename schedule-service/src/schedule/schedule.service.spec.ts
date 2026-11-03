import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let prismaService: any;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
  });

  describe('createSchedule', () => {
    it('should successfully create schedule when customer, doctor exist and time is available', async () => {
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
      expect(result).toEqual(mockSchedule);
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      prismaService.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.createSchedule({
          objective: 'General Checkup',
          customerId: 'non-existent-customer',
          doctorId: mockDoctor.id,
          scheduledAt: scheduledDate,
        }),
      ).rejects.toThrow(
        new NotFoundException('Customer with ID "non-existent-customer" not found'),
      );
    });

    it('should throw NotFoundException if doctor does not exist', async () => {
      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      prismaService.doctor.findUnique.mockResolvedValue(null);

      await expect(
        service.createSchedule({
          objective: 'General Checkup',
          customerId: mockCustomer.id,
          doctorId: 'non-existent-doctor',
          scheduledAt: scheduledDate,
        }),
      ).rejects.toThrow(
        new NotFoundException('Doctor with ID "non-existent-doctor" not found'),
      );
    });

    it('should throw ConflictException if doctor already has an appointment at the same time', async () => {
      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      prismaService.doctor.findUnique.mockResolvedValue(mockDoctor);
      // Conflict exists!
      prismaService.schedule.findUnique.mockResolvedValue(mockSchedule);

      await expect(
        service.createSchedule({
          objective: 'Urgent Consultation',
          customerId: mockCustomer.id,
          doctorId: mockDoctor.id,
          scheduledAt: scheduledDate,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('schedules', () => {
    it('should return paginated schedules', async () => {
      prismaService.schedule.findMany.mockResolvedValue([mockSchedule]);
      prismaService.schedule.count.mockResolvedValue(1);

      const result = await service.schedules(undefined, { skip: 0, take: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter schedules by doctorId and customerId', async () => {
      prismaService.schedule.findMany.mockResolvedValue([mockSchedule]);
      prismaService.schedule.count.mockResolvedValue(1);

      await service.schedules({
        doctorId: mockDoctor.id,
        customerId: mockCustomer.id,
      });

      expect(prismaService.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            doctorId: mockDoctor.id,
            customerId: mockCustomer.id,
          },
        }),
      );
    });
  });

  describe('schedule', () => {
    it('should return single schedule by ID', async () => {
      prismaService.schedule.findUnique.mockResolvedValue(mockSchedule);

      const result = await service.schedule(mockSchedule.id);
      expect(result).toEqual(mockSchedule);
    });

    it('should throw NotFoundException when schedule is not found', async () => {
      prismaService.schedule.findUnique.mockResolvedValue(null);

      await expect(service.schedule('non-existent-schedule')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteSchedule', () => {
    it('should successfully delete schedule', async () => {
      prismaService.schedule.findUnique.mockResolvedValue(mockSchedule);
      prismaService.schedule.delete.mockResolvedValue(mockSchedule);

      const result = await service.deleteSchedule(mockSchedule.id);
      expect(result).toEqual(mockSchedule);
    });

    it('should throw NotFoundException if schedule to delete is not found', async () => {
      prismaService.schedule.findUnique.mockResolvedValue(null);

      await expect(service.deleteSchedule('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
