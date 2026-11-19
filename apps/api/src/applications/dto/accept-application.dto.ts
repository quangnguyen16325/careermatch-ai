import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AcceptApplicationDto {
  @ApiPropertyOptional({
    description: 'Optional acceptance notes or offer reference',
    example: 'Candidate demonstrated exceptional problem solving and culture fit. Extending official offer.',
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
