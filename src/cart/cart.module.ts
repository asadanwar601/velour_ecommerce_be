import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CartItemManagementService } from './services/cart-item-management.service';
import { CartPricingService } from './services/cart-pricing.service';

@Module({
  imports: [PrismaModule],
  controllers: [CartController],
  providers: [CartService, CartItemManagementService, CartPricingService],
  exports: [CartService, CartItemManagementService, CartPricingService],
})
export class CartModule {}
