import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelInterviewDto {
  @ApiPropertyOptional({
    description: 'Reason for cancelling the interview',
    example: 'Interviewer emergency leave / rescheduling needed.',
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
