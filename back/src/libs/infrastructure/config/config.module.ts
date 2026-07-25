import { Global, Module } from '@nestjs/common';
import { ConfigService } from './config.service';

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
