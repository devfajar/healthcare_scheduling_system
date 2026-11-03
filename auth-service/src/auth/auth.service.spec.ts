import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: any;
  let jwtService: any;

  const mockUser = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    email: 'fajar@test.com',
    password: '$2b$10$hashedpasswordstringforuser',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  let hashedPasswordReal: string;

  beforeAll(async () => {
    hashedPasswordReal = await bcrypt.hash('Password123!', 10);
  });

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mocked-jwt-access-token'),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should successfully register a new user and hash the password', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockImplementation(async ({ data }: any) => ({
        id: mockUser.id,
        email: data.email,
        password: data.password,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      }));

      const result = await authService.register({
        email: 'fajar@test.com',
        password: 'Password123!',
      });

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'fajar@test.com' },
      });
      expect(prismaService.user.create).toHaveBeenCalled();
      const createdCall = prismaService.user.create.mock.calls[0][0];
      expect(createdCall.data.email).toBe('fajar@test.com');
      // Verify bcrypt password was hashed
      expect(createdCall.data.password).not.toBe('Password123!');
      const isValidHash = await bcrypt.compare('Password123!', createdCall.data.password);
      expect(isValidHash).toBe(true);

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: 'fajar@test.com',
      });
      expect(result).toEqual({
        accessToken: 'mocked-jwt-access-token',
        user: {
          id: mockUser.id,
          email: 'fajar@test.com',
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
      });
      expect((result.user as any).password).toBeUndefined();
    });

    it('should throw ConflictException if user email already exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          email: 'fajar@test.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it.each([
      'notanemail',
      'user@',
      '@domain.com',
      'user@domain',
      'user@.com',
      'user space@domain.com',
    ])('should throw BadRequestException if email format is invalid: "%s"', async (invalidEmail) => {
      await expect(
        authService.register({
          email: invalidEmail,
          password: 'Password123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should successfully authenticate user with valid credentials', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashedPasswordReal,
      });

      const result = await authService.login({
        email: 'fajar@test.com',
        password: 'Password123!',
      });

      expect(result.accessToken).toBe('mocked-jwt-access-token');
      expect(result.user.email).toBe('fajar@test.com');
      expect(result.user.id).toBe(mockUser.id);
      expect((result.user as any).password).toBeUndefined();
    });

    it('should throw UnauthorizedException if email does not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'teddy@test.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: hashedPasswordReal,
      });

      await expect(
        authService.login({
          email: 'fajar@test.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if email format is invalid during login', async () => {
      await expect(
        authService.login({
          email: 'not-an-email',
          password: 'Password123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateToken', () => {
    it('should return isValid: true and user info for valid token', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: mockUser.id,
        email: mockUser.email,
      });
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.validateToken('Bearer valid-jwt-token');

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-jwt-token');
      expect(result.isValid).toBe(true);
      expect(result.user?.id).toBe(mockUser.id);
      expect(result.user?.email).toBe(mockUser.email);
      expect(result.message).toBe('Token is valid');
      expect((result.user as any).password).toBeUndefined();
    });

    it('should return isValid: false if no token is provided', async () => {
      const result = await authService.validateToken('');
      expect(result.isValid).toBe(false);
      expect(result.user).toBeNull();
      expect(result.message).toBe('No token provided');
    });

    it('should return isValid: false if user does not exist in database', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'non-existent-user-id',
        email: 'dani@test.com',
      });
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await authService.validateToken('token-with-ghost-user');

      expect(result.isValid).toBe(false);
      expect(result.user).toBeNull();
      expect(result.message).toBe('User associated with token does not exist');
    });

    it('should return isValid: false if token verification throws (e.g. expired)', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      const result = await authService.validateToken('expired-jwt-token');

      expect(result.isValid).toBe(false);
      expect(result.user).toBeNull();
      expect(result.message).toBe('jwt expired');
    });
  });
});
