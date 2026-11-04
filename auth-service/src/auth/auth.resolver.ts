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
    description: 'Mendaftarkan pengguna baru dengan email dan password (password di-hash dengan bcrypt, mengembalikan JWT token)',
  })
  async register(
    @Args('input', { description: 'Payload registrasi user (email valid dan password minimal 6 karakter)' })
    input: RegisterInput,
  ): Promise<AuthPayload> {
    return this.authService.register(input);
  }

  /**
   * Login user with credentials
   */
  @Mutation(() => AuthPayload, {
    description: 'Autentikasi login pengguna dengan email & password, mengembalikan JWT access token dengan masa berlaku 1 hari',
  })
  async login(
    @Args('input', { description: 'Payload kredensial login (email dan password)' })
    input: LoginInput,
  ): Promise<AuthPayload> {
    return this.authService.login(input);
  }

  /**
   * Validate token query for inter-service and client validation
   */
  @Query(() => TokenValidationResponse, {
    description: 'Memvalidasi keabsahan JWT token dan mengembalikan data profil pengguna yang berwenang',
  })
  async validateToken(
    @Args('input', { description: 'Payload token JWT yang akan divalidasi' })
    input: ValidateTokenInput,
  ): Promise<TokenValidationResponse> {
    return this.authService.validateToken(input.token);
  }

  /**
   * Get current authenticated user profile
   */
  @Query(() => User, {
    description: 'Mengambil profil data pengguna yang sedang login berdasarkan header Authorization Bearer token',
  })
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: User): Promise<User> {
    return user;
  }
}
