import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectApplicationDto {
  @ApiPropertyOptional({
    description: 'Constructive feedback or reason for candidate rejection',
    example: 'We decided to proceed with candidates who possess deeper experience with Distributed Systems.',
    maxLength: 2000,
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(2000)
  reason?: string | null;

  @ApiPropertyOptional({
    description: 'Alias for reason',
    example: 'We decided to proceed with candidates who possess deeper experience with Distributed Systems.',
    maxLength: 2000,
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(2000)
  feedback?: string | null;
}
