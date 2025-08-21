import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

// Extend the built-in JwtPayload to include our custom properties
interface CustomJwtPayload extends jwt.JwtPayload {
  type: string;
  sub: string; // Override to be string as expected by JWT library
}

@Injectable()
export class JwtService {
  private readonly jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  private readonly jwtExpiresIn: jwt.SignOptions['expiresIn'] = (process.env.JWT_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'];
  private readonly refreshTokenExpiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
  private readonly logger = new Logger(JwtService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  generateAccessToken(userId: number): string {
    try {
      const payload: CustomJwtPayload = { sub: userId.toString(), type: 'access' };
      const options: jwt.SignOptions = { expiresIn: this.jwtExpiresIn };
      
      const token = jwt.sign(payload, this.jwtSecret, options);
      
      if (!token) {
        throw new Error('Failed to generate JWT token');
      }

      this.logger.debug(`Access token generated for user: ${userId}`);
      return token;
    } catch (error) {
      this.logger.error(`Error generating access token: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to generate access token');
    }
  }

  async generateRefreshToken(userId: number): Promise<string> {
    try {
      const refreshToken = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + this.refreshTokenExpiresIn);

      // Store refresh token in database
      const result = await this.databaseService.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING id',
        [userId, refreshToken, expiresAt]
      );

      if (result.rows.length === 0) {
        throw new Error('Failed to store refresh token in database');
      }

      this.logger.debug(`Refresh token generated for user: ${userId}`);
      return refreshToken;
    } catch (error) {
      this.logger.error(`Error generating refresh token: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to generate refresh token');
    }
  }

  verifyAccessToken(token: string): CustomJwtPayload | null {
    try {
      const result = jwt.verify(token, this.jwtSecret);
      
      // Check if the result is a string (invalid token)
      if (typeof result === 'string') {
        this.logger.warn('JWT verification returned string instead of payload');
        return null;
      }
      
      // Check if the result has the expected CustomJwtPayload structure
      if (result && typeof result === 'object' && 'sub' in result && 'type' in result) {
        const payload = result as CustomJwtPayload;
        
        if (payload.type !== 'access') {
          this.logger.warn('Invalid token type received');
          return null;
        }

        if (!payload.sub || !payload.sub.trim()) {
          this.logger.warn('Token payload missing user ID');
          return null;
        }

        return payload;
      }
      
      this.logger.warn('JWT verification returned invalid payload structure');
      return null;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          this.logger.debug('Access token expired');
        } else if (error.name === 'JsonWebTokenError') {
          this.logger.debug('Invalid JWT token format');
        } else if (error.name === 'NotBeforeError') {
          this.logger.debug('Token not yet valid');
        } else {
          this.logger.error(`Error verifying access token: ${error.message}`, error.stack);
        }
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
      if (!payload) {
        return null;
      }

      const userId = parseInt(payload.sub, 10);
      if (isNaN(userId) || userId <= 0) {
        this.logger.warn('Invalid user ID in token payload');
        return null;
      }

      return userId;
    } catch (error) {
      this.logger.error(`Error extracting user ID from token: ${error.message}`, error.stack);
      return null;
    }
  }
}
