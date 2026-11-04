import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthClientService } from './auth-client.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import { CACHE_PREFIX, CACHE_TTL } from '../cache/cache.constants';

describe('AuthClientService', () => {
  let service: AuthClientService;
  let cacheService: any;

  const mockToken = 'test-valid-jwt-token';
  const mockUser = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    email: 'fajar@test.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthClientService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'AUTH_SERVICE_URL') return 'http://auth-service:3001';
              return defaultValue;
            }),
          },
        },
        { provide: RedisCacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<AuthClientService>(AuthClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateToken', () => {
    it('should return cached validation response when available (Cache Hit - No HTTP call)', async () => {
      const cachedResponse = {
        isValid: true,
        user: mockUser,
      };
      cacheService.get.mockResolvedValue(cachedResponse);

      const fetchSpy = jest.spyOn(global, 'fetch');

      const result = await service.validateToken(`Bearer ${mockToken}`);

      expect(result).toEqual(cachedResponse);
      expect(cacheService.get).toHaveBeenCalledWith(
        expect.stringContaining(CACHE_PREFIX.AUTH_TOKEN),
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should call Auth Service via fetch and cache result on Cache Miss', async () => {
      cacheService.get.mockResolvedValue(null);

      const mockResponse = {
        isValid: true,
        user: mockUser,
      };

      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as any);

      const result = await service.validateToken(mockToken);

      expect(result).toEqual(mockResponse);
      expect(fetchSpy).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining(CACHE_PREFIX.AUTH_TOKEN),
        mockResponse,
        CACHE_TTL.AUTH_TOKEN,
      );

      fetchSpy.mockRestore();
    });

    it('should return isValid: false if no token provided without calling cache or HTTP', async () => {
      const result = await service.validateToken('');
      expect(result.isValid).toBe(false);
      expect(cacheService.get).not.toHaveBeenCalled();
    });
  });
});
