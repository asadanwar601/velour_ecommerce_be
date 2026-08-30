import { Injectable } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AccountProfileService } from './services/account-profile.service';
import { AccountAddressService } from './services/account-address.service';

@Injectable()
export class AccountService {
  constructor(
    private readonly accountProfileService: AccountProfileService,
    private readonly accountAddressService: AccountAddressService,
  ) {}

  async getProfile(userId: string) {
    return this.accountProfileService.getCustomerProfile(userId);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.accountProfileService.updateCustomerProfile(userId, dto);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    return this.accountProfileService.changeCustomerPassword(userId, dto);
  }

  async getSecuritySettings(userId: string) {
    return this.accountProfileService.getSecurityOverview(userId);
  }

  async toggle2FA(userId: string) {
    return this.accountProfileService.toggleTwoFactor(userId);
  }

  async logoutAll(userId: string) {
    return this.accountProfileService.invalidateAllUserSessions(userId);
  }

  async getAddresses(userId: string) {
    return this.accountAddressService.getCustomerAddresses(userId);
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    return this.accountAddressService.createCustomerAddress(userId, dto);
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    return this.accountAddressService.updateCustomerAddress(userId, addressId, dto);
  }

  async deleteAddress(userId: string, addressId: string) {
    return this.accountAddressService.deleteCustomerAddress(userId, addressId);
  }

  async setDefaultAddress(userId: string, addressId: string) {
    return this.accountAddressService.setDefaultCustomerAddress(userId, addressId);
  }
}
