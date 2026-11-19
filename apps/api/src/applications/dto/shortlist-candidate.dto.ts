import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ShortlistCandidateDto {
  @ApiPropertyOptional({
    description: 'Internal note or reason for shortlisting the candidate',
    example: 'Strong background in NestJS and Postgres. Passed initial resume screen.',
    maxLength: 1000,
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(1000)
  note?: string | null;

  @ApiPropertyOptional({
    description: 'Alias for note',
    example: 'Strong background in NestJS and Postgres.',
    maxLength: 1000,
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(1000)
  reason?: string | null;
}
