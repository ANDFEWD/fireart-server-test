import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, InternalServerErrorException, Logger } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '../jwt.service';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest<Request>();
      const token = this.extractTokenFromHeader(request);

      if (!token) {
        this.logger.warn('Access attempt without token');
        throw new UnauthorizedException('Access token is required');
      }

      const userId = this.jwtService.extractUserIdFromToken(token);
      console.warn('TOKEN PARSE', userId, token)
      if (!userId) {
        this.logger.warn('Invalid access token provided');
        throw new UnauthorizedException('Invalid access token');
      }

      const user = await this.authService.validateUser(userId);
      if (!user) {
        this.logger.warn(`User not found for token: ${userId}`);
        throw new UnauthorizedException('User not found');
      }

      // Attach user to request for use in controllers
      request['user'] = user;
      this.logger.debug(`User authenticated: ${user.email} (ID: ${user.id})`);
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Authentication error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Authentication service error');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    try {
      const [type, token] = request.headers.authorization?.split(' ') ?? [];
      return type === 'Bearer' ? token : undefined;
    } catch (error) {
      this.logger.error(`Error extracting token from header: ${error.message}`, error.stack);
      return undefined;
    }
  }
}
