import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from './libs/infrastructure/config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // @thallesp/nestjs-better-auth re-adds the body parsers for non-auth
    // routes; better-auth itself needs the raw, un-parsed request body.
    bodyParser: false,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = app.get(ConfigService);
  await app.listen(config.port);
}
void bootstrap();
