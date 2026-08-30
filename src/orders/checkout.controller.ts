import {
  Controller,
  Post,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';

@ApiTags('Checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-device-id',
    required: false,
    description: 'Anonymous guest device ID for session tracking',
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Process checkout transaction, deduct inventory, and create order',
  })
  @ApiResponse({ status: 201, description: 'Order created successfully with orderNumber' })
  @ApiResponse({ status: 400, description: 'Empty cart or out-of-stock items' })
  async checkout(
    @Body() dto: CheckoutDto,
    @CurrentUser() user: CurrentUserData | null,
    @Headers('x-device-id') deviceId?: string,
  ) {
    return this.ordersService.checkout(dto, user?.id, deviceId);
  }
}
