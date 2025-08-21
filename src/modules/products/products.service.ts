import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateProductDto, UpdateProductDto, ProductResponseDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async create(createProductDto: CreateProductDto, userId: number): Promise<ProductResponseDto> {
    try {
      const { name, description, price } = createProductDto;

      // Check if product with same name already exists for this user
      const existingProduct = await this.databaseService.query(
        'SELECT id FROM products WHERE name = $1 AND user_id = $2',
        [name.trim(), userId]
      );

      if (existingProduct.rows.length > 0) {
        throw new ConflictException('A product with this name already exists');
      }

      const result = await this.databaseService.query(
        'INSERT INTO products (name, description, price, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [name.trim(), description?.trim() || null, price, userId]
      );

      const product = result.rows[0];
      const mappedProduct = this.mapToProductResponse(product);
      
      this.logger.log(`Product created successfully: ${name} by user ${userId}`);
      return mappedProduct;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error creating product: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create product. Please try again.');
    }
  }

  async findAll(userId: number, search?: string, page: number = 1, limit: number = 10): Promise<{ products: ProductResponseDto[], total: number, page: number, limit: number }> {
    try {
      // Validate userId
      if (!userId || userId <= 0 || isNaN(userId)) {
        this.logger.error(`Invalid userId provided: ${userId}`);
        throw new BadRequestException('Invalid user ID');
      }

      // Ensure we have valid default values
      const validPage = Math.max(1, page || 1);
      const validLimit = Math.min(100, Math.max(1, limit || 10));
      const offset = (validPage - 1) * validLimit;
      
      this.logger.debug(`findAll called with: userId=${userId}, search="${search}", page=${page}, limit=${limit}`);
      this.logger.debug(`Processed values: validPage=${validPage}, validLimit=${validLimit}, offset=${offset}`);
      
      let query = 'SELECT * FROM products WHERE user_id = $1';
      let countQuery = 'SELECT COUNT(*) FROM products WHERE user_id = $1';
      const params: any[] = [userId];
      let paramIndex = 2;

      if (search && search.trim().length > 0) {
        query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        countQuery += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${search.trim()}%`);
        paramIndex++;
      }

      query += ' ORDER BY created_at DESC LIMIT $' + paramIndex + ' OFFSET $' + (paramIndex + 1);
      params.push(validLimit, offset);

      // For count query, we only need userId and search (if any), not pagination params
      const countParams = params.slice(0, search && search.trim().length > 0 ? 2 : 1);

      this.logger.debug(`Query: ${query}`);
      this.logger.debug(`Count query: ${countQuery}`);
      this.logger.debug(`Main params: ${JSON.stringify(params)}`);
      this.logger.debug(`Count params: ${JSON.stringify(countParams)}`);

      const [productsResult, countResult] = await Promise.all([
        this.databaseService.query(query, params),
        this.databaseService.query(countQuery, countParams)
      ]);

      const products = productsResult.rows.map(product => this.mapToProductResponse(product));
      const total = parseInt(countResult.rows[0].count);

      this.logger.log(`Products retrieved for user ${userId}: ${products.length} products, page ${validPage}`);

      return {
        products,
        total,
        page: validPage,
        limit: validLimit
      };
    } catch (error) {
      this.logger.error(`Error retrieving products: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to retrieve products. Please try again.');
    }
  }

  async findOne(id: number, userId: number): Promise<ProductResponseDto> {
    try {
      const result = await this.databaseService.query(
        'SELECT * FROM products WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      const product = this.mapToProductResponse(result.rows[0]);
      this.logger.log(`Product retrieved: ${id} by user ${userId}`);
      return product;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error retrieving product ${id}: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to retrieve product. Please try again.');
    }
  }

  async update(id: number, updateProductDto: UpdateProductDto, userId: number): Promise<ProductResponseDto> {
    try {
      // First check if product exists and belongs to user
      const existingProduct = await this.findOne(id, userId);

      const { name, description, price } = updateProductDto;
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex}`);
        params.push(name.trim());
        paramIndex++;
      }

      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        params.push(description?.trim() || null);
        paramIndex++;
      }

      if (price !== undefined) {
        updateFields.push(`price = $${paramIndex}`);
        params.push(price);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return existingProduct;
      }

      // Check if name change would conflict with existing product
      if (name !== undefined && name !== existingProduct.name) {
        const nameConflict = await this.databaseService.query(
          'SELECT id FROM products WHERE name = $1 AND user_id = $2 AND id != $3',
          [name.trim(), userId, id]
        );

        if (nameConflict.rows.length > 0) {
          throw new ConflictException('A product with this name already exists');
        }
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id, userId);

      const result = await this.databaseService.query(
        `UPDATE products SET ${updateFields.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
        params
      );

      const updatedProduct = this.mapToProductResponse(result.rows[0]);
      this.logger.log(`Product updated successfully: ${id} by user ${userId}`);
      return updatedProduct;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error updating product ${id}: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to update product. Please try again.');
    }
  }

  async remove(id: number, userId: number): Promise<{ message: string }> {
    try {
      // First check if product exists and belongs to user
      await this.findOne(id, userId);

      const result = await this.databaseService.query(
        'DELETE FROM products WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, userId]
      );

      if (result.rowCount === 0) {
        throw new NotFoundException(`Product with ID ${id} not found or access denied`);
      }

      this.logger.log(`Product deleted successfully: ${id} by user ${userId}`);
      return { message: 'Product deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting product ${id}: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to delete product. Please try again.');
    }
  }

  private mapToProductResponse(product: any): ProductResponseDto {
    try {
      if (!product || !product.id) {
        throw new Error('Invalid product data structure');
      }

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: parseFloat(product.price),
        userId: product.user_id,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
      };
    } catch (error) {
      this.logger.error(`Error mapping product response: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process product data');
    }
  }
}
