import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

@Injectable()
export class JwtService {
  private readonly jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  private readonly jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
  private readonly refreshTokenExpiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
  private readonly logger = new Logger(JwtService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  generateAccessToken(userId: number): string {
    try {
      const payload = { sub: userId, type: 'access' };
      return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
    } catch (error) {
      this.logger.error(`Error generating access token: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate access token');
    }
  }

  async generateRefreshToken(userId: number): Promise<string> {
    try {
      const refreshToken = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + this.refreshTokenExpiresIn);

      await this.databaseService.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [userId, refreshToken, expiresAt]
      );

      this.logger.log(`Refresh token generated for user: ${userId}`);
      return refreshToken;
    } catch (error) {
      this.logger.error(`Error generating refresh token: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate refresh token');
    }
  }

  verifyAccessToken(token: string): any {
    try {
      const payload = jwt.verify(token, this.jwtSecret);
      if (payload.type !== 'access') {
        this.logger.warn('Invalid token type received');
        return null;
      }
      return payload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        this.logger.debug('Access token expired');
      } else if (error.name === 'JsonWebTokenError') {
        this.logger.debug('Invalid JWT token format');
      } else {
        this.logger.error(`Error verifying access token: ${error.message}`, error.stack);
      }
      return null;
    }
  }

  verifyRefreshToken(token: string): any {
    try {
      // For refresh tokens, we only verify they exist in the database
      // and haven't expired (handled in the auth service)
      return { valid: true };
    } catch (error) {
      this.logger.error(`Error verifying refresh token: ${error.message}`, error.stack);
      return null;
    }
  }

  extractUserIdFromToken(token: string): number | null {
    try {
      const payload = this.verifyAccessToken(token);
      return payload ? payload.sub : null;
    } catch (error) {
      this.logger.error(`Error extracting user ID from token: ${error.message}`, error.stack);
      return null;
    }
  }
}
