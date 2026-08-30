import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CmsService } from './cms.service';
import { UpdateAboutPageDto } from './dto/update-about-page.dto';
import { UpdateContactPageDto } from './dto/update-contact-page.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('CMS & Pages')
@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('about')
  @ApiOperation({ summary: 'Get public About Us page content' })
  @ApiResponse({ status: 200, description: 'About Us page content returned successfully' })
  async getAboutPage() {
    return this.cmsService.getAboutPage();
  }

  @Put('about')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Update About Us page content' })
  @ApiResponse({ status: 200, description: 'About Us page updated successfully' })
  async updateAboutPage(@Body() dto: UpdateAboutPageDto) {
    return this.cmsService.updateAboutPage(dto);
  }

  @Get('contact')
  @ApiOperation({ summary: 'Get public Contact Us page content' })
  @ApiResponse({ status: 200, description: 'Contact Us page content returned successfully' })
  async getContactPage() {
    return this.cmsService.getContactPage();
  }

  @Put('contact')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Update Contact Us page content' })
  @ApiResponse({ status: 200, description: 'Contact Us page updated successfully' })
  async updateContactPage(@Body() dto: UpdateContactPageDto) {
    return this.cmsService.updateContactPage(dto);
  }
}
