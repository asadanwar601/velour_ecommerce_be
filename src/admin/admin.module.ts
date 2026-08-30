import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminAnalyticsService } from './services/admin-analytics.service';
import { AdminUserManagementService } from './services/admin-user-management.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [AdminService, AdminAnalyticsService, AdminUserManagementService],
  exports: [AdminService, AdminAnalyticsService, AdminUserManagementService],
})
export class AdminModule {}
