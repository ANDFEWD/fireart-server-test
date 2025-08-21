import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { JwtService } from './jwt.service';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcryptjs';
import { SignupDto, LoginDto, PasswordResetDto, PasswordResetConfirmDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto) {
    try {
      const { email, password, firstName, lastName } = signupDto;

      // Check if user already exists
      const existingUser = await this.databaseService.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        throw new BadRequestException('User with this email already exists');
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const result = await this.databaseService.query(
        'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name, created_at',
        [email, passwordHash, firstName, lastName]
      );

      const user = result.rows[0];

      // Generate tokens
      const accessToken = this.jwtService.generateAccessToken(user.id);
      const refreshToken = await this.jwtService.generateRefreshToken(user.id);

      this.logger.log(`User registered successfully: ${email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          createdAt: user.created_at,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error during user signup: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create user account');
    }
  }

  async login(loginDto: LoginDto) {
    try {
      const { email, password } = loginDto;

      // Find user
      const result = await this.databaseService.query(
        'SELECT id, email, password_hash, first_name, last_name, created_at FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const user = result.rows[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate tokens
      const accessToken = this.jwtService.generateAccessToken(user.id);
      const refreshToken = await this.jwtService.generateRefreshToken(user.id);

      this.logger.log(`User logged in successfully: ${email}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          createdAt: user.created_at,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Error during user login: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to authenticate user');
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verifyRefreshToken(refreshToken);
      if (!payload) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if refresh token exists in database
      const result = await this.databaseService.query(
        'SELECT user_id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
        [refreshToken]
      );

      if (result.rows.length === 0) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const userId = result.rows[0].user_id;

      // Generate new tokens
      const newAccessToken = this.jwtService.generateAccessToken(userId);
      const newRefreshToken = await this.jwtService.generateRefreshToken(userId);

      // Remove old refresh token
      await this.databaseService.query(
        'DELETE FROM refresh_tokens WHERE token = $1',
        [refreshToken]
      );

      this.logger.log(`Token refreshed successfully for user: ${userId}`);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Error during token refresh: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to refresh token');
    }
  }

  async logout(refreshToken: string) {
    try {
      await this.databaseService.query(
        'DELETE FROM refresh_tokens WHERE token = $1',
        [refreshToken]
      );
      
      this.logger.log('User logged out successfully');
      return { message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error(`Error during logout: ${error.message}`, error.stack);
      // Don't throw error on logout failure, just log it
      return { message: 'Logged out successfully' };
    }
  }

  async requestPasswordReset(passwordResetDto: PasswordResetDto) {
    try {
      const { email } = passwordResetDto;

      // Check if user exists
      const result = await this.databaseService.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        // Don't reveal if user exists or not
        return { message: 'If the email exists, a password reset link has been sent' };
      }

      // In a real application, you would:
      // 1. Generate a secure reset token
      // 2. Store it in the database with expiration
      // 3. Send an email with the reset link
      
      this.logger.log(`Password reset requested for email: ${email}`);
      return { message: 'If the email exists, a password reset link has been sent' };
    } catch (error) {
      this.logger.error(`Error during password reset request: ${error.message}`, error.stack);
      // Don't reveal internal errors to user
      return { message: 'If the email exists, a password reset link has been sent' };
    }
  }

  async confirmPasswordReset(passwordResetConfirmDto: PasswordResetConfirmDto) {
    try {
      const { token, newPassword } = passwordResetConfirmDto;

      // In a real application, you would:
      // 1. Verify the reset token from the database
      // 2. Check if it's expired
      // 3. Update the user's password
      // 4. Remove the reset token

      this.logger.log('Password reset confirmed successfully');
      return { message: 'Password reset successfully' };
    } catch (error) {
      this.logger.error(`Error during password reset confirmation: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to reset password');
    }
  }

  async validateUser(userId: number) {
    try {
      const result = await this.databaseService.query(
        'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      };
    } catch (error) {
      this.logger.error(`Error validating user: ${error.message}`, error.stack);
      return null;
    }
  }
}
