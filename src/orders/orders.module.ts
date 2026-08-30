import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CheckoutController } from './checkout.controller';
import { CartModule } from '../cart/cart.module';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OrderPricingService } from './services/order-pricing.service';
import { OrderStockService } from './services/order-stock.service';
import { OrderPlacementService } from './services/order-placement.service';
import { OrderFulfillmentService } from './services/order-fulfillment.service';
import { InvoiceGeneratorService } from './services/invoice-generator.service';
import { OrderRepository } from './repositories/order.repository';

@Module({
  imports: [PrismaModule, CartModule, MailModule],
  controllers: [OrdersController, CheckoutController],
  providers: [
    OrdersService,
    OrderPricingService,
    OrderStockService,
    OrderPlacementService,
    OrderFulfillmentService,
    InvoiceGeneratorService,
    OrderRepository,
  ],
  exports: [OrdersService, InvoiceGeneratorService, OrderRepository],
})
export class OrdersModule {}
