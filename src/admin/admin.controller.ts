import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: '[ADMIN] Atelier executive KPI metrics, revenue, low stock & recent orders' })
  @ApiResponse({ status: 200, description: 'Dashboard analytics' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin role required' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('customers')
  @ApiOperation({ summary: '[ADMIN] List all registered customers with lifetime spend (Legacy endpoint)' })
  @ApiResponse({ status: 200, description: 'Customer list with metadata' })
  async getCustomers(@Query() query: PaginationQueryDto) {
    return this.adminService.getCustomers(query);
  }

  // ─── USER MANAGEMENT CRUD ──────────────────────────────────────────

  @Get('users')
  @ApiOperation({
    summary: '[ADMIN] Interconnected Users List with live search, filters, order metrics & spend totals',
  })
  @ApiResponse({ status: 200, description: 'Paginated user list with full statistics' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin role required' })
  async getUsers(@Query() query: UserQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Post('users/invite-admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[ADMIN] Create and invite a new Administrator user' })
  @ApiResponse({ status: 201, description: 'Administrator created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createAdmin(@Body() dto: CreateAdminUserDto) {
    return this.adminService.createAdminUser(dto);
  }

  @Get('users/:id')
  @ApiOperation({
    summary: '[ADMIN] Get deep interconnected user dossier (Profile, Orders with tracking, Addresses, Reviews, Wishlist)',
  })
  @ApiResponse({ status: 200, description: 'Complete user dossier' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserDetails(@Param('id') id: string) {
    return this.adminService.getUserDetails(id);
  }

  @Patch('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Update user details or change role (CUSTOMER <-> ADMIN)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.adminService.updateUser(id, dto);
  }

  @Post('users/:id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Archive / deactivate user account' })
  @ApiResponse({ status: 200, description: 'User archived successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async archiveUser(@Param('id') id: string) {
    return this.adminService.archiveUser(id);
  }

  @Post('users/:id/unarchive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Unarchive / restore user account' })
  @ApiResponse({ status: 200, description: 'User restored successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async unarchiveUser(@Param('id') id: string) {
    return this.adminService.unarchiveUser(id);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Permanently delete user account and associated records' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }
}
