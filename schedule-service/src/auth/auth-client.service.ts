import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenValidationResponse } from './interfaces/authenticated-user.interface';

@Injectable()
export class AuthClientService {
  private readonly logger = new Logger(AuthClientService.name);
  private readonly authServiceUrl: string;

  constructor(configService: ConfigService) {
    this.authServiceUrl =
      configService.get<string>('AUTH_SERVICE_URL') || 'http://localhost:3001';
  }

  /**
   * Calls Auth Service /auth/validate endpoint to verify JWT token
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
      return data;
    } catch (error: any) {
      this.logger.error(`Failed to reach Auth Service at ${targetUrl}:`, error?.message);
      return {
        isValid: false,
        user: null,
        message: error?.message || 'Error communicating with Auth Service',
      };
    }
  }
}
