import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { SearchController } from './search.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductQueryService } from './services/product-query.service';
import { ProductManagementService } from './services/product-management.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController, SearchController],
  providers: [ProductsService, ProductQueryService, ProductManagementService],
  exports: [ProductsService, ProductQueryService, ProductManagementService],
})
export class ProductsModule {}
