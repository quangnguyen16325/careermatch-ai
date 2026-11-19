import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ScheduleInterviewDto {
  @ApiProperty({
    description: 'Scheduled interview start time in ISO-8601 format (must be at least 1 hour in the future)',
    example: '2026-11-20T10:00:00.000Z',
  })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({
    description: 'Interview duration in minutes (between 15 and 180)',
    example: 45,
    minimum: 15,
    maximum: 180,
  })
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(180)
  durationMin: number;

  @ApiPropertyOptional({
    description: 'Online meeting URL (e.g. Google Meet, Zoom, MS Teams)',
    example: 'https://meet.google.com/abc-defg-hij',
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsUrl()
  meetingUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Physical location of the interview (if on-site)',
    example: 'Floor 12, Tech Tower, 123 Innovation Street, Hanoi',
    maxLength: 500,
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(500)
  location?: string | null;

  @ApiPropertyOptional({
    description: 'Optional preparation instructions or notes for the candidate',
    example: 'Please bring your laptop and be ready for a brief technical architecture discussion.',
    maxLength: 2000,
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
