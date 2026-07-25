import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './libs/infrastructure/config/config.module';
import { ConfigService } from './libs/infrastructure/config/config.service';
import { AuthController } from './modules/auth/auth.controller';
import { createAuth } from './modules/auth/auth.provider';

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
  ],
  controllers: [AppController, AuthController],
  providers: [AppService],
})
export class AppModule {}
