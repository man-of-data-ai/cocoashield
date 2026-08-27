import { Global, Module } from '@nestjs/common';
import { ConfigService } from './services/config.service';

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useFactory: (): ConfigService => {
        const configService = new ConfigService();
        configService.loadConfig();
        return configService;
      },
    },
  ],
  exports: [ConfigService],
})
export class ConfigModule {}
