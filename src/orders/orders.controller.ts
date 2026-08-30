import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { Role, OrderStatus, ReturnStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateReturnDto } from './dto/create-return.dto';
import { UpdateReturnStatusDto } from './dto/update-return-status.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-device-id',
    required: false,
    description: 'Anonymous guest device ID to merge cart items',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Process checkout transaction (Registered active users only), apply promo discount, deduct inventory, and create order',
  })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized: User must log in before checkout' })
  @ApiResponse({ status: 400, description: 'Empty cart or out-of-stock items' })
  async checkout(
    @Body() dto: CheckoutDto,
    @CurrentUser() user: CurrentUserData,
    @Headers('x-device-id') deviceId?: string,
  ) {
    return this.ordersService.checkout(dto, user.id, deviceId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user order history' })
  @ApiResponse({ status: 200, description: 'List of past orders' })
  async findUserOrders(@CurrentUser() user: CurrentUserData) {
    return this.ordersService.findUserOrders(user.id);
  }

  @Get('tracking/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get real-time shipment tracking timeline, active step index & carrier details (Logged-in user only)' })
  @ApiResponse({ status: 200, description: 'Tracking timeline details' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Sign in required' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getTracking(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const isAdmin = user.role === Role.ADMIN;
    return this.ordersService.getTrackingTimeline(id, user.id, isAdmin);
  }

  @Get(':id/invoice')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate and download official PDF invoice for order' })
  @ApiResponse({ status: 200, description: 'PDF Invoice stream' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async downloadInvoice(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Res() res: Response,
  ) {
    const isAdmin = user.role === Role.ADMIN;
    const { pdfBuffer, orderNumber } = await this.ordersService.getInvoicePdf(id, user.id, isAdmin);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Invoice-${orderNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Self-service cancel order and automatically restock inventory' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Order already shipped or cancelled' })
  async cancelOrder(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.ordersService.cancelOrder(id, user.id, dto.reason);
  }

  @Post(':id/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-device-id', required: false, description: 'Anonymous guest device ID' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '1-Click Reorder: Copy items from previous order back into active cart' })
  @ApiResponse({ status: 200, description: 'Items added to cart' })
  async reorder(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Headers('x-device-id') deviceId?: string,
  ) {
    return this.ordersService.reorder(id, user.id, deviceId);
  }

  @Post(':id/returns')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initiate self-service return and generate prepaid shipping label' })
  @ApiResponse({ status: 201, description: 'Return request created' })
  async createReturn(
    @Param('id') id: string,
    @Body() dto: CreateReturnDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.ordersService.createReturn(id, dto, user.id);
  }

  @Get(':id/returns')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get return requests associated with an order' })
  @ApiResponse({ status: 200, description: 'Order returns list' })
  async getReturns(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.ordersService.getReturnsForOrder(id, user.id);
  }

  // ─── ADMIN ENDPOINTS ────────────────────────────────────────────────

  @Get('returns/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] List all return requests across customers' })
  @ApiQuery({ name: 'status', enum: ReturnStatus, required: false })
  @ApiResponse({ status: 200, description: 'All returns list' })
  async findAllReturns(
    @Query() query: PaginationQueryDto,
    @Query('status') status?: ReturnStatus,
  ) {
    return this.ordersService.findAllReturns({ ...query, status });
  }

  @Patch('returns/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Update return status (approve, receive, refund)' })
  @ApiResponse({ status: 200, description: 'Return updated' })
  async updateReturnStatus(
    @Param('id') returnId: string,
    @Body() dto: UpdateReturnStatusDto,
  ) {
    return this.ordersService.updateReturnStatus(returnId, dto);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] List all customer orders with pagination & status filters' })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  @ApiResponse({ status: 200, description: 'Paginated orders list' })
  async findAllOrders(
    @Query() query: PaginationQueryDto,
    @Query('status') status?: OrderStatus,
  ) {
    return this.ordersService.findAllOrders({ ...query, status });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single order details by ID or orderNumber' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const isAdmin = user.role === Role.ADMIN;
    return this.ordersService.findById(id, user.id, isAdmin);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Update order fulfillment status' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto.status);
  }
}
