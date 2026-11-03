import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthPayload } from './models/auth-payload.model';
import { TokenValidationResponse } from './models/token-validation.model';
import { User } from './models/user.model';
import { RegisterInput } from './dto/register.input';
import { LoginInput } from './dto/login.input';
import { ValidateTokenInput } from './dto/validate-token.input';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Resolver(() => User)
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   */
  @Mutation(() => AuthPayload, {
    description: 'Register a new user with email and password',
  })
  async register(
    @Args('input') input: RegisterInput,
  ): Promise<AuthPayload> {
    return this.authService.register(input);
  }

  /**
   * Login user with credentials
   */
  @Mutation(() => AuthPayload, {
    description: 'Authenticate user and obtain JWT access token',
  })
  async login(
    @Args('input') input: LoginInput,
  ): Promise<AuthPayload> {
    return this.authService.login(input);
  }

  /**
   * Validate token query for inter-service and client validation
   */
  @Query(() => TokenValidationResponse, {
    description: 'Validate a JWT token and return associated user profile',
  })
  async validateToken(
    @Args('input') input: ValidateTokenInput,
  ): Promise<TokenValidationResponse> {
    return this.authService.validateToken(input.token);
  }

  /**
   * Get current authenticated user profile
   */
  @Query(() => User, {
    description: 'Get profile of current authenticated user from Bearer token',
  })
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: User): Promise<User> {
    return user;
  }
}
