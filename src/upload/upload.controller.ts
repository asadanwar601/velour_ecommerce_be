import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '[ADMIN] Upload a single image (Product photo, Brand logo, App icon)' })
  @ApiQuery({ name: 'prefix', required: false, example: 'product', description: 'Prefix for filename (e.g. product, brand, logo, icon)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Image uploaded successfully, returns static URL' })
  @ApiResponse({ status: 400, description: 'Invalid file or format' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin role required' })
  async uploadImage(
    @UploadedFile() file: any,
    @Query('prefix') prefix?: string,
  ) {
    return this.uploadService.saveImageFile(file, prefix || 'image');
  }

  @Post('images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '[ADMIN] Batch upload up to 10 product gallery photos' })
  @ApiQuery({ name: 'prefix', required: false, example: 'product-gallery', description: 'Prefix for filenames' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Images uploaded successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin role required' })
  async uploadMultipleImages(
    @UploadedFiles() files: any[],
    @Query('prefix') prefix?: string,
  ) {
    if (!files || files.length === 0) {
      return { files: [] };
    }

    const saved = await Promise.all(
      files.map((file) => this.uploadService.saveImageFile(file, prefix || 'product')),
    );

    return {
      message: `Successfully uploaded ${saved.length} images`,
      files: saved,
    };
  }
}
