import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateProductDto, UpdateProductDto, ProductResponseDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async create(createProductDto: CreateProductDto, userId: number): Promise<ProductResponseDto> {
    try {
      const { name, description, price } = createProductDto;

      const result = await this.databaseService.query(
        'INSERT INTO products (name, description, price, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, description, price, userId]
      );

      const product = result.rows[0];
      const mappedProduct = this.mapToProductResponse(product);
      
      this.logger.log(`Product created successfully: ${name} by user ${userId}`);
      return mappedProduct;
    } catch (error) {
      this.logger.error(`Error creating product: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create product');
    }
  }

  async findAll(userId: number, search?: string, page: number = 1, limit: number = 10): Promise<{ products: ProductResponseDto[], total: number, page: number, limit: number }> {
    try {
      const offset = (page - 1) * limit;
      
      let query = 'SELECT * FROM products WHERE user_id = $1';
      let countQuery = 'SELECT COUNT(*) FROM products WHERE user_id = $1';
      const params: any[] = [userId];
      let paramIndex = 2;

      if (search) {
        query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        countQuery += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      query += ' ORDER BY created_at DESC LIMIT $' + paramIndex + ' OFFSET $' + (paramIndex + 1);
      params.push(limit, offset);

      const [productsResult, countResult] = await Promise.all([
        this.databaseService.query(query, params),
        this.databaseService.query(countQuery, params.slice(0, paramIndex - 2))
      ]);

      const products = productsResult.rows.map(product => this.mapToProductResponse(product));
      const total = parseInt(countResult.rows[0].count);

      this.logger.log(`Products retrieved for user ${userId}: ${products.length} products, page ${page}`);

      return {
        products,
        total,
        page,
        limit
      };
    } catch (error) {
      this.logger.error(`Error retrieving products: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve products');
    }
  }

  async findOne(id: number, userId: number): Promise<ProductResponseDto> {
    try {
      const result = await this.databaseService.query(
        'SELECT * FROM products WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundException('Product not found');
      }

      const product = this.mapToProductResponse(result.rows[0]);
      this.logger.log(`Product retrieved: ${id} by user ${userId}`);
      return product;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error retrieving product ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve product');
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
        params.push(name);
        paramIndex++;
      }

      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        params.push(description);
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
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating product ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to update product');
    }
  }

  async remove(id: number, userId: number): Promise<{ message: string }> {
    try {
      // First check if product exists and belongs to user
      await this.findOne(id, userId);

      await this.databaseService.query(
        'DELETE FROM products WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      this.logger.log(`Product deleted successfully: ${id} by user ${userId}`);
      return { message: 'Product deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting product ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete product');
    }
  }

  private mapToProductResponse(product: any): ProductResponseDto {
    try {
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
      throw new InternalServerErrorException('Failed to process product data');
    }
  }
}
