import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Ensure uploads directory exists on disk and serve static assets
  const uploadDir = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  app.useStaticAssets(uploadDir, {
    prefix: '/uploads/',
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // 1. Global Request Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTOs
      forbidNonWhitelisted: true, // Reject requests with unknown properties
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 2. CORS Configuration
  // FRONTEND_URL supports a comma-separated list for multi-origin setups
  // e.g. "https://velour.vercel.app,https://velour-git-main-asad.vercel.app"
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Parse comma-separated FRONTEND_URL into an array of allowed origins
      const configuredOrigins = frontendUrl
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean);

      const allowedOrigins = [
        ...configuredOrigins,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
      ];

      // Allow Vercel preview deployment URLs (*.vercel.app) in any environment
      const isVercelPreview = /^https:\/\/[a-z0-9-]+-[a-z0-9]+-[a-z0-9]+\.vercel\.app$/.test(origin);

      if (nodeEnv === 'development' || allowedOrigins.includes(origin) || isVercelPreview) {
        return callback(null, true);
      }

      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id', 'Accept'],
  });


  // 3. Swagger OpenAPI Documentation at /docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('VELOUR Fashion eCommerce API')
    .setDescription(
      'Production-grade REST backend API powering the VELOUR luxury minimal fashion storefront.\n\n' +
        '### Authentication\n' +
        '- **Bearer Token (JWT)**: Include `Authorization: Bearer <token>` for protected customer and admin routes.\n' +
        '- **Guest Session**: Include `x-device-id: <uuid>` header for anonymous cart persistence and guest checkout.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'bearer',
    )
    .addTag('Products', 'Public and admin product catalog endpoints')
    .addTag('Categories', 'Dynamic subcategories derived from active inventory')
    .addTag('Cart', 'Guest and authenticated shopping cart operations')
    .addTag('Wishlist', 'Saved for later & wishlist management')
    .addTag('Coupons', 'Promotional discounts & promo code validation')
    .addTag('Reviews', 'Product ratings, fit reviews, and buyer verification')
    .addTag('Account', 'Customer profile, password, and saved addresses')
    .addTag('Admin', 'Atelier executive dashboard analytics, customer metrics, and KPI tracking')
    .addTag('Checkout', 'Transactional checkout and order placement')
    .addTag('Orders', 'Customer order history, shipment tracking, cancellations & returns')
    .addTag('Inventory', 'Multi-location inventory tracking and stock adjustments')
    .addTag('Settings', 'Public and admin store branding, logo, app icon, and operational settings')
    .addTag('Upload', 'Image asset uploads for products, brand logo, and app icons')
    .addTag('Search', 'Global full-text search across catalogue')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'VELOUR API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  });

  await app.listen(port);
  logger.log(`🚀 VELOUR API server running at http://localhost:${port}`);
  logger.log(`📚 Swagger documentation available at http://localhost:${port}/docs`);
}

bootstrap();
