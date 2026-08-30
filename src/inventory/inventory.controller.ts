import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('low-stock')
  @ApiOperation({ summary: '[ADMIN] Get products at or below their low-stock threshold' })
  @ApiResponse({ status: 200, description: 'List of low stock inventory items' })
  async getLowStock() {
    return this.inventoryService.getLowStock();
  }

  @Get(':productId')
  @ApiOperation({ summary: '[ADMIN] Get stock breakdown across all locations for a product' })
  @ApiResponse({ status: 200, description: 'Product inventory details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductInventory(@Param('productId') productId: string) {
    return this.inventoryService.getProductInventory(productId);
  }

  @Post('adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[ADMIN] Adjust inventory quantity at a location and record an audit StockMovement',
  })
  @ApiResponse({ status: 200, description: 'Inventory adjusted and stock movement recorded' })
  @ApiResponse({ status: 400, description: 'Adjustment results in negative stock' })
  async adjust(@Body() dto: AdjustInventoryDto) {
    return this.inventoryService.adjust(dto);
  }
}
