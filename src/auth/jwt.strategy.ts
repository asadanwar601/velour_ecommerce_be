import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma/prisma.service";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  isAdmin?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET", "velour_super_secure_jwt_secret_key_2026_fashion_lux"),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload) {
    // 1. Check if token was revoked / blacklisted on logout
    const rawToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (rawToken) {
      try {
        const isBlacklisted = await this.prisma.blacklistedToken.findUnique({
          where: { token: rawToken },
        });
        if (isBlacklisted) {
          throw new UnauthorizedException("Session has been revoked or logged out. Please sign in again.");
        }
      } catch (err) {
        if (err instanceof UnauthorizedException) throw err;
      }
    }

    // 2. Validate user identity
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("User session is invalid or user no longer exists");
    }

    return user;
  }
}
