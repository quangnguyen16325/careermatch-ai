import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeclineInterviewDto {
  @ApiPropertyOptional({
    description: 'Reason for declining the proposed interview invitation',
    example: 'I have a university exam conflict at this proposed time.',
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
