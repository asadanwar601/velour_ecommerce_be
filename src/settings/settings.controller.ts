import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SettingsService } from './settings.service';
import { UpdateBrandSettingsDto } from './dto/update-brand-settings.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('brand')
  @ApiOperation({ summary: 'Get public store and brand details (Brand Name, Logo, App Icon, Tagline, Currency)' })
  @ApiResponse({ status: 200, description: 'Brand and store settings' })
  async getBrandSettings() {
    return this.settingsService.getBrandSettings();
  }

  @Patch('brand')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Update brand name, logo, app icon, favicon, or store settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin role required' })
  async updateBrandSettings(@Body() dto: UpdateBrandSettingsDto) {
    return this.settingsService.updateBrandSettings(dto);
  }

  @Delete('brand/logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Remove active brand logo' })
  @ApiResponse({ status: 200, description: 'Logo removed' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin role required' })
  async deleteBrandLogo() {
    return this.settingsService.deleteBrandLogo();
  }

  @Delete('brand/icon')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Remove active brand app icon' })
  @ApiResponse({ status: 200, description: 'Icon removed' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin role required' })
  async deleteBrandIcon() {
    return this.settingsService.deleteBrandIcon();
  }

  @Delete('brand/favicon')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Remove active brand favicon' })
  @ApiResponse({ status: 200, description: 'Favicon removed' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin role required' })
  async deleteBrandFavicon() {
    return this.settingsService.deleteBrandFavicon();
  }
}
