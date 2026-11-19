import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class HiringOutcomeDto {
  @ApiProperty({
    description: 'Final hiring outcome decision (ACCEPTED or REJECTED)',
    enum: ['ACCEPTED', 'REJECTED'],
    example: 'ACCEPTED',
  })
  @IsIn(['ACCEPTED', 'REJECTED'])
  outcome: 'ACCEPTED' | 'REJECTED';

  @ApiPropertyOptional({
    description: 'Optional note or reason explaining the hiring outcome',
    example: 'Candidate accepted offer for Senior Backend Developer.',
    maxLength: 2000,
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(2000)
  note?: string | null;

  @ApiPropertyOptional({
    description: 'Alias for note',
    example: 'Candidate accepted offer for Senior Backend Developer.',
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
}
