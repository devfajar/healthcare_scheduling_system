import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';
import { AuthClientService } from './auth-client.service';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser | null;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authClientService: AuthClientService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = this.getRequest(context);
    const authHeader = req?.headers?.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException(
        'Invalid authorization format. Expected "Bearer <token>"',
      );
    }

    // Call Auth Service validateToken endpoint (Optimized with Redis Cache)
    const validation = await this.authClientService.validateToken(token);
    if (!validation.isValid || !validation.user) {
      throw new UnauthorizedException(
        validation.message || 'Unauthorized - Token is invalid or expired',
      );
    }

    // Attach validated user to strongly typed request
    req.user = validation.user;
    return true;
  }

  private getRequest(context: ExecutionContext): AuthenticatedRequest {
    const gqlContext = GqlExecutionContext.create(context);
    const gqlReq = gqlContext.getContext<{ req?: AuthenticatedRequest }>()?.req;
    if (gqlReq) {
      return gqlReq;
    }
    return context.switchToHttp().getRequest<AuthenticatedRequest>();
  }
}
