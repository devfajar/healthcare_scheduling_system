import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthClientService } from './auth-client.service';

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

    // Call Auth Service validateToken endpoint
    const validation = await this.authClientService.validateToken(token);
    if (!validation.isValid || !validation.user) {
      throw new UnauthorizedException(
        validation.message || 'Unauthorized - Token is invalid or expired',
      );
    }

    // Attach validated user to request
    req.user = validation.user;
    return true;
  }

  private getRequest(context: ExecutionContext): any {
    const gqlContext = GqlExecutionContext.create(context);
    const req = gqlContext.getContext()?.req;
    if (req) {
      return req;
    }
    return context.switchToHttp().getRequest();
  }
}
