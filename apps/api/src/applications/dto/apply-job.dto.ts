import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';

export class ApplyJobDto {
  @ApiPropertyOptional({ example: 'c0000000-0000-0000-0000-000000000001' })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({
    example: 'I am excited to apply for the Backend Developer Intern position...',
    maxLength: 5000,
    nullable: true,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(5000)
  coverLetter?: string | null;
}
