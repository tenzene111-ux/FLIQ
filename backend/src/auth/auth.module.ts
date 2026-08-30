import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './jwt.strategy.js';
import { parseDurationMs } from './token.util.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: Math.floor(parseDurationMs(config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') / 1000),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  // Re-export PassportModule so any feature module using JwtAuthGuard just
  // needs to `imports: [AuthModule]` — @nestjs/passport's AuthGuard mixin
  // needs PassportModule registered wherever it's used, not only here.
  exports: [AuthService, PassportModule],
})
export class AuthModule {}
