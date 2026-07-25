import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { toNodeHandler } from 'better-auth/node';
import * as express from 'express';
import { AppModule } from './app.module';
import { ConfigService } from './libs/infrastructure/config/config.service';
import { AUTH_INSTANCE } from './modules/auth/auth.constants';
import type { Auth } from './modules/auth/auth.provider';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  const auth = app.get<Auth>(AUTH_INSTANCE);

  // better-auth needs the raw (un-parsed) request, so it must be mounted
  // before the JSON body parser is applied to every other route.
  app.use('/api/auth/{*any}', toNodeHandler(auth));
  app.use(express.json());

  const config = app.get(ConfigService);
  await app.listen(config.port);
}
bootstrap();
