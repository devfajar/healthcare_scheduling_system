import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisCacheService } from './redis-cache.service';

describe('RedisCacheService', () => {
  let service: RedisCacheService;
  let mockRedisClient: any;

  beforeEach(async () => {
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      quit: jest.fn(),
      on: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<RedisCacheService>(RedisCacheService);
    // Inject mock client and set connected
    (service as any).client = mockRedisClient;
    (service as any).isConnected = true;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return parsed JSON data when key exists', async () => {
      const mockData = { id: 'c1', name: 'Teddy' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockData));

      const result = await service.get('customer:c1');
      expect(result).toEqual(mockData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('customer:c1');
    });

    it('should return null when key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get('non-existent');
      expect(result).toBeNull();
    });

    it('should return null when client is disconnected', async () => {
      (service as any).isConnected = false;

      const result = await service.get('customer:c1');
      expect(result).toBeNull();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('should serialize value and set with TTL', async () => {
      const mockData = { id: 'd1', name: 'Doctor Lukman' };
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('doctor:d1', mockData, 300);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'doctor:d1',
        JSON.stringify(mockData),
        'EX',
        300,
      );
    });

    it('should gracefully handle errors without throwing', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis full'));

      await expect(service.set('key', { data: 1 })).resolves.not.toThrow();
    });
  });

  describe('del', () => {
    it('should delete key in redis', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await service.del('customer:c1');
      expect(mockRedisClient.del).toHaveBeenCalledWith('customer:c1');
    });
  });

  describe('delByPattern', () => {
    it('should find keys by pattern and delete them', async () => {
      mockRedisClient.keys.mockResolvedValue(['customers:0:10', 'customers:10:10']);
      mockRedisClient.del.mockResolvedValue(2);

      await service.delByPattern('customers:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('customers:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith('customers:0:10', 'customers:10:10');
    });

    it('should do nothing if no keys match pattern', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      await service.delByPattern('empty:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('empty:*');
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });
});
