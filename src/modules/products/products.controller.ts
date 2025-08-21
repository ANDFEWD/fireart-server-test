import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductResponseDto, ProductQueryDto } from './dto/product.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@ApiTags('Products')
@ApiBearerAuth()
// @UseGuards(AuthGuard) // Temporarily disabled for testing
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully', type: ProductResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Conflict - Product name already exists' })
  async create(@Body() createProductDto: CreateProductDto): Promise<ProductResponseDto> {
    // TODO: Get userId from JWT token when auth is properly implemented
    const userId = 1;
    return this.productsService.create(createProductDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products with pagination and search' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid query parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for product name or description' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10, max: 100)', type: Number })
  async findAll(@Query() query: ProductQueryDto): Promise<{ products: ProductResponseDto[], total: number, page: number, limit: number }> {
    // TODO: Get userId from JWT token when auth is properly implemented
    const userId = 1;
    
    // Parse and validate query parameters
    let page = 1;
    let limit = 10;
    
    if (query.page) {
      const parsedPage = parseInt(query.page);
      if (isNaN(parsedPage) || parsedPage < 1) {
        throw new BadRequestException('Page must be a valid positive integer');
      }
      page = parsedPage;
    }
    
    if (query.limit) {
      const parsedLimit = parseInt(query.limit);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        throw new BadRequestException('Limit must be a valid integer between 1 and 100');
      }
      limit = parsedLimit;
    }
    
    const search = query.search;
    
    return this.productsService.findAll(userId, search, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiParam({ name: 'id', description: 'Product ID', type: Number })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully', type: ProductResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid product ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ProductResponseDto> {
    // TODO: Get userId from JWT token when auth is properly implemented
    const userId = 1;
    return this.productsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', description: 'Product ID', type: Number })
  @ApiResponse({ status: 200, description: 'Product updated successfully', type: ProductResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data or product ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Product name already exists' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto
  ): Promise<ProductResponseDto> {
    // TODO: Get userId from JWT token when auth is properly implemented
    const userId = 1;
    return this.productsService.update(id, updateProductDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({ name: 'id', description: 'Product ID', type: Number })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid product ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    // TODO: Get userId from JWT token when auth is properly implemented
    const userId = 1;
    return this.productsService.remove(id, userId);
  }
}
