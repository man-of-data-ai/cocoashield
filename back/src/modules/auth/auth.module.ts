import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { authProvider } from './auth.provider';

@Global()
@Module({
  providers: [
    authProvider,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [authProvider],
})
export class AuthModule {}
