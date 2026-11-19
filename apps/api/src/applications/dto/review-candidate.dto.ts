import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewCandidateDto {
  @ApiPropertyOptional({
    description: 'Optional note when starting candidate review',
    example: 'Reviewing candidate portfolio and project history.',
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
}
