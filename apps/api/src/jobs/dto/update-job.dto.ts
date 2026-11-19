import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { JobSkillInputDto } from './job-skill.dto.js';

export class UpdateJobDto {
  @ApiPropertyOptional({ example: 'Senior Backend Engineer', minLength: 3, maxLength: 255 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(3, 255)
  title?: string;

  @ApiPropertyOptional({
    example: 'We are looking for a Node.js / NestJS engineer...',
    minLength: 10,
    maxLength: 10000,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(10, 10000)
  description?: string;

  @ApiPropertyOptional({ example: 'Ho Chi Minh City, Vietnam', maxLength: 255, nullable: true })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(255)
  location?: string | null;

  @ApiPropertyOptional({ example: 'HYBRID', enum: ['ONSITE', 'HYBRID', 'REMOTE'], nullable: true })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsIn(['ONSITE', 'HYBRID', 'REMOTE'])
  workMode?: string | null;

  @ApiPropertyOptional({ example: 'c0000000-0000-0000-0000-000000000001', nullable: true })
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({ type: [JobSkillInputDto] })
  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobSkillInputDto)
  skills?: JobSkillInputDto[];
}
