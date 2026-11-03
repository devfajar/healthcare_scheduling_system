import { Test, TestingModule } from '@nestjs/testing';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { User } from './models/user.model';
import { AuthPayload } from './models/auth-payload.model';
import { TokenValidationResponse } from './models/token-validation.model';

describe('AuthResolver', () => {
  let resolver: AuthResolver;
  let authService: any;

  const mockUser: User = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    email: 'fajar@test.com',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const mockAuthPayload: AuthPayload = {
    accessToken: 'sample-access-token',
    user: mockUser,
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn().mockResolvedValue(mockAuthPayload),
      login: jest.fn().mockResolvedValue(mockAuthPayload),
      validateToken: jest.fn().mockResolvedValue({
        isValid: true,
        user: mockUser,
        message: 'Token is valid',
      } as TokenValidationResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthResolver,
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    resolver = module.get<AuthResolver>(AuthResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register with input', async () => {
      const input = {
        email: 'fajar@test.com',
        password: 'Password123!',
      };

      const result = await resolver.register(input);

      expect(authService.register).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockAuthPayload);
    });
  });

  describe('login', () => {
    it('should call authService.login with credentials', async () => {
      const input = {
        email: 'fajar@test.com',
        password: 'Password123!',
      };

      const result = await resolver.login(input);

      expect(authService.login).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockAuthPayload);
    });
  });

  describe('validateToken', () => {
    it('should call authService.validateToken with token', async () => {
      const input = { token: 'sample-jwt-token' };

      const result = await resolver.validateToken(input);

      expect(authService.validateToken).toHaveBeenCalledWith('sample-jwt-token');
      expect(result.isValid).toBe(true);
      expect(result.user).toEqual(mockUser);
    });
  });

  describe('me', () => {
    it('should return current user from decorator', async () => {
      const result = await resolver.me(mockUser);
      expect(result).toEqual(mockUser);
    });
  });
});
