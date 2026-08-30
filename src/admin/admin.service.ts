import { Injectable } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { AdminAnalyticsService } from './services/admin-analytics.service';
import { AdminUserManagementService } from './services/admin-user-management.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly adminAnalyticsService: AdminAnalyticsService,
    private readonly adminUserManagementService: AdminUserManagementService,
  ) {}

  async getDashboardStats() {
    return this.adminAnalyticsService.calculateDashboardMetrics();
  }

  async getCustomers(query: PaginationQueryDto) {
    return this.adminUserManagementService.findPaginatedUsers({
      ...query,
      role: 'CUSTOMER' as any,
    });
  }

  async getUsers(query: UserQueryDto) {
    return this.adminUserManagementService.findPaginatedUsers(query);
  }

  async getUserDetails(userId: string) {
    return this.adminUserManagementService.getCompleteUserDetails(userId);
  }

  async createAdminUser(dto: CreateAdminUserDto) {
    return this.adminUserManagementService.createAdminUser(dto);
  }

  async updateUser(userId: string, dto: AdminUpdateUserDto) {
    return this.adminUserManagementService.updateUserRecord(userId, dto);
  }

  async archiveUser(userId: string) {
    return this.adminUserManagementService.setArchiveStatus(userId, true);
  }

  async unarchiveUser(userId: string) {
    return this.adminUserManagementService.setArchiveStatus(userId, false);
  }

  async deleteUser(userId: string) {
    return this.adminUserManagementService.deleteUserPermanently(userId);
  }
}
