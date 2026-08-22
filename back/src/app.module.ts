import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './libs/infrastructure/config/config.module';
import { ConfigService } from './libs/infrastructure/config/config.service';
import { AnalysesModule } from './modules/analyses/analyses.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthController } from './modules/auth/auth.controller';
import { createAuth } from './modules/auth/auth.provider';
import { MissionsModule } from './modules/missions/missions.module';
import { ExportsModule } from './modules/exports/exports.module';
import { ParcelsModule } from './modules/parcels/parcels.module';
import { PlatformConfigModule } from './modules/platform-config/platform-config.module';
import { AppRolesGuard } from './modules/users/guards/app-roles.guard';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({ auth: createAuth(config) }),
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
    // Autorisation métier appliquée à chaque requête, après l'AuthGuard de
    // better-auth. Enregistrée globalement pour qu'aucune route ne puisse
    // être exposée en oubliant de la déclarer.
    { provide: APP_GUARD, useClass: AppRolesGuard },
  ],
})
export class AppModule {}
