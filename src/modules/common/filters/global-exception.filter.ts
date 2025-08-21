import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Log the exception with context
    this.logger.error(`Exception occurred: ${exception instanceof Error ? exception.message : 'Unknown error'}`, {
      exception: exception instanceof Error ? exception.stack : exception,
      url: request.url,
      method: request.method,
      body: request.body,
      params: request.params,
      query: request.query,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
      timestamp: new Date().toISOString(),
    });

    let status = HttpStatus.BAD_REQUEST; // Default to 400 instead of 500
    let message = 'Bad Request';
    let error = 'Bad Request';

    // Handle different types of exceptions
    if (exception && typeof exception === 'object' && 'status' in exception) {
      // HttpException or similar
      status = (exception as any).status || HttpStatus.BAD_REQUEST;
      
      // Handle ValidationPipe errors specifically
      if (status === HttpStatus.UNPROCESSABLE_ENTITY) {
        const exceptionResponse = (exception as any).response;
        if (exceptionResponse && Array.isArray(exceptionResponse.message)) {
          // Multiple validation errors
          message = exceptionResponse.message.join('; ');
          error = 'Validation Error';
        } else if (exceptionResponse && exceptionResponse.message) {
          // Single validation error
          message = exceptionResponse.message;
          error = 'Validation Error';
        } else {
          message = 'Validation failed';
          error = 'Validation Error';
        }
      } else {
        message = (exception as any).message || 'Bad Request';
        error = (exception as any).error || 'Bad Request';
      }
    } else if (exception instanceof Error) {
      // Standard JavaScript errors
      message = exception.message;
      error = exception.name;
      
      // Map common error types to appropriate HTTP status codes
      if (exception.name === 'ValidationError') {
        status = HttpStatus.BAD_REQUEST;
      } else if (exception.name === 'UnauthorizedError') {
        status = HttpStatus.UNAUTHORIZED;
      } else if (exception.name === 'ForbiddenError') {
        status = HttpStatus.FORBIDDEN;
      } else if (exception.name === 'NotFoundError') {
        status = HttpStatus.NOT_FOUND;
      } else if (exception.name === 'ConflictError') {
        status = HttpStatus.CONFLICT;
      } else if (exception.name === 'DatabaseError' || exception.name === 'QueryFailedError') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Database operation failed';
      } else {
        // For unexpected errors, still use 400 but log them as errors
        status = HttpStatus.BAD_REQUEST;
        message = 'An unexpected error occurred';
        this.logger.error('Unexpected error caught by global filter:', exception.stack);
      }
    }

    // Ensure status is within valid HTTP range
    if (status < 100 || status > 599) {
      status = HttpStatus.BAD_REQUEST;
    }

    // Create error response
    const errorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // In production, don't expose internal error details
    if (process.env.NODE_ENV === 'production' && status >= 500) {
      errorResponse.message = 'Internal server error';
      errorResponse.error = 'Internal Server Error';
    }

    response.status(status).json(errorResponse);
  }
}
