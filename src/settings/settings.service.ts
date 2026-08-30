import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBrandSettingsDto } from './dto/update-brand-settings.dto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get public brand and store settings.
   */
  async getBrandSettings() {
    let settings = await this.prisma.brandSetting.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await this.prisma.brandSetting.create({
        data: {
          id: 'default',
          brandName: 'VELOUR',
          tagline: 'Quiet Luxury & Modern Atelier',
          logoUrl: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=400&q=80',
          supportEmail: 'care@velour.com',
          supportPhone: '+1 (800) 555-0199',
          freeShippingThreshold: 75.0,
          announcementBarText: 'Complimentary Express Shipping on Orders Over $75 • Atelier Gift Packaging Included',
          announcementBarActive: true,
        },
      });
    }

    return {
      id: settings.id,
      brandName: settings.brandName,
      tagline: settings.tagline,
      logoUrl: settings.logoUrl,
      iconUrl: settings.iconUrl,
      faviconUrl: settings.faviconUrl,
      currency: settings.currency,
      currencySymbol: settings.currencySymbol,
      supportEmail: settings.supportEmail,
      supportPhone: settings.supportPhone,
      instagramUrl: (settings as any).instagramUrl || null,
      facebookUrl: (settings as any).facebookUrl || null,
      youtubeUrl: (settings as any).youtubeUrl || null,
      websiteUrl: (settings as any).websiteUrl || null,
      freeShippingThreshold: Number(settings.freeShippingThreshold),
      announcementBarText: settings.announcementBarText,
      announcementBarActive: settings.announcementBarActive,
      updatedAt: settings.updatedAt.toISOString(),
    };
  }

  /**
   * Admin: Update brand name, logo, app icon, or store settings.
   */
  async updateBrandSettings(dto: UpdateBrandSettingsDto) {
    await this.getBrandSettings(); // Ensure row exists

    const data: any = {};
    if (dto.brandName !== undefined) data.brandName = dto.brandName.trim();
    if (dto.tagline !== undefined) data.tagline = dto.tagline.trim();
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl ? dto.logoUrl.trim() : null;
    if (dto.iconUrl !== undefined) data.iconUrl = dto.iconUrl ? dto.iconUrl.trim() : null;
    if (dto.faviconUrl !== undefined) data.faviconUrl = dto.faviconUrl ? dto.faviconUrl.trim() : null;
    if (dto.currency !== undefined) data.currency = dto.currency.trim().toUpperCase();
    if (dto.currencySymbol !== undefined) data.currencySymbol = dto.currencySymbol.trim();
    if (dto.supportEmail !== undefined) data.supportEmail = dto.supportEmail.trim();
    if (dto.supportPhone !== undefined) data.supportPhone = dto.supportPhone.trim();
    if (dto.instagramUrl !== undefined) data.instagramUrl = dto.instagramUrl ? dto.instagramUrl.trim() : null;
    if (dto.facebookUrl !== undefined) data.facebookUrl = dto.facebookUrl ? dto.facebookUrl.trim() : null;
    if (dto.youtubeUrl !== undefined) data.youtubeUrl = dto.youtubeUrl ? dto.youtubeUrl.trim() : null;
    if (dto.websiteUrl !== undefined) data.websiteUrl = dto.websiteUrl ? dto.websiteUrl.trim() : null;
    if (dto.freeShippingThreshold !== undefined) data.freeShippingThreshold = dto.freeShippingThreshold;
    if (dto.announcementBarText !== undefined) data.announcementBarText = dto.announcementBarText.trim();
    if (dto.announcementBarActive !== undefined) data.announcementBarActive = dto.announcementBarActive;

    const updated = await this.prisma.brandSetting.update({
      where: { id: 'default' },
      data,
    });

    return {
      message: 'Brand and store settings updated successfully',
      settings: {
        id: updated.id,
        brandName: updated.brandName,
        tagline: updated.tagline,
        logoUrl: updated.logoUrl,
        iconUrl: updated.iconUrl,
        faviconUrl: updated.faviconUrl,
        currency: updated.currency,
        currencySymbol: updated.currencySymbol,
        supportEmail: updated.supportEmail,
        supportPhone: updated.supportPhone,
        instagramUrl: (updated as any).instagramUrl || null,
        facebookUrl: (updated as any).facebookUrl || null,
        youtubeUrl: (updated as any).youtubeUrl || null,
        websiteUrl: (updated as any).websiteUrl || null,
        freeShippingThreshold: Number(updated.freeShippingThreshold),
        announcementBarText: updated.announcementBarText,
        announcementBarActive: updated.announcementBarActive,
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Admin: Remove brand logo.
   */
  async deleteBrandLogo() {
    const updated = await this.prisma.brandSetting.update({
      where: { id: 'default' },
      data: { logoUrl: null },
    });

    return {
      message: 'Brand logo removed successfully',
      settings: updated,
    };
  }

  /**
   * Admin: Remove brand app icon.
   */
  async deleteBrandIcon() {
    const updated = await this.prisma.brandSetting.update({
      where: { id: 'default' },
      data: { iconUrl: null },
    });

    return {
      message: 'Brand app icon removed successfully',
      settings: updated,
    };
  }

  /**
   * Admin: Remove brand favicon.
   */
  async deleteBrandFavicon() {
    const updated = await this.prisma.brandSetting.update({
      where: { id: 'default' },
      data: { faviconUrl: null },
    });

    return {
      message: 'Brand favicon removed successfully',
      settings: updated,
    };
  }
}
