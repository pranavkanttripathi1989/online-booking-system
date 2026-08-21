import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: process.env.JWT_ACCESS_TTL ?? '15m' },
    }),
  ],
  providers: [AuthService, AuthResolver, JwtStrategy],
  // JwtModule exported so AccountController (a plain REST route, outside the
  // GraphQL-context-only global GqlAuthGuard) can verify a bearer token
  // itself via JwtService -- see account.controller.ts.
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
