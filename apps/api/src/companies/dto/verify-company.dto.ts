import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { VerificationStatus } from '../../generated/prisma/enums.js';

export class VerifyCompanyDto {
  @ApiProperty({
    enum: [VerificationStatus.VERIFIED, VerificationStatus.REJECTED],
    example: VerificationStatus.VERIFIED,
  })
  @IsIn([VerificationStatus.VERIFIED, VerificationStatus.REJECTED])
  status: typeof VerificationStatus.VERIFIED | typeof VerificationStatus.REJECTED;

  @ApiPropertyOptional({
    example: 'Valid business registration documents verified.',
    maxLength: 1000,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
