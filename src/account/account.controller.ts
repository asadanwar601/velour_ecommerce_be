import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { AccountService } from './account.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@ApiTags('Account')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current customer profile with order & wishlist stats' })
  @ApiResponse({ status: 200, description: 'User account profile' })
  async getProfile(@CurrentUser() user: CurrentUserData) {
    return this.accountService.getProfile(user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update customer personal information & wardrobe preferences' })
  @ApiResponse({ status: 200, description: 'Updated profile' })
  async updateProfile(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.accountService.updateProfile(user.id, dto);
  }

  @Get('security')
  @ApiOperation({ summary: 'Get security settings (2FA status, active sessions)' })
  @ApiResponse({ status: 200, description: 'Security overview' })
  async getSecuritySettings(@CurrentUser() user: CurrentUserData) {
    return this.accountService.getSecuritySettings(user.id);
  }

  @Post('2fa/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle Two-Factor Authentication status' })
  @ApiResponse({ status: 200, description: '2FA status updated' })
  async toggle2FA(@CurrentUser() user: CurrentUserData) {
    return this.accountService.toggle2FA(user.id);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change account password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Incorrect current password' })
  async changePassword(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.accountService.changePassword(user.id, dto);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out from all active device sessions' })
  @ApiResponse({ status: 200, description: 'All sessions revoked' })
  async logoutAll(@CurrentUser() user: CurrentUserData) {
    return this.accountService.logoutAll(user.id);
  }

  @Get('addresses')
  @ApiOperation({ summary: 'List all saved delivery addresses' })
  @ApiResponse({ status: 200, description: 'List of saved addresses' })
  async getAddresses(@CurrentUser() user: CurrentUserData) {
    return this.accountService.getAddresses(user.id);
  }

  @Post('addresses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save a new delivery address with recipient details' })
  @ApiResponse({ status: 201, description: 'Address created' })
  async createAddress(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateAddressDto,
  ) {
    return this.accountService.createAddress(user.id, dto);
  }

  @Patch('addresses/:id')
  @ApiOperation({ summary: 'Update an existing saved address' })
  @ApiResponse({ status: 200, description: 'Address updated' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async updateAddress(
    @CurrentUser() user: CurrentUserData,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.accountService.updateAddress(user.id, addressId, dto);
  }

  @Delete('addresses/:id')
  @ApiOperation({ summary: 'Remove an address from address book' })
  @ApiResponse({ status: 200, description: 'Address deleted' })
  async deleteAddress(
    @CurrentUser() user: CurrentUserData,
    @Param('id') addressId: string,
  ) {
    return this.accountService.deleteAddress(user.id, addressId);
  }

  @Patch('addresses/:id/default')
  @ApiOperation({ summary: 'Set address as primary default shipping address' })
  @ApiResponse({ status: 200, description: 'Default address set' })
  async setDefaultAddress(
    @CurrentUser() user: CurrentUserData,
    @Param('id') addressId: string,
  ) {
    return this.accountService.setDefaultAddress(user.id, addressId);
  }
}
