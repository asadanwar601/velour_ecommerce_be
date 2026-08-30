import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UserQueryDto } from '../dto/user-query.dto';
import { AdminUpdateUserDto } from '../dto/admin-update-user.dto';
import { CreateAdminUserDto } from '../dto/create-admin-user.dto';

@Injectable()
export class AdminUserManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async findPaginatedUsers(query: UserQueryDto) {
    const whereClause: Prisma.UserWhereInput = {};

    if (query.role && query.role.toUpperCase() !== 'ALL') {
      const normalizedRole = query.role.toUpperCase();
      if (normalizedRole === 'ADMIN' || normalizedRole === 'CUSTOMER') {
        whereClause.role = normalizedRole as Role;
      }
    }

    if (query.status && query.status.toUpperCase() !== 'ALL') {
      const normalizedStatus = query.status.toLowerCase();
      if (normalizedStatus === 'archived') whereClause.isArchived = true;
      else if (normalizedStatus === 'active') whereClause.isArchived = false;
    }

    const searchTerm = query.search || query.query;
    if (searchTerm && searchTerm.trim() !== '') {
      const sanitizedSearch = searchTerm.trim();
      whereClause.OR = [
        { email: { contains: sanitizedSearch, mode: 'insensitive' } },
        { firstName: { contains: sanitizedSearch, mode: 'insensitive' } },
        { lastName: { contains: sanitizedSearch, mode: 'insensitive' } },
        { phone: { contains: sanitizedSearch, mode: 'insensitive' } },
      ];
    }

    const currentPage = query.page || 1;
    const pageItemLimit = query.limit || 50;
    const skipOffset = (currentPage - 1) * pageItemLimit;

    const [totalMatchingUsers, retrievedUsers] = await Promise.all([
      this.prisma.user.count({ where: whereClause }),
      this.prisma.user.findMany({
        where: whereClause,
        include: {
          orders: { select: { id: true, total: true, createdAt: true } },
          reviews: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: skipOffset,
        take: pageItemLimit,
      }),
    ]);

    const formattedUserList = retrievedUsers.map((user) => {
      const orderCount = user.orders?.length || 0;
      const totalSpend = (user.orders || []).reduce((sum, order) => sum + Number(order.total), 0);
      const lastOrderDate = user.orders?.length
        ? user.orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
        : null;

      return {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        twoFactorEnabled: user.twoFactorEnabled,
        isArchived: user.isArchived,
        archivedAt: user.archivedAt?.toISOString() || null,
        createdAt: user.createdAt.toISOString(),
        orderCount,
        totalSpend: Math.round(totalSpend * 100) / 100,
        reviewCount: user.reviews?.length || 0,
        lastOrderDate: lastOrderDate?.toISOString() || null,
      };
    });

    return {
      data: formattedUserList,
      meta: {
        total: totalMatchingUsers,
        page: currentPage,
        limit: pageItemLimit,
        totalPages: Math.ceil(totalMatchingUsers / pageItemLimit),
      },
    };
  }

  async getCompleteUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: true,
        orders: { include: { items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } },
        reviews: { include: { product: true }, orderBy: { createdAt: 'desc' } },
        returns: { include: { items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!user) throw new NotFoundException(`User with ID "${userId}" not found`);

    const totalSpend = (user.orders || []).reduce((sum, order) => sum + Number(order.total), 0);

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      isArchived: user.isArchived,
      archivedAt: user.archivedAt?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      stats: {
        orderCount: user.orders?.length || 0,
        totalSpend: Math.round(totalSpend * 100) / 100,
        reviewCount: user.reviews?.length || 0,
        returnCount: user.returns?.length || 0,
      },
      addresses: user.addresses,
      orders: user.orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: Number(o.total),
        itemCount: o.items.length,
        createdAt: o.createdAt.toISOString(),
        trackingNumber: o.trackingNumber,
        items: o.items.map((it) => ({
          id: it.id,
          productName: it.product?.name || 'Garment',
          price: Number(it.price),
          quantity: it.quantity,
          size: it.size,
          primaryImageUrl: it.product?.primaryImageUrl || null,
        })),
      })),
      reviews: user.reviews.map((r) => ({
        id: r.id,
        productName: r.product?.name || 'Product',
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      })),
      returns: user.returns.map((ret) => ({
        id: ret.id,
        reason: ret.reason,
        status: ret.status,
        refundAmount: ret.refundAmount ? Number(ret.refundAmount) : null,
        createdAt: ret.createdAt.toISOString(),
      })),
    };
  }

  async updateUserRecord(userId: string, dto: AdminUpdateUserDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) throw new NotFoundException(`User with ID "${userId}" not found`);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName !== undefined ? dto.firstName.trim() : undefined,
        lastName: dto.lastName !== undefined ? dto.lastName.trim() : undefined,
        phone: dto.phone !== undefined ? dto.phone.trim() : undefined,
        role: dto.role,
        isArchived: dto.status !== undefined ? dto.status === 'ARCHIVED' : undefined,
        archivedAt: dto.status === 'ARCHIVED' ? new Date() : dto.status === 'ACTIVE' ? null : undefined,
      },
    });
  }

  async setArchiveStatus(userId: string, isArchived: boolean) {
    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) throw new NotFoundException(`User with ID "${userId}" not found`);

    return this.prisma.user.update({
      where: { id: userId },
      data: { isArchived, archivedAt: isArchived ? new Date() : null },
    });
  }

  async deleteUserPermanently(userId: string) {
    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) throw new NotFoundException(`User with ID "${userId}" not found`);

    if (existingUser.role === Role.ADMIN) {
      const adminCount = await this.prisma.user.count({ where: { role: Role.ADMIN } });
      if (adminCount <= 1) throw new BadRequestException('Cannot delete the last remaining administrator account');
    }

    await this.prisma.user.delete({ where: { id: userId } });
    return { success: true, message: `User "${existingUser.email}" permanently removed` };
  }

  async createAdminUser(dto: CreateAdminUserDto) {
    const sanitizedEmail = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email: sanitizedEmail } });
    if (existing) throw new ConflictException(`An account with email "${sanitizedEmail}" already exists`);

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const adminUser = await this.prisma.user.create({
      data: {
        email: sanitizedEmail,
        password: hashedPassword,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone?.trim() || null,
        role: Role.ADMIN,
        isEmailVerified: true,
        isActive: true,
      },
    });

    return {
      message: `Administrator "${adminUser.email}" created successfully`,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        role: adminUser.role,
        isEmailVerified: adminUser.isEmailVerified,
        createdAt: adminUser.createdAt.toISOString(),
      },
    };
  }
}
