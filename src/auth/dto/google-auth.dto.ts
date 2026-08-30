import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GoogleAuthDto {
  @ApiPropertyOptional({
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjE...',
    description: 'Google ID token or Google Identity Platform / Firebase ID Token',
  })
  @IsOptional()
  @IsString()
  idToken?: string;

  @ApiPropertyOptional({
    example: 'ya29.a0AfH6SM...',
    description: 'Google OAuth Access Token',
  })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional({ example: 'elena.rostova@gmail.com', description: 'User Google email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'Elena', description: 'User first name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Rostova', description: 'User last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'Elena Rostova', description: 'Google Identity Platform full name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Elena Rostova', description: 'Google Identity Platform display name' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://lh3.googleusercontent.com/a/sample', description: 'Avatar picture URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'https://lh3.googleusercontent.com/a/sample', description: 'Google Identity Platform photoURL' })
  @IsOptional()
  @IsString()
  photoURL?: string;

  @ApiPropertyOptional({ example: '10984729384729103948', description: 'Google sub ID' })
  @IsOptional()
  @IsString()
  googleId?: string;

  @ApiPropertyOptional({ example: '10984729384729103948', description: 'Google Identity Platform user UID' })
  @IsOptional()
  @IsString()
  uid?: string;

  @ApiPropertyOptional({ example: 'dev-client-123', description: 'Guest device ID to merge cart into new account' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}
