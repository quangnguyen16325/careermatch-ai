import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, ValidateIf } from 'class-validator';

export class WithdrawApplicationDto {
  @ApiPropertyOptional({
    example: 'I have accepted another internship offer. Thank you for your time.',
    maxLength: 1000,
    nullable: true,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(1000)
  reason?: string | null;
}
