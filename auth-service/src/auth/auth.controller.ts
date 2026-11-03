import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { ValidateTokenDto } from './dto/validate-token.dto';
import { TokenValidationResponse } from './models/token-validation.model';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './models/user.model';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * REST endpoint to validate token, called by other microservices
   * Accepts { token } in body OR "Authorization: Bearer <token>" in header
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateToken(
    @Body() body?: Partial<ValidateTokenDto>,
    @Headers('authorization') authHeader?: string,
  ): Promise<TokenValidationResponse> {
    const rawToken = body?.token || authHeader || '';
    return this.authService.validateToken(rawToken);
  }

  /**
   * REST endpoint to get current authenticated user
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: User): Promise<User> {
    return user;
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      service: 'auth-service',
      port: 3001,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Microservice message pattern handler for NestJS microservices transport
   * e.g., client.send({ cmd: 'validate_token' }, { token: '...' })
   */
  @MessagePattern({ cmd: 'validate_token' })
  async handleMicroserviceValidateToken(
    @Payload() data: { token: string },
  ): Promise<TokenValidationResponse> {
    return this.authService.validateToken(data?.token || '');
  }
}
