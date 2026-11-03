import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from '../auth.service';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let authService: any;

  const mockUser = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    email: 'doctor@hospital.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    authService = {
      validateToken: jest.fn(),
    };
    guard = new JwtAuthGuard(authService as AuthService);
  });

  const createMockHttpContext = (authHeader?: string) => {
    const req: any = {
      headers: authHeader ? { authorization: authHeader } : {},
    };
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
      getArgs: () => [req],
      getArgByIndex: () => req,
      switchToRpc: () => ({}),
      switchToWs: () => ({}),
    } as unknown as ExecutionContext;

    return { context, req };
  };

  it('should throw UnauthorizedException when authorization header is missing', async () => {
    const { context } = createMockHttpContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Authorization header is missing'),
    );
  });

  it('should throw UnauthorizedException when scheme is not Bearer', async () => {
    const { context } = createMockHttpContext('Basic abcdef12345');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException(
        'Invalid authorization format. Expected "Bearer <token>"',
      ),
    );
  });

  it('should throw UnauthorizedException when authService returns invalid', async () => {
    const { context } = createMockHttpContext('Bearer expired-token');
    authService.validateToken.mockResolvedValue({
      isValid: false,
      user: null,
      message: 'jwt expired',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('jwt expired'),
    );
  });

  it('should set req.user and return true when token is valid', async () => {
    const { context, req } = createMockHttpContext('Bearer valid-token');
    authService.validateToken.mockResolvedValue({
      isValid: true,
      user: mockUser,
      message: 'Token is valid',
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(req.user).toEqual(mockUser);
  });
});
