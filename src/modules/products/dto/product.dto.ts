import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsPositive, MaxLength, IsInt } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ 
    description: 'Product name',
    example: 'iPhone 15 Pro',
    maxLength: 255
  })
  @IsString({ message: 'Product name must be a string' })
  @IsNotEmpty({ message: 'Product name is required' })
  @MaxLength(255, { message: 'Product name cannot exceed 255 characters' })
  name: string;

  @ApiPropertyOptional({ 
    description: 'Product description',
    example: 'Latest iPhone with advanced features',
    maxLength: 1000
  })
  @IsOptional()
  @IsString({ message: 'Product description must be a string' })
  @MaxLength(1000, { message: 'Product description cannot exceed 1000 characters' })
  description?: string;

  @ApiProperty({ 
    description: 'Product price (must be greater than 0)',
    example: 999.99,
    minimum: 0.01
  })
  @IsNumber({}, { message: 'Price must be a number' })
  @IsPositive({ message: 'Price must be greater than zero' })
  @Min(0.01, { message: 'Price must be at least 0.01' })
  price: number;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ 
    description: 'Product name',
    example: 'iPhone 15 Pro Max',
    maxLength: 255
  })
  @IsOptional()
  @IsString({ message: 'Product name must be a string' })
  @IsNotEmpty({ message: 'Product name cannot be empty' })
  @MaxLength(255, { message: 'Product name cannot exceed 255 characters' })
  name?: string;

  @ApiPropertyOptional({ 
    description: 'Product description',
    example: 'Latest iPhone with advanced features and larger screen',
    maxLength: 1000
  })
  @IsOptional()
  @IsString({ message: 'Product description must be a string' })
  @MaxLength(1000, { message: 'Product description cannot exceed 1000 characters' })
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Product price (must be greater than 0)',
    example: 1099.99,
    minimum: 0.01
  })
  @IsOptional()
  @IsNumber({}, { message: 'Price must be a number' })
  @IsPositive({ message: 'Price must be greater than zero' })
  @Min(0.01, { message: 'Price must be at least 0.01' })
  price?: number;
}

export class ProductResponseDto {
  @ApiProperty({ 
    description: 'Product unique identifier',
    example: 1
  })
  id: number;

  @ApiProperty({ 
    description: 'Product name',
    example: 'iPhone 15 Pro'
  })
  name: string;

  @ApiPropertyOptional({ 
    description: 'Product description',
    example: 'Latest iPhone with advanced features'
  })
  description?: string;

  @ApiProperty({ 
    description: 'Product price',
    example: 999.99
  })
  price: number;

  @ApiProperty({ 
    description: 'User ID who created the product',
    example: 1
  })
  userId: number;

  @ApiProperty({ 
    description: 'Product creation timestamp',
    example: '2025-08-21T12:00:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({ 
    description: 'Product last update timestamp',
    example: '2025-08-21T12:00:00.000Z'
  })
  updatedAt: Date;
}

export class ProductQueryDto {
  @ApiPropertyOptional({ 
    description: 'Search term for product name or description',
    example: 'iPhone'
  })
  @IsOptional()
  @IsString({ message: 'Search term must be a string' })
  search?: string;

  @ApiPropertyOptional({ 
    description: 'Page number for pagination (starts from 1)',
    example: 1,
    minimum: 1,
    default: 1
  })
  @IsOptional()
  @IsString({ message: 'Page must be a valid number' })
  page?: string;

  @ApiPropertyOptional({ 
    description: 'Number of products per page (1-100)',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10
  })
  @IsOptional()
  @IsString({ message: 'Limit must be a valid number' })
  limit?: string;
}
