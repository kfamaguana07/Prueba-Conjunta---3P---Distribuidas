import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const corsOrigins = config.get<string[]>('corsOrigins') ?? ['*'];
  app.enableCors({ origin: corsOrigins.includes('*') ? true : corsOrigins });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ms-audit API')
    .setDescription('Microservicio de auditoría de CavaLocal')
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = config.get<number>('port') ?? 3002;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`ms-audit en http://localhost:${port} — Swagger en /docs`);
}
bootstrap();