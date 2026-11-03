import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthClientService } from './auth-client.service';

describe('AuthGuard (Schedule Service)', () => {
  let guard: AuthGuard;
  let authClientService: any;

  const mockUser = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    email: 'fajar@test.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    authClientService = {
      validateToken: jest.fn(),
    };
    guard = new AuthGuard(authClientService as AuthClientService);
  });

  const createMockContext = (authHeader?: string) => {
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
    } as unknown as ExecutionContext;

    return { context, req };
  };

  it('should throw UnauthorizedException when authorization header is missing', async () => {
    const { context } = createMockContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Authorization header is missing'),
    );
  });

  it('should throw UnauthorizedException when token scheme is not Bearer', async () => {
    const { context } = createMockContext('Basic token123');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException(
        'Invalid authorization format. Expected "Bearer <token>"',
      ),
    );
  });

  it('should throw UnauthorizedException when Auth Service rejects token', async () => {
    const { context } = createMockContext('Bearer invalid-or-expired-token');
    authClientService.validateToken.mockResolvedValue({
      isValid: false,
      user: null,
      message: 'jwt expired',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('jwt expired'),
    );
  });

  it('should allow request and attach user to req when token is valid', async () => {
    const { context, req } = createMockContext('Bearer valid-jwt-token');
    authClientService.validateToken.mockResolvedValue({
      isValid: true,
      user: mockUser,
      message: 'Token is valid',
    });

    const result = await guard.canActivate(context);

    expect(authClientService.validateToken).toHaveBeenCalledWith('valid-jwt-token');
    expect(result).toBe(true);
    expect(req.user).toEqual(mockUser);
  });
});
