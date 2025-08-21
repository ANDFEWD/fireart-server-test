import { Controller, Post, Body, UseGuards, Req, HttpCode, HttpStatus, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { SignupDto, LoginDto, PasswordResetDto, PasswordResetConfirmDto, RefreshTokenDto } from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - User already exists' })
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.logout(refreshTokenDto.refreshToken);
  }

  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async requestPasswordReset(@Body() passwordResetDto: PasswordResetDto) {
    return this.authService.requestPasswordReset(passwordResetDto);
  }

  @Get('password-reset/validate/:token')
  @ApiOperation({ summary: 'Validate password reset token' })
  @ApiParam({ name: 'token', description: 'Password reset token' })
  @ApiResponse({ status: 200, description: 'Token validation result' })
  async validatePasswordResetToken(@Param('token') token: string) {
    return this.authService.validatePasswordResetToken(token);
  }

  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm password reset' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid token' })
  async confirmPasswordReset(@Body() passwordResetConfirmDto: PasswordResetConfirmDto) {
    return this.authService.confirmPasswordReset(passwordResetConfirmDto);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({ status: 200, description: 'User info retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Req() req: Request) {
    return req['user'];
  }
}
