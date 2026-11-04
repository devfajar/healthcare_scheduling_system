import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import { CACHE_PREFIX, CACHE_TTL } from '../cache/cache.constants';

describe('DoctorService', () => {
  let service: DoctorService;
  let prismaService: any;
  let cacheService: any;

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

    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      delByPattern: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorService,
        { provide: PrismaService, useValue: prismaService },
        { provide: RedisCacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<DoctorService>(DoctorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDoctor', () => {
    it('should successfully create a new doctor and invalidate list cache', async () => {
      prismaService.doctor.create.mockResolvedValue(mockDoctor);

      const result = await service.createDoctor({
        name: 'Doctor Lukman',
      });

      expect(prismaService.doctor.create).toHaveBeenCalledWith({
        data: { name: 'Doctor Lukman' },
      });
      expect(cacheService.delByPattern).toHaveBeenCalledWith(`${CACHE_PREFIX.DOCTORS_LIST}:*`);
      expect(result).toEqual(mockDoctor);
    });
  });

  describe('updateDoctor', () => {
    it('should successfully update doctor details and invalidate cache', async () => {
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
      expect(cacheService.delByPattern).toHaveBeenCalledWith(`${CACHE_PREFIX.DOCTORS_LIST}:*`);
      expect(cacheService.del).toHaveBeenCalledWith(`${CACHE_PREFIX.DOCTOR}:${mockDoctor.id}`);
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
    it('should return cached doctors if available (Cache Hit)', async () => {
      const cachedData = {
        items: [mockDoctor],
        total: 1,
        skip: 0,
        take: 10,
      };
      cacheService.get.mockResolvedValue(cachedData);

      const result = await service.doctors({ skip: 0, take: 10 });

      expect(result).toEqual(cachedData);
      expect(cacheService.get).toHaveBeenCalledWith(`${CACHE_PREFIX.DOCTORS_LIST}:0:10`);
      expect(prismaService.doctor.findMany).not.toHaveBeenCalled();
    });

    it('should query DB and populate cache on Cache Miss', async () => {
      cacheService.get.mockResolvedValue(null);
      prismaService.doctor.findMany.mockResolvedValue([mockDoctor]);
      prismaService.doctor.count.mockResolvedValue(1);

      const result = await service.doctors({ skip: 0, take: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${CACHE_PREFIX.DOCTORS_LIST}:0:10`,
        expect.objectContaining({ total: 1 }),
        CACHE_TTL.DOCTORS,
      );
    });
  });

  describe('doctor', () => {
    it('should return cached doctor if available (Cache Hit)', async () => {
      cacheService.get.mockResolvedValue(mockDoctor);

      const result = await service.doctor(mockDoctor.id);
      expect(result).toEqual(mockDoctor);
      expect(cacheService.get).toHaveBeenCalledWith(`${CACHE_PREFIX.DOCTOR}:${mockDoctor.id}`);
      expect(prismaService.doctor.findUnique).not.toHaveBeenCalled();
    });

    it('should query DB and store in cache on Cache Miss', async () => {
      cacheService.get.mockResolvedValue(null);
      prismaService.doctor.findUnique.mockResolvedValue(mockDoctor);

      const result = await service.doctor(mockDoctor.id);
      expect(result).toEqual(mockDoctor);
      expect(cacheService.set).toHaveBeenCalledWith(
        `${CACHE_PREFIX.DOCTOR}:${mockDoctor.id}`,
        mockDoctor,
        CACHE_TTL.DOCTOR_DETAIL,
      );
    });

    it('should throw NotFoundException if doctor is not found', async () => {
      cacheService.get.mockResolvedValue(null);
      prismaService.doctor.findUnique.mockResolvedValue(null);

      await expect(service.doctor('unknown-doctor')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteDoctor', () => {
    it('should successfully delete doctor and invalidate cache', async () => {
      prismaService.doctor.findUnique.mockResolvedValue(mockDoctor);
      prismaService.doctor.delete.mockResolvedValue(mockDoctor);

      const result = await service.deleteDoctor(mockDoctor.id);
      expect(result).toEqual(mockDoctor);
      expect(cacheService.delByPattern).toHaveBeenCalledWith(`${CACHE_PREFIX.DOCTORS_LIST}:*`);
      expect(cacheService.del).toHaveBeenCalledWith(`${CACHE_PREFIX.DOCTOR}:${mockDoctor.id}`);
    });

    it('should throw NotFoundException when deleting non-existent doctor', async () => {
      prismaService.doctor.findUnique.mockResolvedValue(null);

      await expect(service.deleteDoctor('unknown-doctor')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
