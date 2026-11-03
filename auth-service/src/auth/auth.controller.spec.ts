import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './models/user.model';
import { TokenValidationResponse } from './models/token-validation.model';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

  const mockUser: User = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    email: 'fajar@test.com',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const mockValidationResponse: TokenValidationResponse = {
    isValid: true,
    user: mockUser,
    message: 'Token is valid',
  };

  beforeEach(async () => {
    authService = {
      validateToken: jest.fn().mockResolvedValue(mockValidationResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('validateToken', () => {
    it('should validate token provided in request body', async () => {
      const result = await controller.validateToken({ token: 'jwt-body-token' });

      expect(authService.validateToken).toHaveBeenCalledWith('jwt-body-token');
      expect(result).toEqual(mockValidationResponse);
    });

    it('should validate token provided in authorization header when body is omitted', async () => {
      const result = await controller.validateToken(
        undefined,
        'Bearer jwt-header-token',
      );

      expect(authService.validateToken).toHaveBeenCalledWith('Bearer jwt-header-token');
      expect(result).toEqual(mockValidationResponse);
    });
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      const result = await controller.getProfile(mockUser);
      expect(result).toEqual(mockUser);
    });
  });

  describe('healthCheck', () => {
    it('should return health check status for auth-service', () => {
      const health = controller.healthCheck();
      expect(health.status).toBe('ok');
      expect(health.service).toBe('auth-service');
      expect(health.port).toBe(3001);
      expect(health.timestamp).toBeDefined();
    });
  });

  describe('handleMicroserviceValidateToken', () => {
    it('should validate token from microservice message pattern payload', async () => {
      const result = await controller.handleMicroserviceValidateToken({
        token: 'tcp-token',
      });
      expect(authService.validateToken).toHaveBeenCalledWith('tcp-token');
      expect(result).toEqual(mockValidationResponse);
    });
  });
});
