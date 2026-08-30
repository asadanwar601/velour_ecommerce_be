import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto } from '../dto/create-address.dto';
import { UpdateAddressDto } from '../dto/update-address.dto';

@Injectable()
export class AccountAddressService {
  constructor(private readonly prisma: PrismaService) {}

  async getCustomerAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createCustomerAddress(userId: string, dto: CreateAddressDto) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const existingCount = await this.prisma.address.count({ where: { userId } });
    const isFirstAddress = existingCount === 0;

    return this.prisma.address.create({
      data: {
        userId,
        label: dto.label || 'Home',
        recipientName: dto.recipientName || null,
        phone: dto.phone || null,
        line1: dto.line1,
        line2: dto.line2 || null,
        city: dto.city,
        state: dto.state,
        zip: dto.zip,
        country: dto.country || 'US',
        isDefault: dto.isDefault ?? isFirstAddress,
      },
    });
  }

  async updateCustomerAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const existing = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!existing) {
      throw new NotFoundException(`Address "${addressId}" not found`);
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { id: addressId },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.recipientName !== undefined && { recipientName: dto.recipientName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.line1 !== undefined && { line1: dto.line1 }),
        ...(dto.line2 !== undefined && { line2: dto.line2 }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.zip !== undefined && { zip: dto.zip }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });
  }

  async deleteCustomerAddress(userId: string, addressId: string) {
    const existing = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!existing) {
      throw new NotFoundException(`Address "${addressId}" not found`);
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.address.delete({ where: { id: addressId } });

    if (existing.isDefault) {
      const remainingAddress = await this.prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (remainingAddress) {
        await this.prisma.address.update({
          where: { id: remainingAddress.id },
          data: { isDefault: true },
        });
      }
    }

    return { success: true, message: 'Address deleted successfully' };
  }

  async setDefaultCustomerAddress(userId: string, addressId: string) {
    const existing = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!existing) {
      throw new NotFoundException(`Address "${addressId}" not found`);
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    return this.prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });
  }
}
