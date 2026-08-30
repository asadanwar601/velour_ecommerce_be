import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleAuthDto } from '../dto/google-auth.dto';

@Injectable()
export class AuthOAuthService {
  private readonly logger = new Logger(AuthOAuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async authenticateGoogleCustomer(googleAuthDto: GoogleAuthDto) {
    let customerEmail = googleAuthDto.email?.trim().toLowerCase();
    let customerFirstName = googleAuthDto.firstName?.trim() || null;
    let customerLastName = googleAuthDto.lastName?.trim() || null;
    let customerAvatarUrl = googleAuthDto.avatarUrl?.trim() || googleAuthDto.photoURL?.trim() || null;
    let customerGoogleId = googleAuthDto.googleId?.trim() || googleAuthDto.uid?.trim() || null;

    const rawDisplayName = googleAuthDto.displayName || googleAuthDto.name;
    if (!customerFirstName && rawDisplayName) {
      const nameParts = rawDisplayName.trim().split(' ');
      customerFirstName = nameParts[0] || null;
      customerLastName = nameParts.slice(1).join(' ') || null;
    }

    if (googleAuthDto.idToken) {
      try {
        const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${googleAuthDto.idToken}`);
        if (tokenInfoResponse.ok) {
          const tokenPayload: any = await tokenInfoResponse.json();
          if (tokenPayload.email) {
            customerEmail = tokenPayload.email.toLowerCase();
            customerFirstName = tokenPayload.given_name || tokenPayload.name || customerFirstName;
            customerLastName = tokenPayload.family_name || customerLastName;
            customerAvatarUrl = tokenPayload.picture || customerAvatarUrl;
            customerGoogleId = tokenPayload.sub || customerGoogleId;
          }
        } else {
          const tokenSegments = googleAuthDto.idToken.split('.');
          if (tokenSegments.length === 3) {
            const rawPayload = Buffer.from(tokenSegments[1], 'base64').toString('utf-8');
            const decodedPayload = JSON.parse(rawPayload);
            if (decodedPayload.email) {
              customerEmail = decodedPayload.email.toLowerCase();
              customerFirstName = decodedPayload.given_name || decodedPayload.name || customerFirstName;
              customerLastName = decodedPayload.family_name || customerLastName;
              customerAvatarUrl = decodedPayload.picture || customerAvatarUrl;
              customerGoogleId = decodedPayload.sub || customerGoogleId;
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`Could not verify Google id_token online: ${err.message}`);
      }
    }

    if (!customerEmail && googleAuthDto.accessToken) {
      try {
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${googleAuthDto.accessToken}` },
        });
        if (userInfoResponse.ok) {
          const profilePayload: any = await userInfoResponse.json();
          customerEmail = profilePayload.email?.toLowerCase();
          customerFirstName = profilePayload.given_name || profilePayload.name || customerFirstName;
          customerLastName = profilePayload.family_name || customerLastName;
          customerAvatarUrl = profilePayload.picture || customerAvatarUrl;
          customerGoogleId = profilePayload.sub || customerGoogleId;
        }
      } catch (err: any) {
        this.logger.warn(`Could not fetch Google userinfo: ${err.message}`);
      }
    }

    if (!customerEmail) {
      throw new BadRequestException('Invalid Google credentials. Could not extract user email.');
    }

    let userRecord = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: customerEmail }, ...(customerGoogleId ? [{ googleId: customerGoogleId }] : [])],
      },
    });

    let isBrandNewUser = false;
    if (!userRecord) {
      isBrandNewUser = true;
      userRecord = await this.prisma.user.create({
        data: {
          email: customerEmail,
          firstName: customerFirstName,
          lastName: customerLastName,
          avatarUrl: customerAvatarUrl,
          googleId: customerGoogleId,
          role: Role.CUSTOMER,
          isEmailVerified: true,
          isActive: true,
        },
      });
      this.logger.log(`Created new customer account via Google OAuth for: ${customerEmail}`);
    } else {
      const metadataUpdates: any = {
        isEmailVerified: true,
        isActive: true,
      };
      if (!userRecord.googleId && customerGoogleId) metadataUpdates.googleId = customerGoogleId;
      if (!userRecord.avatarUrl && customerAvatarUrl) metadataUpdates.avatarUrl = customerAvatarUrl;
      if (!userRecord.firstName && customerFirstName) metadataUpdates.firstName = customerFirstName;
      if (!userRecord.lastName && customerLastName) metadataUpdates.lastName = customerLastName;

      userRecord = await this.prisma.user.update({
        where: { id: userRecord.id },
        data: metadataUpdates,
      });
    }

    return { user: userRecord, isNewUser: isBrandNewUser };
  }
}
