import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('NotificationBootstrap');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const allowedOrigins = process.env.CORS_ORIGIN || '*';
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins === '*' || allowedOrigins.split(',').includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'apollo-require-preflight'],
    credentials: true,
  });

  const port = process.env.PORT || 3003;
  await app.listen(port);
  logger.log(`🚀 Notification Microservice is running on http://localhost:${port}`);
  logger.log(`📊 GraphQL Playground available on http://localhost:${port}/graphql`);
  logger.log(`❤️ Health check available on http://localhost:${port}/health`);
}

bootstrap();
