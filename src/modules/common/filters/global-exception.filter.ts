import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorType = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || exception.message;
        errorType = (exceptionResponse as any).error || exception.constructor.name;
      } else {
        message = exception.message;
        errorType = exception.constructor.name;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorType = exception.constructor.name;
    }

    // Log the error with context
    this.logger.error(
      `${request.method} ${request.url} - ${status} ${errorType}: ${message}`,
      {
        url: request.url,
        method: request.method,
        userAgent: request.get('User-Agent'),
        ip: request.ip,
        userId: (request as any).user?.id,
        error: exception instanceof Error ? exception.stack : exception,
      }
    );

    // Don't expose internal errors to the client in production
    if (process.env.NODE_ENV === 'production' && status === HttpStatus.INTERNAL_SERVER_ERROR) {
      message = 'Internal server error';
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: Array.isArray(message) ? message[0] : message,
      error: errorType,
    };

    response.status(status).json(errorResponse);
  }
}
