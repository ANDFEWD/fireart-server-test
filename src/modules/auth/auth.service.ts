import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from './jwt.service';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcryptjs';
import { SignupDto, LoginDto, PasswordResetDto, PasswordResetConfirmDto } from './dto/auth.dto';
import { randomBytes } from 'crypto';

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
        [email.trim().toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        throw new ConflictException('User with this email already exists');
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const result = await this.databaseService.query(
        'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name, created_at',
        [email.trim().toLowerCase(), passwordHash, firstName.trim(), lastName?.trim() || null]
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
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error during user signup: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create user account. Please try again.');
    }
  }

  async login(loginDto: LoginDto) {
    try {
      const { email, password } = loginDto;

      // Find user
      const result = await this.databaseService.query(
        'SELECT id, email, password_hash, first_name, last_name, created_at FROM users WHERE email = $1',
        [email.trim().toLowerCase()]
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
      throw new BadRequestException('Failed to authenticate user. Please try again.');
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
        throw new UnauthorizedException('Invalid or expired refresh token');
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
      throw new BadRequestException('Failed to refresh token. Please try again.');
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
        [email.trim().toLowerCase()]
      );

      if (result.rows.length === 0) {
        return { message: 'If the email exists, a password reset link has been sent' };
      }

      const userId = result.rows[0].id;

      await this.cleanupExpiredPasswordResetTokens();

      // Generate a secure reset token
      const resetToken = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

      // Store the reset token in the database (replace existing if any)
      await this.databaseService.query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3',
        [userId, resetToken, expiresAt]
      );

      // Fake email service - in production this would send an actual email
      await this.fakeSendPasswordResetEmail(email, resetToken);

      this.logger.log(`Password reset requested for email: ${email}`);
      return { message: 'If the email exists, a password reset link has been sent' };
    } catch (error) {
      this.logger.error(`Error during password reset request: ${error.message}`, error.stack);
      // Don't reveal internal errors to user
      return { message: 'If the email exists, a password reset link has been sent' };
    }
  }

  async validatePasswordResetToken(token: string): Promise<{ valid: boolean; message?: string }> {
    try {
      const result = await this.databaseService.query(
        'SELECT user_id, expires_at FROM password_reset_tokens WHERE token = $1',
        [token]
      );

      if (result.rows.length === 0) {
        return { valid: false, message: 'Invalid reset token' };
      }

      const resetTokenData = result.rows[0];
      const expiresAt = new Date(resetTokenData.expires_at);

      if (expiresAt < new Date()) {
        // Remove expired token
        await this.databaseService.query(
          'DELETE FROM password_reset_tokens WHERE token = $1',
          [token]
        );
        return { valid: false, message: 'Reset token has expired' };
      }

      return { valid: true };
    } catch (error) {
      this.logger.error(`Error validating password reset token: ${error.message}`, error.stack);
      return { valid: false, message: 'Error validating token' };
    }
  }

  async confirmPasswordReset(passwordResetConfirmDto: PasswordResetConfirmDto) {
    try {
      const { token, newPassword } = passwordResetConfirmDto;

      // Validate the token first
      const tokenValidation = await this.validatePasswordResetToken(token);
      if (!tokenValidation.valid) {
        throw new BadRequestException(tokenValidation.message || 'Invalid or expired reset token');
      }

      // Find the reset token in the database
      const result = await this.databaseService.query(
        'SELECT user_id FROM password_reset_tokens WHERE token = $1',
        [token]
      );

      const userId = result.rows[0].user_id;

      // Hash the new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update the user's password
      await this.databaseService.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newPasswordHash, userId]
      );

      // Remove the used reset token
      await this.databaseService.query(
        'DELETE FROM password_reset_tokens WHERE token = $1',
        [token]
      );

      this.logger.log(`Password reset confirmed successfully for user: ${userId}`);
      return { message: 'Password reset successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error during password reset confirmation: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to reset password. Please try again.');
    }
  }

  async validateUser(userId: number) {
    try {
      const result = await this.databaseService.query(
        'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error validating user: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to validate user');
    }
  }

  private async cleanupExpiredPasswordResetTokens(): Promise<void> {
    try {
      const result = await this.databaseService.query(
        'DELETE FROM password_reset_tokens WHERE expires_at < NOW()'
      );
      
      if (result.rowCount > 0) {
        this.logger.log(`Cleaned up ${result.rowCount} expired password reset tokens`);
      }
    } catch (error) {
      this.logger.error(`Error cleaning up expired password reset tokens: ${error.message}`, error.stack);
    }
  }

  private async fakeSendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Log the reset link (in production this would be sent via email)
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
    
    this.logger.log(`[FAKE EMAIL] Password reset email sent to ${email}`);
    this.logger.log(`[FAKE EMAIL] Reset link: ${resetLink}`);
    
    // In a real application, you would:
    // 1. Use a proper email service (SendGrid, AWS SES, etc.)
    // 2. Send a formatted HTML email with the reset link
    // 3. Include proper email templates and branding
    // 4. Handle email delivery failures and retries
    // 5. Add email validation and bounce handling
    // 6. Implement rate limiting for password reset requests
  }
}
