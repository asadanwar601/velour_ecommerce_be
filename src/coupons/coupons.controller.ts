import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CouponsService } from './coupons.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate coupon/promo code and calculate instant discount' })
  @ApiResponse({ status: 200, description: 'Discount calculation details' })
  @ApiResponse({ status: 400, description: 'Coupon is inactive, expired, or min order spend not met' })
  @ApiResponse({ status: 404, description: 'Coupon code not found' })
  async validate(@Body() dto: ValidateCouponDto) {
    return this.couponsService.validate(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List active public promotional offers' })
  @ApiResponse({ status: 200, description: 'Active promotions' })
  async findAll() {
    return this.couponsService.findAll(false);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] List all coupons with redemption statistics' })
  @ApiResponse({ status: 200, description: 'All coupons' })
  async findAllAdmin() {
    return this.couponsService.findAll(true);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[ADMIN] Create a new promotional discount coupon' })
  @ApiResponse({ status: 201, description: 'Coupon created' })
  @ApiResponse({ status: 409, description: 'Coupon code already exists' })
  async create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }
}
