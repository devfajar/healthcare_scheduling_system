import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = this.getRequest(context);
    const authHeader = req?.headers?.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization format. Expected "Bearer <token>"');
    }

    const validation = await this.authService.validateToken(token);
    if (!validation.isValid || !validation.user) {
      throw new UnauthorizedException(validation.message || 'Unauthorized');
    }

    req.user = validation.user;
    return true;
  }

  private getRequest(context: ExecutionContext): any {
    const gqlCtx = GqlExecutionContext.create(context);
    const req = gqlCtx.getContext()?.req;
    if (req) {
      return req;
    }
    return context.switchToHttp().getRequest();
  }
}
