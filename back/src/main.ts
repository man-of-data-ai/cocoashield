import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from './libs/infrastructure/config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // @thallesp/nestjs-better-auth re-adds the body parsers for non-auth
    // routes; better-auth itself needs the raw, un-parsed request body.
    bodyParser: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      // `whitelist` retire les champs non déclarés dans le DTO ;
      // `forbidNonWhitelisted` refuse explicitement la requête au lieu de les
      // ignorer en silence (protection contre la sur-affectation).
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = app.get(ConfigService);
  app.enableCors({ origin: config.webUrl, credentials: true });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CocoaShield API')
    .setDescription(
      'API de suivi phytosanitaire des parcelles de cacao. ' +
        'L’authentification se fait par cookie de session better-auth.',
    )
    .setVersion('1.0')
    .addCookieAuth('better-auth.session_token')
    .build();
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(config.port);
}
void bootstrap();
