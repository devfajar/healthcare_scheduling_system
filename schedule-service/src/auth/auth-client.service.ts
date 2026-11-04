import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { TokenValidationResponse } from './interfaces/authenticated-user.interface';
import { RedisCacheService } from '../cache/redis-cache.service';
import { CACHE_PREFIX, CACHE_TTL } from '../cache/cache.constants';

@Injectable()
export class AuthClientService {
  private readonly logger = new Logger(AuthClientService.name);
  private readonly authServiceUrl: string;

  constructor(
    configService: ConfigService,
    private readonly cacheService: RedisCacheService,
  ) {
    this.authServiceUrl =
      configService.get<string>('AUTH_SERVICE_URL') || 'http://localhost:3001';
  }

  /**
   * Calls Auth Service /auth/validate endpoint to verify JWT token
   * Optimizes performance using Redis token caching to eliminate redundant inter-service network hops.
   */
  async validateToken(token: string): Promise<TokenValidationResponse> {
    if (!token) {
      return {
        isValid: false,
        user: null,
        message: 'No token provided',
      };
    }

    const cleanToken = token.startsWith('Bearer ')
      ? token.slice(7).trim()
      : token.trim();

    // 1. Fast SHA-256 hash for secure and consistent cache key
    const tokenHash = createHash('sha256').update(cleanToken).digest('hex');
    const cacheKey = `${CACHE_PREFIX.AUTH_TOKEN}:${tokenHash}`;

    // 2. Check Redis Cache Hit
    const cached = await this.cacheService.get<TokenValidationResponse>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for token validation: ${tokenHash.slice(0, 8)}...`);
      return cached;
    }

    // 3. Cache Miss: Inter-service HTTP call to Auth Service
    const targetUrl = `${this.authServiceUrl.replace(/\/$/, '')}/auth/validate`;

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanToken}`,
        },
        body: JSON.stringify({ token: cleanToken }),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        this.logger.warn(`Auth Service returned HTTP ${response.status} during token validation`);
        return {
          isValid: false,
          user: null,
          message: `Auth Service rejected token with status ${response.status}`,
        };
      }

      const data = (await response.json()) as TokenValidationResponse;

      // 4. Cache valid token payload (TTL: 120 seconds)
      if (data.isValid && data.user) {
        await this.cacheService.set(cacheKey, data, CACHE_TTL.AUTH_TOKEN);
      }

      return data;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to reach Auth Service at ${targetUrl}:`, msg);
      return {
        isValid: false,
        user: null,
        message: msg || 'Error communicating with Auth Service',
      };
    }
  }
}
