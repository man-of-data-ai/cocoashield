import { Global, Module } from '@nestjs/common';
import { ConfigService } from './config.service';

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useFactory: async (): Promise<ConfigService> => {
        const configService = new ConfigService();
        await configService.loadConfig();
        return configService;
      },
    },
  ],
  exports: [ConfigService],
})
export class ConfigModule {}
