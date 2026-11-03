import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('AuthServiceBootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const allowedOriginsEnv = configService.get<string>('CORS_ORIGIN', '*');

  // Frontend-ready and secure CORS configuration
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (like mobile apps, curl, Postman, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      // In dev or wildcard mode, reflect incoming origin so credentials: true works without browser CORS rejection
      if (allowedOriginsEnv === '*') {
        return callback(null, true);
      }

      const allowedList = allowedOriginsEnv.split(',').map((o) => o.trim());
      if (allowedList.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS policy`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'apollo-require-preflight',
      'x-apollo-operation-name',
    ],
    exposedHeaders: ['Authorization'],
    maxAge: 86400,
  });

  // Global validation pipe with transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(port);

  logger.log(`🚀 Auth Microservice is running on port: ${port}`);
  logger.log(`📡 GraphQL Endpoint available at: http://localhost:${port}/graphql`);
  logger.log(`🔑 REST Validate Token available at: http://localhost:${port}/auth/validate`);
}

void bootstrap();
