import { IsString, IsNumber, IsOptional, Min, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'Latest iPhone with advanced features' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 999.99, minimum: 0 })
  @IsNumber()
  @Min(0)
  price: number;
}

export class UpdateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro Max' })
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Latest iPhone with advanced features and larger screen' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 1199.99, minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;
}

export class ProductResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
