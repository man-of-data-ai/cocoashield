import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule, AuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './libs/infrastructure/config/config.module';
import { Environment } from './libs/infrastructure/config/config.schema';
import { ConfigService } from './libs/infrastructure/config/config.service';
import { AnalysesModule } from './modules/analyses/analyses.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthController } from './modules/auth/auth.controller';
import { createAuth, type Auth } from './modules/auth/auth.provider';
import { MissionsModule } from './modules/missions/missions.module';
import { ExportsModule } from './modules/exports/exports.module';
import { ParcelsModule } from './modules/parcels/parcels.module';
import { PlatformConfigModule } from './modules/platform-config/platform-config.module';
import { AppRolesGuard } from './modules/users/guards/app-roles.guard';
import { SESSION_RESOLVER } from './modules/users/guards/session-resolver';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        auth: createAuth({
          databaseUrl: config.databaseUrl,
          betterAuthSecret: config.betterAuthSecret,
          betterAuthUrl: config.betterAuthUrl,
          webUrl: config.webUrl,
          isProduction: config.nodeEnv === Environment.PRODUCTION,
        }),
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => config.typeOrmConfig,
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: config.redisConnection,
      }),
      inject: [ConfigService],
    }),
    AuditModule,
    ParcelsModule,
    AnalysesModule,
    MissionsModule,
    ExportsModule,
    PlatformConfigModule,
    UsersModule,
  ],
  controllers: [AppController, AuthController],
  providers: [
    AppService,
    // Résolution de session, injectée dans l'AppRolesGuard : c'est le seul
    // point où l'autorisation touche à better-auth.
    {
      provide: SESSION_RESOLVER,
      inject: [AuthService],
      useFactory: (authService: AuthService) => async (request: Request) => {
        const auth = authService.instance as unknown as Auth;
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        });
        return session?.user?.id;
      },
    },
    // Autorisation métier appliquée à chaque requête. Enregistrée globalement
    // pour qu'aucune route ne puisse être exposée en oubliant de la déclarer.
    { provide: APP_GUARD, useClass: AppRolesGuard },
  ],
})
export class AppModule {}
