import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DoctorService', () => {
  let service: DoctorService;
  let prismaService: any;

  const mockDoctor = {
    id: 'd1111111-1111-1111-1111-111111111111',
    name: 'Doctor Lukman',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaService = {
      doctor: {
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
        DoctorService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<DoctorService>(DoctorService);
  });

  describe('createDoctor', () => {
    it('should successfully create a new doctor', async () => {
      prismaService.doctor.create.mockResolvedValue(mockDoctor);

      const result = await service.createDoctor({
        name: 'Doctor Lukman',
      });

      expect(prismaService.doctor.create).toHaveBeenCalledWith({
        data: { name: 'Doctor Lukman' },
      });
      expect(result).toEqual(mockDoctor);
    });
  });

  describe('updateDoctor', () => {
    it('should successfully update doctor details', async () => {
      prismaService.doctor.findUnique.mockResolvedValue(mockDoctor);
      prismaService.doctor.update.mockResolvedValue({
        ...mockDoctor,
        name: 'Doctor Lukman',
      });

      const result = await service.updateDoctor({
        id: mockDoctor.id,
        name: 'Doctor Lukman',
      });

      expect(result.name).toBe('Doctor Lukman');
    });

    it('should throw NotFoundException if doctor does not exist', async () => {
      prismaService.doctor.findUnique.mockResolvedValue(null);

      await expect(
        service.updateDoctor({
          id: 'unknown-doctor',
          name: 'Doctor Lukman',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('doctors', () => {
    it('should return paginated doctors list', async () => {
      prismaService.doctor.findMany.mockResolvedValue([mockDoctor]);
      prismaService.doctor.count.mockResolvedValue(1);

      const result = await service.doctors({ skip: 0, take: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(10);
    });
  });

  describe('doctor', () => {
    it('should return doctor by ID', async () => {
      prismaService.doctor.findUnique.mockResolvedValue(mockDoctor);

      const result = await service.doctor(mockDoctor.id);
      expect(result).toEqual(mockDoctor);
    });

    it('should throw NotFoundException if doctor not found', async () => {
      prismaService.doctor.findUnique.mockResolvedValue(null);

      await expect(service.doctor('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteDoctor', () => {
    it('should delete doctor by ID', async () => {
      prismaService.doctor.findUnique.mockResolvedValue(mockDoctor);
      prismaService.doctor.delete.mockResolvedValue(mockDoctor);

      const result = await service.deleteDoctor(mockDoctor.id);
      expect(result).toEqual(mockDoctor);
    });

    it('should throw NotFoundException if doctor to delete is not found', async () => {
      prismaService.doctor.findUnique.mockResolvedValue(null);

      await expect(service.deleteDoctor('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
