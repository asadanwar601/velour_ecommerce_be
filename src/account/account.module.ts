import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountProfileService } from './services/account-profile.service';
import { AccountAddressService } from './services/account-address.service';

@Module({
  imports: [PrismaModule],
  controllers: [AccountController],
  providers: [AccountService, AccountProfileService, AccountAddressService],
  exports: [AccountService, AccountProfileService, AccountAddressService],
})
export class AccountModule {}
