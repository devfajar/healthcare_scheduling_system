import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterInput } from './dto/register.input';
import { LoginInput } from './dto/login.input';
import { AuthPayload } from './models/auth-payload.model';
import { TokenValidationResponse } from './models/token-validation.model';
import { User } from './models/user.model';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new user with email and hashed password
   */
  async register(input: RegisterInput): Promise<AuthPayload> {
    const email = input.email.trim().toLowerCase();
    this.validateEmailFormat(email);

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(`User with email "${email}" already exists`);
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(input.password, saltRounds);

    // Persist new user
    const newUser = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    this.logger.log(`User registered successfully: ${newUser.id}`);

    const accessToken = await this.generateToken(newUser.id, newUser.email);

    return {
      accessToken,
      user: this.sanitizeUser(newUser),
    };
  }

  /**
   * Authenticate user with email and password, return JWT token
   */
  async login(input: LoginInput): Promise<AuthPayload> {
    const email = input.email.trim().toLowerCase();
    this.validateEmailFormat(email);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordMatching = await bcrypt.compare(
      input.password,
      user.password,
    );

    if (!isPasswordMatching) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.generateToken(user.id, user.email);

    this.logger.log(`User logged in successfully: ${user.id}`);

    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Validate a JWT access token and return user info
   */
  async validateToken(rawToken: string): Promise<TokenValidationResponse> {
    if (!rawToken) {
      return {
        isValid: false,
        user: null,
        message: 'No token provided',
      };
    }

    const token = rawToken.startsWith('Bearer ')
      ? rawToken.slice(7).trim()
      : rawToken.trim();

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        return {
          isValid: false,
          user: null,
          message: 'User associated with token does not exist',
        };
      }

      return {
        isValid: true,
        user: this.sanitizeUser(user),
        message: 'Token is valid',
      };
    } catch (error: any) {
      return {
        isValid: false,
        user: null,
        message: error?.message || 'Invalid or expired token',
      };
    }
  }

  /**
   * Find sanitized user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    return this.sanitizeUser(user);
  }

  /**
   * Generate signed JWT access token
   */
  private async generateToken(userId: string, email: string): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      email,
    };

    return this.jwtService.signAsync(payload);
  }

  /**
   * Validate email format strictly
   */
  private validateEmailFormat(email: string): void {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(email)) {
      throw new BadRequestException('Please provide a valid email address');
    }
  }

  /**
   * Remove sensitive fields such as password before returning
   */
  private sanitizeUser(user: {
    id: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
