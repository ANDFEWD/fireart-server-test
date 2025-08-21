import { Injectable, OnModuleInit, OnModuleDestroy, Logger, BadRequestException } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);

  async onModuleInit() {
    try {
      // Validate environment variables
      const host = process.env.POSTGRES_HOST || 'localhost';
      const port = parseInt(process.env.POSTGRES_PORT) || 5432;
      const user = process.env.POSTGRES_USER || 'postgres';
      const password = process.env.POSTGRES_PASSWORD || 'password';
      const database = process.env.POSTGRES_NAME || 'fireart_test';

      if (port < 1 || port > 65535) {
        throw new BadRequestException('Invalid database port number');
      }

      this.pool = new Pool({
        host,
        port,
        user,
        password,
        database,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test connection
      const client = await this.pool.connect();
      this.logger.log('Database connected successfully');
      client.release();
      
      // Initialize database tables
      await this.initializeTables();
    } catch (error) {
      this.logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      if (this.pool) {
        await this.pool.end();
        this.logger.log('Database connection pool closed');
      }
    } catch (error) {
      this.logger.error('Error closing database pool:', error);
    }
  }

  private async initializeTables() {
    const client = await this.pool.connect();
    
    try {
      // Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create products table
      await client.query(`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create refresh_tokens table
      await client.query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create password_reset_tokens table
      await client.query(`
        DROP TABLE IF EXISTS password_reset_tokens CASCADE
      `);
      
      await client.query(`
        CREATE TABLE password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id)
        )
      `);

      this.logger.log('Database tables initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing database tables:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } catch (error) {
      // Handle specific database errors
      if (error instanceof Error) {
        if (error.message.includes('duplicate key value violates unique constraint')) {
          this.logger.warn(`Duplicate key constraint violation: ${error.message}`);
          throw new BadRequestException('Resource already exists');
        } else if (error.message.includes('violates foreign key constraint')) {
          this.logger.warn(`Foreign key constraint violation: ${error.message}`);
          throw new BadRequestException('Referenced resource does not exist');
        } else if (error.message.includes('syntax error')) {
          this.logger.error(`SQL syntax error: ${error.message}`);
          throw new BadRequestException('Invalid database query');
        } else if (error.message.includes('does not exist')) {
          this.logger.error(`Table or column does not exist: ${error.message}`);
          throw new BadRequestException('Database schema error');
        } else if (error.message.includes('connection')) {
          this.logger.error(`Database connection error: ${error.message}`);
          throw new BadRequestException('Database connection failed');
        }
      }

      this.logger.error(`Database query error: ${error.message}`, {
        query: text,
        params,
        error: error.stack
      });
      throw new BadRequestException('Database operation failed');
    } finally {
      client.release();
    }
  }

  async getClient(): Promise<PoolClient> {
    try {
      return await this.pool.connect();
    } catch (error) {
      this.logger.error('Error getting database client:', error);
      throw new BadRequestException('Failed to get database connection');
    }
  }
}
