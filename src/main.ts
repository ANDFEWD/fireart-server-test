import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './modules/common/filters/global-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    
    // Enable CORS
    app.enableCors();
    
    // Global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      errorHttpStatusCode: 422,
    }));

    // Global exception filter for better error handling
    app.useGlobalFilters(new GlobalExceptionFilter());

    // Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('FireArt Server Test API')
      .setDescription('NestJS backend with authentication and CRUD operations')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    const port = process.env.PORT || 3000;
    await app.listen(port);
    
    logger.log(`Application is running on: http://localhost:${port}`);
    logger.log(`Swagger documentation: http://localhost:${port}/api`);
    logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (error) {
    logger.error('Failed to start application:', error.stack);
    process.exit(1);
  }
}

bootstrap();
