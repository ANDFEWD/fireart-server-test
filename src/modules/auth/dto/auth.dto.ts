import { IsEmail, IsString, MinLength, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ 
    description: 'User email address',
    example: 'user@example.com'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ 
    description: 'User password (minimum 6 characters)',
    example: 'password123',
    minLength: 6
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @ApiProperty({ 
    description: 'User first name',
    example: 'John'
  })
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @ApiPropertyOptional({ 
    description: 'User last name',
    example: 'Doe'
  })
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  lastName?: string;
}

export class LoginDto {
  @ApiProperty({ 
    description: 'User email address',
    example: 'user@example.com'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ 
    description: 'User password',
    example: 'password123'
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ 
    description: 'Refresh token for authentication',
    example: 'refresh_token_here'
  })
  @IsString({ message: 'Refresh token must be a string' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}

export class PasswordResetDto {
  @ApiProperty({ 
    description: 'Email address for password reset',
    example: 'user@example.com'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}

export class PasswordResetConfirmDto {
  @ApiProperty({ 
    description: 'Password reset token',
    example: 'reset_token_here'
  })
  @IsString({ message: 'Reset token must be a string' })
  @IsNotEmpty({ message: 'Reset token is required' })
  token: string;

  @ApiProperty({ 
    description: 'New password (minimum 6 characters)',
    example: 'newpassword123',
    minLength: 6
  })
  @IsString({ message: 'New password must be a string' })
  @MinLength(6, { message: 'New password must be at least 6 characters long' })
  @IsNotEmpty({ message: 'New password is required' })
  newPassword: string;
}
