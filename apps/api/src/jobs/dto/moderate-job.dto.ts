import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { JobStatus } from '../../generated/prisma/enums.js';

export class ModerateJobDto {
  @ApiProperty({
    enum: [JobStatus.PUBLISHED, JobStatus.REJECTED, JobStatus.CLOSED],
    example: JobStatus.PUBLISHED,
  })
  @IsIn([JobStatus.PUBLISHED, JobStatus.REJECTED, JobStatus.CLOSED])
  status:
    | typeof JobStatus.PUBLISHED
    | typeof JobStatus.REJECTED
    | typeof JobStatus.CLOSED;

  @ApiPropertyOptional({
    example: 'Job description violates content guidelines regarding salary transparency.',
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
